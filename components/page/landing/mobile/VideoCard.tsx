'use client'

import { memo, useRef, useEffect } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

interface VideoCardProps {
    src: string;
    className?: string;
    isMuted?: boolean;
    posterSrc?: string;
    threshold?: number;
}

function VideoCard({
    src,
    className = "",
    isMuted = true,
    posterSrc,
    threshold = 0.1,
}: VideoCardProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Intersection Observer
    const { targetRef, isIntersecting, hasIntersected } = useIntersectionObserver(threshold);

    // 화면 진입/이탈 및 명시적 비디오 재생 제어
    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        if (isIntersecting) {
            videoEl.play().catch(() => {});
        } else {
            videoEl.pause();
        }
    }, [isIntersecting]);

    // Unmount 시 Video Media Buffer & GPU Decoder 완전 release
    useEffect(() => {
        const videoEl = videoRef.current;
        return () => {
            if (videoEl) {
                videoEl.pause();
                videoEl.removeAttribute('src');
                videoEl.load();
            }
        };
    }, []);

    // 동적 muted 상태 실시간 반영
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
        }
    }, [isMuted]);

    // lazyLoad가 true이면 화면에 한 번이라도 노출되었을 때만 src 할당
    const shouldLoad = hasIntersected;

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
                preload={"none"}
                className="w-full h-full object-cover transition-opacity duration-700 ease-in-out pointer-events-none"
            />

            {/* Overlay Gradient for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20" />
        </div>
    );
}

export default memo(VideoCard);