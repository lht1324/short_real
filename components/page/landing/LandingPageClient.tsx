'use client'

import { memo, useMemo } from "react";
import Header from "../../public/Header";
import { ArrowRight, Star, Zap, Play } from "lucide-react";
import HeroSection from "@/components/page/landing/HeroSection";

function LandingPageClient() {
    // Daily, Marketing(Temp), Influencer?
    // 하루에 몇 개 기준 (30, 60, 90)
    const testimonials = useMemo(() => [
        {
            id: 1,
            name: "Alex Johnson",
            avatar: "👨‍💻",
            rating: 5,
            comment: "Incredible tool! Created 50+ videos in just a week."
        },
        {
            id: 2,
            name: "Sarah Chen",
            avatar: "👩‍🎨",
            rating: 5,
            comment: "The AI understands exactly what I want to create."
        },
        {
            id: 3,
            name: "Mike Rodriguez",
            avatar: "🎬",
            rating: 5,
            comment: "Saved me hours of video editing work."
        },
        {
            id: 4,
            name: "Emily Davis",
            avatar: "✨",
            rating: 5,
            comment: "My viral video got 2M views using this!"
        },
        {
            id: 5,
            name: "David Kim",
            avatar: "🚀",
            rating: 5,
            comment: "Game changer for content creators."
        },
        {
            id: 6,
            name: "Lisa Wang",
            avatar: "💫",
            rating: 5,
            comment: "Best investment for my YouTube channel."
        }
    ], []);

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Hero Section */}
            <HeroSection
                className="pt-40 pb-16 px-4 sm:px-6 lg:px-8"
            />

            {/* Testimonials Section */}
            <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-gray-900/50">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="flex justify-center items-center space-x-4 mb-12">
                        {/* User Avatars */}
                        <div className="flex -space-x-2">
                            {testimonials.slice(0, 6).map((testimonial) => (
                                <div
                                    key={testimonial.id}
                                    className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-xl border-2 border-black"
                                >
                                    {testimonial.avatar}
                                </div>
                            ))}
                        </div>

                        {/* Rating */}
                        <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                                ))}
                            </div>
                            <span className="text-gray-300 font-medium">5.0</span>
                        </div>
                    </div>

                    <p className="text-gray-400 text-lg">
                        Trusted by <span className="text-pink-400 font-semibold">27,000+</span> creators
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
                <div className="max-w-7xl mx-auto text-center text-gray-500">
                    <p>&copy; 2025 ShortReal. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

export default memo(LandingPageClient);