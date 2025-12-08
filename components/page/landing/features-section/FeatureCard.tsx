'use client'

// 개별 기능 카드 컴포넌트
import {memo, useCallback, useEffect, useRef, useState, MouseEvent} from "react";
import {Volume2, VolumeX} from "lucide-react";
import {Feature} from "@/components/page/landing/features-section/FeaturesSection";
import {useVideoCleanup} from "@/hooks/videoHooks";

function FeatureCard({ feature, index }: { feature: Feature, index: number }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [typedText, setTypedText] = useState("");

    // 소리 토글 핸들러
    const toggleMute = useCallback((e: MouseEvent) => {
        e.stopPropagation(); // 카드 클릭이나 다른 이벤트 전파 방지
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(!isMuted);
        }
    }, [isMuted]);

    useVideoCleanup(videoRef);

    // 타이핑 효과 로직
    useEffect(() => {
        if (isHovered) {
            let i = 0;
            const typing = setInterval(() => {
                setTypedText(feature.prompt.substring(0, i + 1));
                i++;
                if (i === feature.prompt.length) clearInterval(typing);
            }, 15);
            return () => clearInterval(typing);
        } else {
            setTypedText("");
        }
    }, [isHovered, feature.prompt]);

    return (
        <div
            className={`group relative w-full aspect-[9/16] rounded-2xl overflow-hidden border-2 ${feature.color} bg-gray-900 transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 shadow-2xl`}
            style={{ animationDelay: `${index * 0.1}s` }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Video Background */}
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                src={feature.videoSrc}
                autoPlay
                muted={isMuted} // 상태 연결
                loop
                playsInline
            />

            {/* Default Label (Bottom) */}
            <div className={`absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent transition-transform duration-300 pointer-events-none z-10 ${isHovered ? 'translate-y-full' : 'translate-y-0'}`}>
                <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20`}>
                        <feature.icon size={20} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{feature.title}</h3>
                </div>
                <p className="text-gray-400 text-sm whitespace-pre-line">{feature.description}</p>
            </div>

            {/* Hover Overlay (Prompt Terminal) - z-index를 낮춰서 버튼 클릭 방해 안 하게 */}
            <div className={`absolute inset-0 bg-black/80 backdrop-blur-sm p-6 flex flex-col justify-center transition-opacity duration-300 pointer-events-none z-20 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-widest">
                    {"// Prompt Input"}
                </span>
                <p className="font-mono text-sm sm:text-base text-green-400 leading-relaxed">
                    &gt; {typedText}
                    <span className="animate-pulse">_</span>
                </p>
            </div>

            {/* Mute Button (Top Right) - z-index를 가장 높게(z-30) 설정하여 클릭 가능하게 */}
            <button
                onClick={toggleMute}
                className={`
                    absolute top-4 right-4 p-2 rounded-full 
                    bg-black/50 border border-white/20 text-white 
                    transition-all duration-300 hover:bg-black/80 backdrop-blur-md z-30
                    ${!isMuted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} 
                `}
            >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
        </div>
    );
}

export default memo(FeatureCard);