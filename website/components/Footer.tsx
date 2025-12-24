"use client";

import { Shield } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("Common");

  return (
    <footer className="border-t border-white/10 bg-background/50 backdrop-blur-lg pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-lg text-foreground">
                Local Tools
              </span>
            </Link>
            <p className="text-muted-foreground max-w-sm">
              The professional&apos;s choice for secure, offline PDF and image
              processing. Desktop-first, with free web tools for quick previews.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-6">{t("product")}</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li>
                <Link
                  href="#features"
                  className="hover:text-primary transition-colors"
                >
                  {t("features")}
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="hover:text-primary transition-colors"
                >
                  {t("pricing")}
                </Link>
              </li>
              <li>
                <Link
                  href="#download"
                  className="hover:text-primary transition-colors"
                >
                  {t("download")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">{t("legal")}</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-primary transition-colors"
                >
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-primary transition-colors"
                >
                  {t("terms")}
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@localtools.com"
                  className="hover:text-primary transition-colors"
                >
                  {t("support")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Local Tools. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Made with ❤️ for Privacy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
