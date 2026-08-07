'use client'

import { memo, useState, useCallback, useEffect, useRef } from "react";
import { FEATURES_DATA } from "@/components/page/landing/data/featuresData";
import { ArrowDown, ArrowUp, Volume2, VolumeX } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

gsap.registerPlugin(ScrollTrigger);

function FeaturesSection() {
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [isMuted, setIsMuted] = useState<boolean>(true);

    const [isPinned, setIsPinned] = useState<boolean>(false);
    const isPinnedRef = useRef<boolean>(false);

    // Viewport Intersection Observer for Lazy Video Source Loading (0B initial decoder footprint)
    const { targetRef: sectionRef, hasIntersected } = useIntersectionObserver(0.1);
    const overlayRef = useRef<HTMLDivElement>(null);
    const railTrackRef = useRef<HTMLDivElement>(null);

    const touchStartYRef = useRef<number>(0);
    const dragOffsetRef = useRef<number>(0);
    const activeIndexRef = useRef<number>(0);
    const lastWheelTimeRef = useRef<number>(0);
    const lastTransitionTimeRef = useRef<number>(0);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

    useEffect(() => {
        activeIndexRef.current = activeIndex;
    }, [activeIndex]);

    useEffect(() => {
        isPinnedRef.current = isPinned;
    }, [isPinned]);

    const onClickToggleMute = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMuted(prev => !prev);
    }, []);

    // Active Reel Video Playback & Mute Sync Controller (Viewport & Pin Aware - Remembers User Mute Preference)
    useEffect(() => {
        if (!hasIntersected) return;

        videoRefs.current.forEach((videoEl, idx) => {
            if (!videoEl) return;

            if (isPinned && idx === activeIndex) {
                // Features 섹션 고정 시: 유저가 설정한 isMuted 복원 및 재생
                videoEl.muted = isMuted;
                videoEl.play().catch(() => {});
            } else {
                // 이탈 시 또는 비활성 비디오: 음소거 & Pause 수면 모드
                videoEl.muted = true;
                videoEl.pause();
            }
        });
    }, [activeIndex, isMuted, hasIntersected, isPinned]);

    // Next Reel Forced Preload: 인덱스 이동 즉시 다음 영상 다운로드 강제 시작
    // (iOS Safari는 화면 밖 video 로드를 지연시키므로 명시적 load() 호출로 파이프라인 확보)
    useEffect(() => {
        if (!hasIntersected) return;
        const nextEl = videoRefs.current[activeIndex + 1];
        if (nextEl) {
            nextEl.load();
        }
    }, [activeIndex, hasIntersected]);

    // Step 1: Features Precision Pin Lock Engine with High Constant Buffer (6000px)
    useEffect(() => {
        const sectionEl = sectionRef.current;
        if (!sectionEl) return;

        const ctx = gsap.context(() => {
            ScrollTrigger.create({
                trigger: sectionEl,
                start: "top top",
                end: "+=6000px",
                pin: true,
                pinSpacing: true,
                anticipatePin: 1,
                onToggle: (self) => {
                    setIsPinned(self.isActive);
                },
            });
        }, sectionEl);

        return () => {
            ctx.revert();
        };
    }, []);

    // Boundary Escape Helper Functions
    const escapeToHero = useCallback(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const escapeToComparison = useCallback(() => {
        const comparisonEl = document.getElementById("comparison");
        if (comparisonEl) {
            const y = comparisonEl.getBoundingClientRect().top + window.pageYOffset - 64;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    }, []);

    // Step 2 & 3: Pure Swipe Event Data Controller (Zero Scroll when pinned, Direct DOM Motion + Debounce Lock)
    useEffect(() => {
        const overlayEl = overlayRef.current;
        if (!overlayEl) return;

        const onTouchStart = (e: TouchEvent) => {
            if (!isPinnedRef.current) return;
            touchStartYRef.current = e.touches[0].clientY;
            setIsDragging(true);
            dragOffsetRef.current = 0;
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!isPinnedRef.current) return;
            if (e.cancelable) {
                e.preventDefault();
            }
            const currentY = e.touches[0].clientY;
            let diffY = touchStartYRef.current - currentY;
            const currentIdx = activeIndexRef.current;

            // Apply elastic resistance only on boundaries (first & last card escapes)
            if ((currentIdx === 0 && diffY < 0) || (currentIdx === FEATURES_DATA.length - 1 && diffY > 0)) {
                diffY = diffY * 0.2; // 80% resistance
            }

            dragOffsetRef.current = diffY;

            // Direct DOM GPU transform (Zero React State Re-render)
            if (railTrackRef.current) {
                railTrackRef.current.style.transform = `translate3d(0, calc(-${currentIdx * 100}% - ${diffY}px), 0)`;
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (!isPinnedRef.current) return;
            const touchEndY = e.changedTouches[0].clientY;
            const diffY = touchStartYRef.current - touchEndY;
            const currentIdx = activeIndexRef.current;

            setIsDragging(false);
            dragOffsetRef.current = 0;

            // Minimum 30px swipe threshold
            if (Math.abs(diffY) > 30) {
                const now = Date.now();

                if (diffY > 0) {
                    // Swiped UP -> Next Reel UI or Escape to Comparison
                    if (currentIdx < FEATURES_DATA.length - 1) {
                        if (now - lastTransitionTimeRef.current < 300) return;
                        lastTransitionTimeRef.current = now;
                        const nextIdx = currentIdx + 1;
                        setActiveIndex(nextIdx);
                        if (railTrackRef.current) {
                            railTrackRef.current.style.transform = `translate3d(0, -${nextIdx * 100}%, 0)`;
                        }
                    } else {
                        // Only on last video (index 3) -> Escape to Comparison with clean reset
                        if (railTrackRef.current) {
                            railTrackRef.current.style.transform = `translate3d(0, -300%, 0)`;
                        }
                        escapeToComparison();
                    }
                } else {
                    // Swiped DOWN -> Prev Reel UI or Escape to Hero
                    if (currentIdx > 0) {
                        if (now - lastTransitionTimeRef.current < 300) return;
                        lastTransitionTimeRef.current = now;
                        const prevIdx = currentIdx - 1;
                        setActiveIndex(prevIdx);
                        if (railTrackRef.current) {
                            railTrackRef.current.style.transform = `translate3d(0, -${prevIdx * 100}%, 0)`;
                        }
                    } else {
                        // Only on first video (index 0) -> Escape to Hero with clean reset
                        if (railTrackRef.current) {
                            railTrackRef.current.style.transform = `translate3d(0, 0%, 0)`;
                        }
                        escapeToHero();
                    }
                }
            } else {
                // Under threshold: snap back to current index cleanly
                if (railTrackRef.current) {
                    railTrackRef.current.style.transform = `translate3d(0, -${currentIdx * 100}%, 0)`;
                }
            }
        };

        const onWheel = (e: WheelEvent) => {
            if (!isPinnedRef.current) return;
            // 100% Cancel Native Wheel Scroll only when pinned
            if (e.cancelable) {
                e.preventDefault();
            }

            const now = Date.now();
            if (now - lastWheelTimeRef.current < 300) return;
            if (now - lastTransitionTimeRef.current < 300) return;

            const deltaY = e.deltaY;
            if (Math.abs(deltaY) < 15) return;

            lastWheelTimeRef.current = now;
            lastTransitionTimeRef.current = now;
            const currentIdx = activeIndexRef.current;

            if (deltaY > 0) {
                // Scroll DOWN -> Next Reel UI or Escape to Comparison
                if (currentIdx < FEATURES_DATA.length - 1) {
                    const nextIdx = currentIdx + 1;
                    setActiveIndex(nextIdx);
                    if (railTrackRef.current) {
                        railTrackRef.current.style.transform = `translate3d(0, -${nextIdx * 100}%, 0)`;
                    }
                } else {
                    if (railTrackRef.current) {
                        railTrackRef.current.style.transform = `translate3d(0, -300%, 0)`;
                    }
                    escapeToComparison();
                }
            } else {
                // Scroll UP -> Prev Reel UI or Escape to Hero
                if (currentIdx > 0) {
                    const prevIdx = currentIdx - 1;
                    setActiveIndex(prevIdx);
                    if (railTrackRef.current) {
                        railTrackRef.current.style.transform = `translate3d(0, -${prevIdx * 100}%, 0)`;
                    }
                } else {
                    if (railTrackRef.current) {
                        railTrackRef.current.style.transform = `translate3d(0, 0%, 0)`;
                    }
                    escapeToHero();
                }
            }
        };

        // Attach non-passive native listeners to force e.preventDefault()
        overlayEl.addEventListener("touchstart", onTouchStart, { passive: true });
        overlayEl.addEventListener("touchmove", onTouchMove, { passive: false });
        overlayEl.addEventListener("touchend", onTouchEnd, { passive: true });
        overlayEl.addEventListener("wheel", onWheel, { passive: false });

        return () => {
            overlayEl.removeEventListener("touchstart", onTouchStart);
            overlayEl.removeEventListener("touchmove", onTouchMove);
            overlayEl.removeEventListener("touchend", onTouchEnd);
            overlayEl.removeEventListener("wheel", onWheel);
        };
    }, [escapeToComparison, escapeToHero]);

    // Next / Escape Button Callback
    const onClickNext = useCallback(() => {
        if (activeIndex < FEATURES_DATA.length - 1) {
            const nextIdx = activeIndex + 1;
            setActiveIndex(nextIdx);
            if (railTrackRef.current) {
                railTrackRef.current.style.transform = `translate3d(0, -${nextIdx * 100}%, 0)`;
            }
        } else {
            if (railTrackRef.current) {
                railTrackRef.current.style.transform = `translate3d(0, -300%, 0)`;
            }
            escapeToComparison();
        }
    }, [activeIndex, escapeToComparison]);

    const onClickSelectFeature = useCallback((index: number) => {
        setActiveIndex(index);
        if (railTrackRef.current) {
            railTrackRef.current.style.transform = `translate3d(0, -${index * 100}%, 0)`;
        }
    }, []);

    const activeFeature = FEATURES_DATA[activeIndex] || FEATURES_DATA[0];
    const Icon = activeFeature.icon;

    return (
        <section
            ref={sectionRef}
            id="features"
            className="relative w-full h-[100dvh] bg-black overflow-hidden flex flex-col justify-between select-none"
        >
            {/* Transparent Gesture Overlay (Active only when GSAP Pin is locked) */}
            <div
                ref={overlayRef}
                className={`absolute inset-0 z-20 ${
                    isPinned ? "pointer-events-auto touch-none cursor-grab active:cursor-grabbing" : "pointer-events-none"
                }`}
            />

            {/* Smooth 4-Video Vertical Sliding Rail Track with Direct DOM Drag Offset */}
            <div className="relative w-full h-full bg-black overflow-hidden">
                <div
                    ref={railTrackRef}
                    className={`w-full h-full flex flex-col ${
                        isDragging ? '' : 'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
                    }`}
                    style={{
                        transform: `translate3d(0, -${activeIndex * 100}%, 0)`
                    }}
                >
                    {FEATURES_DATA.map((feat, idx) => {
                        // Reels Preload Strategy: src는 ±1 범위로 유지(이전 복귀 시 캐시 재사용),
                        // preload="auto"는 현재+다음만 — 다음 영상은 스와이프 한 번 앞서 로드 완료되어 즉각 재생
                        const isNearby = Math.abs(idx - activeIndex) <= 1;
                        const isActiveOrNext = idx === activeIndex || idx === activeIndex + 1;
                        const shouldLoad = hasIntersected && isNearby;
                        return (
                            <div key={feat.id} className="relative w-full h-full shrink-0 flex items-center justify-center bg-black">
                                <video
                                    ref={(el) => { videoRefs.current[idx] = el; }}
                                    src={shouldLoad ? feat.videoSrc : undefined}
                                    poster={`/preview/demo_${feat.title.toLowerCase()}.webp`}
                                    preload={hasIntersected && isActiveOrNext ? "auto" : "none"}
                                    className="w-full h-full object-contain pointer-events-none"
                                    autoPlay
                                    loop
                                    muted={isMuted}
                                    playsInline
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Top Category Badge (Elevated to z-30) */}
                <div className="absolute top-4 inset-x-0 px-4 flex items-center justify-between z-30 pointer-events-none">
                    <div className="px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center gap-2 pointer-events-auto">
                        <Icon size={14} className="text-white" />
                        <span className="text-xs font-bold tracking-widest text-white uppercase">
                            {activeFeature.title} Engine
                        </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white/50 tracking-widest uppercase">
                        {activeIndex + 1} / {FEATURES_DATA.length}
                    </span>
                </div>

                {/* Bottom Reel Caption & Skip Control Overlay (Elevated to z-30 for Click Interactivity) */}
                <div className="absolute bottom-3 inset-x-0 px-4 z-30 space-y-2.5 pointer-events-none">
                    {/* Active Reel Caption with Integrated Right Mute Button */}
                    <div className="p-4 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-between gap-3 pointer-events-auto shadow-2xl">
                        <h3 className="text-sm xs:text-base font-semibold text-white leading-snug tracking-tight whitespace-pre-line min-w-0 flex-1">
                            {activeFeature.description}
                        </h3>

                        {/* Integrated Right Mute Button */}
                        <button
                            onClick={onClickToggleMute}
                            className="h-10 w-10 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 transition-all shadow-lg"
                        >
                            {isMuted ? (
                                <VolumeX size={18} className="text-zinc-400" />
                            ) : (
                                <Volume2 size={18} className="text-emerald-400 animate-pulse" />
                            )}
                        </button>
                    </div>

                    {/* 4-Feature Dot Indicator Bar & Skip Button Layer */}
                    <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 pointer-events-auto">
                        {/* Dot Indicator Buttons */}
                        <div className="flex items-center gap-1.5 px-1 overflow-x-auto no-scrollbar">
                            {FEATURES_DATA.map((feat, idx) => {
                                const isSelected = idx === activeIndex;
                                return (
                                    <button
                                        key={feat.id}
                                        onClick={() => onClickSelectFeature(idx)}
                                        className={`
                                            h-8 px-3 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 flex items-center gap-1 border whitespace-nowrap shrink-0
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
                            className="h-8 px-3.5 rounded-xl bg-white text-black font-bold text-xs flex items-center gap-1 active:scale-95 transition-transform shadow-lg shrink-0"
                        >
                            <span>{activeIndex < FEATURES_DATA.length - 1 ? "NEXT" : "ESCAPE"}</span>
                            {activeIndex < FEATURES_DATA.length - 1 ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default memo(FeaturesSection);;;


