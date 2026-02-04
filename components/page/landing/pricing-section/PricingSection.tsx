'use client'

import {memo, useCallback, useMemo} from "react";
import PricingSectionItem from "./PricingSectionItem";
import {ProductData} from "@/api/types/api/polar/products/ProductData";

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

    return (
        <section
            id="pricing"
            className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        >
            <div className="max-w-7xl mx-auto relative z-10">
                {/* 헤더 */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight text-white">
                        Choose Your <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Power</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Unlock the full potential of the ShortReal AI engine.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {productDataList.length !== 0 ? (productDataList.map((productData, index) => (
                        <PricingSectionItem
                            key={productData.id}
                            name={productData.name}
                            price={productData.price}
                            currency={productData.currency}
                            interval={productData.interval}
                            description={productData.description}
                            benefits={productData.benefits}
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
                                className="relative flex flex-col p-6 rounded-3xl border border-white/5 bg-[#0f0f16] h-[580px] overflow-hidden"
                            >
                                {/* Shimmer Effect */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />

                                {/* Title Skeleton */}
                                <div className="w-24 h-6 bg-white/10 rounded mb-10 animate-pulse" />

                                {/* Price Skeleton */}
                                <div className="flex items-baseline gap-2 mb-8">
                                    <div className="w-32 h-12 bg-white/10 rounded animate-pulse" />
                                    <div className="w-12 h-4 bg-white/5 rounded animate-pulse" />
                                </div>

                                {/* Button Skeleton */}
                                <div className="w-full h-12 bg-white/10 rounded-xl mb-8 animate-pulse" />

                                {/* Description Skeleton */}
                                <div className="w-full h-4 bg-white/5 rounded mb-2 animate-pulse" />
                                <div className="w-2/3 h-4 bg-white/5 rounded mb-8 animate-pulse" />

                                {/* Benefits List Skeleton */}
                                <div className="space-y-4 mt-auto">
                                    {[1, 2, 3, 4, 5].map((line) => (
                                        <div key={line} className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full bg-white/10 animate-pulse shrink-0" />
                                            <div className="w-full h-3 bg-white/5 rounded animate-pulse" />
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