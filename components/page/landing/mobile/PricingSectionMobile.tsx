'use client'

import { memo, useState, useCallback } from "react";
import { ProductData } from "@/lib/api/types/api/polar/products/ProductData";
import { PRICING_BENEFIT_LIST } from "@/components/page/landing/pricing-section/PRICING_BENEFIT_LIST";
import { Sparkles, Zap, LogIn } from "lucide-react";

export interface PricingSectionMobileProps {
    productDataList: ProductData[];
    isLoggedIn: boolean;
    onClickPurchasePlan: (productId: string) => void;
}

function PricingSectionMobile({
    productDataList,
    isLoggedIn,
    onClickPurchasePlan,
}: PricingSectionMobileProps) {
    // Default to Studio plan if available
    const defaultIndex = productDataList.findIndex(p => p.isPopular || p.name.toLowerCase().includes('studio'));
    const [selectedPlanId, setSelectedPlanId] = useState<string>(
        productDataList[defaultIndex !== -1 ? defaultIndex : 0]?.id || ""
    );

    const onClickSubscribe = useCallback((productId: string) => {
        onClickPurchasePlan(productId);
    }, [onClickPurchasePlan]);

    // Active product
    const activeProduct = productDataList.find(p => p.id === selectedPlanId) || productDataList[0];

    if (!activeProduct) return null;

    const formattedPrice = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: activeProduct.currency,
        minimumFractionDigits: 0,
    }).format(activeProduct.price / 100);

    const benefits = PRICING_BENEFIT_LIST.filter(b => b.includedPlanList.includes(activeProduct.planId));

    return (
        <section id="pricing" className="relative py-12 px-4 overflow-hidden">
            <div className="relative z-10 max-w-sm mx-auto">
                {/* Header */}
                <div className="mb-6 text-center">
                    <h2 className="text-3xl font-bold text-white tracking-tight mb-2 leading-tight">
                        Choose Your <span className="text-zinc-500">Power</span>
                    </h2>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                        Tap a plan to compare pricing and features.
                    </p>
                </div>

                {/* Plan Selection Tabs - Perfectly Grid Fitted */}
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 mb-6">
                    {productDataList.map((product) => {
                        const isSelected = product.id === (selectedPlanId || activeProduct.id);
                        const priceStr = new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: product.currency,
                            minimumFractionDigits: 0,
                        }).format(product.price / 100);

                        return (
                            <button
                                key={product.id}
                                onClick={() => setSelectedPlanId(product.id)}
                                className={`
                                    relative h-11 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all active:scale-95 border
                                    ${isSelected
                                        ? 'bg-white text-black border-white shadow-lg'
                                        : 'bg-transparent text-zinc-400 border-transparent hover:text-white'}
                                `}
                            >
                                <div className="flex items-center gap-1">
                                    <span>{product.name}</span>
                                    {product.isPopular && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    )}
                                </div>
                                <span className={`text-[10px] ${isSelected ? 'text-black font-semibold' : 'text-zinc-500'}`}>
                                    {priceStr}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Selected Plan Display Card */}
                <div
                    className={`
                        relative p-6 rounded-3xl border transition-all overflow-hidden flex flex-col
                        ${activeProduct.isPopular
                            ? "bg-[#12121a] border-white/30 shadow-[0_0_30px_-5px_rgba(255,255,255,0.15)]"
                            : "bg-[#0f0f16] border-white/10"}
                    `}
                >
                    {activeProduct.isPopular && (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-white/10 border border-white/20 rounded-full flex items-center gap-1.5">
                            <Sparkles size={11} className="text-white" />
                            <span className="text-[10px] font-bold text-white tracking-wide uppercase">Best Value</span>
                        </div>
                    )}

                    <h3 className="text-xl font-bold text-white mb-2">
                        {activeProduct.name}
                    </h3>

                    <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-4xl font-bold text-white tracking-tight">
                            {formattedPrice}
                        </span>
                        <span className="text-xs text-zinc-500 font-medium">
                            /{activeProduct.interval === "month" ? "mo" : "yr"}
                        </span>
                    </div>

                    <button
                        onClick={() => onClickSubscribe(activeProduct.id)}
                        className={`
                            w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mb-6 active:scale-95 transition-all border
                            ${activeProduct.isPopular
                                ? "bg-white text-black border-transparent shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                : "bg-white/10 text-white border-white/10 active:bg-white/20"}
                        `}
                    >
                        {isLoggedIn ? (
                            <>
                                <span>Unlock Engine</span>
                                <Zap size={16} className={activeProduct.isPopular ? "fill-black" : ""} />
                            </>
                        ) : (
                            <>
                                <span>Sign in to Unlock</span>
                                <LogIn size={16} />
                            </>
                        )}
                    </button>

                    <p className="text-xs text-zinc-400 mb-4 pt-4 border-t border-white/5 leading-relaxed">
                        {activeProduct.description}
                    </p>

                    <ul className="space-y-3 text-xs text-zinc-300">
                        {benefits.map((benefit, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                                <div className={activeProduct.isPopular ? "text-white mt-0.5" : "text-zinc-500 mt-0.5"}>
                                    {benefit.icon}
                                </div>
                                <span>{benefit.description}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-6 text-center text-zinc-500 text-[10px] font-mono tracking-wider">
                    ALL PLANS INCLUDE COMMERCIAL LICENSE & PRIORITY GENERATION
                </div>
            </div>
        </section>
    );
}

export default memo(PricingSectionMobile);
