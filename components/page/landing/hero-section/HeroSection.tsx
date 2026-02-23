'use client'

import { memo, useCallback } from "react";
import { ArrowRight, Zap } from "lucide-react";
import VideoCard from "@/components/page/landing/hero-section/VideoCard";

function HeroSection() {
    const onClickGetStarted = useCallback(() => {
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    return (
        // [수정] bg-[#0b0b15] 제거 -> 부모 배경 투과
        <section className="relative min-h-[100vh] flex items-center overflow-hidden px-4 sm:px-6 lg:px-8 py-16">

            {/* [삭제] 여기에 있던 'Background Atmosphere' (그리드, 조명)와 '하단 마스크'를 모두 지웠습니다.
                이제 LandingPageClient의 배경이 그대로 보입니다. */}

            <div className="relative z-10 w-full max-w-[1400px] mx-48 grid grid-cols-1 lg:grid-cols-2 gap-12">

                {/* 2. Left: Typography */}
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
                    <h1 className="relative leading-[0.9]">
                        <span className="block text-7xl sm:text-9xl font-black tracking-tighter text-white drop-shadow-[0_0_25px_rgba(236,72,153,0.3)]">
                            F*ck AI
                        </span>
                        <div className="relative mt-2 inline-block">
                            <span className="text-6xl sm:text-8xl font-black tracking-tighter text-gray-300 opacity-90 mix-blend-screen">
                                slideshows.
                            </span>
                            <div
                                className="absolute top-1/2 left-[-10%] w-[120%] h-4 sm:h-6 bg-gradient-to-r from-pink-500/70 to-purple-600/70 -rotate-6 transform -translate-y-1/2 shadow-[0_0_20px_rgba(236,72,153,0.4)] backdrop-blur-sm"
                                style={{ clipPath: "polygon(0% 20%, 5% 0%, 100% 10%, 95% 90%, 50% 100%, 0% 80%)" }}
                            ></div>
                        </div>
                    </h1>

                    <p className="text-xl sm:text-2xl font-medium text-gray-400 tracking-wide max-w-lg">
                        Finally, <span className="text-white font-bold border-b-2 border-pink-500">True Motion</span> Generation.<br/>
                        Don&#39;t settle for zooming images.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4">
                        <button
                            onClick={onClickGetStarted}
                            className="group relative px-10 py-4 rounded-full font-bold text-white text-lg transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(236,72,153,0.5)]"
                        >
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 group-hover:from-pink-500 group-hover:to-purple-500 transition-colors"></div>
                            <div className="relative flex items-center justify-center gap-2">
                                <Zap className="w-5 h-5 fill-white" />
                                <span>Create Real Video</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>
                    </div>
                </div>

                {/* 3. Right: Video Deck */}
                <div className="relative w-full h-[600px] flex items-center justify-center perspective-1000 mt-10 lg:mt-0">
                    <VideoCard
                        src={`${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_main_left.mp4`}
                        className="w-[220px] sm:w-[260px] -rotate-12 hover:rotate-0 hover:scale-[1.15] border-purple-500/30 bg-[#1f2937] z-20 hover:border-purple-500"
                        isRightSideCovered={true}
                        style={{ left: "10%" }}
                    />
                    <VideoCard
                        src={`${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_main_center.mp4`}
                        className="w-[240px] sm:w-[300px] -translate-x-1/2 rotate-0 hover:scale-105 border-white/20 bg-[#1f2937] z-30 shadow-[0_0_60px_-15px_rgba(236,72,153,0.3)] hover:border-white"
                    />
                    <VideoCard
                        src={`${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_main_right.mp4`}
                        className="w-[220px] sm:w-[260px] rotate-12 hover:rotate-0 hover:scale-[1.15] border-pink-500/30 bg-[#1f2937] z-20 hover:border-pink-500"
                        style={{ right: "10%" }}
                    />
                </div>

            </div>
        </section>
    );
}

export default memo(HeroSection);