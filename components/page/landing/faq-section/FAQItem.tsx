'use client';

import { memo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FAQItemData } from "./FAQSection";

interface FAQItemProps {
    data: FAQItemData;
}

function FAQItem({ data }: FAQItemProps) {
    const [isOpen, setIsOpen] = useState(false);

    const onToggle = () => setIsOpen(!isOpen);

    return (
        <div
            className={`rounded-2xl border transition-colors duration-300 ${
                isOpen
                    ? 'bg-white/[0.03] border-white/20 shadow-[0_0_30px_-5px_rgba(255,255,255,0.05)]'
                    : 'bg-[#0f0f16] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
            }`}
        >
            <button
                onClick={onToggle}
                className="w-full py-6 px-6 flex items-center justify-between text-left focus:outline-none cursor-pointer group"
            >
                <span className={`text-lg font-bold transition-colors duration-200 ${
                    isOpen ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                }`}>
                    {data.question}
                </span>

                <span className={`ml-4 shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-colors duration-300 ${
                    isOpen
                        ? 'bg-white text-black border-transparent'
                        : 'border-white/10 text-gray-500 bg-white/5 group-hover:border-white/20 group-hover:text-gray-300'
                }`}>
                    <div
                        className="flex items-center justify-center transition-transform duration-300 ease-in-out"
                        style={{ transform: isOpen ? 'rotate(-180deg)' : 'rotate(0deg)' }}
                    >
                        <ChevronDown size={18} />
                    </div>
                </span>
            </button>

            {/* CSS Grid Animation Trick: JS 계산 없이 브라우저 네이티브로 60fps 보장 */}
            <div
                className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
                <div className="overflow-hidden">
                    <div className="px-6 pb-6 pt-0">
                        <div className="border-t border-white/5 pt-4">
                            <p 
                                className={`text-gray-400 leading-relaxed text-base whitespace-pre-line transition-opacity duration-300 ${
                                    isOpen ? "opacity-100 delay-100" : "opacity-0"
                                }`}
                            >
                                {data.answer}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(FAQItem);