import { NextRequest, NextResponse } from 'next/server';

/**
 * Download API Route
 *
 * Redirects users to the correct download URL for their platform.
 * URLs are configured via environment variables, pointing to cloud storage (R2/S3).
 *
 * Usage:
 * - /api/download/windows → downloads Windows installer
 * - /api/download/mac → downloads macOS app
 * - /api/download/linux → downloads Linux AppImage
 */

// Download URLs from environment variables
// These should point to your Cloudflare R2/S3 bucket
function getDownloadUrls() {
  return {
    windows: process.env.DOWNLOAD_URL_WINDOWS,
    mac: process.env.DOWNLOAD_URL_MAC,
    linux: process.env.DOWNLOAD_URL_LINUX,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const normalizedPlatform = platform.toLowerCase();

  // Validate platform
  if (!['windows', 'mac', 'linux'].includes(normalizedPlatform)) {
    return NextResponse.json(
      {
        error: 'Invalid platform',
        message: 'Valid platforms: windows, mac, linux',
        example: '/api/download/windows'
      },
      { status: 400 }
    );
  }

  const downloadUrls = getDownloadUrls();
  const downloadUrl = downloadUrls[normalizedPlatform as keyof typeof downloadUrls];

  // Check if download URL is configured
  if (!downloadUrl) {
    console.error(`Download URL not configured for platform: ${normalizedPlatform}`);
    return NextResponse.json(
      {
        error: 'Download not available',
        message: `The ${normalizedPlatform} download is not yet available. Please check back soon.`,
        platform: normalizedPlatform
      },
      { status: 503 }
    );
  }

  // Log download for analytics (optional: add to database/analytics service)
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  console.log({
    event: 'download',
    platform: normalizedPlatform,
    timestamp: new Date().toISOString(),
    userAgent: userAgent.substring(0, 100), // Truncate for logs
    ip: ip.split(',')[0], // First IP if multiple
  });

  // Redirect to the actual download URL
  // Using 302 (temporary) so we can change URLs without cache issues
  return NextResponse.redirect(downloadUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

// Also support HEAD requests for download managers
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const normalizedPlatform = platform.toLowerCase();

  if (!['windows', 'mac', 'linux'].includes(normalizedPlatform)) {
    return new NextResponse(null, { status: 400 });
  }

  const downloadUrls = getDownloadUrls();
  const downloadUrl = downloadUrls[normalizedPlatform as keyof typeof downloadUrls];

  if (!downloadUrl) {
    return new NextResponse(null, { status: 503 });
  }

  return NextResponse.redirect(downloadUrl, { status: 302 });
}
