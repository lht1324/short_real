import {memo, useCallback, useState, MouseEvent, useRef, useEffect} from "react";
import {Volume2, VolumeX} from "lucide-react";
import {Feature} from "./FeaturesSection";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

function FeatureCard({ feature, index, className }: { feature: Feature, index: number, className?: string }) {
    const [isMuted, setIsMuted] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    
    // Intersection Observer (10% 화면 노출 시 트리거)
    const { targetRef, isIntersecting, hasIntersected } = useIntersectionObserver(0.1);

    // 소리 토글 핸들러
    const toggleMute = useCallback((e: MouseEvent) => {
        e.stopPropagation(); // 카드 클릭이나 다른 이벤트 전파 방지
        setIsMuted(!isMuted);
    }, [isMuted]);

    // 화면 진입/이탈 시 재생 상태 제어
    useEffect(() => {
        if (!videoRef.current) return;
        
        if (isIntersecting) {
            videoRef.current.play().catch(() => {});
        } else {
            videoRef.current.pause();
        }
    }, [isIntersecting]);

    // 원본 영상 경로 생성
    const originalUrl = feature.videoSrc;

    return (
        <div
            ref={targetRef}
            className={`group relative rounded-3xl overflow-hidden border border-white/10 bg-zinc-900/50 transition-all duration-500 hover:border-white/20 ${className || 'w-full h-full'}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <a 
                href={originalUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="absolute inset-0 z-10 block cursor-default"
                onClick={(e) => e.preventDefault()}
            >
                <span className="sr-only">Open Original Resolution Video</span>
            </a>

            {/* native video optimized background with Lazy Loading */}
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out pointer-events-none"
                src={hasIntersected ? feature.videoSrc.replace('.mp4', '_low.mp4') : undefined}
                poster={`/preview/demo_${feature.title.toLowerCase()}.webp`}
                muted={isMuted}
                preload={!hasIntersected ? "none" : "auto"}
                autoPlay
                loop
                playsInline
            />

            {/* Default Label (Bottom) */}
            <div className={`absolute bottom-0 left-0 w-full p-6 md:p-8 bg-gradient-to-t from-black via-black/80 to-transparent transition-transform duration-500 pointer-events-none z-10 ${isHovered ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                        <feature.icon size={20} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">{feature.title}</h3>
                </div>
                <p className="text-zinc-400 text-sm md:text-base whitespace-pre-line max-w-sm">{feature.description}</p>
            </div>

            {/* Hover Overlay (Prompt Terminal - Subtitle Bar style) */}
            <div className={`absolute bottom-0 left-0 w-full bg-black/75 backdrop-blur-md p-6 border-t border-white/10 flex flex-col transition-all duration-500 pointer-events-none z-20 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
                <span className="text-[10px] font-mono text-zinc-500 mb-1.5 uppercase tracking-widest">
                    {"// Prompt Input"}
                </span>
                <p className="font-mono text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-xl">
                    &gt; {feature.prompt}
                    <span className="animate-pulse text-zinc-500 ml-1">_</span>
                </p>
            </div>

            {/* Mute Button */}
            <button
                onClick={toggleMute}
                className={`
                    absolute top-6 right-6 p-2.5 rounded-full 
                    bg-black/50 border border-white/10 text-white 
                    transition-all duration-300 hover:bg-black/80 hover:scale-105 backdrop-blur-md z-30
                    ${!isMuted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} 
                `}
            >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
        </div>
    );
}

export default memo(FeatureCard);
