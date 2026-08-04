'use client'

import { memo, useState, useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HeroSectionMobile from "@/components/page/landing/mobile/HeroSectionMobile";
import FeaturesSectionMobile from "@/components/page/landing/mobile/FeaturesSectionMobile";
import ComparisonSectionMobile from "@/components/page/landing/mobile/ComparisonSectionMobile";
import HowItWorksSectionMobile from "@/components/page/landing/mobile/HowItWorksSectionMobile";
import CostStructureSectionMobile from "@/components/page/landing/mobile/CostStructureSectionMobile";
import PricingSectionMobile from "@/components/page/landing/mobile/PricingSectionMobile";
import FAQSectionMobile from "@/components/page/landing/mobile/FAQSectionMobile";
import Footer from "@/components/public/footer/Footer";
import FloatingRoadmap from "@/components/page/landing/FloatingRoadmap";
import { ProductData } from "@/lib/api/types/api/polar/products/ProductData";
import { RoadmapItem } from "@/lib/api/types/supabase/RoadmapItem";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";

gsap.registerPlugin(ScrollTrigger);

export interface LandingPageMobileClientProps {
    productDataList: ProductData[];
    roadmapItemList: RoadmapItem[];
    aiModelDataList: AIModelData[];
    isLoadingRoadmapItemList: boolean;
    isLoggedIn: boolean;
    onClickPurchasePlan: (productId: string) => void;
}

function LandingPageMobileClient({
    productDataList,
    roadmapItemList,
    aiModelDataList,
    isLoadingRoadmapItemList,
    isLoggedIn,
    onClickPurchasePlan,
}: LandingPageMobileClientProps) {
    const [isFeaturesVisible, setIsFeaturesVisible] = useState(false);

    // Initialize Lenis & Sync with GSAP ScrollTrigger
    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            touchMultiplier: 1.5,
            smoothWheel: true,
        });

        // Sync Lenis scroll with GSAP ScrollTrigger
        lenis.on("scroll", ScrollTrigger.update);

        // Tell GSAP to use Lenis for scroll positions
        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);

        (window as any).lenis = lenis;

        return () => {
            delete (window as any).lenis;
            lenis.destroy();
        };
    }, []);

    // Hide Floating Roadmap while Features Section is active in Viewport
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
                <HeroSectionMobile />
                <FeaturesSectionMobile />
                <ComparisonSectionMobile />
                <HowItWorksSectionMobile />
                <CostStructureSectionMobile aiModelDataList={aiModelDataList} />
                <PricingSectionMobile
                    productDataList={productDataList}
                    isLoggedIn={isLoggedIn}
                    onClickPurchasePlan={onClickPurchasePlan}
                />
                <FAQSectionMobile />
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

export default memo(LandingPageMobileClient);
