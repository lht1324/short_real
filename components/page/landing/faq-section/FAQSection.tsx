'use client';

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FAQItem from "./FAQItem";

export type FAQCategory =
    | "API & Security"
    | "Video Generation"
    | "Autopilot & Publishing"
    | "Plans & Billing";

export interface FAQItemData {
    question: string;
    answer: string;
    category: FAQCategory;
}

const CATEGORIES: FAQCategory[] = [
    "API & Security",
    "Video Generation",
    "Autopilot & Publishing",
    "Plans & Billing"
];

const FAQ_LIST: FAQItemData[] = [
    {
        category: "API & Security",
        question: "How does the BYOK (Bring Your Own Key) model work?",
        answer: "ShortReal operates on a Bring Your Own Key (BYOK) model for image and video generation. You connect your own fal.ai API key to our platform, which is used to run the generation models. You pay fal.ai directly at cost with no markup from us, making high-volume video production extremely cost-effective."
    },
    {
        category: "API & Security",
        question: "Is my API key secure?",
        answer: "Yes, absolutely. Your API keys are encrypted at rest using industry-standard AES-256 encryption. To put it simply, someone would need a quantum computer (or magic) to crack it. In fact, they are so securely scrambled that even our own developers (including myself!) can't read them in plain text. We only use them programmatically to request generations on your behalf."
    },
    {
        category: "Video Generation",
        question: "What counts as a 'scene'?",
        answer: "Each sentence in your script creates one scene. For example, a script with 8 sentences will generate an 8-scene video."
    },
    {
        category: "Video Generation",
        question: "What voiceover options and languages are supported?",
        answer: "We provide premium English AI voiceovers powered by ElevenLabs, which are fully integrated into our platform. Currently, we support English voiceovers only, optimized to deliver the most natural-sounding narration for global audiences."
    },
    {
        category: "Video Generation",
        question: "Can I edit the video after it's generated?",
        answer: "Yes. After generation, you can open the editor to select AI music, trim the clip, and configure captions. However, since video scenes are timed to the voiceover, full regeneration is required to change the scene content itself, which will incur additional generation costs from your connected fal.ai API key."
    },
    {
        category: "Video Generation",
        question: "What formats, aspect ratios, and resolutions do you support?",
        answer: "Videos are generated in MP4 format. We support both 9:16 (vertical) and 16:9 (horizontal) aspect ratios at either 720p or 1080p resolutions, giving you full flexibility for both shorts and long-form content."
    },
    {
        category: "Autopilot & Publishing",
        question: "What is the Autopilot feature?",
        answer: "Autopilot is an automated scheduling system that handles your entire content pipeline. You select your target niche, set your preferred days and times, and ShortReal will automatically write the script, generate the video using your API key, and post it to your connected social channels on autopilot."
    },
    {
        category: "Autopilot & Publishing",
        question: "Which platforms can I connect for auto-publishing?",
        answer: "Currently, we support direct connection and auto-publishing to YouTube Shorts and TikTok. We are actively working on adding Instagram Reels to our supported platforms in the near future."
    },
    {
        category: "Plans & Billing",
        question: "Can I use the videos for commercial purposes?",
        answer: "Yes! All paid plans include a full commercial license. You own 100% of the rights to the videos you create and can use them for YouTube, TikTok, and Instagram content."
    },
    {
        category: "Plans & Billing",
        question: "Can I cancel my subscription anytime?",
        answer: "Absolutely. You can cancel instantly from your dashboard. You will continue to have access to ShortReal's platform features until the end of your current billing cycle, and you won't be charged for the next cycle."
    },
    {
        category: "Plans & Billing",
        question: "What is your refund policy?",
        answer: "Since you pay fal.ai directly for image and video generation via your own API key, ShortReal's refund policy applies only to our platform subscription fee. Platform subscription fees are refundable within 14 days of purchase if you haven't generated any videos during that period."
    }
];

function FAQSection() {
    const [activeCategory, setActiveCategory] = useState<FAQCategory>("API & Security");

    return (
        <section
            id="faq"
            className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
            style={{ overflowAnchor: 'none' }}
        >
            <div className="max-w-[1400px] mx-auto relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
                    
                    {/* 좌측: 타이틀 (Sticky 래퍼를 주어 스크롤 시 따라오게 할 수도 있음) */}
                    <div className="lg:col-span-5 lg:sticky lg:top-32">
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight leading-[1.1]">
                            Frequently Asked<br />
                            <span className="text-zinc-600">Questions</span>
                        </h2>
                        <p className="text-lg md:text-xl text-zinc-400 max-w-md leading-relaxed mb-8">
                            Everything you need to know about the product and billing.
                        </p>
                        
                        <div className="hidden lg:block">
                            <p className="text-sm text-gray-500">
                                Still have questions?<br />
                                <a href="mailto:support@shortreal.ai" className="text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-all font-medium mt-2 inline-block">
                                    Contact Support
                                </a>
                            </p>
                        </div>
                    </div>

                    {/* 우측: FAQ 탭 및 아코디언 리스트 */}
                    <div className="lg:col-span-7 space-y-8 overflow-anchor-none">
                        {/* 가로형 카테고리 탭 (모바일/데스크톱 공용, 가로 스크롤 대응) */}
                        <div className="flex overflow-x-auto pb-4 border-b border-white/5 scrollbar-none gap-2">
                            {CATEGORIES.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setActiveCategory(category)}
                                    className={`shrink-0 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                                        activeCategory === category
                                            ? "bg-white/[0.04] text-white border-white/20 shadow-[0_0_15px_-3px_rgba(255,255,255,0.05)]"
                                            : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300"
                                    }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeCategory}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="space-y-4 min-h-[290px] sm:min-h-[360px] lg:min-h-[440px]"
                            >
                                {FAQ_LIST.filter(faq => faq.category === activeCategory).map((faq, index) => (
                                    <FAQItem
                                        key={`${activeCategory}-${index}`}
                                        data={faq}
                                    />
                                ))}
                            </motion.div>
                        </AnimatePresence>

                        {/* 모바일용 하단 연락처 */}
                        <div className="mt-12 pt-8 border-t border-white/5 lg:hidden text-center">
                            <p className="text-gray-500">
                                Still have questions?{' '}
                                <a href="mailto:support@shortreal.ai" className="text-white underline underline-offset-4 decoration-white/30 hover:decoration-white font-medium transition-colors">
                                    Contact Support
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default memo(FAQSection);