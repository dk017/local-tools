import { NextRequest, NextResponse } from 'next/server';

// TODO: Update these URLs when you publish releases
// Option 1: GitHub Releases (recommended)
// Option 2: Your own CDN/storage
const DOWNLOAD_LINKS = {
  windows: process.env.DOWNLOAD_URL_WINDOWS || 'https://github.com/yourusername/local-tools/releases/latest/download/Local-Tools-Setup.exe',
  mac: process.env.DOWNLOAD_URL_MAC || 'https://github.com/yourusername/local-tools/releases/latest/download/Local-Tools.dmg',
  linux: process.env.DOWNLOAD_URL_LINUX || 'https://github.com/yourusername/local-tools/releases/latest/download/Local-Tools.AppImage',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;

  const downloadUrl = DOWNLOAD_LINKS[platform as keyof typeof DOWNLOAD_LINKS];

  if (!downloadUrl) {
    return NextResponse.json(
      { error: 'Invalid platform. Use: windows, mac, or linux' },
      { status: 404 }
    );
  }

  // Track download (optional - add analytics here if needed)
  console.log(`Download requested: ${platform}`);

  // Redirect to actual download URL
  return NextResponse.redirect(downloadUrl, 302);
}
