import { tools } from "@/data/tools";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Check, Shield } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { getTranslations } from "next-intl/server";
import { ToolProcessor } from "@/components/OnlineTool/ToolProcessor";

function getApiEndpoint(slug: string) {
  switch (slug) {
    case "merge-pdf":
      return "/api/pdf/merge";
    case "split-pdf":
      return "/api/pdf/split";
    case "compress-pdf":
      return "/api/pdf/compress";
    case "pdf-to-word":
      return "/api/pdf/pdf_to_word";
    case "pdf-to-images":
      return "/api/pdf/pdf_to_images";
    case "images-to-pdf":
      return "/api/pdf/images_to_pdf";
    case "rotate-pdf":
      return "/api/pdf/rotate";
    case "watermark-pdf":
      return "/api/pdf/watermark";
    case "protect-pdf":
      return "/api/pdf/protect";
    case "unlock-pdf":
      return "/api/pdf/unlock";
    case "grayscale-pdf":
      return "/api/pdf/grayscale";
    case "repair-pdf":
      return "/api/pdf/repair";

    case "remove-image-background":
      return "/api/image/remove_bg";
    case "convert-image":
      return "/api/image/convert";
    case "resize-image":
      return "/api/image/resize";
    case "compress-image":
      return "/api/image/compress";
    case "passport-photo":
      return "/api/image/passport";
    case "generate-icons":
      return "/api/image/generate_icons";
    case "extract-palette":
      return "/api/image/extract_palette";
    case "extract-images-from-pdf":
      return "/api/pdf/extract_images_from_pdf";
    case "crop-image":
      return "/api/image/crop";
    case "watermark-image":
      return "/api/image/watermark";
    case "extract-tables":
      return "/api/pdf/extract_tables";

    case "pdf-diff":
      return "/api/pdf/diff";
    case "booklet-maker":
      return "/api/pdf/booklet";
    case "pdf-scrubber":
      return "/api/pdf/scrub";
    case "pdf-redactor":
      return "/api/pdf/redact";
    case "pdf-signer":
      return "/api/pdf/sign";
    case "pdf-web-optimize":
      return "/api/pdf/optimize";

    case "heic-to-jpg":
      return "/api/image/heic_to_jpg";

    case "word-to-pdf":
      return "/api/pdf/word_to_pdf";
    case "powerpoint-to-pdf":
      return "/api/pdf/powerpoint_to_pdf";
    case "excel-to-pdf":
      return "/api/pdf/excel_to_pdf";
    case "html-to-pdf":
      return "/api/pdf/html_to_pdf";
    case "ocr-pdf":
      return "/api/pdf/ocr_pdf";
    case "pdf-to-pdfa":
      return "/api/pdf/pdf_to_pdfa";
    case "crop-pdf":
      return "/api/pdf/crop";
    case "organize-pdf":
      return "/api/pdf/organize";
    case "delete-pages":
      return "/api/pdf/delete_pages";
    case "page-numbers":
      return "/api/pdf/page_numbers";
    case "extract-text":
      return "/api/pdf/extract_text";
    case "remove-metadata":
      return "/api/pdf/remove_metadata";
    case "extract-metadata":
      return "/api/pdf/extract_metadata";
    case "extract-form-data":
      return "/api/pdf/extract_form_data";
    case "reorder-pages":
      return "/api/pdf/reorder_pages";
    case "flatten-pdf":
      return "/api/pdf/flatten";
    case "photo-studio":
      return "/api/image/design";
    case "grid-split":
      return "/api/image/grid_split";
    case "remove-image-metadata":
      return "/api/image/remove_metadata";

    default:
      return `/api/pdf/${slug.replace("-pdf", "")}`;
  }
}

