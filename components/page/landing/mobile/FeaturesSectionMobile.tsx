'use client'

import { memo, useState, useCallback, useRef } from "react";
import { FEATURES_DATA } from "@/components/page/landing/data/featuresData";
import { ArrowDown } from "lucide-react";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";

function FeaturesSectionMobile() {
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const activeFeature = FEATURES_DATA[activeIndex] || FEATURES_DATA[0];
    const Icon = activeFeature.icon;
    const headerHeight = useHeaderHeight(64);

    const touchStartYRef = useRef<number>(0);

    const onClickNext = useCallback(() => {
        if (activeIndex < FEATURES_DATA.length - 1) {
            setActiveIndex(prev => prev + 1);
        } else {
            // Escape to Comparison Section smoothly
            const comparisonEl = document.getElementById("comparison");
            if (comparisonEl) {
                const y = comparisonEl.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                window.scrollTo({ top: y, behavior: "smooth" });
            }
        }
    }, [activeIndex, headerHeight]);

    const onClickSelectFeature = useCallback((index: number) => {
        setActiveIndex(index);
    }, []);

    // Vertical Touch Swipe Gesture Handler for Video-to-Video Swapping
    const onTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartYRef.current = e.touches[0].clientY;
    }, []);

    const onTouchEnd = useCallback((e: React.TouchEvent) => {
        const touchEndY = e.changedTouches[0].clientY;
        const diffY = touchEndY - touchStartYRef.current;
        const threshold = 35; // 35px vertical swipe threshold

        if (diffY < -threshold) {
            // Swiped Up -> Move to Next Feature Video
            if (activeIndex < FEATURES_DATA.length - 1) {
                setActiveIndex(prev => prev + 1);
            }
        } else if (diffY > threshold) {
            // Swiped Down -> Move to Prev Feature Video
            if (activeIndex > 0) {
                setActiveIndex(prev => prev - 1);
            }
        }
    }, [activeIndex]);

    return (
        <section
            id="features"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            style={{ height: `calc(100dvh - ${headerHeight}px)` }}
            className="relative w-full bg-black overflow-hidden flex flex-col justify-between select-none snap-start snap-always touch-pan-x"
        >
            {/* 100% Unclipped Video Box with Letterbox/Pillarbox Fit */}
            <div className="relative w-full h-full flex items-center justify-center bg-black">
                <video
                    key={activeFeature.id}
                    src={activeFeature.videoSrc}
                    className="w-full h-full object-contain pointer-events-none transition-opacity duration-300"
                    autoPlay
                    loop
                    muted
                    playsInline
                />

                {/* Top Category Badge */}
                <div className="absolute top-4 inset-x-0 px-4 flex items-center justify-between z-10">
                    <div className="px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center gap-2">
                        <Icon size={14} className="text-white" />
                        <span className="text-xs font-black tracking-widest text-white uppercase">
                            {activeFeature.title} Engine
                        </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-white/50 tracking-widest uppercase">
                        {activeIndex + 1} / {FEATURES_DATA.length}
                    </span>
                </div>

                {/* Bottom Reel Caption & Skip Control Overlay */}
                <div className="absolute bottom-3 inset-x-0 px-4 z-10 space-y-2.5">
                    {/* Active Reel Caption */}
                    <div className="p-3.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 space-y-1">
                        <h3 className="text-xs xs:text-sm font-extrabold text-white leading-snug tracking-tight whitespace-pre-line">
                            {activeFeature.description}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Real Video Diffusion · 9:16 True Motion</span>
                        </div>
                    </div>

                    {/* 4-Feature Dot Indicator Bar & Skip Arrow */}
                    <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20">
                        {/* Dot Tabs */}
                        <div className="flex items-center gap-1.5 pl-1">
                            {FEATURES_DATA.map((feat, idx) => {
                                const isSelected = idx === activeIndex;
                                return (
                                    <button
                                        key={feat.id}
                                        onClick={() => onClickSelectFeature(idx)}
                                        className={`
                                            h-7 px-2.5 rounded-xl text-[10px] font-mono font-bold transition-all active:scale-95 flex items-center gap-1 border
                                            ${isSelected
                                                ? 'bg-white text-black border-white shadow-md'
                                                : 'bg-black/40 text-zinc-400 border-white/10 hover:text-white'}
                                        `}
                                    >
                                        <span>{feat.title}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Next Feature Skip Arrow Button */}
                        <button
                            onClick={onClickNext}
                            className="h-7 px-3 rounded-xl bg-white text-black font-bold text-[10px] flex items-center gap-1 active:scale-95 transition-transform shadow-lg shrink-0"
                        >
                            <span>{activeIndex < FEATURES_DATA.length - 1 ? "NEXT" : "ESCAPE"}</span>
                            <ArrowDown size={12} />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default memo(FeaturesSectionMobile);
