'use client'

import {memo, MouseEvent, useCallback, useEffect, useMemo, useState} from "react";
import {Voice, VoiceGender} from "@/api/types/deepgram/Voice";
import {voiceClientAPI} from "@/api/client/voiceClientAPI";
import VoiceSelectionPanelItem from "@/components/page/workspace/create/VoiceSelectionPanelItem";

interface VoiceSelectionPanelProps {
    selectedVoiceId?: string;
    onSelectVoice: (voiceId: string) => void;
    onChangeIsLoading: (isVoiceLoading: boolean) => void;
}

function VoiceSelectionPanel({
    selectedVoiceId,
    onSelectVoice,
    onChangeIsLoading,
}: VoiceSelectionPanelProps) {
    const [voiceList, setVoiceList] = useState<Voice[]>([]);
    const [accentTagRecord, setAccentTagRecord] = useState<Record<string, boolean>>({});
    const [ageTagRecord, setAgeTagRecord] = useState<Record<string, boolean>>({});
    const [genderTagRecord, setGenderTagRecord] = useState<Record<string, boolean>>({});

    const isAllTagSelected = useMemo(() => {
        return Object.values(accentTagRecord).every((isTagSelected) => isTagSelected) &&
            Object.values(ageTagRecord).every((isTagSelected) => isTagSelected) &&
            Object.values(genderTagRecord).every((isTagSelected) => isTagSelected);
    }, [accentTagRecord, ageTagRecord, genderTagRecord]);

    const filteredVoiceList = useMemo(() => {
        const anyAccentSelected = Object.values(accentTagRecord).some(v => v);
        const anyAgeSelected = Object.values(ageTagRecord).some(v => v);
        const anyGenderSelected = Object.values(genderTagRecord).some(v => v);

        return voiceList.filter((voice) => {
            // 선택된 voice는 항상 표시
            if (selectedVoiceId === voice.id && (!anyAccentSelected && !anyAgeSelected && !anyGenderSelected)) {
                return true;
            }

            // 필터가 모두 비활성화되어 있으면 숨김
            if (!anyAccentSelected && !anyAgeSelected && !anyGenderSelected) {
                return false;
            }

            const isEnabledAccent = anyAccentSelected
                ? accentTagRecord[voice.accent]
                : true;
            const isEnabledAge = anyAgeSelected
                ? ageTagRecord[voice.age]
                : true;
            const isEnabledGender = anyGenderSelected
                ? genderTagRecord[voice.gender]
                : true;

            return isEnabledAccent && isEnabledAge && isEnabledGender;
        });
    }, [selectedVoiceId, voiceList, accentTagRecord, ageTagRecord, genderTagRecord]);

    // Audio state management
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);

    const onToggleAccentTag = useCallback((tagName: string) => {
        setAccentTagRecord(prev => ({
            ...prev,
            [tagName]: !prev[tagName]
        }));
    }, []);

    const onToggleAgeTag = useCallback((tagName: string) => {
        setAgeTagRecord(prev => ({
            ...prev,
            [tagName]: !prev[tagName]
        }));
    }, []);

    const onToggleGenderTag = useCallback((tagName: string) => {
        setGenderTagRecord(prev => ({
            ...prev,
            [tagName]: !prev[tagName]
        }));
    }, []);

    const onClickSelectAllTag = useCallback(() => {
        setAccentTagRecord((prev) => {
            const newRecord: Record<string, boolean> = {};
            Object.keys(prev).forEach((tagName) => {
                newRecord[tagName] = !isAllTagSelected;
            });
            return newRecord;
        });
        setAgeTagRecord((prev) => {
            const newRecord: Record<string, boolean> = {};
            Object.keys(prev).forEach((tagName) => {
                newRecord[tagName] = !isAllTagSelected;
            });
            return newRecord;
        });
        setGenderTagRecord((prev) => {
            const newRecord: Record<string, boolean> = {};
            Object.keys(prev).forEach((tagName) => {
                newRecord[tagName] = !isAllTagSelected;
            });
            return newRecord;
        });
    }, [isAllTagSelected]);

    const onClickPlaySoundPreview = useCallback((soundId: string, soundPreviewUrl?: string) => {
        // 음성 재생 중 다른 음성 재생
        if (playingSoundId !== soundId && currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            setCurrentAudio(null);
            setPlayingSoundId(null);
        }

        // 새로운 음성 재생
        if (soundPreviewUrl) {
            const audio = new Audio(soundPreviewUrl);

            audio.addEventListener('ended', () => {
                setCurrentAudio((current) => {
                    if (current === audio) {
                        setPlayingSoundId(null);
                        return null;
                    }
                    return current;
                });
            });

            audio.addEventListener('error', (error) => {
                console.error('Audio playback error:', error);
                setCurrentAudio((current) => {
                    if (current === audio) {
                        setPlayingSoundId(null);
                        return null;
                    }
                    return current;
                });
            });

            audio.play().then(() => {
                setCurrentAudio(audio);
                setPlayingSoundId(soundId);
            }).catch((error) => {
                console.error('Failed to play audio:', error);
                setCurrentAudio(null);
                setPlayingSoundId(null);
            });
        } else {
            console.log('No preview URL available for:', soundId);
        }
    }, [currentAudio, playingSoundId]);

    const onClickStopSoundPreview = useCallback(() => {
        currentAudio?.pause();
        setCurrentAudio(null);
        setPlayingSoundId(null);
    }, [currentAudio]);

    const onTogglePlay = useCallback((e: MouseEvent, voiceId: string, voicePreviewUrl: string) => {
        e.stopPropagation();

        if (!currentAudio || playingSoundId !== voiceId) {
            onClickPlaySoundPreview(voiceId, voicePreviewUrl);
        } else {
            onClickStopSoundPreview();
        }
    }, [currentAudio, playingSoundId, onClickPlaySoundPreview, onClickStopSoundPreview]);

    useEffect(() => {
        const loadData = async () => {
            const voiceDataList = await voiceClientAPI.getVoices();

            // accent와 age 값들을 수집
            const accentTags = new Set<string>();
            const ageTags = new Set<string>();
            const genderTags = new Set<string>();

            voiceDataList.forEach((voiceData) => {
                if (voiceData.accent) {
                    accentTags.add(voiceData.accent);
                }
                if (voiceData.age) {
                    ageTags.add(voiceData.age);
                }
                if (voiceData.gender) {
                    genderTags.add(voiceData.gender);
                }
            });

            const uniqueAccentTagRecord: Record<string, boolean> = {};
            const uniqueAgeTagRecord: Record<string, boolean> = {};
            const uniqueGenderTagRecord: Record<string, boolean> = {};

            Array.from(accentTags).forEach((accentTag) => {
                uniqueAccentTagRecord[accentTag] = true;
            });

            Array.from(ageTags).forEach((ageTag) => {
                uniqueAgeTagRecord[ageTag] = true;
            });

            Array.from(genderTags).forEach((genderTag) => {
                uniqueGenderTagRecord[genderTag] = true;
            });

            setVoiceList(voiceDataList);
            setAccentTagRecord(uniqueAccentTagRecord);
            setAgeTagRecord(uniqueAgeTagRecord);
            setGenderTagRecord(uniqueGenderTagRecord);
            onChangeIsLoading(false);
        };

        loadData().then();
    }, [onChangeIsLoading]);

    // 컴포넌트 언마운트 시 오디오 정리
    useEffect(() => {
        return () => {
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
                setCurrentAudio(null);
                setPlayingSoundId(null);
            }
        };
    }, [currentAudio]);

    return (
        <div className="flex-[2.7] bg-gray-900/30 backdrop-blur-sm border-r border-purple-500/20 overflow-y-auto">
            <div className="p-6 flex flex-col gap-4">
                <h2 className="text-xl font-semibold text-purple-300">Voice</h2>

                {/* Voice Filters */}
                <div className="flex flex-col gap-4">
                    {/* Select All Button */}
                    <button
                        onClick={onClickSelectAllTag}
                        className={`px-3 py-1.5 rounded-lg border font-medium transition-all text-sm ${
                            isAllTagSelected
                                ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-purple-300 border-purple-400/30'
                                : 'bg-gray-800/30 text-gray-400 border-purple-500/30 hover:border-purple-400/50'
                        }`}
                    >
                        Select All
                    </button>

                    {/* Accent Filter */}
                    <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-medium text-purple-300">Accent</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(accentTagRecord).sort((a, b) => {
                                return a.localeCompare(b);
                            }).map((tagName) => {
                                const isActive = accentTagRecord[tagName];
                                return (
                                    <button
                                        key={tagName}
                                        onClick={() => onToggleAccentTag(tagName)}
                                        className={`text-xs px-2 py-1 rounded-full border font-medium transition-all ${
                                            isActive
                                                ? 'bg-pink-500/20 text-pink-300 border-pink-400/30'
                                                : 'bg-gray-800/30 text-gray-400 border-purple-500/30 hover:border-purple-400/50'
                                        }`}
                                    >
                                        {tagName}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Age Filter */}
                    <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-medium text-purple-300">Age</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(ageTagRecord).sort((a, b) => {
                                return a.localeCompare(b);
                            }).map((tagName) => {
                                const isActive = ageTagRecord[tagName];
                                return (
                                    <button
                                        key={tagName}
                                        onClick={() => onToggleAgeTag(tagName)}
                                        className={`text-xs px-2 py-1 rounded-full border font-medium transition-all ${
                                            isActive
                                                ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                                                : 'bg-gray-800/30 text-gray-400 border-purple-500/30 hover:border-purple-400/50'
                                        }`}
                                    >
                                        {tagName}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Gender Filter */}
                    <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-medium text-purple-300">Gender</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(genderTagRecord).sort((a, b) => {
                                return a.localeCompare(b);
                            }).map((tagName) => {
                                const isActive = genderTagRecord[tagName];
                                const isMale = tagName === VoiceGender.MALE;
                                const isFemale = tagName === VoiceGender.FEMALE;

                                // 활성 상태일 때 성별에 따라 색상 분리
                                let activeClass = '';
                                if (isActive) {
                                    if (isMale) {
                                        activeClass = 'bg-blue-500/20 text-blue-300 border-blue-400/30';
                                    } else if (isFemale) {
                                        activeClass = 'bg-red-500/20 text-red-300 border-red-400/30';
                                    } else {
                                        activeClass = 'bg-purple-500/20 text-purple-300 border-purple-400/30';
                                    }
                                }

                                return (
                                    <button
                                        key={tagName}
                                        onClick={() => onToggleGenderTag(tagName)}
                                        className={`text-xs px-2 py-1 rounded-full border font-medium transition-all ${
                                            isActive
                                                ? activeClass
                                                : 'bg-gray-800/30 text-gray-400 border-purple-500/30 hover:border-purple-400/50'
                                        }`}
                                    >
                                        {tagName}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Voice Selection */}
                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                    <div className="flex flex-col gap-3">
                        {filteredVoiceList.map((voice) => (
                            <VoiceSelectionPanelItem
                                key={voice.id}
                                voice={voice}
                                isSelected={voice.id === selectedVoiceId}
                                isPlaying={playingSoundId === voice.id}
                                onSelect={() => onSelectVoice(voice.id)}
                                onTogglePlay={onTogglePlay}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(VoiceSelectionPanel);
