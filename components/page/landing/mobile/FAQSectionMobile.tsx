'use client'

import { memo, useState, useCallback } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQCategory {
    id: string;
    label: string;
}

interface FAQItemData {
    id: number;
    category: string;
    question: string;
    answer: string;
}

const FAQ_CATEGORIES: FAQCategory[] = [
    { id: "all", label: "All Questions" },
    { id: "engine", label: "Engine & Quality" },
    { id: "pricing", label: "Billing & Plans" },
    { id: "byok", label: "BYOK & API" }
];

const FAQ_ITEMS: FAQItemData[] = [
    {
        id: 1,
        category: "engine",
        question: "How is ShortReal AI different from image slideshow generators?",
        answer: "ShortReal AI harnesses true video diffusion engines that generate continuous physical motion, camera dynamics, and fluid atmospheric effects—instead of taking static images and adding panning or zooming effects."
    },
    {
        id: 2,
        category: "byok",
        question: "What is Bring Your Own Key (BYOK)?",
        answer: "BYOK allows you to connect your personal fal.ai API key. ShortReal AI charges zero platform markup on generation costs. You pay exact direct costs charged by the AI providers."
    },
    {
        id: 3,
        category: "pricing",
        question: "Can I cancel or upgrade my subscription at any time?",
        answer: "Yes! You can upgrade, downgrade, or cancel your subscription instantly from your profile settings with zero lock-in or cancellation fees."
    },
    {
        id: 4,
        category: "engine",
        question: "What video resolutions are supported?",
        answer: "We support both 720p HD and 1080p Full HD outputs across 9:16 vertical shorts, 16:9 widescreen, and 1:1 square aspect ratios."
    },
    {
        id: 5,
        category: "pricing",
        question: "Do generated videos include commercial usage rights?",
        answer: "Yes, all paid plans include full commercial licensing. You own 100% of your generated video content for YouTube, TikTok, client work, and TV ads."
    }
];

function FAQSectionMobile() {
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [openItemIds, setOpenItemIds] = useState<number[]>([1]); // Default open item 1

    const toggleItem = useCallback((id: number) => {
        setOpenItemIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    }, []);

    const filteredItems = selectedCategory === "all"
        ? FAQ_ITEMS
        : FAQ_ITEMS.filter(item => item.category === selectedCategory);

    return (
        <section id="faq" className="relative py-12 px-4 overflow-hidden">
            <div className="relative z-10 max-w-sm mx-auto space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h2 className="text-3xl font-black text-white tracking-tight mb-2 leading-tight">
                        Frequently Asked <span className="text-zinc-500">Questions</span>
                    </h2>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                        Everything you need to know about ShortReal AI.
                    </p>
                </div>

                {/* Mobile Category Chips (Horizontally Scrollable Filter) */}
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 px-1">
                    {FAQ_CATEGORIES.map(cat => {
                        const isSelected = cat.id === selectedCategory;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`
                                    h-10 px-3.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95 border
                                    ${isSelected
                                        ? 'bg-white text-black border-white shadow-md'
                                        : 'bg-white/5 text-zinc-400 border-white/10 active:bg-white/10'}
                                `}
                            >
                                {cat.label}
                            </button>
                        );
                    })}
                </div>

                {/* Mobile FAQ Accordion List (48px+ Touch Target Cards) */}
                <div className="space-y-3">
                    {filteredItems.map(item => {
                        const isOpen = openItemIds.includes(item.id);
                        return (
                            <div
                                key={item.id}
                                className={`
                                    rounded-2xl border transition-all overflow-hidden
                                    ${isOpen ? "bg-[#12121c] border-white/20" : "bg-[#0b0b15] border-white/10"}
                                `}
                            >
                                <button
                                    onClick={() => toggleItem(item.id)}
                                    className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between text-left gap-3 active:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <HelpCircle size={16} className={isOpen ? "text-white shrink-0" : "text-zinc-500 shrink-0"} />
                                        <span className={`text-xs font-bold leading-snug ${isOpen ? "text-white" : "text-zinc-300"}`}>
                                            {item.question}
                                        </span>
                                    </div>
                                    <ChevronDown
                                        size={16}
                                        className={`text-zinc-400 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-white" : ""}`}
                                    />
                                </button>

                                {isOpen && (
                                    <div className="px-4 pb-4 pt-1 text-xs text-zinc-400 leading-relaxed border-t border-white/5">
                                        {item.answer}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}

export default memo(FAQSectionMobile);
