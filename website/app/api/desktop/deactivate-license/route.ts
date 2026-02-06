import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Detect license provider based on key format
function detectProvider(licenseKey: string): 'polar' | 'lemonsqueezy' {
  // Polar license keys are UUIDs, optionally with custom prefix
  const uuidPattern = /^([A-Z0-9_]+-)?[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
  if (uuidPattern.test(licenseKey) || licenseKey.startsWith('POLAR_') || licenseKey.startsWith('polar_')) {
    return 'polar';
  }
  return 'lemonsqueezy';
}

// Determine Polar API base URL (sandbox vs production)
function getPolarApiBase(): string {
  // Only check checkout URL for sandbox detection
  // polar_oat_ tokens are used in both sandbox AND production
  const isSandbox = process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL?.includes('sandbox');
  return isSandbox ? 'https://sandbox-api.polar.sh/v1' : 'https://api.polar.sh/v1';
}

async function deactivateWithPolar(licenseKey: string, activationId: string) {
  const organizationId = process.env.POLAR_ORGANIZATION_ID;
  if (!organizationId) {
    throw new Error('POLAR_ORGANIZATION_ID not configured');
  }

  // Polar customer-portal deactivate endpoint is public (no auth required)
  const apiBase = getPolarApiBase();
  const response = await fetch(`${apiBase}/customer-portal/license-keys/deactivate`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key: licenseKey,
      organization_id: organizationId,
      activation_id: activationId,
    }),
  });

  return response;
}

async function deactivateWithLemonSqueezy(licenseKey: string, instanceId: string) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) {
    throw new Error('LEMONSQUEEZY_API_KEY not configured');
  }

  const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/deactivate', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ license_key: licenseKey, instance_id: instanceId }),
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    // Validate input
    const body = await request.json();
    const { license_key, instance_id, provider: explicitProvider } = body;

    if (!license_key || !instance_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Determine provider (explicit or auto-detect)
    const provider = explicitProvider || detectProvider(license_key);

    let response: Response;

    try {
      if (provider === 'polar') {
        response = await deactivateWithPolar(license_key, instance_id);
      } else {
        response = await deactivateWithLemonSqueezy(license_key, instance_id);
      }
    } catch (configError) {
      console.error('License service config error:', configError);
      return NextResponse.json(
        { success: false, error: 'License service temporarily unavailable' },
        { status: 503 }
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { success: false, error: errorData.error || errorData.message || 'License deactivation failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Log deactivation request (for monitoring)
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

    console.log({
      timestamp: new Date().toISOString(),
      action: 'deactivate',
      provider,
      ip: ip,
      success: data.deactivated ?? data.success,
      instance_id: instance_id,
    });

    return NextResponse.json({
      success: true,
      deactivated: data.deactivated ?? data.success ?? true,
      provider,
      license_key: {
        activation_usage: data.license_key?.activation_usage ?? data.activations_count,
      },
    });

  } catch (error) {
    console.error('License deactivation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
