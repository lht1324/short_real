'use client'

import {memo, MouseEvent, useCallback, useMemo} from "react";
import { Play, Square } from "lucide-react";
import {Voice, VoiceGender} from "@/api/types/deepgram/Voice";
import Image from "next/image";

interface VoiceSelectionPanelItemProps {
    voice: Voice;
    isSelected: boolean;
    isPlaying: boolean;
    onSelect: () => void;
    onTogglePlay: (e: MouseEvent, voiceId: string, voicePreviewUrl: string) => void;
}

function VoiceSelectionPanelItem({
    voice,
    isSelected,
    isPlaying,
    onSelect,
    onTogglePlay,
}: VoiceSelectionPanelItemProps) {
    const genderClassName = useMemo(() => {
        const basicAttr = "text-xs px-2 py-1 rounded-full border font-medium"

        switch (voice.gender) {
            case VoiceGender.MALE: return `${basicAttr} bg-blue-500/20 text-blue-300 border-blue-400/30`;
            case VoiceGender.FEMALE: return `${basicAttr} bg-red-500/20 text-red-300 border-red-400/30`;
            default: return `${basicAttr} bg-purple-500/20 text-purple-300 border-purple-400/30`;
        }
    }, [voice.gender]);

    const onClickPlayButton = useCallback((e: MouseEvent) => {
        onTogglePlay(e, voice.id, voice.previewUrl ?? "");
    }, [voice.id, voice.previewUrl, onTogglePlay]);

    return (
        <div
            onClick={onSelect}
            className={`p-4 rounded-lg border transition-all cursor-pointer
                ${isSelected
                    ? 'border-pink-500 bg-pink-500/10'
                    : 'border-purple-500/30 bg-gray-800/30 hover:border-purple-400/50'
                }
            `}
        >
            <div className="flex items-start gap-4">
                {/* Left: Image with colored border */}
                <div className="flex-shrink-0">
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
                        style={{
                            border: `3px solid ${voice.color || '#8B5CF6'}`,
                        }}
                    >
                        {voice.imageUrl ? (
                            <Image
                                src={voice.imageUrl}
                                alt={voice.name}
                                width={64}
                                height={64}
                                className="object-cover"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center text-white font-bold text-xl"
                                style={{ backgroundColor: voice.color || '#8B5CF6' }}
                            >
                                {voice.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Voice info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            {/* Name */}
                            <h3 className="text-white font-medium text-base mb-2 capitalize">
                                {voice.name}
                            </h3>

                            {/* Tags */}
                            {voice.tags && voice.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {voice.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Accent & Age & Gender */}
                            <div className="flex flex-wrap gap-1.5">
                                {voice.accent && (
                                    <span className="text-xs px-2 py-1 rounded-full border font-medium bg-pink-500/20 text-pink-300 border-pink-400/30">
                                        {voice.accent}
                                    </span>
                                )}
                                {voice.age && (
                                    <span className="text-xs px-2 py-1 rounded-full border font-medium bg-green-500/20 text-green-300 border-green-400/30">
                                        {voice.age}
                                    </span>
                                )}
                                {voice.gender && (
                                    <span className={genderClassName}>
                                        {voice.gender}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Play button */}
                        <button
                            onClick={onClickPlayButton}
                            className="p-1.5 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors flex-shrink-0"
                        >
                            {isPlaying ? (
                                <Square size={14} className="text-white" />
                            ) : (
                                <Play size={14} className="text-white" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(VoiceSelectionPanelItem);