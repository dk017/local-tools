import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Validate input
    const body = await request.json();
    const { license_key, instance_id } = body;

    if (!license_key || !instance_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Deactivate with LemonSqueezy
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) {
      console.error('LEMONSQUEEZY_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'License service temporarily unavailable' },
        { status: 503 }
      );
    }

    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/deactivate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ license_key, instance_id }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { success: false, error: errorData.error || 'License deactivation failed' },
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
      ip: ip,
      success: data.deactivated,
      instance_id: instance_id,
    });

    return NextResponse.json({
      success: true,
      deactivated: data.deactivated,
      license_key: {
        activation_usage: data.license_key?.activation_usage,
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
