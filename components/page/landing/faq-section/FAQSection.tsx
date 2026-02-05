'use client';

import { memo, useState } from "react";
import FAQItem from "./FAQItem";

export interface FAQItemData {
    question: string;
    answer: string;
}

const FAQ_LIST: FAQItemData[] = [
    {
        question: "Can I use the videos for commercial purposes?",
        answer: "Yes! All paid plans include a full commercial license. You own 100% of the rights to the videos you create, including monetization on YouTube, TikTok, and Instagram."
    },
    {
        question: "How does the credit system work?",
        answer: "1 Credit = 1 Second of video generation. For example, a 30-second Short costs 30 credits. Credits refresh every month for subscription plans."
    },
    {
        question: "Can I cancel my subscription anytime?",
        answer: "Absolutely. You can cancel your subscription instantly from your dashboard. Your credits will remain active until the end of your current billing period."
    },
    {
        question: "Do you support multiple languages?",
        answer: "Yes, ShortReal supports over 29 languages including English, Korean, Japanese, Spanish, and French with native-sounding AI voiceovers."
    },
    {
        question: "Is there a watermark on the videos?",
        answer: "Watermarks are removed on all paid plans. Only the free trial generation includes a small ShortReal watermark."
    },
];

function FAQSection() {
    const [openIndexList, setOpenIndexList] = useState<number[]>([]);

    const handleToggle = (toggledIndex: number) => {
        setOpenIndexList((prevOpenIndexList) => {
            return !prevOpenIndexList.includes(toggledIndex)
                ? [...prevOpenIndexList, toggledIndex]
                : prevOpenIndexList.filter((openIndex) => openIndex !== toggledIndex);
        });
    };

    return (
        <section
            id="faq"
            className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
            style={{ overflowAnchor: 'none' }}
        >
            <div className="max-w-3xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight text-white">
                        Frequently Asked <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">Questions</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Everything you need to know about the product and billing.
                    </p>
                </div>

                <div
                    className="space-y-4 overflow-anchor-none"
                >
                    {FAQ_LIST.map((faq, index) => (
                        <FAQItem
                            key={index}
                            data={faq}
                            isOpen={openIndexList.includes(index)}
                            onToggle={() => handleToggle(index)}
                        />
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-gray-500">
                        Still have questions?{' '}
                        <a href="mailto:support@shortreal.ai" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                            Contact Support
                        </a>
                    </p>
                </div>
            </div>
        </section>
    );
}

export default memo(FAQSection);