"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  ArrowRight,
  Layers,
  FileImage,
  Files,
  Scissors,
  Minimize2,
} from "lucide-react";

export function ToolShowcase() {
  const t = useTranslations("Tools");

  const tools = [
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
      slug: "remove-image-background",
      icon: FileImage,
      title: t("remove-image-background.title"),
      desc: t("remove-image-background.desc"),
      color: "text-pink-400 bg-pink-400/10 border-pink-400/20",
    },
    {
      slug: "compress-pdf",
      icon: Minimize2,
      title: t("compress-pdf.title"),
      desc: t("compress-pdf.desc"),
      color: "text-green-400 bg-green-400/10 border-green-400/20",
    },
    {
      slug: "pdf-signer",
      icon: Files,
      title: t("pdf-signer.title"),
      desc: t("pdf-signer.desc"),
      color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    },
    {
      slug: "ocr-pdf",
      icon: Files,
      title: t("ocr-pdf.title"),
      desc: t("ocr-pdf.desc"),
      color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    },
  ];

  return (
    <section className="py-20 px-6 max-w-7xl mx-auto">
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tools.map((tool, i) => (
          <motion.div
            key={tool.slug}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link
              href={`/tools/${tool.slug}`}
              className="block p-6 rounded-2xl bg-card border border-white/5 hover:border-primary/20 transition-all hover:-translate-y-1 hover:bg-white/5 group h-full"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${tool.color}`}
              >
                <tool.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold mb-1 text-lg group-hover:text-primary transition-colors">
                {tool.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {tool.desc}
              </p>

              <div className="flex items-center text-xs font-semibold text-primary">
                Try Now{" "}
                <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
