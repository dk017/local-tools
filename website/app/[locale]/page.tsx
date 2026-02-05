import { Hero } from "@/components/Hero";
import { TrustIndicators } from "@/components/TrustIndicators";
import { Benefits } from "@/components/Benefits";
import { ToolShowcase } from "@/components/ToolShowcase";
import { Process } from "@/components/Process";
import { Features } from "@/components/Features";
import { ProblemSolution } from "@/components/ProblemSolution";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
// import { EmailCaptureModal } from "@/components/EmailCaptureModal"; // Disabled for now

// Structured Data for SEO
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Local Tools",
  "url": "https://localtools.pro",
  "logo": "https://localtools.pro/logo.png",
  "description": "Privacy-first offline PDF and image processing tools for professionals.",
  "contactPoint": {
    "@type": "ContactPoint",
    "url": "https://x.com/dk_r017",
    "contactType": "customer support"
  }
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Local Tools Desktop App",
  "description": "The first offline AI toolkit. Merge, split, and edit PDFs with neural processing on your device.",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "Windows, macOS",
  "offers": {
    "@type": "Offer",
    "price": "27",
    "priceCurrency": "USD",
    "priceValidUntil": "2026-12-31",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "ratingCount": "50",
    "bestRating": "5",
    "worstRating": "1"
  },
  "featureList": [
    "100% Offline Processing",
    "50+ PDF & Image Tools",
    "Zero Cloud Uploads",
    "AI-Powered Background Removal",
    "PDF Merge, Split, Compress",
    "OCR Text Recognition",
    "Batch Processing"
  ]
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Does the license work offline?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. After initial activation (which requires internet), the app works completely offline. No internet required for any tool."
      }
    },
    {
      "@type": "Question",
      "name": "What happens when my subscription expires?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The app continues working with the tools available at renewal time. You just won't receive new features or updates until you renew."
      }
    },
    {
      "@type": "Question",
      "name": "Can I use this for commercial work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Absolutely. Commercial use rights are included with every license. Use it for client work, internal documents, whatever you need."
      }
    },
    {
      "@type": "Question",
      "name": "Is there a free trial?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Try our web demo tools for free with no signup. The desktop app has a 30-day money-back guarantee—full refund, no questions asked."
      }
    },
    {
      "@type": "Question",
      "name": "What file types are supported?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "PDF, DOCX, XLSX, PPTX, PNG, JPG, WEBP, HEIC, and more. Check our tools page for the complete list."
      }
    },
    {
      "@type": "Question",
      "name": "How do I get support?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Contact us on X (Twitter) @dk_r017. Priority support is included with every license—we typically respond within 24 hours."
      }
    }
  ]
};

export default function Home() {
  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="flex flex-col gap-0">
        <Hero />
        <TrustIndicators />
        <Benefits />
        <ToolShowcase />
        <Process />
        <Features />
        <ProblemSolution />
        <Pricing />
        <FAQ />
        <FinalCTA />
        <Footer />
        {/* <EmailCaptureModal /> */}
      </div>
    </>
  );
}
