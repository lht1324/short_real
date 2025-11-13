'use client'

import {memo, useMemo} from "react";
import {Sparkles, Video, Type, Music} from "lucide-react";

function FeaturesSection() {
    const features = useMemo(() => [
        {
            id: 1,
            icon: Sparkles,
            title: "AI Script Generation",
            description: "Transform your ideas into one story with AI-powered scriptwriting."
        },
        {
            id: 2,
            icon: Video,
            title: "True Motion Video Generation",
            description: "Generate videos with authentic, lifelike motion—not just image slideshows with transitions."
        },
        {
            id: 3,
            icon: Type,
            title: "Professional Caption Editor",
            description: "Customize captions with perfect timing, fonts, colors, and dynamic positioning."
        },
        {
            id: 4,
            icon: Music,
            title: "Studio-Quality Music",
            description: "AI generates professional-grade background music that perfectly matches your video's mood and pacing."
        }
    ], []);

    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
            {/* Background Effects */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-7xl mx-auto relative">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                        Powerful <span className="bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">Features</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Professional-grade tools for high-end shortform videos
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature) => {
                        const IconComponent = feature.icon;
                        return (
                            <div
                                key={feature.id}
                                className="group relative p-6 rounded-xl border border-purple-500/20 bg-gray-900/30 backdrop-blur-sm hover:border-purple-400/50 hover:bg-gray-800/50 transition-all duration-300 hover:scale-105"
                            >
                                {/* Icon */}
                                <div className="w-12 h-12 mb-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <IconComponent size={24} className="text-white" />
                                </div>

                                {/* Content */}
                                <h3 className="text-xl font-semibold text-white mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-400 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    )
}

export default memo(FeaturesSection);
