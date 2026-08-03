'use client'

import { memo, useState, useCallback, useRef } from "react";
import { Zap, ArrowRight, Volume2, VolumeX } from "lucide-react";
import VideoCard from "@/components/page/landing/hero-section/VideoCard";

type HeroVideoKey = "left" | "center" | "right";

interface HeroVideoItem {
    key: HeroVideoKey;
    src: string;
    poster: string;
    label: string;
}

const HERO_VIDEOS: HeroVideoItem[] = [
    {
        key: "left",
        src: `${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_main_left.mp4`,
        poster: "/preview/demo_main_left.webp",
        label: "Dynamic Physics"
    },
    {
        key: "center",
        src: `${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_main_center.mp4`,
        poster: "/preview/demo_main_center.webp",
        label: "True Motion Engine"
    },
    {
        key: "right",
        src: `${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_main_right.mp4`,
        poster: "/preview/demo_main_right.webp",
        label: "Cinematic Atmosphere"
    }
];

const ORDER: HeroVideoKey[] = ["left", "center", "right"];

function HeroSectionMobile() {
    const [focusedKey, setFocusedKey] = useState<HeroVideoKey>("center");
    const [isMuted, setIsMuted] = useState<boolean>(true);

    // Continuous Drag Progress State (0.0 = Left, 1.0 = Center, 2.0 = Right)
    const [dragProgress, setDragProgress] = useState<number | null>(null);
    const isDraggingRef = useRef<boolean>(false);
    const startXRef = useRef<number>(0);
    const startProgressRef = useRef<number>(1.0);

    const onClickGetStarted = useCallback(() => {
        const pricingEl = document.getElementById('pricing');
        if (pricingEl) {
            const y = pricingEl.getBoundingClientRect().top + window.pageYOffset - 60;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    }, []);

    const onClickCard = useCallback((key: HeroVideoKey) => {
        setFocusedKey(key);
    }, []);

    const onClickToggleMute = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMuted(prev => !prev);
    }, []);

    // Continuous Touch Drag & Snap Handlers
    const handleDragStart = useCallback((clientX: number) => {
        isDraggingRef.current = true;
        startXRef.current = clientX;
        startProgressRef.current = ORDER.indexOf(focusedKey);
        setDragProgress(startProgressRef.current);
    }, [focusedKey]);

    const handleDragMove = useCallback((clientX: number) => {
        if (!isDraggingRef.current) return;
        const diffX = clientX - startXRef.current;
        // Dragging left (negative diffX) increases progress towards 2.0 (right card)
        const progressDelta = - (diffX / 180); // 180px per full card transition
        const newProgress = Math.max(0, Math.min(2, startProgressRef.current + progressDelta));
        setDragProgress(newProgress);
    }, []);

    const handleDragEnd = useCallback(() => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;

        if (dragProgress !== null) {
            // Snap to closest integer card index (0, 1, or 2)
            const targetIndex = Math.round(dragProgress);
            setFocusedKey(ORDER[targetIndex]);
        }
        setDragProgress(null);
    }, [dragProgress]);

    // Active progress value (either continuous dragging value or discrete focused index)
    const currentProgress = dragProgress !== null ? dragProgress : ORDER.indexOf(focusedKey);

    return (
        <section className="relative pt-4 pb-8 px-4 overflow-hidden z-10 min-h-[82dvh] flex flex-col justify-center select-none">
            <div className="flex flex-col items-center text-center space-y-4 max-w-sm mx-auto w-full">
                
                {/* Mobile Headline */}
                <h1 className="relative leading-none flex flex-col items-center select-none pt-1">
                    <span className="block text-[3.4rem] xs:text-[3.8rem] font-black tracking-tighter text-white">
                        F*ck
                    </span>
                    <div className="relative mt-1 inline-block">
                        <div className="relative overflow-visible">
                            {/* UPPER SLICE */}
                            <span
                                className="block text-[2.5rem] xs:text-[2.8rem] font-black tracking-tighter text-zinc-500/80 uppercase [clip-path:polygon(0%_0%,100%_0%,100%_15%,0_70%)] whitespace-nowrap"
                                aria-hidden="true"
                            >
                                AI slideshows<span className="text-[#0a0a0c]">.</span>
                            </span>

                            {/* LOWER SLICE */}
                            <span 
                                className="absolute inset-0 text-[2.5rem] xs:text-[2.8rem] font-black tracking-tighter text-zinc-500/60 uppercase [clip-path:polygon(0%_80%,100%_25%,100%_100%,0_100%)] translate-x-[1px] whitespace-nowrap"
                            >
                                AI slideshows<span className="text-[#0a0a0c]">.</span>
                            </span>

                            {/* MASTER BLADE (Crimson Red) */}
                            <div
                                className="absolute top-[48%] left-[-5%] w-[110%] h-[2.5px] bg-[#c21a2e] -rotate-[5.1deg] transform -translate-y-1/2 z-10 mix-blend-screen [clip-path:polygon(0%_50%,2%_0%,98%_0%,100%_50%,98%_100%,2%_100%)]"
                                style={{ filter: 'drop-shadow(0 0 10px rgba(194,26,46,0.8))' }}
                            ></div>
                        </div>
                    </div>
                </h1>

                {/* Sub Copy */}
                <p className="text-xs font-medium text-zinc-400 tracking-wide max-w-[30ch] leading-relaxed">
                    Finally, <span className="text-white font-black">True Motion</span> Generation.<br />
                    Don&#39;t settle for zooming images.
                </p>

                {/* CTA Button */}
                <div className="pt-0.5">
                    <button
                        onClick={onClickGetStarted}
                        className="group h-10 px-5 bg-white text-black rounded-full font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_25px_-5px_rgba(255,255,255,0.3)]"
                    >
                        <Zap className="w-3.5 h-3.5 fill-black" />
                        <span>Create Real Video</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Continuous Drag & Snap Deck Layout Container */}
                <div 
                    onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
                    onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
                    onTouchEnd={handleDragEnd}
                    onMouseDown={(e) => handleDragStart(e.clientX)}
                    onMouseMove={(e) => handleDragMove(e.clientX)}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    className="w-full relative h-[360px] my-2 select-none flex items-center justify-center touch-pan-y cursor-grab active:cursor-grabbing"
                >
                    {HERO_VIDEOS.map((item, idx) => {
                        const isMain = item.key === focusedKey;

                        // Calculate relative card offset from continuous progress (idx: 0=left, 1=center, 2=right)
                        const offset = idx - currentProgress; // -2.0 to +2.0

                        // Dynamic interpolated styling based on continuous progress
                        const translateX = offset * 70; // 70px separation per card step
                        const translateY = Math.abs(offset) * 8; // subtle curve down
                        const rotate = offset * 7; // 7deg rotation per step
                        const scale = 1 - Math.abs(offset) * 0.1; // scale down side cards
                        const zIndex = Math.round(30 - Math.abs(offset) * 10);
                        const opacityVal = Math.max(0.4, 1 - Math.abs(offset) * 0.25);

                        return (
                            <div
                                key={item.key}
                                onClick={() => onClickCard(item.key)}
                                style={{
                                    zIndex,
                                    transform: `translate3d(${translateX}px, ${translateY}px, 0px) rotate(${rotate}deg) scale(${scale})`,
                                    opacity: opacityVal,
                                }}
                                className={`
                                    absolute w-[210px] aspect-[9/16] rounded-3xl overflow-hidden border ${dragProgress !== null ? 'transition-none' : 'transition-all duration-500 ease-out'} cursor-pointer bg-black ${isMain ? 'border-white/30 shadow-[0_10px_35px_rgba(0,0,0,0.8)]' : 'border-white/15'}
                                `}
                            >
                                <VideoCard
                                    src={item.src}
                                    posterSrc={item.poster}
                                    isMutedOverride={isMain ? isMuted : true}
                                    lazyLoad={!isMain}
                                    preload={isMain ? "auto" : "none"}
                                    className="w-full h-full object-cover pointer-events-none"
                                />

                                {/* Audio Mute/Unmute Control (Visible on Main Card) */}
                                {isMain && (
                                    <button
                                        onClick={onClickToggleMute}
                                        className="absolute top-3 right-3 z-30 h-8 w-8 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 shadow-lg"
                                    >
                                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}

export default memo(HeroSectionMobile);
