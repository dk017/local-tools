import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Simple in-memory rate limiter (use Redis for production scale)
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // 10 requests per minute
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
  const uuidPattern = /^([A-Z0-9_]+-)?[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
  if (uuidPattern.test(licenseKey) || licenseKey.startsWith('POLAR_') || licenseKey.startsWith('polar_')) {
    return 'polar';
  }
  return 'lemonsqueezy';
}

// Determine Polar API base URL (sandbox vs production)
function getPolarApiBase(): string {
  const isSandbox = process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL?.includes('sandbox') ||
                    process.env.POLAR_ACCESS_TOKEN?.startsWith('polar_oat_');
  return isSandbox ? 'https://sandbox-api.polar.sh/v1' : 'https://api.polar.sh/v1';
}

async function validateWithPolar(licenseKey: string, activationId?: string) {
  const organizationId = process.env.POLAR_ORGANIZATION_ID;
  if (!organizationId) {
    throw new Error('POLAR_ORGANIZATION_ID not configured');
  }

  // Polar customer-portal endpoints don't require authentication
  const apiBase = getPolarApiBase();
  const response = await fetch(`${apiBase}/customer-portal/license-keys/validate`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key: licenseKey,
      organization_id: organizationId,
      activation_id: activationId || undefined,
    }),
  });

  return response;
}

async function validateWithLemonSqueezy(licenseKey: string, instanceId?: string) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) {
    throw new Error('LEMONSQUEEZY_API_KEY not configured');
  }

  const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      license_key: licenseKey,
      instance_id: instanceId || undefined,
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
    const { license_key, instance_id, activation_id, provider: explicitProvider } = body;

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
        // Polar uses activation_id for validation
        response = await validateWithPolar(license_key, activation_id);
      } else {
        response = await validateWithLemonSqueezy(license_key, instance_id);
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
        { success: false, error: errorData.error || errorData.message || 'License validation failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Log validation request (for monitoring)
    console.log({
      timestamp: new Date().toISOString(),
      action: 'validate',
      provider,
      ip: ip,
      success: data.valid ?? data.success,
      license_status: data.license_key?.status ?? data.status,
    });

    // Return normalized response (don't leak API key or sensitive info)
    return NextResponse.json({
      success: true,
      valid: data.valid ?? data.success ?? true,
      provider,
      license_key: {
        status: data.license_key?.status ?? data.status ?? 'active',
        status_formatted: data.license_key?.status_formatted ?? data.status,
        activation_usage: data.license_key?.activation_usage ?? data.activations_count,
        activation_limit: data.license_key?.activation_limit ?? data.activations_limit,
        expires_at: data.license_key?.expires_at ?? data.expires_at,
      },
      instance: data.instance ?? data.activation,
      meta: data.meta,
    });

  } catch (error) {
    console.error('License validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
