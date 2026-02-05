'use client';

import { memo, useState } from "react";
import FAQItem from "./FAQItem";

export interface FAQItemData {
    question: string;
    answer: string;
}

const FAQ_LIST: FAQItemData[] = [
    {
        question: "How does the credit system work?",
        answer: `100 credits = 1 basic video (≤ 30 seconds, ≤ 6 scenes)
+5 credits per additional 2 seconds over 30s
+5 credits per additional scene over 6 scenes
Credits are cumulative and added to your balance each month.`
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
        answer: "Yes. After generation, you can open the editor to select AI music, trim the clip, and configure captions. However, since video scenes are timed to the voiceover, full regeneration is required to change the scene content itself."
    },
    {
        question: "What formats and resolutions do you support?",
        answer: "Videos are generated in MP4 format in 9:16 (vertical) at 720p. We plan to support 1080p and additional formats in the future."
    },
    {
        question: "Do unused credits roll over?",
        answer: "Yes. Unused credits roll over and accumulate in your account indefinitely. You keep what you pay for."
    },
    {
        question: "Can I cancel my subscription anytime?",
        answer: "Absolutely. You can cancel instantly from your dashboard. Your credits will remain active, and you won't be charged for the next cycle."
    },
    {
        question: "What is your refund policy?",
        answer: "If you haven't used any credits yet, contact support for a refund. Once credits are used, we cannot offer refunds due to the high GPU costs incurred during generation."
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