'use client'

import { memo, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HeroSection from "@/components/page/landing/mobile/hero-section/HeroSection";
import FeaturesSection from "@/components/page/landing/mobile/FeaturesSection";
import ComparisonSection from "@/components/page/landing/mobile/ComparisonSection";
import HowItWorksSection from "@/components/page/landing/mobile/HowItWorksSection";
import CostStructureSection from "@/components/page/landing/mobile/cost-structure-section/CostStructureSection";
import PricingSection from "@/components/page/landing/mobile/PricingSection";
import FAQSection from "@/components/page/landing/mobile/FAQSection";
import Footer from "@/components/public/footer/Footer";
import FloatingRoadmap from "@/components/page/landing/FloatingRoadmap";
import { ProductData } from "@/lib/api/types/api/polar/products/ProductData";
import { RoadmapItem } from "@/lib/api/types/supabase/RoadmapItem";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";

gsap.registerPlugin(ScrollTrigger);

export interface LandingPageClientProps {
    productDataList: ProductData[];
    roadmapItemList: RoadmapItem[];
    aiModelDataList: AIModelData[];
    isLoadingRoadmapItemList: boolean;
    isLoggedIn: boolean;
    onClickPurchasePlan: (productId: string) => void;
}

function LandingPageClient({
    productDataList,
    roadmapItemList,
    aiModelDataList,
    isLoadingRoadmapItemList,
    isLoggedIn,
    onClickPurchasePlan,
}: LandingPageClientProps) {
    const [isFeaturesVisible, setIsFeaturesVisible] = useState(false);

    // Hide Floating Roadmap & Main Header while Features Section is active in Viewport
    useEffect(() => {
        const featuresEl = document.getElementById("features");
        if (!featuresEl) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsFeaturesVisible(entry.isIntersecting);
            },
            { threshold: 0.2 }
        );

        observer.observe(featuresEl);
        return () => observer.disconnect();
    }, []);

    // Toggle Main Header visibility when Features section is active (GPU translate3d: Zero Layout Shift)
    useEffect(() => {
        const headerEl = document.getElementById("main-header");
        if (!headerEl) return;

        if (isFeaturesVisible) {
            headerEl.style.transform = "translate3d(0, -100%, 0)";
            headerEl.style.opacity = "0";
            headerEl.style.pointerEvents = "none";
        } else {
            headerEl.style.transform = "translate3d(0, 0, 0)";
            headerEl.style.opacity = "1";
            headerEl.style.pointerEvents = "auto";
        }
    }, [isFeaturesVisible]);

    return (
        <main
            className="relative min-h-[100dvh] pt-16 bg-[#0b0b15] text-white selection:bg-[#c21a2e]/30 overflow-x-hidden"
            style={{
                overflowAnchor: "none"
            }}
        >
            {/* Background Texture Grid */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            </div>

            {/* Ambient Mobile Glows */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden h-full">
                <div className="absolute top-0 left-[-20%] w-[500px] h-[500px] bg-red-950/15 blur-[100px] rounded-full mix-blend-screen opacity-70" />
                <div className="absolute bottom-0 right-[-20%] w-[500px] h-[500px] bg-red-950/15 blur-[100px] rounded-full mix-blend-screen opacity-70" />
            </div>

            {/* Mobile Dedicated Content Layers */}
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

            {/* Floating Roadmap Pill (Hidden during Features Section for Maximum Video Immersion) */}
            <div className={`transition-all duration-300 ${isFeaturesVisible ? "opacity-0 pointer-events-none translate-y-4" : "opacity-100 pointer-events-auto"}`}>
                <FloatingRoadmap
                    roadmapItemList={roadmapItemList}
                    isLoading={isLoadingRoadmapItemList}
                />
            </div>
        </main>
    );
}

export default memo(LandingPageClient);
