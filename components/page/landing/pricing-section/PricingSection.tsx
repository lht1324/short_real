'use client'

import {memo, useCallback, useMemo} from "react";
import PricingSectionItem from "./PricingSectionItem";
import {ProductData} from "@/lib/api/types/api/polar/products/ProductData";
import {PRICING_BENEFIT_LIST} from "@/components/page/landing/pricing-section/PRICING_BENEFIT_LIST";

export interface PricingSectionProps {
    productDataList: ProductData[];
    isLoggedIn: boolean;
    onClickPurchasePlan: (productId: string) => void;
}

function PricingSection({
    productDataList,
    isLoggedIn,
    onClickPurchasePlan,
}: PricingSectionProps) {
    const minimumPrice = useMemo(() => {
        return productDataList.map((productData) => {
            return productData.price;
        }).reduce((minValue, price) => {
            return minValue > price
                ? price
                : minValue;
        }, Number.MAX_VALUE);
    }, [productDataList]);

    const onClickSubscribe = useCallback(async (productId: string) => {
        onClickPurchasePlan(productId);
    }, [onClickPurchasePlan]);

    const gridClass = useMemo(() => {
        const length = productDataList.length;
        if (length === 0) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"; // Skeleton state
        if (length === 1) return "grid-cols-1 max-w-sm mx-auto";
        if (length === 2) return "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto";
        if (length === 3) return "grid-cols-1 md:grid-cols-3 max-w-6xl mx-auto";
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
    }, [productDataList.length]);

    return (
        <section
            id="pricing"
            className="relative py-24 md:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
        >
            <div className="max-w-[1400px] mx-auto relative z-10">
                {/* 헤더 */}
                <div className="mb-16 md:mb-24 max-w-3xl relative z-10">
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight leading-[1.1]">
                        Choose Your <span className="text-zinc-600">Power</span>
                    </h2>
                    <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
                        Unlock the full potential of the ShortReal AI engine.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className={`grid gap-6 ${gridClass}`}>
                    {productDataList.length !== 0 ? (productDataList.map((productData, index) => (
                        <PricingSectionItem
                            key={productData.id}
                            name={productData.name}
                            price={productData.price}
                            currency={productData.currency}
                            interval={productData.interval}
                            description={productData.description}
                            benefits={PRICING_BENEFIT_LIST.filter((benefit) => {
                                return benefit.includedPlanList.includes(productData.planData.planId);
                            }).map((benefit) => {
                                return {
                                    description: benefit.description,
                                    icon: benefit.icon,
                                };
                            })}
                            isPopular={productData.isPopular}
                            videosPerDay={productData.videosPerDay}
                            minimumPrice={minimumPrice}
                            index={index}
                            isLoggedIn={isLoggedIn}
                            onClickSubscribe={async () => {
                                await onClickSubscribe(productData.id)
                            }}
                        />
                    ))) : (
                        // Loading Skeletons
                        Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="relative flex flex-col p-6 rounded-3xl border border-white/5 bg-[#0f0f16] overflow-hidden"
                            >
                                {/* Shimmer Effect */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

                                {/* Title Skeleton */}
                                <div className="w-24 h-6 bg-white/10 rounded mb-4 animate-pulse relative z-10" />

                                {/* Price Skeleton */}
                                <div className="flex items-baseline gap-2 mb-6 relative z-10">
                                    <div className="w-32 h-12 sm:h-14 bg-white/10 rounded animate-pulse" />
                                    <div className="w-12 h-4 bg-white/5 rounded animate-pulse" />
                                </div>

                                {/* Button Skeleton */}
                                <div className="w-full h-12 bg-white/10 rounded-xl mb-8 border border-white/5 animate-pulse relative z-10" />

                                {/* Description Skeleton (matches border-t in real card) */}
                                <div className="border-t border-white/5 pt-6 mb-6 relative z-10">
                                    <div className="w-full h-4 bg-white/5 rounded mb-2 animate-pulse" />
                                    <div className="w-2/3 h-4 bg-white/5 rounded animate-pulse" />
                                </div>

                                {/* Benefits List Skeleton (matches space-y-4 flex-1 in real card) */}
                                <div className="space-y-4 flex-1 relative z-10">
                                    {[1, 2, 3, 4, 5, 6, 7].map((line) => (
                                        <div key={line} className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-md bg-white/10 animate-pulse shrink-0" />
                                            <div className="w-3/4 h-4 bg-white/5 rounded animate-pulse mt-0.5" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* 하단 안내 문구 */}
                <div className="mt-12 text-center text-gray-500 text-sm font-mono">
                    ALL PLANS INCLUDE COMMERCIAL LICENSE & PRIORITY GENERATION
                </div>
            </div>
        </section>
    );
}

export default memo(PricingSection);