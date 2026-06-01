import {memo, ReactNode, useMemo} from "react";
import { Check, Sparkles, Zap, LogIn } from "lucide-react";

interface PricingSectionItemProps {
    name: string;
    price: number;
    currency: string;
    interval: "month" | "year";
    description: string;
    benefits: {
        description: ReactNode;
        icon: ReactNode;
    }[];
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

    return (
        <div
            className={`
                group relative flex flex-col p-6 rounded-3xl border transition-all duration-500 overflow-hidden
                ${isPopular
                ? "bg-[#12121a] border-white/30 shadow-[0_0_40px_-10px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.15)] scale-[1.02]"
                : "bg-[#0f0f16] border-white/10 hover:border-white/20 hover:scale-[1.01]"}
            `}
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            {/* Popular 배지 & Glow */}
            {isPopular && (
                <>
                    <div className="absolute top-4 right-4 px-3 py-1 bg-white/10 border border-white/20 rounded-full flex items-center gap-1.5">
                        <Sparkles size={12} className="text-white" />
                        <span className="text-[10px] font-bold text-white tracking-wide uppercase">Best Value</span>
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
            </div>

            {/* CTA 버튼 (Sliding Animation) */}
            <button
                onClick={onClickSubscribe}
                className={`
                    relative w-full h-12 rounded-xl font-bold text-sm overflow-hidden transition-all duration-300 mb-8 border
                    ${isPopular
                    ? "bg-white text-black hover:bg-zinc-200 shadow-[0_0_40px_-15px_rgba(255,255,255,0.3)] hover:scale-[1.02] border-transparent"
                    : "bg-white/5 text-white hover:bg-white/10 border-white/10"}
                `}
            >
                {/* State 1: Default (Unlock Engine) - Slides UP when hovered & !isLoggedIn */}
                <div className={`absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-300 ease-out ${!isLoggedIn ? 'group-hover:-translate-y-full' : ''}`}>
                    <span>Unlock Engine</span>
                    <Zap size={16} className={isPopular ? "fill-black" : ""} />
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
                {benefits.map((benefit, index) => {
                    const {
                        description,
                        icon,
                    } = benefit;

                    return <li key={index} className="flex items-start gap-3 text-sm">
                        <div
                            className={`${isPopular ? 'text-white' : 'text-gray-500'}`}
                        >
                            {icon}
                        </div>
                        {description}
                    </li>
                })}
            </ul>
        </div>
    );
}

export default memo(PricingSectionItem);