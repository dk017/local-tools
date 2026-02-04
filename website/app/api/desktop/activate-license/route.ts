import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Rate limiting for activation (stricter than validation)
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // 5 activations per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);

  if (!record || now > record.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Detect license provider based on key format
function detectProvider(licenseKey: string): 'polar' | 'lemonsqueezy' {
  // Polar license keys are UUIDs, optionally with custom prefix
  // LemonSqueezy subscription IDs are numeric
  // Check for UUID pattern (with or without prefix)
  const uuidPattern = /^([A-Z0-9_]+-)?[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
  if (uuidPattern.test(licenseKey) || licenseKey.startsWith('POLAR_') || licenseKey.startsWith('polar_')) {
    return 'polar';
  }
  return 'lemonsqueezy';
}

async function activateWithPolar(licenseKey: string, instanceName: string) {
  const organizationId = process.env.POLAR_ORGANIZATION_ID;
  if (!organizationId) {
    throw new Error('POLAR_ORGANIZATION_ID not configured');
  }

  // Polar customer-portal endpoints don't require authentication
  // They are safe to use from client-side/desktop apps
  const response = await fetch('https://api.polar.sh/v1/customer-portal/license-keys/activate', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key: licenseKey,
      organization_id: organizationId,
      label: instanceName || 'Desktop App',
    }),
  });

  return response;
}

async function activateWithLemonSqueezy(licenseKey: string, instanceName: string) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) {
    throw new Error('LEMONSQUEEZY_API_KEY not configured');
  }

  const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      license_key: licenseKey,
      instance_name: instanceName || 'Desktop App',
    }),
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate input
    const body = await request.json();
    const { license_key, instance_name, provider: explicitProvider } = body;

    if (!license_key || typeof license_key !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid license key format' },
        { status: 400 }
      );
    }

    // Determine provider (explicit or auto-detect)
    const provider = explicitProvider || detectProvider(license_key);

    let response: Response;

    try {
      if (provider === 'polar') {
        response = await activateWithPolar(license_key, instance_name);
      } else {
        response = await activateWithLemonSqueezy(license_key, instance_name);
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
        { success: false, error: errorData.error || errorData.message || 'License activation failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Log activation request (for monitoring)
    console.log({
      timestamp: new Date().toISOString(),
      action: 'activate',
      provider,
      ip: ip,
      success: data.activated ?? data.success,
      license_status: data.license_key?.status ?? data.status,
      instance_id: data.instance?.id ?? data.activation?.id,
    });

    // Return normalized response
    // Polar returns: { id, license_key_id, label, license_key: { status, expires_at, ... } }
    // LemonSqueezy returns: { activated, license_key: { status, ... }, instance: { id } }
    const isPolar = provider === 'polar';

    return NextResponse.json({
      success: true,
      activated: isPolar ? true : (data.activated ?? data.success ?? true),
      provider,
      license_key: {
        status: data.license_key?.status ?? data.status ?? 'active',
        activation_usage: data.license_key?.activation_usage ?? data.activations_count,
        activation_limit: data.license_key?.activation_limit ?? data.activations_limit,
        expires_at: data.license_key?.expires_at,
      },
      instance: isPolar ? { id: data.id, label: data.label } : (data.instance ?? data.activation),
      activation_id: isPolar ? data.id : undefined, // Polar activation ID for validation
      meta: data.meta,
    });

  } catch (error) {
    console.error('License activation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
