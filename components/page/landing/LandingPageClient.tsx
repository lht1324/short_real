'use client'

import { memo, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { polarClientAPI } from "@/lib/api/client/polarClientAPI";
import { ProductData } from "@/lib/api/types/api/polar/products/ProductData";

// Components
import HeroSection from "@/components/page/landing/hero-section/HeroSection";
import FeaturesSection from "@/components/page/landing/features-section/FeaturesSection";
import ComparisonSection from "@/components/page/landing/comparison-section/ComparisonSection";
import HowItWorksSection from "@/components/page/landing/how-it-works-section/HowItWorksSection";
import PricingSection from "@/components/page/landing/pricing-section/PricingSection";
import FAQSection from "@/components/page/landing/faq-section/FAQSection";
import Footer from "@/components/public/footer/Footer";
import FloatingRoadmap from "@/components/page/landing/FloatingRoadmap";
import {RoadmapItem} from "@/lib/api/types/supabase/RoadmapItem";
import {roadmapClientAPI} from "@/lib/api/client/roadmapClientAPI";

function LandingPageClient() {
    const router = useRouter();
    const { user } = useAuth();
    const [productDataList, setProductDataList] = useState<ProductData[]>([]);
    const [roadmapItemList, setRoadmapItemList] = useState<RoadmapItem[]>([]);

    const [isLoadingRoadmapItemList, setIsLoadingRoadmapItemList] = useState(false);

    // 결제 로직 (기존 유지)
    const onClickPurchasePlan = useCallback(async (productId: string) => {
        try {
            if (!user) {
                router.push('/sign-in?redirectTo=pricing');
                return;
            }
            const checkoutUrl = await polarClientAPI.postPolarCheckouts(
                productId,
                user.id,
                user.email,
                user.name,
            );
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                throw new Error("Failed to create checkout session");
            }
        } catch (error) {
            console.error("Error in onClickPurchasePlan:", error);
            alert("Failed to proceed to checkout. Please try again.");
        }
    }, [user, router]);

    // 상품 데이터 로드 (기존 유지)
    useEffect(() => {
        const loadProductDataList = async () => {
            const productDataList = await polarClientAPI.getPolarProducts();
            if (!productDataList) {
                throw Error("No polarProducts found");
            }
            setProductDataList(productDataList.sort((a, b) => a.price - b.price));
        }
        const loadRoadmapItemList = async () => {
            setIsLoadingRoadmapItemList(true);

            const roadmapItemList = await roadmapClientAPI.getRoadmaps();
            if (!roadmapItemList) {
                throw Error("No roadmap items found");
            }
            setRoadmapItemList(roadmapItemList);
        }
        loadProductDataList().then();
        loadRoadmapItemList().then(() => {
            setIsLoadingRoadmapItemList(false);
        });
    }, []);

    return (
        // 1. [Global Base] 전체 페이지 배경색 (#0b0b15) 및 기본 설정
        <main
            className="relative min-h-screen pt-16 bg-[#0b0b15] text-white selection:bg-pink-500/30 overflow-x-hidden"
            style={{
                overflowAnchor: "none"
            }}
        >

            {/* 2. [Global Texture] 고정된 그리드 패턴 (Fixed Position)
                - 스크롤을 내려도 그리드는 배경에 박제되어 있어 고급스러운 깊이감을 줍니다.
            */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>
            </div>

            {/* 3. [Global Lighting] 페이지 전체를 아우르는 조명 배치 (Absolute Position)
                - 섹션별로 끊기지 않고 자연스럽게 이어지도록 큰 조명들을 배치합니다.
            */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden h-full">
                {/* Hero Section Area Glows (Purple & Pink) */}
                <div className="absolute top-0 left-[-10%] w-[1000px] h-[1000px] bg-purple-900/20 blur-[150px] rounded-full mix-blend-screen opacity-70" />
                <div className="absolute top-[10%] right-[-10%] w-[800px] h-[800px] bg-pink-900/10 blur-[150px] rounded-full mix-blend-screen opacity-70" />

                {/* Features & Comparison Area Glows (Cyan & Blue) */}
                <div className="absolute top-[40%] left-[-20%] w-[1200px] h-[1200px] bg-cyan-900/10 blur-[150px] rounded-full mix-blend-screen opacity-60" />

                {/* Pricing & Bottom Area Glows (Return to Purple) */}
                <div className="absolute bottom-0 right-[-10%] w-[1000px] h-[1000px] bg-purple-900/10 blur-[150px] rounded-full mix-blend-screen opacity-70" />
            </div>

            {/* 4. [Content Layer] 실제 섹션들 (z-index를 10으로 올려서 배경 위에 띄움) */}
            <div className="relative z-10">
                <HeroSection />

                <FeaturesSection />

                <ComparisonSection />

                <HowItWorksSection />

                <PricingSection
                    productDataList={productDataList}
                    isLoggedIn={!!user}
                    onClickPurchasePlan={onClickPurchasePlan}
                />

                <FAQSection />

                <Footer/>
            </div>
            <FloatingRoadmap
                roadmapItemList={roadmapItemList}
                isLoading={isLoadingRoadmapItemList}
            />
        </main>
    );
}

export default memo(LandingPageClient);