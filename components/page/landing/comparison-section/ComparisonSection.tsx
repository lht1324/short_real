'use client'

import { memo, useState, useRef, useEffect, useCallback } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";
import Video from 'next-video';

// 대본 데이터
const scriptLines = [
    { text: "A masterpiece carved not from stone, but from sheer will.", start: 0, end: 3.877 },
    { text: "Every fiber screams perfectly silent power.", start: 3.877, end: 7.372 },
    { text: "The back tells the story of a thousand heavy days.", start: 7.372, end: 10.077 },
    { text: "Focus remains absolute, unbroken by the burning pain.", start: 10.077, end: 13.688 },
    { text: "This is not just a body, it is a living trophy.", start: 13.688, end: 16.3 },
];

const TOTAL_DURATION = 17.5;

function ComparisonSection() {
    const badVideoRef = useRef<HTMLVideoElement>(null);
    const goodVideoRef = useRef<HTMLVideoElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const scriptRefs = useRef<(HTMLParagraphElement | null)[]>([]);

    // [최적화] requestAnimationFrame ID 관리용 Ref
    const rafRef = useRef<number | null>(null);

    // 로딩 및 재생 상태
    const [isBadReady, setIsBadReady] = useState(false);
    const [isGoodReady, setIsGoodReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    // 뮤트 상태
    const [isMuted, setIsMuted] = useState(true);

    // [성능 최적화] activeIndex를 상태가 아닌 ref로 관리하여 리렌더링 방지
    const activeIndexRef = useRef(0);

    // [최적화] 안전하게 루프를 멈추는 함수
    const stopLoop = useCallback(() => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    // [최적화] 탭 비활성화(백그라운드) 감지하여 재생/루프 중단
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopLoop();
                badVideoRef.current?.pause();
                goodVideoRef.current?.pause();
                setIsPlaying(false);
            } else {
                setIsBadReady(false);
                setIsGoodReady(false);
                badVideoRef.current?.load();
                goodVideoRef.current?.load();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            stopLoop();
        };
    }, [stopLoop]);

    // 1. 동시 재생 로직
    useEffect(() => {
        if (isBadReady && isGoodReady && !isPlaying) {
            const startTimeout = setTimeout(() => {
                if (!document.hidden && badVideoRef.current && goodVideoRef.current) {
                    Promise.all([
                        badVideoRef.current.play().catch(() => {}),
                        goodVideoRef.current.play().catch(() => {})
                    ]).then(() => {
                        setIsPlaying(true);
                    }).catch(e => console.warn("Playback failed", e));
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

    // 2. 싱크 루프 (고강도 성능 최적화: 직접 DOM 조작)
    useEffect(() => {
        if (!isPlaying) {
            stopLoop();
            return;
        }

        const updateLoop = () => {
            const mainVideo = goodVideoRef.current;
            const subVideo = badVideoRef.current;

            if (!mainVideo || !subVideo) {
                stopLoop();
                return;
            }

            const currentTime = mainVideo.currentTime;

            // [성능] 직접 DOM Ref를 조작하여 리액트 리렌더링 없이 프로그레스 바 업데이트
            if (progressRef.current) {
                const percent = Math.min((currentTime / TOTAL_DURATION) * 100, 100);
                progressRef.current.style.width = `${percent}%`;
            }

            // [성능] 텍스트 하이라이팅 직접 조작
            const newIndex = scriptLines.findIndex(
                line => currentTime >= line.start && currentTime < line.end
            );

            if (newIndex !== -1 && newIndex !== activeIndexRef.current) {
                const prevIndex = activeIndexRef.current;
                
                // 이전 엘리먼트 비활성화
                const prevEl = scriptRefs.current[prevIndex];
                if (prevEl) {
                    prevEl.style.color = '#71717a'; // zinc-400
                    prevEl.style.opacity = '0.8';
                    prevEl.style.transform = 'translateX(0)';
                }

                // 현재 엘리먼트 활성화
                const currEl = scriptRefs.current[newIndex];
                if (currEl) {
                    currEl.style.color = '#ffffff'; // white
                    currEl.style.opacity = '1';
                    currEl.style.transform = 'translateX(8px)';
                }

                activeIndexRef.current = newIndex;
            }

            // Sync Correction
            if (Math.abs(mainVideo.currentTime - subVideo.currentTime) > 0.15) {
                subVideo.currentTime = mainVideo.currentTime;
            }

            // Loop Logic
            if (currentTime >= TOTAL_DURATION || mainVideo.ended) {
                mainVideo.currentTime = 0;
                subVideo.currentTime = 0;
                mainVideo.play().catch(() => {});
                subVideo.play().catch(() => {});
            }

            rafRef.current = requestAnimationFrame(updateLoop);
        };

        rafRef.current = requestAnimationFrame(updateLoop);

        return () => stopLoop();
    }, [isPlaying, stopLoop]);

    useEffect(() => {
        if (badVideoRef.current) {
            badVideoRef.current.load();
        }
        if (goodVideoRef.current) {
            goodVideoRef.current.load();
        }
    }, []);

    return (
        <section
            id="comparison"
            className="relative py-24 md:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
        >
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center relative z-10">

                {/* LEFT: Editorial Text */}
                <div className="lg:col-span-5 flex flex-col justify-center order-2 lg:order-1">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-8 leading-[1.1]"
                    >
                        Same Script.<br/>
                        <span className="text-zinc-600">Different Reality.</span>
                    </motion.h2>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-5 text-lg md:text-xl font-medium leading-relaxed max-w-md mb-12"
                    >
                        {scriptLines.map((line, idx) => (
                            <p 
                                key={idx} 
                                ref={el => { scriptRefs.current[idx] = el; }}
                                style={{
                                    transition: 'all 0.5s ease',
                                    color: idx === 0 ? '#ffffff' : '#71717a',
                                    opacity: idx === 0 ? '1' : '0.8',
                                    transform: idx === 0 ? 'translateX(8px)' : 'translateX(0)'
                                }}
                            >
                                {line.text}
                            </p>
                        ))}
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center gap-6"
                    >
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
                        >
                            {isMuted ? (
                                <VolumeX size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
                            ) : (
                                <Volume2 size={18} className="text-white" />
                            )}
                            <span className={`text-sm font-bold tracking-wider ${isMuted ? 'text-zinc-400 group-hover:text-white' : 'text-white'}`}>
                                {isMuted ? "SOUND OFF" : "SOUND ON"}
                            </span>
                        </button>
                        
                        {/* Progress Line */}
                        <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden max-w-[200px]">
                            <div 
                                ref={progressRef}
                                className="h-full bg-white transition-all duration-75 ease-linear"
                                style={{ width: '0%' }}
                            />
                        </div>
                    </motion.div>
                </div>

                {/* RIGHT: Videos Comparison */}
                <div className="lg:col-span-7 grid grid-cols-2 gap-4 md:gap-6 order-1 lg:order-2">
                    
                    {/* BAD EXAMPLE */}
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden border border-white/5 bg-zinc-900 shadow-2xl"
                    >
                        {!isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                                <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
                            </div>
                        )}
                        <Video
                            ref={badVideoRef}
                            src={`${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_bad_example.mp4`}
                            className="w-full h-full object-cover grayscale opacity-80"
                            muted={true}
                            preload="auto"
                            onCanPlay={() => setIsBadReady(true)}
                            loop
                            playsInline
                            controls={false}
                        />
                        <div className="absolute top-4 md:top-6 left-4 md:left-6 px-3 py-1.5 bg-black/50 border border-white/10 rounded-full flex items-center gap-2 backdrop-blur-md z-30">
                            <AlertTriangle size={14} className="text-zinc-400" />
                            <span className="text-zinc-400 text-xs font-bold tracking-wider">SLIDESHOW</span>
                        </div>
                    </motion.div>

                    {/* GOOD EXAMPLE */}
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl scale-105 origin-bottom"
                    >
                        {!isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            </div>
                        )}
                        <Video
                            ref={goodVideoRef}
                            src={`${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_good_example.mp4`}
                            className="w-full h-full object-cover"
                            muted={isMuted}
                            preload="auto"
                            onCanPlay={() => setIsGoodReady(true)}
                            loop
                            playsInline
                            controls={false}
                        />
                        <div className="absolute top-4 md:top-6 left-4 md:left-6 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full flex items-center gap-2 backdrop-blur-md z-30">
                            <CheckCircle2 size={14} className="text-white" />
                            <span className="text-white text-xs font-bold tracking-wider">TRUE MOTION</span>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}

export default memo(ComparisonSection);
