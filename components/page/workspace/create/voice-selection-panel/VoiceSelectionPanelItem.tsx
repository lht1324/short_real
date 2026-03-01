'use client'

import {memo, useMemo, MouseEvent} from "react";
import {Play, Square} from "lucide-react";
import {Voice} from "@/lib/api/types/eleven-labs/Voice";

enum VoiceGender {
    MALE = "Male",
    FEMALE = "Female",
    NEUTRAL = "Neutral",
}

enum VoiceAge {
    YOUNG = "Young",
    ADULT = "Adult",
    SENIOR = "Senior",
}

enum VoiceAccent {
    AMERICAN = "American",
    BRITISH = "British",
    AUSTRALIAN = "Australian",
    STANDARD = "Standard"
}

enum VoiceUseCase {
    SOCIAL_MEDIA = "Social Media",
    ADVERTISEMENT = "Advertisement",
    CHARACTERS = "Characters",
    CONVERSATIONAL = "Conversational",
    INFORMATIVE_EDUCATIONAL = "Informative Educational",
    NARRATIVE_STORY = "Narrative Story",
    ENTERTAINMENT = "Entertainment",
    OTHER = "Other",
}

interface VoiceSelectionPanelItemProps {
    voice: Voice;
    selectedVoiceId?: string;
    playingSoundId: string | null;
    onSelectVoice: (voiceId: string) => void;
    onClickPlayAndPauseButton: (e: MouseEvent, voiceId: string, voicePreviewUrl?: string) => void;
}

function VoiceSelectionPanelItem({
    voice,
    selectedVoiceId,
    playingSoundId,
    onSelectVoice,
    onClickPlayAndPauseButton,
}: VoiceSelectionPanelItemProps) {
    const genderText = useMemo(() => {
        switch (voice.gender) {
            case "male": return VoiceGender.MALE;
            case "female": return VoiceGender.FEMALE;
            default: return VoiceGender.NEUTRAL;
        }
    }, [voice.gender]);

    const ageText = useMemo(() => {
        switch (voice.age) {
            case "young": return VoiceAge.YOUNG;
            case "middle_aged": return VoiceAge.ADULT;
            default: return VoiceAge.SENIOR;
        }
    }, [voice.age]);

    const accentText = useMemo(() => {
        switch (voice.accent) {
            case 'american': return VoiceAccent.AMERICAN;
            case 'british': return VoiceAccent.BRITISH;
            case 'australian': return VoiceAccent.AUSTRALIAN;
            default: return VoiceAccent.STANDARD;
        }
    }, [voice.accent]);

    const useCaseText = useMemo(() => {
        switch (voice.useCase) {
            case "social_media": return VoiceUseCase.SOCIAL_MEDIA;
            case "advertisement": return VoiceUseCase.ADVERTISEMENT;
            case "characters": return VoiceUseCase.CHARACTERS;
            case "conversational": return VoiceUseCase.CONVERSATIONAL;
            case "informative_educational": return VoiceUseCase.INFORMATIVE_EDUCATIONAL;
            case "narrative_story": return VoiceUseCase.NARRATIVE_STORY;
            case "entertainment": return VoiceUseCase.ENTERTAINMENT;
            default: return VoiceUseCase.OTHER;
        }
    }, [voice.useCase]);

    // Voice 아이템 태그 클래스 생성 (동적 클래스 문제 해결)
    const genderTagClass = useMemo(() => {
        const getGenderColor = (gender?: string) => {
            switch (gender) {
                case "male": return "blue";
                case "female": return "red";
                case 'neutral': return "gray";
                default: return "gray";
            }
        }
        const color = getGenderColor(voice.gender);

        switch (color) {
            case 'blue':
                return 'text-xs px-2 py-1 rounded-full border font-medium bg-blue-500/20 text-blue-300 border-blue-400/30';
            case 'red':
                return 'text-xs px-2 py-1 rounded-full border font-medium bg-red-500/20 text-red-300 border-red-400/30';
            default:
                return 'text-xs px-2 py-1 rounded-full border font-medium bg-gray-500/20 text-gray-300 border-gray-400/30';
        }
    }, [voice.gender]);

    const ageTagClass = useMemo(() => {
        const getAgeColor = (age?: string) => {
            switch (age) {
                case "young": return "green";
                case "middle_aged": return "purple";
                case "old": return "orange";
                default: return "gray";
            }
        }
        const color = getAgeColor(voice.age);

        switch (color) {
            case 'green':
                return 'text-xs px-2 py-1 rounded-full border font-medium bg-green-500/20 text-green-300 border-green-400/30';
            case 'purple':
                return 'text-xs px-2 py-1 rounded-full border font-medium bg-purple-500/20 text-purple-300 border-purple-400/30';
            case 'orange':
                return 'text-xs px-2 py-1 rounded-full border font-medium bg-orange-500/20 text-orange-300 border-orange-400/30';
            default:
                return 'text-xs px-2 py-1 rounded-full border font-medium bg-gray-500/20 text-gray-300 border-gray-400/30';
        }
    }, [voice.age]);

    return (
        <div
            onClick={() => onSelectVoice(voice.id)}
            className={`pt-3 pr-3 pb-3 rounded-lg border transition-all text-left cursor-pointer ${
                voice.id === selectedVoiceId
                    ? 'border-pink-500 bg-pink-500/10'
                    : 'border-purple-500/30 bg-gray-800/30 hover:border-purple-400/50'
            }`}
        >
            <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1.5">
                        {/* Voice Name + Descriptive */}
                        <div className="pl-3 text-white font-medium text-base flex items-center gap-2">
                            <span>{voice.name}</span>
                            {/*{voice.descriptive && (*/}
                            {/*    <span className="text-purple-300 text-sm font-normal">*/}
                            {/*        • {voice.descriptive.charAt(0).toUpperCase() + voice.descriptive.slice(1)}*/}
                            {/*    </span>*/}
                            {/*)}*/}
                            {/*{voice.useCase && (*/}
                            {/*    <span className="text-purple-300 text-sm font-normal">*/}
                            {/*        • {useCaseText}*/}
                            {/*    </span>*/}
                            {/*)}*/}
                        </div>

                        {/* Description */}
                        {voice.description && (
                            <div className="pl-3 text-gray-400 text-sm">
                                {voice.description}
                            </div>
                        )}

                        {/* Tags */}
                        <div className="flex pl-2 gap-1.5 flex-wrap">
                            {voice.gender && (
                                <span className={genderTagClass}>
                                    {genderText}
                                </span>
                            )}
                            {voice.age && (
                                <span className={ageTagClass}>
                                    {ageText}
                                </span>
                            )}
                            {voice.accent && (
                                <span className="text-xs px-2 py-1 rounded-full border font-medium bg-cyan-500/20 text-cyan-300 border-cyan-400/30">
                                    {accentText}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    className="p-1.5 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors flex-shrink-0 ml-2"
                    onClick={(e) => {
                        onClickPlayAndPauseButton(e, voice.id, voice.previewUrl);
                    }}
                >
                    {playingSoundId === voice.id ? (
                        <Square size={14} className="text-white" />
                    ) : (
                        <Play size={14} className="text-white" />
                    )}
                </button>
            </div>
        </div>
    )
}

export default memo(VoiceSelectionPanelItem);