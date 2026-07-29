'use client'

import {memo, useCallback, useEffect, useMemo, useState, MouseEvent} from "react";
import {polarClientAPI} from "@/lib/api/client/polarClientAPI";
import {ProductData} from "@/lib/api/types/api/polar/products/ProductData";
import {Loader2, X} from "lucide-react";
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
            <div className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-zinc-950 rounded-2xl shadow-2xl border border-white/10">
                {/* 헤더 */}
                <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-md border-b border-white/5 px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl font-bold text-zinc-100">
                                Change Plan
                            </h2>
                            <p className="mt-1.5 text-zinc-500 text-sm">
                                Current Plan: <span className="text-zinc-200 font-semibold">{userCurrentProductName}</span>
                            </p>
                        </div>
                        <button
                            onClick={onClickClose}
                            className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
                            aria-label="Close modal"
                        >
                            <X className="w-6 h-6 text-zinc-500 hover:text-zinc-100" />
                        </button>
                    </div>
                </div>

                {/* 컨텐츠 */}
                <div className="relative px-8 py-10">
                    {isLoading ? (
                        // 로딩 상태
                        <div className="flex items-center justify-center py-24">
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="w-10 h-10 animate-spin text-zinc-700" />
                                <p className="text-zinc-500 font-medium">Fetching plans...</p>
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
                                        return benefit.includedPlanList.includes(productData.planId);
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
                                <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-900/50 border border-white/5">
                                    <p className="text-zinc-400 text-xs font-medium">
                                        {noticeText}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => selectedProductId && onClickSelectPlan()}
                                disabled={!isChangePlanEnabled}
                                className={`
                                    px-10 py-3 rounded-xl font-bold text-sm transition-all duration-300
                                    ${isChangePlanEnabled
                                        ? 'bg-white text-black hover:bg-zinc-200 shadow-xl'
                                        : 'bg-zinc-900 text-zinc-700 cursor-not-allowed opacity-50'
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