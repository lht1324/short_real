import {memo, useMemo} from "react";
import { Check, Sparkles, Zap, LogIn } from "lucide-react";

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
    index: number;
    isLoggedIn: boolean;
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
    index,
    isLoggedIn,
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
            className={`
                group relative flex flex-col p-6 rounded-3xl border transition-all duration-500 overflow-hidden
                ${isPopular
                ? "bg-[#12121a] border-purple-500/50 shadow-[0_0_40px_-10px_rgba(168,85,247,0.2)] hover:shadow-[0_0_60px_-10px_rgba(168,85,247,0.4)] scale-[1.02]"
                : "bg-[#0f0f16] border-white/10 hover:border-white/20 hover:scale-[1.01]"}
            `}
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            {/* Background Grid Pattern (Optional Texture) */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none" />

            {/* Popular 배지 & Glow */}
            {isPopular && (
                <>
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" />
                    <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-purple-500/30 rounded-full flex items-center gap-1.5">
                        <Sparkles size={12} className="text-purple-400" />
                        <span className="text-[10px] font-bold text-purple-300 tracking-wide uppercase">Best Value</span>
                    </div>
                </>
            )}

            {/* 플랜명 */}
            <div className="mb-4 relative z-10">
                <h3 className={`text-lg font-bold tracking-wide ${isPopular ? 'text-white' : 'text-gray-200'}`}>
                    {name}
                </h3>
            </div>

            {/* 가격 및 할인율 */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-6 relative z-10">
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                        {formattedPrice}
                    </span>
                    <span className="text-sm text-gray-500 font-medium">
                        /{interval === "month" ? "mo" : "yr"}
                    </span>
                </div>

                {/* 할인율 배지 (가격 우측 배치) */}
                {discountRate > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 transform -translate-y-1">
                        SAVE {discountRate}% PER VIDEO
                    </span>
                )}
            </div>

            {/* CTA 버튼 (Sliding Animation) */}
            <button
                onClick={onClickSubscribe}
                className={`
                    relative w-full h-12 rounded-xl font-bold text-sm overflow-hidden transition-all duration-300 mb-8
                    ${isPopular
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/30 hover:shadow-purple-900/50 hover:brightness-110"
                    : "bg-white/5 text-white hover:bg-white/10 border border-white/10"}
                `}
            >
                {/* State 1: Default (Unlock Engine) - Slides UP when hovered & !isLoggedIn */}
                <div className={`absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-300 ease-out ${!isLoggedIn ? 'group-hover:-translate-y-full' : ''}`}>
                    <span>Unlock Engine</span>
                    <Zap size={16} className={isPopular ? "fill-white" : ""} />
                </div>

                {/* State 2: Hovered & !isLoggedIn (Sign in to Unlock) - Slides UP from bottom */}
                {!isLoggedIn && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-gray-900/90 backdrop-blur-sm">
                        <span>Sign in to Unlock</span>
                        <LogIn size={16} />
                    </div>
                )}
            </button>

            {/* 설명 */}
            <p className="text-sm text-gray-400 mb-6 leading-relaxed border-t border-white/5 pt-6">
                {description}
            </p>

            {/* 기능 리스트 */}
            <ul className="space-y-4 flex-1 relative z-10">
                {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                        <div className={`mt-0.5 p-0.5 rounded-full ${isPopular ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-500'}`}>
                            <Check size={10} strokeWidth={3} />
                        </div>
                        <span className="text-gray-300">{benefit}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default memo(PricingSectionItem);