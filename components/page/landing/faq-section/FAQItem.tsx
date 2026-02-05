'use client';

import { memo, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { FAQItemData } from "./FAQSection";

interface FAQItemProps {
    data: FAQItemData;
    isOpen: boolean;
    onToggle: () => void;
}

function FAQItem({ data, isOpen, onToggle }: FAQItemProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const content = contentRef.current;
        const inner = innerRef.current;
        if (!content || !inner) return;

        if (isOpen) {
            // 펼칠 때: 실제 높이 측정 후 적용
            const height = inner.scrollHeight;
            content.style.maxHeight = `${height}px`;
        } else {
            // 접을 때: 현재 높이 먼저 고정, 그 다음 0으로
            const height = content.scrollHeight;
            content.style.maxHeight = `${height}px`;

            // 다음 프레임에 0으로 변경 (애니메이션 트리거)
            requestAnimationFrame(() => {
                content.style.maxHeight = '0px';
            });
        }
    }, [isOpen]);

    return (
        <div
            className={`rounded-2xl border transition-colors duration-300 ${
                isOpen
                    ? 'bg-white/[0.03] border-purple-500/30 shadow-lg shadow-purple-900/10'
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
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500'
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

            {/* 실제 높이로 애니메이션 */}
            <div
                ref={contentRef}
                style={{
                    maxHeight: '0px',
                    transition: 'max-height 0.3s cubic-bezier(0.04, 0.62, 0.23, 0.98)',
                    overflow: 'hidden'
                }}
            >
                <div ref={innerRef}>
                    <div className="px-6 pb-6 pt-0">
                        <div className="border-t border-white/5 pt-4">
                            <p className="text-gray-400 leading-relaxed text-base whitespace-pre-line">
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