export async function generateStaticParams() {
  const locales = ["en", "jp", "kr", "fr", "es", "it"];

  const params = [];
  for (const locale of locales) {
    for (const tool of tools) {
      params.push({ locale, slug: tool.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) return { title: "Tool Not Found" };

  try {
    const t = await getTranslations({ locale, namespace: "ToolsPage" });
    const title = t(`${slug}.h1`);
    return {
      title: `${title} | Local Tools`,
      description: tool.description,
    };
  } catch {
    return {
      title: `${tool.title} Offline - Private & Secure | Local Tools`,
      description: tool.description,
    };
  }
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const tool = tools.find((t) => t.slug === slug);

  if (!tool) {
    notFound();
  }

  const t = await getTranslations("ToolsPage");

  // Determine accepted file types based on tool slug
  let acceptedTypes: Record<string, string[]> = { "application/pdf": [".pdf"] };

  if (slug === "heic-to-jpg") {
    acceptedTypes = { "image/heic": [".heic", ".heif"] };
  } else if (
    slug === "extract-images-from-pdf" ||
    slug === "pdf-to-images" ||
    slug === "ocr-pdf" ||
    slug === "pdf-to-pdfa"
  ) {
    acceptedTypes = { "application/pdf": [".pdf"] };
  } else if (slug === "word-to-pdf") {
    acceptedTypes = {
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx", ".doc"],
    };
  } else if (slug === "powerpoint-to-pdf") {
    acceptedTypes = {
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        [".pptx", ".ppt"],
    };
  } else if (slug === "excel-to-pdf") {
    acceptedTypes = {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
        ".xls",
      ],
    };
  } else if (slug === "html-to-pdf") {
    acceptedTypes = { "text/html": [".html", ".htm"] };
  } else if (
    (slug.includes("image") &&
      slug !== "pdf-to-images" &&
      slug !== "extract-images-from-pdf") ||
    slug === "remove-image-background" ||
    slug === "passport-photo" ||
    slug === "extract-palette" ||
    slug === "design-studio" ||
    slug === "generate-icons" ||
    slug === "photo-studio" ||
    slug === "grid-split" ||
    slug === "remove-image-metadata"
  ) {
    acceptedTypes = { "image/*": [".png", ".jpg", ".jpeg", ".webp"] };
  }

  const getToolText = (key: string) => {
    try {
      return t(`${slug}.${key}`);
    } catch {
      return "Missing Translation";
    }
  };

  return (
    <div className="min-h-screen">
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-6">
          <Shield className="w-3 h-3" />
          <span>{t("privacy_badge", { tool: getToolText("h1") })}</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
          {getToolText("h1")}
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          {getToolText("p1")}
        </p>

        {/* Primary CTA Area is now the Tool Interface directly */}

        <div className="mb-20">
          <ToolProcessor
            toolSlug={slug}
            apiEndpoint={getApiEndpoint(slug)}
            acceptedFileTypes={acceptedTypes}
          />
        </div>

        {/* Upsell Banner */}
        <div className="max-w-4xl mx-auto bg-card/20 border border-primary/20 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8 mb-20 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1 text-center md:text-left relative z-10">
            <h3 className="text-xl font-bold text-white mb-2">
              Process files 100x faster offline
            </h3>
            <p className="text-muted-foreground text-sm">
              Download the desktop app to process confidential files locally. No
              uploads, no waiting, no limits.
            </p>
          </div>
          <Link
            href="/#pricing"
            className="relative z-10 px-8 py-4 bg-primary text-black rounded-xl font-bold hover:scale-105 transition-transform whitespace-nowrap shadow-[0_0_20px_rgba(0,243,255,0.2)]"
          >
            Get Desktop App
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-secondary/5">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold mb-12 text-center text-primary">
            {t("why_offline")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {["f1", "f2", "f3"].map((key, i) => (
              <div
                key={i}
                className="p-6 bg-background/50 rounded-xl border border-white/5 hover:border-primary/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="font-semibold mb-2">{getToolText(key)}</h3>
                <p className="text-sm text-muted-foreground">{t("why_desc")}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
