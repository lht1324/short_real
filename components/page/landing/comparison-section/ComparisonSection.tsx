'use client'

import { memo, useState, useRef, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Terminal, Loader2, Volume2, VolumeX } from "lucide-react";
import TypeWriter from "@/components/page/landing/comparison-section/TypeWriter";

// 대본 데이터
const scriptLines = [
    { text: "A masterpiece carved not from stone, but from sheer will.", start: 0, end: 4.2 },
    { text: "Every fiber screams perfectly silent power.", start: 4.2, end: 8.1 },
    { text: "The back tells the story of a thousand heavy days.", start: 8.1, end: 11.3 },
    { text: "Focus remains absolute, unbroken by the burning pain.", start: 11.3, end: 14.6 },
    { text: "This is not just a body, it is a living trophy.", start: 14.6, end: 17.5 },
];

const TOTAL_DURATION = 17.5;

function ComparisonSection() {
    const badVideoRef = useRef<HTMLVideoElement>(null);
    const goodVideoRef = useRef<HTMLVideoElement>(null);

    // 로딩 및 재생 상태
    const [isBadReady, setIsBadReady] = useState(false);
    const [isGoodReady, setIsGoodReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    // 뮤트 상태
    const [isMuted, setIsMuted] = useState(true);

    const [currentLine, setCurrentLine] = useState(scriptLines[0].text);
    const [progress, setProgress] = useState(0);

    // 1. 동시 재생 로직
    useEffect(() => {
        if (isBadReady && isGoodReady && !isPlaying) {
            const startTimeout = setTimeout(() => {
                if (badVideoRef.current && goodVideoRef.current) {
                    Promise.all([
                        badVideoRef.current.play(),
                        goodVideoRef.current.play()
                    ]).then(() => {
                        setIsPlaying(true);
                    }).catch(e => console.error("Playback failed", e));
                }
            }, 500);
            return () => clearTimeout(startTimeout);
        }
    }, [isBadReady, isGoodReady, isPlaying]);

    // 뮤트 상태 변경 감지
    useEffect(() => {
        if (goodVideoRef.current) {
            goodVideoRef.current.muted = isMuted;
        }
    }, [isMuted]);

    // 2. 싱크 루프
    useEffect(() => {
        if (!isPlaying) return;

        const mainVideo = goodVideoRef.current;
        const subVideo = badVideoRef.current;
        if (!mainVideo || !subVideo) return;

        const updateLoop = () => {
            const currentTime = mainVideo.currentTime;

            const percent = Math.min((currentTime / TOTAL_DURATION) * 100, 100);
            setProgress(percent);

            const activeLine = scriptLines.find(
                line => currentTime >= line.start && currentTime < line.end
            );

            if (activeLine && activeLine.text !== currentLine) {
                setCurrentLine(activeLine.text);
            }

            if (Math.abs(mainVideo.currentTime - subVideo.currentTime) > 0.1) {
                subVideo.currentTime = mainVideo.currentTime;
            }

            if (currentTime >= TOTAL_DURATION || mainVideo.ended) {
                mainVideo.currentTime = 0;
                subVideo.currentTime = 0;
                mainVideo.play();
                subVideo.play();
            }

            requestAnimationFrame(updateLoop);
        };

        const animationFrame = requestAnimationFrame(updateLoop);
        return () => cancelAnimationFrame(animationFrame);
    }, [currentLine, isPlaying]);

    return (
        <section
            // [핵심 변경] bg-[#0b0b15] 제거 -> 투명 배경
            className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden"
        >
            {/* Header */}
            <div className="text-center mb-16 relative z-10">
                <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
                    Same Script. <br/>
                    <span className="bg-gradient-to-r from-red-500 to-cyan-500 bg-clip-text text-transparent">
                        Different Reality.
                    </span>
                </h2>
                <p className="text-gray-400 text-lg">
                    See how ShortReal interprets your story compared to others.
                </p>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">

                {/* 배경 연결선 */}
                <div className="hidden lg:block absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-red-900/50 via-gray-700 to-cyan-900/50 -z-10" />

                {/* --- LEFT: BAD EXAMPLE --- */}
                <div className="lg:col-span-4 flex flex-col items-center gap-4 order-2 lg:order-1">
                    <div className="relative w-[240px] sm:w-[280px] aspect-[9/16] rounded-2xl border-2 border-red-500/30 bg-gray-900 shadow-[0_0_40px_-10px_rgba(220,38,38,0.2)] overflow-hidden group">
                        {!isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                            </div>
                        )}
                        <video
                            ref={badVideoRef}
                            src="/demo/bad_example.mp4"
                            className="w-full h-full object-cover opacity-60 grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:opacity-100"
                            muted
                            loop
                            playsInline
                            onCanPlayThrough={() => setIsBadReady(true)}
                        />
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-950/80 border border-red-500/50 rounded-full flex items-center gap-2 backdrop-blur-md z-30">
                            <AlertTriangle size={12} className="text-red-500" />
                            <span className="text-red-400 text-xs font-bold tracking-wider">SLIDESHOW</span>
                        </div>
                    </div>
                </div>

                {/* --- CENTER: SCRIPT TERMINAL --- */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center order-1 lg:order-2 w-full">
                    <div className="relative w-full max-w-md p-1 rounded-xl bg-gradient-to-b from-gray-700 to-gray-900 shadow-2xl">
                        <div className="bg-[#050505] rounded-lg p-6 border border-white/10 min-h-[200px] flex flex-col justify-between relative overflow-hidden">

                            {/* Terminal Header & Mute Button */}
                            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                                <div className="flex items-center gap-2">
                                    <Terminal size={16} className="text-gray-500" />
                                    <span className="text-xs text-gray-500 font-mono">LIVE_NARRATION</span>
                                </div>

                                <button
                                    onClick={() => setIsMuted(!isMuted)}
                                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 transition-colors group"
                                >
                                    <span className={`text-[10px] font-bold tracking-wider ${isMuted ? 'text-gray-600' : 'text-cyan-500'}`}>
                                        {isMuted ? "SOUND OFF" : "SOUND ON"}
                                    </span>
                                    {isMuted ? (
                                        <VolumeX size={14} className="text-gray-600 group-hover:text-gray-400" />
                                    ) : (
                                        <Volume2 size={14} className="text-cyan-500 group-hover:text-cyan-400" />
                                    )}
                                </button>
                            </div>

                            {/* Typing Text Area */}
                            <div className="font-mono text-lg sm:text-xl text-white leading-relaxed min-h-[80px]">
                                <span className="text-gray-500 mr-2">&gt;</span>
                                {isPlaying ? (
                                    <TypeWriter text={currentLine} />
                                ) : (
                                    <span className="text-gray-500 animate-pulse">INITIALIZING SYSTEM...</span>
                                )}
                                <span className="animate-pulse text-cyan-500">_</span>
                            </div>

                            <div className="absolute bottom-0 left-0 h-1 bg-gray-800 w-full">
                                <div
                                    className="h-full bg-gradient-to-r from-red-500 via-purple-500 to-cyan-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        <div className="hidden lg:block absolute top-1/2 -left-3 w-3 h-3 bg-gray-500 rounded-full" />
                        <div className="hidden lg:block absolute top-1/2 -right-3 w-3 h-3 bg-gray-500 rounded-full" />
                    </div>
                </div>

                {/* --- RIGHT: GOOD EXAMPLE --- */}
                <div className="lg:col-span-4 flex flex-col items-center gap-4 order-3">
                    <div className="relative w-[240px] sm:w-[280px] aspect-[9/16] rounded-2xl border-2 border-cyan-500/50 bg-gray-900 shadow-[0_0_60px_-10px_rgba(6,182,212,0.4)] overflow-hidden transform scale-105 z-10">
                        {!isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                            </div>
                        )}
                        <video
                            ref={goodVideoRef}
                            src="/demo/good_example.mp4"
                            className="w-full h-full object-cover"
                            muted={isMuted}
                            loop
                            playsInline
                            onCanPlayThrough={() => setIsGoodReady(true)}
                        />
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-cyan-950/80 border border-cyan-500/50 rounded-full flex items-center gap-2 backdrop-blur-md z-30">
                            <CheckCircle2 size={12} className="text-cyan-400" />
                            <span className="text-cyan-400 text-xs font-bold tracking-wider">TRUE MOTION</span>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}

export default memo(ComparisonSection);