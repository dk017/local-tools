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
    const { license_key, instance_id } = body;

    if (!license_key || typeof license_key !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid license key format' },
        { status: 400 }
      );
    }

    // Validate with LemonSqueezy
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) {
      console.error('LEMONSQUEEZY_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'License service temporarily unavailable' },
        { status: 503 }
      );
    }

    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        license_key,
        instance_id: instance_id || undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { success: false, error: errorData.error || 'License validation failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Log validation request (for monitoring)
    console.log({
      timestamp: new Date().toISOString(),
      action: 'validate',
      ip: ip,
      success: data.valid,
      license_status: data.license_key?.status,
    });

    // Return sanitized response (don't leak API key or sensitive info)
    return NextResponse.json({
      success: true,
      valid: data.valid,
      license_key: {
        status: data.license_key?.status,
        status_formatted: data.license_key?.status_formatted,
        activation_usage: data.license_key?.activation_usage,
        activation_limit: data.license_key?.activation_limit,
        expires_at: data.license_key?.expires_at,
      },
      instance: data.instance,
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
