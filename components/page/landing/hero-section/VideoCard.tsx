'use client'

import {useState, MouseEvent, useCallback, memo, useRef, useEffect} from "react";
import {Volume2, VolumeX} from "lucide-react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

interface VideoCardProps {
    src: string;
    className?: string;
    isMutedOverride?: boolean;
    isLeftCard?: boolean;
    preload?: "auto" | "metadata" | "none";
    posterSrc?: string;
    lazyLoad?: boolean;
    threshold?: number;
}

function VideoCard({
    src,
    className = "",
    isMutedOverride,
    preload = "auto",
    posterSrc,
    isLeftCard,
    lazyLoad = false,
    threshold = 0.1,
}: VideoCardProps) {
    const [isMutedLocal, setIsMutedLocal] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    
    // Intersection Observer
    const { targetRef, isIntersecting, hasIntersected } = useIntersectionObserver(threshold);

    const isMuted = isMutedOverride !== undefined ? isMutedOverride : isMutedLocal;

    const toggleMute = useCallback((e: MouseEvent) => {
        e.stopPropagation();
        if (isMutedOverride === undefined) {
            setIsMutedLocal((prev) => !prev);
        }
    }, [isMutedOverride]);

    // 화면 진입/이탈 시 비디오 재생/일시정지 제어
    useEffect(() => {
        if (!lazyLoad || !videoRef.current) return;
        
        if (isIntersecting) {
            videoRef.current.play().catch(() => {});
        } else {
            videoRef.current.pause();
        }
    }, [isIntersecting, lazyLoad]);

    // 동적 muted 상태 실시간 반영
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
        }
    }, [isMuted]);

    // lazyLoad가 true이면 화면에 한 번이라도 노출되었을 때만 src 할당
    const shouldLoad = !lazyLoad || hasIntersected;
    
    // _low 영상 경로 생성 (UI에는 노출하지 않음)
    const lowResSrc = src.replace('.mp4', '_low.mp4');
    // 원본 영상 경로 생성
    const originalUrl = src.replace('_low.mp4', '.mp4');

    return (
        <div
            ref={targetRef}
            className={`relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl group w-full h-full ${className}`}
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

            <video
                ref={videoRef}
                src={shouldLoad ? lowResSrc : undefined}
                poster={posterSrc?.replace('.png', '.webp')}
                muted={isMuted}
                loop
                autoPlay
                playsInline
                preload={lazyLoad && !hasIntersected ? "none" : preload}
                className="w-full h-full object-cover transition-opacity duration-700 ease-in-out pointer-events-none"
            />

            {/* Overlay Gradient for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20" />


        </div>
    );
}

export default memo(VideoCard);
