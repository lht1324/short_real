'use client'

import { memo, useState, useCallback, useEffect, useRef } from "react";
import { FEATURES_DATA } from "@/components/page/landing/data/featuresData";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function FeaturesSectionMobile() {
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [dragOffset, setDragOffset] = useState<number>(0);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const headerHeight = useHeaderHeight(64);
    const sectionRef = useRef<HTMLElement>(null);
    const touchStartYRef = useRef<number>(0);
    const activeIndexRef = useRef<number>(0);

    useEffect(() => {
        activeIndexRef.current = activeIndex;
    }, [activeIndex]);

    // Step 1: Features Precision Pin Lock Engine with High Constant Buffer (4000px)
    useEffect(() => {
        const sectionEl = sectionRef.current;
        if (!sectionEl) return;

        const st = ScrollTrigger.create({
            trigger: sectionEl,
            start: `top top+=${headerHeight}`,
            end: "+=4000px",
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
        });

        return () => {
            st.kill();
        };
    }, [headerHeight]);

    // Step 2 & 3-A: 1:1 Touch Drag Tracking, Reels Snap & Option A Boundary Escape
    useEffect(() => {
        const sectionEl = sectionRef.current;
        if (!sectionEl) return;

        const onTouchStart = (e: TouchEvent) => {
            touchStartYRef.current = e.touches[0].clientY;
            setIsDragging(true);
            setDragOffset(0);
        };

        const onTouchMove = (e: TouchEvent) => {
            const currentY = e.touches[0].clientY;
            const diffY = touchStartYRef.current - currentY;
            setDragOffset(diffY);
        };

        const onTouchEnd = (e: TouchEvent) => {
            const touchEndY = e.changedTouches[0].clientY;
            const diffY = touchStartYRef.current - touchEndY;
            const currentIdx = activeIndexRef.current;

            setIsDragging(false);
            setDragOffset(0);

            // Minimum 30px swipe threshold
            if (Math.abs(diffY) > 30) {
                if (diffY > 0) {
                    // Swiped UP -> Go to NEXT reel or Escape Down (Option A)
                    if (currentIdx < FEATURES_DATA.length - 1) {
                        setActiveIndex(currentIdx + 1);
                    } else {
                        // Option A: Escape to Comparison Section
                        const comparisonEl = document.getElementById("comparison");
                        if (comparisonEl) {
                            const y = comparisonEl.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                            window.scrollTo({ top: y, behavior: 'smooth' });
                        }
                    }
                } else {
                    // Swiped DOWN -> Go to PREV reel or Escape Up (Option A)
                    if (currentIdx > 0) {
                        setActiveIndex(currentIdx - 1);
                    } else {
                        // Option A: Escape to Hero Section
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }
            }
        };

        sectionEl.addEventListener("touchstart", onTouchStart, { passive: true });
        sectionEl.addEventListener("touchmove", onTouchMove, { passive: true });
        sectionEl.addEventListener("touchend", onTouchEnd, { passive: true });

        return () => {
            sectionEl.removeEventListener("touchstart", onTouchStart);
            sectionEl.removeEventListener("touchmove", onTouchMove);
            sectionEl.removeEventListener("touchend", onTouchEnd);
        };
    }, [headerHeight]);

    const onClickNext = useCallback(() => {
        if (activeIndex < FEATURES_DATA.length - 1) {
            setActiveIndex(prev => prev + 1);
        } else {
            const comparisonEl = document.getElementById("comparison");
            if (comparisonEl) {
                const y = comparisonEl.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        }
    }, [activeIndex, headerHeight]);

    const onClickSelectFeature = useCallback((index: number) => {
        setActiveIndex(index);
    }, []);

    const activeFeature = FEATURES_DATA[activeIndex] || FEATURES_DATA[0];
    const Icon = activeFeature.icon;

    return (
        <section
            ref={sectionRef}
            id="features"
            style={{ height: `calc(100dvh - ${headerHeight}px)` }}
            className="relative w-full bg-black overflow-hidden flex flex-col justify-between select-none"
        >
            {/* Smooth 4-Video Vertical Sliding Rail Track with 1:1 Drag Offset */}
            <div className="relative w-full h-full bg-black overflow-hidden">
                <div
                    className={`w-full h-full flex flex-col ${
                        isDragging ? '' : 'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
                    }`}
                    style={{
                        transform: `translate3d(0, calc(-${activeIndex * 100}% - ${dragOffset}px), 0)`
                    }}
                >
                    {FEATURES_DATA.map((feat) => (
                        <div key={feat.id} className="relative w-full h-full shrink-0 flex items-center justify-center bg-black">
                            <video
                                src={feat.videoSrc}
                                className="w-full h-full object-contain pointer-events-none"
                                autoPlay
                                loop
                                muted
                                playsInline
                            />
                        </div>
                    ))}
                </div>

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

                    {/* 4-Feature Dot Indicator Bar & Skip Button Layer */}
                    <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20">
                        {/* Dot Indicator Buttons */}
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

                        {/* Next / Escape Arrow Button */}
                        <button
                            onClick={onClickNext}
                            className="h-7 px-3 rounded-xl bg-white text-black font-bold text-[10px] flex items-center gap-1 active:scale-95 transition-transform shadow-lg shrink-0"
                        >
                            <span>{activeIndex < FEATURES_DATA.length - 1 ? "NEXT" : "ESCAPE"}</span>
                            {activeIndex < FEATURES_DATA.length - 1 ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default memo(FeaturesSectionMobile);


