'use client'

import {memo, MouseEvent} from "react";
import {Play, Square} from "lucide-react";
import {VoiceProfile} from "@/components/page/landing/how-it-works-section/HowItWorksSection";
import {MotionDiv} from "@/components/public/framerMotion/Motion";

interface VoiceSelectionItemProps {
    voice: VoiceProfile;
    isSelected: boolean;
    isPlaying: boolean;
    onClickPlay: (e: MouseEvent, voice: VoiceProfile) => void;
    onSelectVoiceId: (voiceId: string) => void;
}

function VoiceSelectionItem({
    voice,
    isSelected,
    isPlaying,
    onClickPlay,
    onSelectVoiceId,
}: VoiceSelectionItemProps) {
    return (
        <div
            key={voice.id}
            onClick={() => {
                onSelectVoiceId(voice.id);
            }}
            className={`
                relative cursor-pointer p-4 rounded-xl border transition-all duration-300
                ${isSelected
                    ? 'bg-[#1a1a24] border-pink-500/50 shadow-[0_0_15px_-5px_rgba(236,72,153,0.15)]'
                    : 'bg-transparent border-white/5 hover:bg-white/5 hover:border-white/10'}
            `}
        >
            <div className="flex items-center justify-between relative z-10">
                <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <span className={`text-base font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                {voice.name}
                            </span>
                            {voice.uiDescriptive && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                    isSelected
                                        ? 'bg-pink-500/10 border-pink-500/30 text-pink-300'
                                        : 'bg-white/5 border-white/10 text-gray-500'
                                }`}>
                                    {voice.uiDescriptive}
                                </span>
                            )}
                        </div>

                        <button
                            onClick={(e) => onClickPlay(e, voice)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 hover:scale-110 active:scale-95 z-20 ${
                                isPlaying
                                    ? 'bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.5)]'
                                    : isSelected
                                        ? 'bg-pink-500 text-white hover:bg-pink-400'
                                        : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                            }`}
                        >
                            {isPlaying ? (
                                <Square size={12} fill="currentColor" />
                            ) : (
                                <Play size={12} fill="currentColor" className="ml-0.5" />
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-1">
                        {voice.uiTags.map(tag => (
                            <span key={tag} className="bg-white/5 px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                    </div>
                </div>
            </div>
            {isSelected && (
                <MotionDiv
                    layoutId="active-voice"
                    className="absolute inset-0 rounded-xl border border-pink-500/30 pointer-events-none"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
            )}
        </div>
    )
}

export default memo(VoiceSelectionItem);