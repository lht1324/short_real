'use client'

import { memo, useCallback } from "react";
import { ArrowRight, Zap, Play } from "lucide-react";
import VideoCard from "@/components/page/landing/hero-section/VideoCard";

function HeroSection() {
    const onClickGetStarted = useCallback(() => {
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // 카드 공통 스타일
    const cardBaseStyle = "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] sm:w-[260px] aspect-[9/16] rounded-xl border-2 shadow-2xl transition-all duration-500 ease-out hover:scale-105 hover:z-50";

    return (
        <section className="relative min-h-screen flex items-center overflow-hidden bg-[#0b0b15] px-4 sm:px-6 lg:px-8 py-20">

            {/* 1. Background Atmosphere */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>
                {/* 왼쪽(텍스트) 뒤엔 보라색, 오른쪽(비디오) 뒤엔 핑크색 은은하게 */}
                <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-purple-900/20 blur-[150px]" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-pink-900/10 blur-[150px]" />
            </div>

            <div className="relative z-10 w-full max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                {/* 2. Left: Typography (강렬한 텍스트) */}
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
                    <h1 className="relative leading-[0.9]">
                        <span className="block text-7xl sm:text-9xl font-black tracking-tighter text-white drop-shadow-[0_0_25px_rgba(236,72,153,0.3)]">
                            F*ck AI
                        </span>
                        <div className="relative mt-2 inline-block">
                            {/* 텍스트 색상을 gray-700 -> gray-500 정도로 밝힘 */}
                            <span className="text-6xl sm:text-8xl font-black tracking-tighter text-gray-300 opacity-90 mix-blend-screen">
                                slideshows.
                            </span>

                            {/* 취소선(Spray Paint)의 색상을 더 쨍한 핫핑크로 강조 */}
                            <div
                                className="absolute top-1/2 left-[-10%] w-[120%] h-4 sm:h-6 bg-gradient-to-r from-pink-500/70 to-purple-600/70 -rotate-6 transform -translate-y-1/2 shadow-[0_0_20px_rgba(236,72,153,0.4)] backdrop-blur-sm"
                                style={{ clipPath: "polygon(0% 20%, 5% 0%, 100% 10%, 95% 90%, 50% 100%, 0% 80%)" }}
                            ></div>
                        </div>
                    </h1>

                    <p className="text-xl sm:text-2xl font-medium text-gray-400 tracking-wide max-w-lg">
                        Finally, <span className="text-white font-bold border-b-2 border-pink-500">True Motion</span> Generation.<br/>
                        Don't settle for zooming images.
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

                {/* 3. Right: Video Deck (Full Visibility) */}
                <div className="relative h-[600px] w-full flex items-center justify-center perspective-1000 mt-10 lg:mt-0">
                    {/* Left Video Card */}
                    <VideoCard
                        src="/demo/demo_1.mp4"
                        className="
                            w-[220px] sm:w-[260px]
                            -translate-x-[110%] sm:-translate-x-[120%]
                            -rotate-12 hover:rotate-0 hover:scale-[1.15]
                            border-purple-500/30 bg-[#1f2937] z-20 hover:border-purple-500
                        "
                        isRightSideCovered={true}
                    />

                    {/* Right Video Card */}
                    <VideoCard
                        src="/demo/demo_2.mp4"
                        className="
                            w-[220px] sm:w-[260px]
                            translate-x-[10%] sm:translate-x-[20%]
                            rotate-12 hover:rotate-0 hover:scale-[1.15]
                            border-pink-500/30 bg-[#1f2937] z-20 hover:border-pink-500
                        "
                    />

                    {/* Center Video Card (Main) */}
                    <VideoCard
                        src="/demo/demo_main.mp4"
                        className="
                            w-[240px] sm:w-[300px]
                            -translate-x-1/2
                            rotate-0 hover:scale-105
                            border-white/20 bg-[#1f2937] z-30 shadow-[0_0_60px_-15px_rgba(236,72,153,0.3)] hover:border-white
                        "
                    />
                </div>

            </div>
        </section>
    );
}

export default memo(HeroSection);