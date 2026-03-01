'use client'

import {memo, useCallback, useEffect, useMemo, useState, MouseEvent} from "react";
import {polarClientAPI} from "@/lib/api/client/polarClientAPI";
import {ProductData} from "@/lib/api/types/api/polar/products/ProductData";
import {X} from "lucide-react";
import ChangePlanModalPricingItem from "@/components/page/profile/ChangePlanModalPricingItem";
import ChangePlanConfirmModal from "@/components/page/profile/ChangePlanConfirmModal";
import {PRICING_BENEFIT_LIST} from "@/components/page/landing/pricing-section/PRICING_BENEFIT_LIST";

interface ChangePlanModalProps {
    userCurrentProductId: string | null;
    userCurrentProductName: string | null;
    onConfirmChangePlan: (productId: string) => void;
    onClickClose: () => void;
}

function ChangePlanModal({
    userCurrentProductId,
    userCurrentProductName,
    onConfirmChangePlan,
    onClickClose,
}: ChangePlanModalProps) {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [showChangePlanConfirmModal, setShowChangePlanConfirmModal] = useState<boolean>(false);

    const [productList, setProductList] = useState<ProductData[]>([]);

    const [selectedProductId, setSelectedProductId] = useState<string | null>(userCurrentProductId);

    const currentProductData = useMemo(() => {
        return productList.find((productData) => {
            return productData.id === userCurrentProductId;
        }) ?? null;
    }, [userCurrentProductId, productList]);

    const selectedProductData = useMemo(() => {
        return productList.find((productData) => {
            return productData.id === selectedProductId;
        }) ?? null;
    }, [productList, selectedProductId]);

    const noticeText = useMemo(() => {
        if (!selectedProductId) {
            return "Select a plan to see details.";
        }

        if (!currentProductData || !selectedProductData) {
            return "";
        }

        // 현재 플랜과 동일한 경우
        if (selectedProductData.id === currentProductData.id) {
            return "This is your current plan.";
        }

        // 다운그레이드 (더 저렴한 플랜)
        if (selectedProductData.price < currentProductData.price) {
            return "Your plan will change at the next billing cycle.";
        }

        // 업그레이드 (더 비싼 플랜)
        return "Upgrade will be charged immediately and take effect right away.";
    }, [currentProductData, selectedProductData, selectedProductId]);

    // 버튼 활성화 조건
    const isChangePlanEnabled = useMemo(() => {
        if (!selectedProductId || !currentProductData || !selectedProductData) {
            return false;
        }
        return selectedProductData.id !== currentProductData.id;
    }, [selectedProductId, currentProductData, selectedProductData]);

    // 오버레이 클릭 핸들러
    const onClickOverlay = useCallback((e: MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClickClose();
        }
    }, [onClickClose]);

    // 플랜 선택 핸들러
    const onClickSelectPlan = useCallback(() => {
        if (showChangePlanConfirmModal && selectedProductId) {
            onConfirmChangePlan(selectedProductId);
            setShowChangePlanConfirmModal(false);
        } else {
            setShowChangePlanConfirmModal(true);
        }
    }, [onConfirmChangePlan, selectedProductId, showChangePlanConfirmModal]);

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
            const sortedProductList = productList?.sort((a, b) => {
                return a.price - b.price;
            }) ?? [];

            setProductList(sortedProductList);
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
                                    benefits={PRICING_BENEFIT_LIST.filter((benefit) => {
                                        return benefit.includedPlanList.includes(productData.planData.planId);
                                    }).map((benefit) => {
                                        return {
                                            description: benefit.description,
                                            icon: benefit.icon,
                                        };
                                    })}
                                    selectedProductId={selectedProductId}
                                    onSelectPlan={onSelectPlan}
                                />
                            ))}
                        </div>
                    )}

                    {/* 하단 안내 문구 및 버튼 */}
                    {!isLoading && (
                        <div className="mt-12 flex flex-col items-center gap-6">
                            {noticeText && (
                                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-purple-500/10 border border-purple-500/30">
                                    <p className="text-gray-300 text-sm font-medium">
                                        {noticeText}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => selectedProductId && onClickSelectPlan()}
                                disabled={!isChangePlanEnabled}
                                className={`
                                    px-8 py-3 rounded-full font-semibold text-white transition-all duration-300
                                    ${isChangePlanEnabled
                                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 hover:scale-105 shadow-lg shadow-purple-500/50'
                                        : 'bg-gray-700 cursor-not-allowed opacity-50'
                                    }
                                `}
                            >
                                Change Plan
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {showChangePlanConfirmModal && selectedProductData && currentProductData && <ChangePlanConfirmModal
                planName={selectedProductData?.name}
                price={selectedProductData.price}
                isUpgrade={selectedProductData?.price > currentProductData.price}
                onClickConfirm={onClickSelectPlan}
                onClickCancel={() => {
                    setShowChangePlanConfirmModal(false);
                }}
            />}
        </div>
    )
}

export default memo(ChangePlanModal);