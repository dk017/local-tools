'use client';

import { Download, CheckCircle, Monitor, Apple, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DownloadOption {
  platform: string;
  icon: LucideIcon;
  title: string;
  description: string;
  fileSize: string;
  downloadUrl: string;
}

export default function DownloadPage() {
  const t = useTranslations('Download');

  const downloads: DownloadOption[] = [
    {
      platform: 'windows',
      icon: Monitor,
      title: 'Windows',
      description: 'Windows 10, 11 (64-bit)',
      fileSize: '~150 MB',
      downloadUrl: '/api/download/windows',
    },
    {
      platform: 'mac',
      icon: Apple,
      title: 'macOS',
      description: 'macOS 11+ (Intel & Apple Silicon)',
      fileSize: '~140 MB',
      downloadUrl: '/api/download/mac',
    },
    {
      platform: 'linux',
      icon: Monitor,
      title: 'Linux',
      description: 'Ubuntu, Debian, Fedora, etc.',
      fileSize: '~160 MB',
      downloadUrl: '/api/download/linux',
    },
  ];

  return (
    <div className="min-h-screen py-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">
            Download Local Tools
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose your operating system to download the desktop app
          </p>
        </div>

        {/* Download Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {downloads.map((option) => (
            <div
              key={option.platform}
              className="bg-card/30 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:border-primary/50 transition-all group"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition">
                  <option.icon className="w-8 h-8 text-primary" />
                </div>

                <h3 className="text-2xl font-bold mb-2">{option.title}</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  {option.description}
                </p>
                <p className="text-xs text-muted-foreground/70 mb-6">
                  {option.fileSize}
                </p>

                <a
                  href={option.downloadUrl}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-[0_0_20px_rgba(0,243,255,0.2)]"
                >
                  <Download className="w-5 h-5" />
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Installation Instructions */}
        <div className="bg-card/30 backdrop-blur-md border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-primary" />
            Installation & Activation
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Windows</h3>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Download the .exe installer</li>
                <li>Run the installer and follow the setup wizard</li>
                <li>Launch Local Tools from the Start Menu</li>
                <li>Enter your license key when prompted</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">macOS</h3>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Download the .dmg file</li>
                <li>Open the .dmg and drag Local Tools to Applications</li>
                <li>Right-click the app → Open (first time only)</li>
                <li>Enter your license key when prompted</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Linux</h3>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Download the .AppImage file</li>
                <li>Make it executable: <code className="bg-black/40 px-2 py-1 rounded text-sm">chmod +x Local-Tools.AppImage</code></li>
                <li>Run the AppImage</li>
                <li>Enter your license key when prompted</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Need help? Check your email for your license key and activation instructions.
          </p>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            Lost your license key? Contact us on{' '}
            <a
              href="https://x.com/dk_r017"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @dk_r017
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
