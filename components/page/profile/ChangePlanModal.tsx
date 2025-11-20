'use client'

import {memo, useCallback, useEffect, useMemo, useState, MouseEvent} from "react";
import {polarClientAPI} from "@/api/client/polarClientAPI";
import {ProductData} from "@/api/types/api/polar/products/ProductData";
import {X} from "lucide-react";
import PricingSectionItem from "@/components/page/landing/PricingSectionItem";
import ChangePlanModalPricingItem from "@/components/page/profile/ChangePlanModalPricingItem";

interface ChangePlanModalProps {
    userCurrentProductName: string | null;
    onClickChangePlan: (productId: string) => void;
    onClickClose: () => void;
}

function ChangePlanModal({
    userCurrentProductName,
    onClickChangePlan,
    onClickClose,
}: ChangePlanModalProps) {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [productList, setProductList] = useState<ProductData[]>([]);

    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

    // 최소 가격 계산 (PricingSection과 동일)
    const minimumPrice = useMemo(() => {
        return productList.map((productData) => {
            return productData.price;
        }).reduce((minValue, price) => {
            return minValue > price
                ? price
                : minValue;
        }, Number.MAX_VALUE);
    }, [productList]);

    // 오버레이 클릭 핸들러
    const onClickOverlay = useCallback((e: MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClickClose();
        }
    }, [onClickClose]);

    // 플랜 선택 핸들러
    const onClickSelectPlan = useCallback((productId: string) => {
        onClickChangePlan(productId);
    }, [onClickChangePlan]);

    const onSelectPlan = useCallback((productId: string) => {
        setSelectedProductId((prevSelectedProductId) => {
            return prevSelectedProductId !== productId
                ? productId
                : null;
        });
    }, []);

    useEffect(() => {
        const loadProductList = async () => {
            const productList = await polarClientAPI.getPolarProducts();

            setProductList(productList?.sort((a, b) => {
                return a.price - b.price;
            }) ?? []);
        }

        loadProductList().then(() => {
            setIsLoading(false);
        }).catch(() => {
            onClickClose();
            setIsLoading(false);
        })
    }, [onClickClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClickOverlay}
        >
            {/* 모달 컨테이너 */}
            <div className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl shadow-2xl border border-purple-500/30">
                {/* 배경 효과 */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
                </div>

                {/* 헤더 */}
                <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-md border-b border-purple-500/20 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-bold text-white">
                                Change Your <span className="bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">Plan</span>
                            </h2>
                            <p className="mt-2 text-gray-400">
                                Current Plan: <span className="text-purple-400 font-semibold">{userCurrentProductName}</span>
                            </p>
                        </div>
                        <button
                            onClick={onClickClose}
                            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                            aria-label="Close modal"
                        >
                            <X className="w-6 h-6 text-gray-400 hover:text-white" />
                        </button>
                    </div>
                </div>

                {/* 컨텐츠 */}
                <div className="relative px-8 py-10">
                    {isLoading ? (
                        // 로딩 상태
                        <div className="flex items-center justify-center py-20">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                                <p className="text-gray-400">Loading plans...</p>
                            </div>
                        </div>
                    ) : (
                        // Pricing Cards Grid
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {productList.map((productData) => (
                                <ChangePlanModalPricingItem
                                    key={productData.id}
                                    productId={productData.id}
                                    productName={productData.name}
                                    productDescription={productData.description}
                                    price={productData.price}
                                    videosPerDay={productData.videosPerDay}
                                    selectedProductId={selectedProductId}
                                    onSelectPlan={onSelectPlan}
                                />
                                // <PricingSectionItem
                                //     key={productData.id}
                                //     name={productData.name}
                                //     price={productData.price}
                                //     currency={productData.currency}
                                //     interval={productData.interval}
                                //     description={productData.description}
                                //     benefits={productData.benefits}
                                //     isPopular={productData.isPopular}
                                //     videosPerDay={productData.videosPerDay}
                                //     minimumPrice={minimumPrice}
                                //     onClickSubscribe={() => onClickSelectPlan(productData.id)}
                                // />
                            ))}
                        </div>
                    )}

                    {/* 하단 안내 문구 */}
                    {!isLoading && (
                        <div className="mt-12 text-center text-gray-400 text-sm">
                            All plans include professional-grade output.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default memo(ChangePlanModal);