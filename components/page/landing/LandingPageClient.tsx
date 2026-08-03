'use client'

import { memo, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { polarClientAPI } from "@/lib/api/client/polarClientAPI";
import { ProductData } from "@/lib/api/types/api/polar/products/ProductData";
import { RoadmapItem } from "@/lib/api/types/supabase/RoadmapItem";
import { roadmapClientAPI } from "@/lib/api/client/roadmapClientAPI";
import { aiModelDataClientAPI } from "@/lib/api/client/aiModelDataClientAPI";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";

import LandingPageDesktopClient from "@/components/page/landing/desktop/LandingPageDesktopClient";
import LandingPageMobileClient from "@/components/page/landing/mobile/LandingPageMobileClient";
import { useIsMobile } from "@/hooks/useIsMobile";

function LandingPageClient() {
    const router = useRouter();
    const { user } = useAuth();
    const isMobile = useIsMobile(768);
    const [productDataList, setProductDataList] = useState<ProductData[]>([]);
    const [roadmapItemList, setRoadmapItemList] = useState<RoadmapItem[]>([]);
    const [aiModelDataList, setAiModelDataList] = useState<AIModelData[]>([]);

    const [isLoadingRoadmapItemList, setIsLoadingRoadmapItemList] = useState(false);

    // 결제 로직
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

    // 상품 데이터 및 로드맵 로드
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
        const loadAiModelDataList = async () => {
            const dataList = await aiModelDataClientAPI.getAIModelData();
            setAiModelDataList(dataList || []);
        }
        loadProductDataList().then();
        loadRoadmapItemList().then(() => {
            setIsLoadingRoadmapItemList(false);
        });
        loadAiModelDataList().then();
    }, []);

    return isMobile ? (
        <LandingPageMobileClient
            productDataList={productDataList}
            roadmapItemList={roadmapItemList}
            aiModelDataList={aiModelDataList}
            isLoadingRoadmapItemList={isLoadingRoadmapItemList}
            isLoggedIn={!!user}
            onClickPurchasePlan={onClickPurchasePlan}
        />
    ) : (
        <LandingPageDesktopClient
            productDataList={productDataList}
            roadmapItemList={roadmapItemList}
            aiModelDataList={aiModelDataList}
            isLoadingRoadmapItemList={isLoadingRoadmapItemList}
            isLoggedIn={!!user}
            onClickPurchasePlan={onClickPurchasePlan}
        />
    );
}

export default memo(LandingPageClient);