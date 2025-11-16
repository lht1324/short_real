'use client'

import {memo, useCallback, useEffect, useState} from "react";
import HeroSection from "@/components/page/landing/HeroSection";
import FeaturesSection from "@/components/page/landing/FeaturesSection";
import HowItWorksSection from "@/components/page/landing/HowItWorksSection";
import FinalCTASection from "@/components/page/landing/FinalCTASection";
import PricingSection from "@/components/page/landing/PricingSection";
import {ProductData} from "@/api/types/api/polar/products/ProductData";
import {polarClientAPI} from "@/api/client/polarClientAPI";
import {useAuth} from "@/context/AuthContext";
import {useRouter} from "next/navigation";

function LandingPageClient() {
    const router = useRouter();

    const { user } = useAuth();

    const [productDataList, setProductDataList] = useState<ProductData[]>([]);

    const onClickPurchasePlan = useCallback(async (productId: string) => {
        try {
            // 로그인되지 않은 경우 로그인 페이지로 이동
            if (!user) {
                router.push('/sign-in');
                return;
            }

            // 체크아웃 세션 생성
            const checkoutUrl = await polarClientAPI.postPolarCheckouts(
                productId,
                user.id,
                user.email,
                user.name,
            );

            // 체크아웃 URL로 리다이렉트
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

    useEffect(() => {
        const loadData = async () => {
            const productDataList = await polarClientAPI.getPolarProducts();

            if (!productDataList) {
                throw Error("No polarProducts found");
            }

            setProductDataList(productDataList.sort((a, b) => a.price - b.price));
        }

        loadData().then();
    }, []);

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Hero Section */}
            <HeroSection
                className="pt-40 pb-16 px-4 sm:px-6 lg:px-8"
            />

            {/* Features Section */}
            <FeaturesSection />

            {/* How It Works Section */}
            <HowItWorksSection />

            {/* Pricing Section */}
            <PricingSection
                productDataList={productDataList}
                onClickPurchasePlan={onClickPurchasePlan}
            />

            {/* Final CTA Section */}
            <FinalCTASection />

            {/* Footer */}
            <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-purple-500/20 bg-gray-900/30 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
                        {/* Logo & Copyright */}
                        <div className="text-center md:text-left">
                            <div className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent mb-2">
                                ShortReal
                            </div>
                            <p className="text-gray-400 text-sm">
                                &copy; 2025 ShortReal. All rights reserved.
                            </p>
                        </div>

                        {/* Links */}
                        <div className="flex space-x-8 text-sm">
                            <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">
                                Privacy Policy
                            </a>
                            <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">
                                Terms of Service
                            </a>
                            <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">
                                Contact
                            </a>
                        </div>

                        {/* Social Links */}
                        <div className="flex space-x-4">
                            <a
                                href="#"
                                className="w-10 h-10 bg-gray-800/50 border border-purple-500/30 rounded-lg flex items-center justify-center hover:bg-gray-700/50 hover:border-purple-400/50 transition-all"
                            >
                                <span className="text-lg">𝕏</span>
                            </a>
                            <a
                                href="#"
                                className="w-10 h-10 bg-gray-800/50 border border-purple-500/30 rounded-lg flex items-center justify-center hover:bg-gray-700/50 hover:border-purple-400/50 transition-all"
                            >
                                <span className="text-lg">in</span>
                            </a>
                            <a
                                href="#"
                                className="w-10 h-10 bg-gray-800/50 border border-purple-500/30 rounded-lg flex items-center justify-center hover:bg-gray-700/50 hover:border-purple-400/50 transition-all"
                            >
                                <span className="text-lg">YT</span>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default memo(LandingPageClient);