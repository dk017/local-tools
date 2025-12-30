import { Hero } from "@/components/Hero";
import { ToolShowcase } from "@/components/ToolShowcase";
import { Features } from "@/components/Features";
import { ProblemSolution } from "@/components/ProblemSolution";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";
import { EmailCaptureModal } from "@/components/EmailCaptureModal";

export default function Home() {
  return (
    <div className="flex flex-col gap-0">
      <Hero />
      <ToolShowcase />
      <Features />
      <ProblemSolution />
      <Pricing />
      <Footer />
      <EmailCaptureModal />
    </div>
  );
}
