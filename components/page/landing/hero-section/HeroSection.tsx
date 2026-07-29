'use client'

import { memo, useCallback } from "react";
import { ArrowRight, Zap } from "lucide-react";
import VideoCard from "@/components/page/landing/hero-section/VideoCard";
import { useIsMobile } from "@/hooks/useIsMobile";

function HeroSection() {
    const isMobile = useIsMobile();

    const onClickGetStarted = useCallback(() => {
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    return (
        <section className="relative pt-6 pb-12 lg:pt-10 lg:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden z-10">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">

                {/* LEFT: Typography & CTA */}
                <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 lg:space-y-8 order-1 lg:pr-8">
                    <h1 className="relative leading-[1] md:leading-[0.95] flex flex-col items-center lg:items-start">
                        <span className="block text-[4rem] sm:text-7xl md:text-8xl lg:text-[7.5rem] font-black tracking-tighter text-white cursor-default select-none">
                            F×ck
                        </span>
                        <div className="relative mt-1 md:mt-2 inline-block">
                            <div className="relative overflow-visible">
                                {/* UPPER SLICE (The Master Blade Strategy) */}
                                <span
                                    className="block text-[3.5rem] sm:text-6xl md:text-7xl lg:text-[6.5rem] font-black tracking-tighter text-zinc-500/80 uppercase [clip-path:polygon(0%_0%,100%_0%,100%_15%,0_70%)] cursor-default select-none whitespace-nowrap"
                                    aria-hidden="true"
                                >
                                    AI slideshows<span className="text-[#0a0a0c]">.</span>
                                </span>

                                {/* LOWER SLICE (The Master Blade Strategy) */}
                                <span 
                                    className="absolute inset-0 text-[3.5rem] left-[1%] sm:text-6xl md:text-7xl lg:text-[6.5rem] font-black tracking-tighter text-zinc-500/60 uppercase [clip-path:polygon(0%_80%,100%_25%,100%_100%,0_100%)] translate-x-[1px] cursor-default select-none whitespace-nowrap"
                                >
                                    AI slideshows<span className="text-[#0a0a0c]">.</span>
                                </span>

                                {/* MASTER BLADE (Sharpened and Centered - Crimson Red) */}
                                <div
                                    className="absolute top-[48%] left-[-5%] w-[110%] h-[1.5px] lg:h-[3.4px] bg-[#c21a2e] -rotate-[5.1deg] transform -translate-y-1/2 z-10 mix-blend-screen [clip-path:polygon(0%_50%,2%_0%,98%_0%,100%_50%,98%_100%,2%_100%)]"
                                    style={{ filter: 'drop-shadow(0 0 12px rgba(194,26,46,0.8))' }}
                                ></div>
                            </div>
                        </div>
                    </h1>

                    {/* Sub Copy - Optimized for mobile readability with contrast and tracking */}
                    <p className="text-base sm:text-lg lg:text-2xl font-medium text-zinc-400 tracking-wider max-w-[40ch] mx-auto lg:mx-0 cursor-default select-none leading-relaxed">
                        Finally, <span className="text-white font-black">True Motion</span> Generation.<br className="hidden lg:block"/>
                        Don&#39;t settle for zooming images.
                    </p>

                    {/* CTA Button */}
                    <div className="pt-4">
                        <button
                            onClick={onClickGetStarted}
                            className="group flex items-center justify-center gap-3 px-8 py-3.5 sm:px-10 sm:py-4 bg-white text-black rounded-full font-bold text-base sm:text-xl transition-all duration-300 hover:scale-105 hover:bg-zinc-200 shadow-[0_0_40px_-15px_rgba(255,255,255,0.3)]"
                        >
                            <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-black" />
                            <span>Create Real Video</span>
                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* RIGHT: Visual Assets (Single DOM for both Mobile/Desktop) */}
                <div className="lg:col-span-6 flex flex-col order-2 w-full mt-8 lg:mt-0 min-h-[450px] lg:min-h-[600px] justify-center relative">
                    
                    {/* Unified Video Group */}
                    <div className="flex lg:relative overflow-x-auto lg:overflow-visible snap-x snap-mandatory hide-scrollbar gap-4 lg:gap-0 w-full pb-4 pt-2 lg:p-0 justify-center items-center lg:py-4 xl:py-10">
                        
                        {/* 1. Main Center Video (Priority) */}
                        <div className="snap-center shrink-0 w-[80%] max-w-[300px] lg:w-[55%] lg:max-w-[380px] xl:max-w-[420px] aspect-[9/16] relative z-30 shadow-[0_0_80px_-15px_rgba(255,255,255,0.15)] transition-transform duration-500 hover:scale-105 lg:order-2 ml-4 lg:ml-0">
                            <VideoCard
                                src={`${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_main_center.mp4`}
                                posterSrc="/preview/demo_main_center.webp"
                                lazyLoad={false}
                                className="w-full h-full border-white/20"
                                preload="auto"
                            />
                        </div>

                        {/* 2. Left Sub Video (Behind on Desktop, Swipe on Mobile) */}
                        <div className="snap-center shrink-0 w-[80%] max-w-[300px] lg:w-[32%] lg:max-w-[240px] aspect-[9/16] lg:absolute lg:left-0 lg:xl:left-[2%] z-10 lg:opacity-70 lg:hover:opacity-100 transition-all duration-500 lg:hover:z-40 lg:hover:-translate-y-2 lg:hover:scale-110 lg:drop-shadow-2xl lg:order-1 opacity-80">
                            <VideoCard
                                src={`${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_main_left.mp4`}
                                posterSrc="/preview/demo_main_left.webp"
                                lazyLoad={true}
                                preload="none"
                                threshold={0.5}
                                className="w-full h-full border-white/10"
                            />
                        </div>

                        {/* 3. Right Sub Video (Behind on Desktop, Swipe on Mobile) */}
                        <div className="snap-center shrink-0 w-[80%] max-w-[300px] aspect-[9/16] lg:w-[32%] lg:max-w-[240px] lg:absolute lg:right-0 lg:xl:right-[2%] z-10 lg:opacity-70 lg:hover:opacity-100 transition-all duration-500 lg:hover:z-40 lg:hover:-translate-y-2 lg:hover:scale-110 lg:drop-shadow-2xl lg:order-3 opacity-80 pr-4 lg:p-0">
                            <VideoCard
                                src={`${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_main_right.mp4`}
                                posterSrc="/preview/demo_main_right.webp"
                                lazyLoad={true}
                                preload="none"
                                threshold={0.5}
                                className="w-full h-full border-white/10"
                            />
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}

export default memo(HeroSection);
