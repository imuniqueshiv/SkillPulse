import { IndiaScrollMap } from "@/components/landing/IndiaScrollMap";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeatureSection } from "@/components/landing/FeatureSection";
import { TimelineSection } from "@/components/landing/TimelineSection";
import { DataFlowSection } from "@/components/landing/DataFlowSection";
import { InsightSection } from "@/components/landing/InsightSection";
import { StakeholdersSection } from "@/components/landing/StakeholdersSection";
import { EvidenceTrustSection } from "@/components/landing/EvidenceTrustSection";
import { MaharashtraSection } from "@/components/landing/MaharashtraSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col font-sans text-[#1F2937] antialiased relative">
      <IndiaScrollMap />
      <HeroSection />
      <FeatureSection />
      <TimelineSection />
      <DataFlowSection />
      <InsightSection />
      <StakeholdersSection />
      <EvidenceTrustSection />
      <MaharashtraSection />
      <FinalCTASection />
    </div>
  );
}
