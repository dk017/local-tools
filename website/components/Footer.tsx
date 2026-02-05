"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

const pdfTools = [
  { slug: "merge-pdf", name: "Merge PDF" },
  { slug: "split-pdf", name: "Split PDF" },
  { slug: "compress-pdf", name: "Compress PDF" },
  { slug: "pdf-to-word", name: "PDF to Word" },
  { slug: "word-to-pdf", name: "Word to PDF" },
  { slug: "rotate-pdf", name: "Rotate PDF" },
  { slug: "crop-pdf", name: "Crop PDF" },
  { slug: "ocr-pdf", name: "OCR PDF" },
  { slug: "organize-pdf", name: "Organize PDF" },
  { slug: "pdf-to-pdfa", name: "PDF to PDF/A" },
];

const imageTools = [
  { slug: "compress-image", name: "Compress Image" },
  { slug: "resize-image", name: "Resize Image" },
  { slug: "crop-image", name: "Crop Image" },
  { slug: "jpg-to-png", name: "JPG to PNG" },
  { slug: "png-to-jpg", name: "PNG to JPG" },
  { slug: "heic-to-jpg", name: "HEIC to JPG" },
  { slug: "remove-image-background", name: "Remove Background" },
  { slug: "upscale-image", name: "Upscale Image" },
  { slug: "watermark-image", name: "Add Watermark" },
  { slug: "passport-photo", name: "Passport Photo" },
];

export function Footer() {
  const t = useTranslations("Common");

  return (
    <footer className="border-t border-white/10 bg-background/50 backdrop-blur-lg pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <Image
                src="/logo.png"
                alt="Local Tools"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-bold text-lg text-foreground">
                Local Tools
              </span>
            </Link>
            <p className="text-muted-foreground text-sm">
              The professional&apos;s choice for secure, offline PDF and image
              processing.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-6">PDF Tools</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {pdfTools.map((tool) => (
                <li key={tool.slug}>
                  <Link
                    href={`/tools/${tool.slug}`}
                    className="hover:text-primary transition-colors"
                  >
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">Image Tools</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {imageTools.map((tool) => (
                <li key={tool.slug}>
                  <Link
                    href={`/tools/${tool.slug}`}
                    className="hover:text-primary transition-colors"
                  >
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">{t("product")}</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/#features"
                  className="hover:text-primary transition-colors"
                >
                  {t("features")}
                </Link>
              </li>
              <li>
                <Link
                  href="/#pricing"
                  className="hover:text-primary transition-colors"
                >
                  {t("pricing")}
                </Link>
              </li>
              <li>
                <Link
                  href="/download"
                  className="hover:text-primary transition-colors"
                >
                  {t("download")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">{t("legal")}</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
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
                  href="https://x.com/dk_r017"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Local Tools. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a
              href="https://x.com/dk_r017"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <span>Made with privacy in mind</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
