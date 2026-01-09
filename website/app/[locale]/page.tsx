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
import { EmailCaptureModal } from "@/components/EmailCaptureModal";

export default function Home() {
  return (
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
      <EmailCaptureModal />
    </div>
  );
}
