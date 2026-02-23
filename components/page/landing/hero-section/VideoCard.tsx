import {useRef, useState, MouseEvent, useCallback, memo, CSSProperties} from "react";
import {Volume2, VolumeX} from "lucide-react";
import {useVideoCleanup} from "@/hooks/videoHooks";

interface VideoCardProps {
    src: string;
    className: string;
    style?: CSSProperties;
    isRightSideCovered?: boolean;
}

function VideoCard({
    src,
    className,
    style,
    isRightSideCovered = false,
}: VideoCardProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isMuted, setIsMuted] = useState(true);

    const toggleMute = useCallback((e: MouseEvent) => {
        e.stopPropagation(); // 카드 클릭 이벤트와 겹치지 않게 방지
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted((prev) => !prev);
        }
    }, []);

    useVideoCleanup(videoRef);

    return (
        <div
            className={`absolute top-1/2 left-1/2 -translate-y-1/2 aspect-[9/16] rounded-xl border-2 shadow-2xl transition-all duration-500 ease-out hover:z-50 group ${className}`}
            style={style}
        >
            <video
                ref={videoRef}
                className="w-full h-full object-cover rounded-lg"
                src={src}
                preload="none"
                autoPlay
                muted={isMuted} // 상태에 따라 뮤트 토글
                loop
                playsInline
            />

            {/* 오버레이: 평소엔 안 보이다가 Hover, !isMuted 시에만 등장하는 소리 버튼 */}
            <button
                onClick={toggleMute}
                className={`absolute bottom-4 ${isRightSideCovered ? "left-4" : "right-4"} p-2 rounded-full bg-black/50 border border-white/20 text-white opacity-${isMuted ? 0 : 100} group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/80 backdrop-blur-md`}
            >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
        </div>
    );
}

export default memo(VideoCard);