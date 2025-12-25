"use client";

import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import {
  ArrowRight,
  Layers,
  FileImage,
  Scissors,
  Minimize2,
  FileText,
  RotateCw,
  Lock,
  Type,
  ImageMinus,
  RefreshCw,
  BoxSelect,
} from "lucide-react";

export function ToolShowcase() {
  const t = useTranslations("Tools");
  const locale = useLocale();

  // 8 Popular PDF Tools
  const pdfTools = [
    {
      slug: "merge-pdf",
      icon: Layers,
      title: t("merge-pdf.title"),
      desc: t("merge-pdf.desc"),
      color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    },
    {
      slug: "split-pdf",
      icon: Scissors,
      title: t("split-pdf.title"),
      desc: t("split-pdf.desc"),
      color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    },
    {
      slug: "compress-pdf",
      icon: Minimize2,
      title: t("compress-pdf.title"),
      desc: t("compress-pdf.desc"),
      color: "text-green-400 bg-green-400/10 border-green-400/20",
    },
    {
      slug: "pdf-to-word",
      icon: FileText,
      title: t("pdf-to-word.title"),
      desc: t("pdf-to-word.desc"),
      color: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    },
    {
      slug: "rotate-pdf",
      icon: RotateCw,
      title: t("rotate-pdf.title"),
      desc: t("rotate-pdf.desc"),
      color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    },
    {
      slug: "protect-pdf",
      icon: Lock,
      title: t("protect-pdf.title"),
      desc: t("protect-pdf.desc"),
      color: "text-red-400 bg-red-400/10 border-red-400/20",
    },
    {
      slug: "ocr-pdf",
      icon: Type,
      title: t("ocr-pdf.title"),
      desc: t("ocr-pdf.desc"),
      color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    },
    {
      slug: "images-to-pdf",
      icon: FileImage,
      title: t("images-to-pdf.title"),
      desc: t("images-to-pdf.desc"),
      color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
    },
  ];

  // 4 Popular Image Tools
  const imageTools = [
    {
      slug: "remove-image-background",
      icon: ImageMinus,
      title: t("remove-image-background.title"),
      desc: t("remove-image-background.desc"),
      color: "text-pink-400 bg-pink-400/10 border-pink-400/20",
    },
    {
      slug: "convert-image",
      icon: RefreshCw,
      title: t("convert-image.title"),
      desc: t("convert-image.desc"),
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    },
    {
      slug: "resize-image",
      icon: BoxSelect,
      title: t("resize-image.title"),
      desc: t("resize-image.desc"),
      color: "text-green-500 bg-green-500/10 border-green-500/20",
    },
    {
      slug: "compress-image",
      icon: Minimize2,
      title: t("compress-image.title"),
      desc: t("compress-image.desc"),
      color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    },
  ];

  const allTools = [...pdfTools, ...imageTools];

  return (
    <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-2">
          Try Our Most Popular Tools
        </h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Explore a few tools below, or browse all PDF &amp; image tools on the
          tools page.
        </p>
        <div className="h-1 w-20 bg-primary/20 mx-auto rounded-full" />
      </div>

      {/* 3-column grid: 4 tools per column = 12 tools total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {allTools.map((tool, i) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.slug}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/${locale}/tools/${tool.slug}`}
                className="block p-5 rounded-xl bg-card border border-white/5 hover:border-primary/20 transition-all hover:-translate-y-1 hover:bg-white/5 group h-full"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${tool.color} border`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold mb-1 text-base group-hover:text-primary transition-colors">
                  {tool.title}
                </h3>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {tool.desc}
                </p>

                <div className="flex items-center text-xs font-semibold text-primary">
                  Try Now{" "}
                  <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* View All Tools Button */}
      <div className="mt-12 text-center">
        <Link
          href={`/${locale}/tools`}
          className="inline-flex items-center gap-2 px-8 py-4 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-base font-bold text-primary hover:text-cyan-400 transition-all group"
        >
          <span>View All Tools</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
