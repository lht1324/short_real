'use client'

import {memo, ReactNode, useCallback, useMemo} from "react";

interface ChangePlanModalPricingItem {
    productId: string;
    productName: string;
    productDescription: string;
    price: number;
    benefits: {
        description: ReactNode;
        icon: ReactNode;
    }[];
    selectedProductId: string | null;
    onSelectPlan: (productId: string) => void;
}

function ChangePlanModalPricingItem({
    productId,
    productName,
    productDescription,
    price,
    benefits,
    selectedProductId,
    onSelectPlan,
}: ChangePlanModalPricingItem) {
    const isSelected = useMemo(() => {
        return selectedProductId === productId;
    }, [productId, selectedProductId]);

    const onClickItem = useCallback(() => {
        onSelectPlan(productId);
    }, [productId, onSelectPlan]);

    const formattedPrice = useMemo(() => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
        }).format(price / 100);
    }, [price]);

    return (
        <button
            onClick={onClickItem}
            className={`
                w-full px-5 py-8 rounded-2xl border transition-all duration-300 text-left
                ${isSelected
                    ? 'border-white/20 bg-zinc-800 shadow-2xl scale-[1.02]'
                    : 'border-white/5 bg-zinc-900/40 hover:border-white/10 hover:bg-zinc-900/60 hover:scale-[1.02]'
                }
            `}
        >
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-zinc-100">
                            {productName}
                        </h3>
                    </div>
                    {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-black"></div>
                        </div>
                    )}
                </div>

                <div className="mb-6">
                    <p className="text-3xl font-bold text-zinc-100">
                        {formattedPrice}
                    </p>
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mt-1">per month</p>
                </div>

                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                    {productDescription}
                </p>

                <div className="mt-auto pt-6 border-t border-white/5">
                    <ul className="space-y-4">
                        {benefits.map((benefit, index) => {
                            const {
                                description,
                                icon,
                            } = benefit;

                            return <li key={index} className="flex items-start gap-3 text-[13px] text-zinc-300 leading-tight">
                                <div className="text-zinc-500 mt-0.5">
                                    {icon}
                                </div>
                                {description}
                            </li>
                        })}
                    </ul>
                </div>
            </div>
        </button>
    )
}

export default memo(ChangePlanModalPricingItem);