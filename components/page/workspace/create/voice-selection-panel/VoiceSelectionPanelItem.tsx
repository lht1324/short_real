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
                return 'text-[11px] px-2 py-0.5 rounded border font-medium bg-sky-500/10 text-sky-400 border-sky-400/20';
            case 'red':
                return 'text-[11px] px-2 py-0.5 rounded border font-medium bg-rose-500/10 text-rose-400 border-rose-400/20';
            default:
                return 'text-[11px] px-2 py-0.5 rounded border font-medium bg-zinc-500/10 text-zinc-400 border-zinc-400/20';
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
                return 'text-[11px] px-2 py-0.5 rounded border font-medium bg-emerald-500/10 text-emerald-400 border-emerald-400/20';
            case 'purple':
                return 'text-[11px] px-2 py-0.5 rounded border font-medium bg-indigo-500/10 text-indigo-400 border-indigo-400/20';
            case 'orange':
                return 'text-[11px] px-2 py-0.5 rounded border font-medium bg-orange-500/10 text-orange-400 border-orange-400/20';
            default:
                return 'text-[11px] px-2 py-0.5 rounded border font-medium bg-zinc-500/10 text-zinc-400 border-zinc-400/20';
        }
    }, [voice.age]);

    return (
        <div
            onClick={() => onSelectVoice(voice.id)}
            className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                voice.id === selectedVoiceId
                    ? 'border-zinc-500 bg-zinc-800 shadow-sm'
                    : 'border-white/5 bg-black/20 hover:bg-white/5 hover:border-white/10'
            }`}
        >
            <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1.5">
                        {/* Voice Name */}
                        <div className={`font-medium text-[13px] flex items-center gap-2 ${
                            voice.id === selectedVoiceId ? 'text-zinc-100' : 'text-zinc-300'
                        }`}>
                            <span>{voice.name}</span>
                        </div>

                        {/* Description */}
                        {voice.description && (
                            <div className="text-zinc-500 text-xs line-clamp-2 pr-2">
                                {voice.description}
                            </div>
                        )}

                        {/* Tags */}
                        <div className="flex gap-1.5 flex-wrap mt-0.5">
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
                                <span className="text-[11px] px-2 py-0.5 rounded border font-medium bg-cyan-500/10 text-cyan-400 border-cyan-400/20">
                                    {accentText}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    className={`p-1.5 rounded-md transition-colors flex-shrink-0 ml-2 ${
                        playingSoundId === voice.id 
                            ? 'bg-zinc-200 text-black' 
                            : voice.id === selectedVoiceId
                                ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white'
                                : 'bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300'
                    }`}
                    onClick={(e) => {
                        onClickPlayAndPauseButton(e, voice.id, voice.previewUrl);
                    }}
                >
                    {playingSoundId === voice.id ? (
                        <Square size={14} fill="currentColor" />
                    ) : (
                        <Play size={14} fill="currentColor" className="ml-0.5" />
                    )}
                </button>
            </div>
        </div>
    )
}

export default memo(VoiceSelectionPanelItem);