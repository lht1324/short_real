'use client'

import { memo, useState, useRef, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Volume2, VolumeX, Sparkles, SlidersHorizontal } from "lucide-react";
import { SCRIPT_LINES } from "@/components/page/landing/data/comparisonScriptData";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

function ComparisonSectionMobile() {
    const [isAutoPlay, setIsAutoPlay] = useState(true);
    const [activePreset, setActivePreset] = useState<'slideshow' | 'split' | 'truemotion' | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const topLayerRef = useRef<HTMLDivElement>(null);
    const dividerRef = useRef<HTMLDivElement>(null);
    const badVideoRef = useRef<HTMLVideoElement>(null);
    const goodVideoRef = useRef<HTMLVideoElement>(null);
    const scriptRefs = useRef<(HTMLParagraphElement | null)[]>([]);

    const sliderPosRef = useRef(50);

    const updateSliderUI = (pos: number) => {
        sliderPosRef.current = pos;
        if (topLayerRef.current) {
            topLayerRef.current.style.clipPath = `inset(0 ${100 - pos}% 0 0)`;
            topLayerRef.current.style.webkitClipPath = `inset(0 ${100 - pos}% 0 0)`;
        }
        if (dividerRef.current) {
            dividerRef.current.style.transform = `translate3d(${pos * 3.1}px, 0, 0)`;
        }
    };

    const [isMuted, setIsMuted] = useState(true);

    // Viewport Intersection Observer for Dormant Sleep Engine & Lazy Video Source
    const { targetRef: sectionRef, isIntersecting, hasIntersected } = useIntersectionObserver(0.1);

    // Sync subtitle active index
    const activeIndexRef = useRef(0);

    // 60fps GPU Harmonic Oscillation Auto Ping-Pong (Zero React Re-render direct DOM updates)
    useEffect(() => {
        if (!isAutoPlay || !isIntersecting) return;

        let animationFrameId: number;
        let frameCount = 0;
        const startTime = Date.now();

        // 30fps 샘플링: 60fps rAF 루프에서 2프레임마다 1회 DOM 업데이트 (clip-path 페인트 부담 절반)
        const animate = () => {
            frameCount++;
            if (frameCount % 2 === 0) {
                const elapsed = (Date.now() - startTime) / 1000; // in seconds
                const sinVal = Math.sin((elapsed * Math.PI * 2) / 3.5);
                // Center is 50%, amplitude is 35% (ranges from 15% to 85%)
                const newPos = 50 + sinVal * 35;
                updateSliderUI(newPos);
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isAutoPlay, isIntersecting]);

    const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number>(0);

    // Video synchronization & Subtitle sync without memory leaks via native timeupdate
    useEffect(() => {
        const goodVideo = goodVideoRef.current;
        const badVideo = badVideoRef.current;
        if (!goodVideo) return;

        const onTimeUpdate = () => {
            const currentTime = goodVideo.currentTime;
            if (badVideo && Math.abs(goodVideo.currentTime - badVideo.currentTime) > 0.15) {
                badVideo.currentTime = goodVideo.currentTime;
            }

            const newIndex = SCRIPT_LINES.findIndex(
                line => currentTime >= line.start && currentTime < line.end
            );

            if (newIndex !== -1 && newIndex !== activeIndexRef.current) {
                activeIndexRef.current = newIndex;
                setActiveSubtitleIndex(newIndex);
            }
        };

        goodVideo.addEventListener("timeupdate", onTimeUpdate);
        return () => {
            goodVideo.removeEventListener("timeupdate", onTimeUpdate);
        };
    }, []);

    // Dormant Sleep for Video Media when scrolled out of viewport
    useEffect(() => {
        const goodVideo = goodVideoRef.current;
        const badVideo = badVideoRef.current;
        if (!goodVideo) return;

        if (isIntersecting) {
            goodVideo.play().catch(() => {});
            if (badVideo) badVideo.play().catch(() => {});
        } else {
            goodVideo.pause();
            if (badVideo) badVideo.pause();
        }
    }, [isIntersecting]);

    // Release Video Media Stream GPU Memory on Unmount
    useEffect(() => {
        const goodVideo = goodVideoRef.current;
        const badVideo = badVideoRef.current;
        return () => {
            if (goodVideo) {
                goodVideo.pause();
                goodVideo.removeAttribute('src');
                goodVideo.load();
            }
            if (badVideo) {
                badVideo.pause();
                badVideo.removeAttribute('src');
                badVideo.load();
            }
        };
    }, []);

    return (
        <section
            ref={sectionRef}
            id="comparison"
            className="relative py-12 px-4 overflow-hidden"
        >
            <div className="relative z-10">
                {/* Section Header */}
                <div className="mb-5 text-center">
                    <h2 className="text-3xl font-bold text-white tracking-tight mb-2 leading-tight">
                        Same Script.<br />
                        <span className="text-zinc-500">Different Reality.</span>
                    </h2>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                        See how True Motion transforms static slideshows in real-time.
                    </p>
                </div>

                {/* Split Viewfinder Frame (100% Native Vertical Scroll Pass-through) */}
                <div
                    ref={containerRef}
                    className="relative w-full max-w-[310px] mx-auto aspect-[9/16] rounded-3xl overflow-hidden border border-white/20 bg-black shadow-2xl select-none"
                >
                    {/* BOTTOM LAYER: TRUE MOTION (Good Video) */}
                    <div className="absolute inset-0 w-full h-full bg-black">
                        <video
                            ref={goodVideoRef}
                            src={hasIntersected ? `${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_good_example_low.mp4` : undefined}
                            poster="/preview/demo_good_example.webp"
                            preload={!hasIntersected ? "none" : "auto"}
                            className="w-full h-full object-cover opacity-100"
                            autoPlay
                            loop
                            muted={isMuted}
                            playsInline
                        />
                        <div className="absolute top-4 right-4 px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30 flex items-center gap-1 z-10">
                            <CheckCircle2 size={11} className="text-white" />
                            <span className="text-[9px] font-semibold text-white">TRUE MOTION</span>
                        </div>
                    </div>

                    {/* TOP LAYER: SLIDESHOW (GPU Hardware Accelerated clip-path: Zero Reflow, Zero CLS) */}
                    <div
                        ref={topLayerRef}
                        className={`absolute inset-0 w-full h-full overflow-hidden border-r-2 border-white/90 bg-black z-20 ${
                            isAutoPlay ? 'transition-none' : 'transition-all duration-300 ease-out'
                        }`}
                        style={{
                            clipPath: `inset(0 ${100 - sliderPosRef.current}% 0 0)`,
                            WebkitClipPath: `inset(0 ${100 - sliderPosRef.current}% 0 0)`
                        }}
                    >
                        <div className="absolute inset-0 w-[310px] h-full bg-black">
                            <video
                                ref={badVideoRef}
                                src={hasIntersected ? `${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_bad_example_low.mp4` : undefined}
                                poster="/preview/demo_bad_example.webp"
                                preload={!hasIntersected ? "none" : "auto"}
                                className="w-full h-full object-cover grayscale opacity-100"
                                autoPlay
                                loop
                                muted
                                playsInline
                            />
                        </div>
                        <div className="absolute top-4 left-4 px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-1">
                            <AlertTriangle size={11} className="text-amber-400" />
                            <span className="text-[9px] font-bold text-amber-400">SLIDESHOW</span>
                        </div>
                    </div>

                    {/* Anti-Slop Precision Laser Hairline Split Divider (GPU translate3d: Zero Reflow, Zero CLS) */}
                    <div
                        ref={dividerRef}
                        className={`absolute top-0 bottom-0 left-0 z-30 w-[1px] bg-white/90 pointer-events-none flex items-center justify-center ${
                            isAutoPlay ? 'transition-none' : 'transition-all duration-300 ease-out'
                        }`}
                        style={{
                            transform: `translate3d(${sliderPosRef.current * 3.1}px, 0, 0)`
                        }}
                    >
                        {/* Subtle Crisp Divider Center Marker */}
                        <div className="w-[3px] h-5 rounded-full bg-white border border-black/30 shadow-sm" />
                    </div>

                    {/* Mute Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMuted(!isMuted);
                        }}
                        className="absolute bottom-4 right-4 z-30 h-9 w-9 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 transition-transform"
                    >
                        {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                </div>

                {/* Taste Skill Monochromatic Apple-Style Segmented Control Panel */}
                <div className="max-w-[310px] mx-auto mt-4 space-y-2">
                    {/* Segmented Preset Switcher */}
                    <div className="p-1 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center justify-between gap-1 shadow-xl">
                        <button
                            onClick={() => {
                                setIsAutoPlay(false);
                                setActivePreset('slideshow');
                                updateSliderUI(100);
                            }}
                            className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 active:scale-[0.96] flex items-center justify-center gap-1.5 ${
                                activePreset === 'slideshow'
                                    ? 'bg-white text-black shadow-md'
                                    : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            <span>Slideshow</span>
                        </button>

                        <button
                            onClick={() => {
                                setIsAutoPlay(false);
                                setActivePreset('split');
                                updateSliderUI(50);
                            }}
                            className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 active:scale-[0.96] flex items-center justify-center gap-1.5 ${
                                activePreset === 'split'
                                    ? 'bg-white text-black shadow-md'
                                    : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            <span>50 : 50</span>
                        </button>

                        <button
                            onClick={() => {
                                setIsAutoPlay(false);
                                setActivePreset('truemotion');
                                updateSliderUI(0);
                            }}
                            className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 active:scale-[0.96] flex items-center justify-center gap-1.5 ${
                                activePreset === 'truemotion'
                                    ? 'bg-white text-black shadow-md'
                                    : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            <span>True Motion</span>
                        </button>
                    </div>

                    {/* Dedicated Auto Ping-Pong Toggle Control Bar */}
                    <button
                        onClick={() => {
                            const nextAuto = !isAutoPlay;
                            setIsAutoPlay(nextAuto);
                            if (nextAuto) {
                                setActivePreset(null);
                            }
                        }}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2 border ${
                            isAutoPlay
                                ? 'bg-white/15 text-white border-white/30 shadow-md'
                                : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
                        }`}
                    >
                        <Sparkles size={13} className={isAutoPlay ? 'text-white animate-pulse' : 'text-zinc-500'} />
                        <span className="tracking-wide uppercase text-[11px]">
                            {isAutoPlay ? 'Auto Motion Active' : 'Enable Auto Motion'}
                        </span>
                    </button>
                </div>

                {/* Subtitle Audio Lines */}
                <div className="max-w-xs mx-auto mt-4 p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                    {SCRIPT_LINES.map((line, idx) => (
                        <p
                            key={idx}
                            className={`text-xs transition-all duration-300 leading-relaxed ${
                                idx === activeSubtitleIndex
                                    ? 'text-white font-semibold'
                                    : 'text-zinc-500 font-medium'
                            }`}
                        >
                            {line.text}
                        </p>
                    ))}
                </div>

            </div>
        </section>
    );
}

export default memo(ComparisonSectionMobile);
