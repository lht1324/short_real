'use client'

import {memo, useMemo} from "react";
import {Edit3, Wand2, Download, ArrowRight} from "lucide-react";

function HowItWorksSection() {
    const steps = useMemo(() => [
        {
            id: 1,
            icon: Wand2,
            title: "Write or Generate Script",
            description: "Start with your own script, or let AI create entire script from a piece of idea."
        },
        {
            id: 2,
            icon: Edit3,
            title: "Edit & Customize",
            description: "Fine-tune captions, adjust timing, choose and cut music, and personalize your video style."
        },
        {
            id: 3,
            icon: Download,
            title: "Export Video",
            description: "Export your video to your favorite platform with just a click."
        }
    ], []);

    return (
        <section
            id="howitworks"
            className="relative h-[calc(100vh-64px)] py-24 px-4 sm:px-6 lg:px-8 flex items-center"
        >
            {/* Background Effects */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto relative">
                {/* Section Header */}
                <div className="text-center mb-20">
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                        How It <span className="bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">Works</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Create high-quality videos in three simple steps
                    </p>
                </div>

                {/* Steps */}
                <div className="relative">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                        {steps.map((step, index) => {
                            const IconComponent = step.icon;
                            return (
                                <div key={step.id} className="relative">
                                    {/* Arrow between steps */}
                                    {index < steps.length - 1 && (
                                        <div className="hidden md:block absolute top-20 left-full w-12 -ml-6">
                                            <ArrowRight
                                                size={24}
                                                className="text-purple-400/50"
                                            />
                                        </div>
                                    )}

                                    {/* Step Card */}
                                    <div className="relative p-8 rounded-2xl border border-purple-500/20 bg-gray-900/50 backdrop-blur-sm hover:border-purple-400/50 hover:bg-gray-800/70 transition-all duration-300">
                                        {/* Step Number */}
                                        <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl border-4 border-black shadow-lg">
                                            {step.id}
                                        </div>

                                        {/* Icon */}
                                        <div className="w-16 h-16 mb-6 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-xl flex items-center justify-center border border-purple-500/30">
                                            <IconComponent size={32} className="text-purple-400" />
                                        </div>

                                        {/* Content */}
                                        <h3 className="text-2xl font-semibold text-white mb-3">
                                            {step.title}
                                        </h3>
                                        <p className="text-gray-400 leading-relaxed">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default memo(HowItWorksSection);