'use client'

import {useState, MouseEvent, useCallback, memo} from "react";
import {Volume2, VolumeX} from "lucide-react";
import Video from 'next-video';

interface VideoCardProps {
    src: string;
    className?: string;
    isMutedOverride?: boolean;
    preload?: "auto" | "metadata" | "none";
}

function VideoCard({
    src,
    className = "",
    isMutedOverride,
    preload = "auto",
}: VideoCardProps) {
    const [isMutedLocal, setIsMutedLocal] = useState(true);

    const isMuted = isMutedOverride !== undefined ? isMutedOverride : isMutedLocal;

    const toggleMute = useCallback((e: MouseEvent) => {
        e.stopPropagation();
        if (isMutedOverride === undefined) {
            setIsMutedLocal((prev) => !prev);
        }
    }, [isMutedOverride]);

    return (
        <div
            className={`relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl group w-full h-full ${className}`}
        >
            <Video
                src={src}
                muted={isMuted}
                loop
                autoPlay
                playsInline
                preload={preload}
                controls={false}
                className="w-full h-full object-cover"
            />

            {/* Overlay Gradient for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Mute Button */}
            <button
                onClick={toggleMute}
                className={`absolute bottom-4 right-4 p-2.5 rounded-full bg-black/50 border border-white/20 text-white opacity-${!isMuted ? 100 : 0} group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/80 hover:scale-105 backdrop-blur-md z-10`}
            >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
        </div>
    );
}

export default memo(VideoCard);
