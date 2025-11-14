import {memo, useMemo} from "react";
import { Check } from "lucide-react";

interface PricingSectionItemProps {
    name: string;
    price: number;
    currency: string;
    interval: "month" | "year";
    description: string;
    benefits: string[];
    isPopular?: boolean;
    videosPerDay: number;
    minimumPrice: number;
    onClickSubscribe?: () => void;
}

function PricingSectionItem({
    name,
    price,
    currency,
    interval,
    description,
    benefits,
    isPopular = false,
    videosPerDay,
    minimumPrice,
    onClickSubscribe,
}: PricingSectionItemProps) {
    const formattedPrice = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
    }).format(price / 100);

    const discountRate = useMemo(() => {
        // 비디오당 가격 계산
        const pricePerVideo = price / videosPerDay;
        const minimumPricePerVideo = minimumPrice; // minimumPrice는 Daily×1의 가격 (1개당)

        // minimumPrice와 동일한 플랜은 할인율 0
        if (price === minimumPrice) {
            return 0;
        }

        // 할인율 계산: ((기준가격 - 현재비디오당가격) / 기준가격) × 100
        const discount = ((minimumPricePerVideo - pricePerVideo) / minimumPricePerVideo) * 100;
        return Math.round(discount); // 반올림
    }, [price, videosPerDay, minimumPrice]);

    return (
        <div
            className={`group relative flex flex-col p-8 rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:scale-105 ${
                isPopular
                    ? "border-purple-400/50 bg-gray-800/50 shadow-2xl shadow-purple-500/25"
                    : "border-purple-500/20 bg-gray-900/30 hover:border-purple-400/50 hover:bg-gray-800/50"
            }`}
        >
            {/* Popular 배지 */}
            {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold rounded-full shadow-lg">
                    Most Popular
                </div>
            )}

            {/* 플랜명 */}
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-2xl font-bold text-white">{name}</h3>
                {/* 할인율 배지 (minimumPrice가 아닌 경우만 표시) */}
                {discountRate > 0 && (
                    <span className="px-2 py-1 bg-gradient-to-r from-purple-400 to-pink-500 text-white text-sm font-bold rounded-md shadow-base">
                        {discountRate}% OFF
                    </span>
                )}
            </div>

            {/* 가격 */}
            <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                    {formattedPrice}
                </span>
                <span className="text-xl text-gray-400">
                    /{interval === "month" ? "mo" : "yr"}
                </span>
            </div>

            {/* 설명 */}
            <p className="mt-4 text-gray-300">{description}</p>

            {/* CTA 버튼 */}
            <button
                onClick={onClickSubscribe}
                className={`mt-6 w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                    isPopular
                        ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 shadow-lg shadow-purple-500/50"
                        : "bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-500/20"
                }`}
            >
                Get Started
            </button>

            {/* 구분선 */}
            <div className="my-6 border-t border-purple-500/20"></div>

            {/* 기능 리스트 */}
            <ul className="space-y-3">
                {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300">{benefit}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default memo(PricingSectionItem);