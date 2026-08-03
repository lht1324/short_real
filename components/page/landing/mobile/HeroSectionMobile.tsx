'use client'

import { memo, useState, useCallback, useRef } from "react";
import { Zap, ArrowRight, Volume2, VolumeX } from "lucide-react";
import VideoCard from "@/components/page/landing/hero-section/VideoCard";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";

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

function HeroSectionMobile() {
    const [focusedIndex, setFocusedIndex] = useState<number>(1); // 0: left, 1: center, 2: right
    const [dragProgress, setDragProgress] = useState<number>(1); // 0.0 ~ 2.0 continuous float
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isMuted, setIsMuted] = useState<boolean>(true);
    
    const headerHeight = useHeaderHeight(64);

    const startXRef = useRef<number>(0);
    const startProgressRef = useRef<number>(1);
    const containerWidthRef = useRef<number>(300);
    const touchContainerRef = useRef<HTMLDivElement>(null);

    const focusedKey = HERO_VIDEOS[focusedIndex]?.key || "center";

    const onClickGetStarted = useCallback(() => {
        const pricingEl = document.getElementById('pricing');
        if (pricingEl) {
            const y = pricingEl.getBoundingClientRect().top + window.pageYOffset - headerHeight;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    }, [headerHeight]);

    const onClickCard = useCallback((key: HeroVideoKey) => {
        const idx = HERO_VIDEOS.findIndex(v => v.key === key);
        if (idx !== -1) {
            setFocusedIndex(idx);
            setDragProgress(idx);
        }
    }, []);

    const onClickToggleMute = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMuted(prev => !prev);
    }, []);

    // Continuous 1:1 Drag Gesture Engine (Touch & Mouse)
    const handleDragStart = (clientX: number) => {
        setIsDragging(true);
        startXRef.current = clientX;
        startProgressRef.current = focusedIndex;
        if (touchContainerRef.current) {
            containerWidthRef.current = touchContainerRef.current.clientWidth || 300;
        }
    };

    const handleDragMove = (clientX: number) => {
        if (!isDragging) return;
        const deltaX = clientX - startXRef.current;
        // Dragging left (negative deltaX) advances progress forward (0 -> 1 -> 2)
        const progressDelta = -deltaX / (containerWidthRef.current * 0.55);
        const newProgress = Math.max(0, Math.min(2, startProgressRef.current + progressDelta));
        setDragProgress(newProgress);
    };

    const handleDragEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        // Snap cleanly to closest integer card index (0, 1, or 2)
        const targetIndex = Math.round(dragProgress);
        const boundedIndex = Math.max(0, Math.min(2, targetIndex));
        setFocusedIndex(boundedIndex);
        setDragProgress(boundedIndex);
    };

    // Touch Event Handlers
    const onTouchStart = (e: React.TouchEvent) => {
        handleDragStart(e.touches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        handleDragMove(e.touches[0].clientX);
    };

    const onTouchEnd = () => {
        handleDragEnd();
    };

    // Mouse Event Handlers for F12 Simulation
    const onMouseDown = (e: React.MouseEvent) => {
        handleDragStart(e.clientX);
    };

    const onMouseMove = (e: React.MouseEvent) => {
        handleDragMove(e.clientX);
    };

    const onMouseUp = () => {
        handleDragEnd();
    };

    const onMouseLeave = () => {
        if (isDragging) handleDragEnd();
    };

    // Continuous Interpolation Helper for 3D Transform
    const getCardStyle = (cardIndex: number) => {
        // cardIndex: 0 (left), 1 (center), 2 (right)
        // currentProgress: 0.0 ~ 2.0 continuous float
        const currentProg = isDragging ? dragProgress : focusedIndex;
        const relPos = cardIndex - currentProg; // relative offset float (-2.0 ~ 2.0)

        // Continuous Interpolation Math
        const translateX = relPos * 56; // px shift
        const translateY = Math.abs(relPos) * 3; // slight dip for background cards
        const rotate = relPos * 8; // deg rotation
        const scale = 1 - Math.abs(relPos) * 0.08; // scale decay
        const opacity = Math.max(0.4, 1 - Math.abs(relPos) * 0.25);
        const zIndex = Math.round(30 - Math.abs(relPos) * 10);

        return {
            transform: `translate3d(${translateX}px, ${translateY}px, 0) rotate(${rotate}deg) scale(${scale})`,
            opacity,
            zIndex,
            transition: isDragging ? "none" : "all 500ms cubic-bezier(0.16, 1, 0.3, 1)"
        };
    };

    return (
        <section
            style={{ height: `calc(100dvh - ${headerHeight}px)` }}
            className="relative w-full px-4 pt-1 pb-12 overflow-hidden z-10 flex flex-col justify-between items-center select-none snap-start snap-always"
        >
            {/* Top Headline & CTA Cluster (Compact Top Uplifted Scale) */}
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-1.5 max-w-sm mx-auto w-full pt-1">
                
                {/* Mobile Headline - 70% Width Grand Scale */}
                <h1 className="relative leading-none flex flex-col items-center select-none">
                    <span className="block text-[4.0rem] xs:text-[4.6rem] font-black tracking-tighter text-white drop-shadow-lg">
                        F*ck
                    </span>
                    <div className="relative mt-0.5 inline-block">
                        <div className="relative overflow-visible">
                            {/* UPPER SLICE */}
                            <span
                                className="block text-[2.9rem] xs:text-[3.3rem] font-black tracking-tighter text-zinc-400/90 uppercase [clip-path:polygon(0%_0%,100%_0%,100%_15%,0_70%)] whitespace-nowrap"
                                aria-hidden="true"
                            >
                                AI slideshows<span className="text-[#0a0a0c]">.</span>
                            </span>

                            {/* LOWER SLICE */}
                            <span 
                                className="absolute inset-0 text-[2.9rem] xs:text-[3.3rem] font-black tracking-tighter text-zinc-500/70 uppercase [clip-path:polygon(0%_80%,100%_25%,100%_100%,0_100%)] translate-x-[1px] whitespace-nowrap"
                            >
                                AI slideshows<span className="text-[#0a0a0c]">.</span>
                            </span>

                            {/* MASTER BLADE (Crimson Red) */}
                            <div
                                className="absolute top-[48%] left-[-5%] w-[110%] h-[3.5px] bg-[#c21a2e] -rotate-[5.1deg] transform -translate-y-1/2 z-10 mix-blend-screen [clip-path:polygon(0%_50%,2%_0%,98%_0%,100%_50%,98%_100%,2%_100%)]"
                                style={{ filter: 'drop-shadow(0 0 12px rgba(194,26,46,0.9))' }}
                            ></div>
                        </div>
                    </div>
                </h1>

                {/* Sub Copy */}
                <p className="text-xs xs:text-sm font-medium text-zinc-400 tracking-wide max-w-[32ch] leading-relaxed">
                    Finally, <span className="text-white font-black">True Motion</span> Generation.<br />
                    Don&#39;t settle for zooming images.
                </p>

                {/* CTA Button */}
                <div className="pt-0.5">
                    <button
                        onClick={onClickGetStarted}
                        className="group h-9 px-5 bg-white text-black rounded-full font-bold text-xs xs:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)]"
                    >
                        <Zap className="w-3.5 h-3.5 fill-black" />
                        <span>Create Real Video</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Linear Bounded Depth Stack Layout with Continuous 1:1 Drag Interpolation */}
            <div 
                ref={touchContainerRef}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseLeave}
                className="w-full relative h-[300px] mb-4 select-none flex items-center justify-center touch-pan-y shrink-0 cursor-grab active:cursor-grabbing"
            >
                {HERO_VIDEOS.map((item, idx) => {
                    const isMain = idx === focusedIndex;
                    const dynamicStyle = getCardStyle(idx);

                    return (
                        <div
                            key={item.key}
                            onClick={() => onClickCard(item.key)}
                            style={{
                                transform: dynamicStyle.transform,
                                opacity: dynamicStyle.opacity,
                                zIndex: dynamicStyle.zIndex,
                                transition: dynamicStyle.transition
                            }}
                            className={`
                                absolute w-[180px] aspect-[9/16] rounded-3xl overflow-hidden border cursor-pointer bg-black ${isMain ? 'border-white/30 shadow-[0_15px_40px_rgba(0,0,0,0.9)]' : 'border-white/10 hover:opacity-100'}
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
                                    className="absolute top-3 right-3 z-30 h-8 w-8 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 shadow-lg pointer-events-auto"
                                >
                                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export default memo(HeroSectionMobile);
