'use client'

import {memo, useCallback, useMemo} from "react";
import PricingSectionItem from "./PricingSectionItem";
import {ProductData} from "@/api/types/api/polar/products/ProductData";

export interface PricingSectionProps {
    productDataList: ProductData[];
    onClickPurchasePlan: (productId: string) => void;
}

function PricingSection({
    productDataList,
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
        <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
            {/* Background Effects */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto relative">
                {/* 헤더 */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                        Choose Your <span className="bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">Plan</span>
                    </h2>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Start creating real videos today.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {productDataList.map((productData) => (
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
                            onClickSubscribe={async () => {
                                await onClickSubscribe(productData.id)
                            }}
                        />
                    ))}
                </div>

                {/* 하단 안내 문구 */}
                <div className="mt-12 text-center text-gray-400 text-sm">
                    All plans include professional-grade output.
                </div>
            </div>
        </section>
    );
}

export default memo(PricingSection);