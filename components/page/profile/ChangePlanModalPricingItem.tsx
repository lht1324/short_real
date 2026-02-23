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
                w-full px-4 py-6 rounded-2xl border backdrop-blur-sm transition-all duration-300 text-left
                ${isSelected
                    ? 'border-purple-400/50 bg-gray-800/50 shadow-2xl shadow-purple-500/25 scale-105'
                    : 'border-purple-500/20 bg-gray-900/30 hover:border-purple-400/50 hover:bg-gray-800/50 hover:scale-105'
                }
            `}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">
                        {productName}
                    </h3>
                    <p className="text-sm text-gray-300 mt-1">
                        {productDescription}
                    </p>
                </div>
                <div className="text-right ml-4">
                    <p className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                        {formattedPrice}
                    </p>
                    <p className="text-xs text-gray-400">per month</p>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-purple-500/20">
                <ul className="space-y-4 flex-1 relative z-10">
                    {benefits.map((benefit, index) => {
                        const {
                            description,
                            icon,
                        } = benefit;

                        return <li key={index} className="flex items-start gap-3 text-sm">
                            <div
                                className={`${isSelected ? 'text-purple-400' : 'text-gray-500'}`}
                            >
                                {icon}
                            </div>
                            {description}
                        </li>
                    })}
                </ul>
            </div>
        </button>
    )
}

export default memo(ChangePlanModalPricingItem);