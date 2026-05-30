import {memo, useCallback, useState, MouseEvent} from "react";
import {Volume2, VolumeX} from "lucide-react";
import {Feature} from "@/components/page/landing/features-section/FeaturesSection";
import Video from 'next-video';

function FeatureCard({ feature, index, className }: { feature: Feature, index: number, className?: string }) {
    const [isMuted, setIsMuted] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    // 소리 토글 핸들러
    const toggleMute = useCallback((e: MouseEvent) => {
        e.stopPropagation(); // 카드 클릭이나 다른 이벤트 전파 방지
        setIsMuted(!isMuted);
    }, [isMuted]);

    return (
        <div
            className={`group relative rounded-3xl overflow-hidden border border-white/10 bg-zinc-900/50 transition-all duration-500 hover:border-white/20 ${className || 'w-full h-full'}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* next-video optimized background */}
            <Video
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                src={feature.videoSrc}
                muted={isMuted}
                preload="auto"
                autoPlay
                loop
                playsInline
                controls={false}
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

            {/* Hover Overlay (Prompt Terminal) */}
            <div className={`absolute inset-0 bg-black/80 backdrop-blur-md p-6 md:p-8 flex flex-col justify-center transition-all duration-500 pointer-events-none z-20 ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <span className="text-xs font-mono text-zinc-500 mb-3 uppercase tracking-widest">
                    {"// Prompt Input"}
                </span>
                <p className="font-mono text-sm md:text-base text-zinc-300 leading-relaxed max-w-xl">
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
