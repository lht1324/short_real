'use client';

import { memo, useState } from "react";
import FAQItem from "./FAQItem";

export interface FAQItemData {
    question: string;
    answer: string;
}

const FAQ_LIST: FAQItemData[] = [
    {
        question: "How does the BYOK (Bring Your Own Key) model work?",
        answer: "ShortReal operates on a Bring Your Own Key (BYOK) model for image and video generation. You connect your own fal.ai API key to our platform, which is used to run the generation models. You pay fal.ai directly at cost with no markup from us, making high-volume video production extremely cost-effective."
    },
    {
        question: "What counts as a 'scene'?",
        answer: "Each sentence in your script creates one scene. For example, a script with 8 sentences will generate an 8-scene video."
    },
    {
        question: "Can I use the videos for commercial purposes?",
        answer: "Yes! All paid plans include a full commercial license. You own 100% of the rights to the videos you create and can use them for YouTube, TikTok, and Instagram content."
    },
    {
        question: "Can I edit the video after it's generated?",
        answer: "Yes. After generation, you can open the editor to select AI music, trim the clip, and configure captions. However, since video scenes are timed to the voiceover, full regeneration is required to change the scene content itself, which will incur additional generation costs from your connected fal.ai API key."
    },
    {
        question: "What formats, aspect ratios, and resolutions do you support?",
        answer: "Videos are generated in MP4 format. We support both 9:16 (vertical) and 16:9 (horizontal) aspect ratios at either 720p or 1080p resolutions, giving you full flexibility for both shorts and long-form content."
    },
    {
        question: "Can I cancel my subscription anytime?",
        answer: "Absolutely. You can cancel instantly from your dashboard. You will continue to have access to ShortReal's platform features until the end of your current billing cycle, and you won't be charged for the next cycle."
    },
    {
        question: "What is your refund policy?",
        answer: "Since you pay fal.ai directly for image and video generation via your own API key, ShortReal's refund policy applies only to our platform subscription fee. Platform subscription fees are refundable within 14 days of purchase if you haven't generated any videos during that period."
    },
];

function FAQSection() {
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

                    {/* 우측: FAQ 아코디언 리스트 */}
                    <div className="lg:col-span-7 space-y-4 overflow-anchor-none">
                        {FAQ_LIST.map((faq, index) => (
                            <FAQItem
                                key={index}
                                data={faq}
                            />
                        ))}

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