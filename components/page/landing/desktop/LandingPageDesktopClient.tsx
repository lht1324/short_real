'use client'

import { memo } from "react";
import HeroSection from "@/components/page/landing/hero-section/HeroSection";
import FeaturesSection from "@/components/page/landing/features-section/FeaturesSection";
import ComparisonSection from "@/components/page/landing/comparison-section/ComparisonSection";
import HowItWorksSection from "@/components/page/landing/how-it-works-section/HowItWorksSection";
import CostStructureSection from "@/components/page/landing/cost-structure-section/CostStructureSection";
import PricingSection from "@/components/page/landing/pricing-section/PricingSection";
import FAQSection from "@/components/page/landing/faq-section/FAQSection";
import Footer from "@/components/public/footer/Footer";
import FloatingRoadmap from "@/components/page/landing/FloatingRoadmap";
import { ProductData } from "@/lib/api/types/api/polar/products/ProductData";
import { RoadmapItem } from "@/lib/api/types/supabase/RoadmapItem";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";

export interface LandingPageDesktopClientProps {
    productDataList: ProductData[];
    roadmapItemList: RoadmapItem[];
    aiModelDataList: AIModelData[];
    isLoadingRoadmapItemList: boolean;
    isLoggedIn: boolean;
    onClickPurchasePlan: (productId: string) => void;
}

function LandingPageDesktopClient({
    productDataList,
    roadmapItemList,
    aiModelDataList,
    isLoadingRoadmapItemList,
    isLoggedIn,
    onClickPurchasePlan,
}: LandingPageDesktopClientProps) {
    return (
        <main
            className="relative min-h-screen pt-16 bg-[#0b0b15] text-white selection:bg-[#c21a2e]/30 overflow-x-hidden"
            style={{
                overflowAnchor: "none"
            }}
        >
            {/* Background Grid Pattern */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>
            </div>

            {/* Ambient Lighting */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden h-full">
                <div className="absolute top-0 left-[-10%] w-[1000px] h-[1000px] bg-red-950/10 blur-[150px] rounded-full mix-blend-screen opacity-70" />
                <div className="absolute top-[10%] right-[-10%] w-[800px] h-[800px] bg-zinc-950/5 blur-[150px] rounded-full mix-blend-screen opacity-70" />
                <div className="absolute top-[40%] left-[-20%] w-[1200px] h-[1200px] bg-zinc-950/5 blur-[150px] rounded-full mix-blend-screen opacity-60" />
                <div className="absolute bottom-0 right-[-10%] w-[1000px] h-[1000px] bg-red-950/10 blur-[150px] rounded-full mix-blend-screen opacity-70" />
            </div>

            {/* Content Sections */}
            <div className="relative z-10">
                <HeroSection />
                <FeaturesSection />
                <ComparisonSection />
                <HowItWorksSection />
                <CostStructureSection aiModelDataList={aiModelDataList} />
                <PricingSection
                    productDataList={productDataList}
                    isLoggedIn={isLoggedIn}
                    onClickPurchasePlan={onClickPurchasePlan}
                />
                <FAQSection />
                <Footer />
            </div>
            <FloatingRoadmap
                roadmapItemList={roadmapItemList}
                isLoading={isLoadingRoadmapItemList}
            />
        </main>
    );
}

export default memo(LandingPageDesktopClient);
