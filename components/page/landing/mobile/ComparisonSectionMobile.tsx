'use client'

import { memo, useState, useRef, useEffect, useCallback } from "react";
import { AlertTriangle, CheckCircle2, Volume2, VolumeX, MoveHorizontal } from "lucide-react";
import { SCRIPT_LINES } from "@/components/page/landing/data/comparisonScriptData";

function ComparisonSectionMobile() {
    const [sliderPos, setSliderPos] = useState(50); // 0% ~ 100%
    const containerRef = useRef<HTMLDivElement>(null);
    const badVideoRef = useRef<HTMLVideoElement>(null);
    const goodVideoRef = useRef<HTMLVideoElement>(null);
    const scriptRefs = useRef<(HTMLParagraphElement | null)[]>([]);

    const [isMuted, setIsMuted] = useState(true);
    const [isDragging, setIsDragging] = useState(false);

    // Sync subtitle
    const activeIndexRef = useRef(0);

    const handleTouchMove = useCallback((clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        let percentage = (x / rect.width) * 100;
        if (percentage < 3) percentage = 0;
        if (percentage > 97) percentage = 100;
        setSliderPos(percentage);
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        handleTouchMove(e.touches[0].clientX);
    }, [handleTouchMove]);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (isDragging) {
            handleTouchMove(e.clientX);
        }
    }, [isDragging, handleTouchMove]);

    // Video synchronization
    useEffect(() => {
        const interval = setInterval(() => {
            const goodVideo = goodVideoRef.current;
            const badVideo = badVideoRef.current;
            if (!goodVideo || !badVideo) return;

            const currentTime = goodVideo.currentTime;
            if (Math.abs(goodVideo.currentTime - badVideo.currentTime) > 0.15) {
                badVideo.currentTime = goodVideo.currentTime;
            }

            const newIndex = SCRIPT_LINES.findIndex(
                line => currentTime >= line.start && currentTime < line.end
            );

            if (newIndex !== -1 && newIndex !== activeIndexRef.current) {
                const prevIndex = activeIndexRef.current;
                const prevEl = scriptRefs.current[prevIndex];
                if (prevEl) {
                    prevEl.style.color = '#71717a';
                    prevEl.style.fontWeight = '500';
                }

                const currEl = scriptRefs.current[newIndex];
                if (currEl) {
                    currEl.style.color = '#ffffff';
                    currEl.style.fontWeight = '800';
                }

                activeIndexRef.current = newIndex;
            }
        }, 150);

        return () => clearInterval(interval);
    }, []);

    return (
        <section id="comparison" className="relative py-12 px-4 overflow-hidden">
            <div className="relative z-10">
                {/* Header */}
                <div className="mb-5 text-center">
                    <h2 className="text-3xl font-black text-white tracking-tight mb-2 leading-tight">
                        Same Script.<br />
                        <span className="text-zinc-500">Different Reality.</span>
                    </h2>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                        Drag the handle to compare Slideshow vs True Motion in real-time.
                    </p>
                </div>

                {/* Interactive Split Viewfinder Frame (100% Opaque, 0% Ghosting) */}
                <div
                    ref={containerRef}
                    onTouchMove={onTouchMove}
                    onMouseMove={onMouseMove}
                    onMouseDown={() => setIsDragging(true)}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                    className="relative w-full max-w-[310px] mx-auto aspect-[9/16] rounded-3xl overflow-hidden border border-white/20 bg-black shadow-2xl select-none touch-none"
                >
                    {/* BOTTOM LAYER: TRUE MOTION (Good Video - 100% Opaque Full Color) */}
                    <div className="absolute inset-0 w-full h-full bg-black">
                        <video
                            ref={goodVideoRef}
                            src={`${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_good_example_low.mp4`}
                            poster="/preview/demo_good_example.webp"
                            className="w-full h-full object-cover opacity-100"
                            autoPlay
                            loop
                            muted={isMuted}
                            playsInline
                        />
                        <div className="absolute top-4 right-4 px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30 flex items-center gap-1 z-10">
                            <CheckCircle2 size={11} className="text-white" />
                            <span className="text-[9px] font-extrabold text-white">TRUE MOTION</span>
                        </div>
                    </div>

                    {/* TOP LAYER: SLIDESHOW (Bad Video - 100% Opaque Grayscale Opaque Layer) */}
                    <div
                        className="absolute inset-0 w-full h-full overflow-hidden border-r-2 border-white/90 bg-black z-20"
                        style={{ width: `${sliderPos}%` }}
                    >
                        <div className="absolute inset-0 w-[310px] h-full bg-black">
                            <video
                                ref={badVideoRef}
                                src={`${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_bad_example_low.mp4`}
                                poster="/preview/demo_bad_example.webp"
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

                    {/* DRAGGABLE SPLIT HANDLE */}
                    <div
                        className="absolute top-1/2 z-30 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white text-black shadow-2xl flex items-center justify-center cursor-ew-resize active:scale-110 transition-transform"
                        style={{ left: `${sliderPos}%` }}
                    >
                        <MoveHorizontal size={18} />
                    </div>

                    {/* Mute Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMuted(!isMuted);
                        }}
                        className="absolute bottom-4 right-4 z-30 h-9 w-9 rounded-full bg-black/70 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95"
                    >
                        {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                </div>

                {/* Quick Touch Presets */}
                <div className="flex justify-center gap-3 mt-3">
                    <button
                        onClick={() => setSliderPos(100)}
                        className="text-[11px] font-bold text-zinc-400 underline decoration-zinc-600 underline-offset-4"
                    >
                        Full Slideshow
                    </button>
                    <span className="text-zinc-600">·</span>
                    <button
                        onClick={() => setSliderPos(50)}
                        className="text-[11px] font-bold text-white underline decoration-white underline-offset-4"
                    >
                        50/50 Split
                    </button>
                    <span className="text-zinc-600">·</span>
                    <button
                        onClick={() => setSliderPos(0)}
                        className="text-[11px] font-bold text-zinc-400 underline decoration-zinc-600 underline-offset-4"
                    >
                        Full True Motion
                    </button>
                </div>

                {/* Subtitle Audio Lines */}
                <div className="max-w-xs mx-auto mt-4 p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                    {SCRIPT_LINES.map((line, idx) => (
                        <p
                            key={idx}
                            ref={el => { scriptRefs.current[idx] = el; }}
                            className="text-xs transition-all duration-300 text-zinc-500 font-medium leading-relaxed"
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
