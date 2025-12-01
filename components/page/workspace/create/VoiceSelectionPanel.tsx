'use client'

import {memo, MouseEvent, useCallback, useEffect, useMemo, useState} from "react";
import {Play, Square} from "lucide-react";
import {Voice} from "@/api/types/eleven-labs/Voice";
import {voiceClientAPI} from "@/api/client/voiceClientAPI";
import VoiceSelectionPanelItem from "@/components/page/workspace/create/VoiceSelectionPanelItem";

interface VoiceSelectionPanelProps {
    selectedVoiceId?: string,
    onSelectVoice: (voiceId: string) => void,
    onChangeIsLoading: (isVoiceLoading: boolean) => void,
}

function VoiceSelectionPanel({
    selectedVoiceId,
    onSelectVoice,
    onChangeIsLoading,
}: VoiceSelectionPanelProps) {
    const [voiceList, setVoiceList] = useState<Voice[]>([]);
    const [voiceGenderTagRecord, setVoiceGenderTagRecord] = useState<Record<string, boolean>>({ });
    const [voiceAgeTagRecord, setVoiceAgeTagRecord] = useState<Record<string, boolean>>({ });
    const [voiceAccentTagRecord, setVoiceAccentTagRecord] = useState<Record<string, boolean>>({ });
    const isAllTagSelected = useMemo(() => {
        return Object.values(voiceGenderTagRecord).every((isTagSelected) => isTagSelected) &&
            Object.values(voiceAgeTagRecord).every((isTagSelected) => isTagSelected) &&
            Object.values(voiceAccentTagRecord).every((isTagSelected) => isTagSelected);
    }, [voiceGenderTagRecord, voiceAgeTagRecord, voiceAccentTagRecord]);
    const filteredVoiceList = useMemo(() => {
        const anyGenderSelected = Object.values(voiceGenderTagRecord).some(v => v);
        const anyAgeSelected = Object.values(voiceAgeTagRecord).some(v => v);
        const anyAccentSelected = Object.values(voiceAccentTagRecord).some(v => v);

        return voiceList.filter((voice) => {
            if (selectedVoiceId === voice.id && (!anyGenderSelected && !anyAgeSelected && !anyAccentSelected)) {
                return true;
            }

            if (!voice.gender || !voice.age || (!anyGenderSelected && !anyAgeSelected && !anyAccentSelected)) {
                return false;
            }

            const isEnabledGender = anyGenderSelected
                ? voiceGenderTagRecord[voice.gender]
                : true;
            const isEnabledAge = anyAgeSelected
                ? voiceAgeTagRecord[voice.age]
                : true;
            const isEnabledAccent = anyAccentSelected
                ? voiceAccentTagRecord[voice.accent]
                : true;

            return isEnabledGender && isEnabledAge && isEnabledAccent
        })
    }, [selectedVoiceId, voiceList, voiceGenderTagRecord, voiceAgeTagRecord, voiceAccentTagRecord]);

    // Audio state management
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);

    const onToggleVoiceGenderTag = useCallback((tagName: string) => {
        setVoiceGenderTagRecord(prev => ({
            ...prev,
            [tagName]: !prev[tagName]
        }));
    }, []);

    const onToggleVoiceAgeTag = useCallback((tagName: string) => {
        setVoiceAgeTagRecord(prev => ({
            ...prev,
            [tagName]: !prev[tagName]
        }));
    }, []);

    const onToggleVoiceAccentTag = useCallback((tagName: string) => {
        setVoiceAccentTagRecord(prev => ({
            ...prev,
            [tagName]: !prev[tagName]
        }));
    }, []);

    const onClickSelectAllTag = useCallback(() => {
        const toggleAll = (prevRecord: Record<string, boolean>) => {
            const newRecord: Record<string, boolean> = { };
            Object.keys(prevRecord).forEach((tagName) => {
                newRecord[tagName] = !isAllTagSelected;
            });
            return newRecord;
        }
        setVoiceGenderTagRecord((prev) => {
            return toggleAll(prev);
        });
        setVoiceAgeTagRecord((prev) => {
            return toggleAll(prev);
        });
        setVoiceAccentTagRecord((prev) => {
            return toggleAll(prev);
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

            // 재생 종료 시 state 초기화 (해당 오디오만)
            audio.addEventListener('ended', () => {
                setCurrentAudio((current) => {
                    if (current === audio) {
                        setPlayingSoundId(null);
                        return null;
                    }

                    return current;
                });
            });

            // 에러 처리 (해당 오디오만)
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
                // 재생 실패 시에만 state 초기화 (기존 오디오는 그대로 유지)
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

    const onClickPlayAndPauseButton = useCallback((e: MouseEvent, voiceId: string, voicePreviewUrl?: string) => {
        e.stopPropagation();

        if (!currentAudio || playingSoundId !== voiceId) {
            onClickPlaySoundPreview(voiceId, voicePreviewUrl);
        } else {
            onClickStopSoundPreview();
        }
    }, [currentAudio, playingSoundId, onClickPlaySoundPreview, onClickStopSoundPreview])

    useEffect(() => {
        const loadData = async () => {
            const voiceDataList = await voiceClientAPI.getVoices();

            // 모든 gender와 age 값들을 수집
            const genderTags = new Set<string>();
            const ageTags = new Set<string>();
            const accentTags = new Set<string>();

            voiceDataList.forEach((voiceData) => {
                if (voiceData.gender) {
                    genderTags.add(voiceData.gender);
                }
                if (voiceData.age) {
                    ageTags.add(voiceData.age);
                }
                if (voiceData.accent) {
                    accentTags.add(voiceData.accent);
                }
            });

            // 중복 제거된 태그들을 isSelected: true로 설정하여 배열로 변환
            const uniqueGenderTagNameList = Array.from(genderTags).map((genderTagName) => {
                return genderTagName;
            });
            const uniqueAgeTagNameList = Array.from(ageTags).map((ageTagName) => {
                return ageTagName;
            });
            const uniqueAccentTagNameList = Array.from(accentTags).map((accentTagName) => {
                return accentTagName;
            });
            const uniqueGenderTagRecord: Record<string, boolean> = { }
            const uniqueAgeTagRecord: Record<string, boolean> = { }
            const uniqueAccentTagRecord: Record<string, boolean> = { }

            uniqueGenderTagNameList.forEach((uniqueGenderTagName) => {
                uniqueGenderTagRecord[uniqueGenderTagName] = true;
            });
            uniqueAgeTagNameList.forEach((uniqueAgeTagName) => {
                uniqueAgeTagRecord[uniqueAgeTagName] = true;
            })
            uniqueAccentTagNameList.forEach((uniqueAccentTagName) => {
                uniqueAccentTagRecord[uniqueAccentTagName] = true;
            })

            setVoiceList(voiceDataList);

            setVoiceGenderTagRecord(uniqueGenderTagRecord);
            setVoiceAgeTagRecord(uniqueAgeTagRecord);
            setVoiceAccentTagRecord(uniqueAccentTagRecord);
        }

        loadData().then(() => {
            onChangeIsLoading(false);
        });
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
        <div className="flex-[2.7] flex-shrink-0 bg-gray-900/30 backdrop-blur-sm border-r border-purple-500/20 overflow-y-auto">
            <div className="p-6">
                <div className="text-purple-300 text-2xl font-medium mb-4">Voice</div>

                {/* Voice Filters */}
                <div className="mb-6">
                    {/* Select All Button */}
                    <div className="mb-3">
                        <button
                            onClick={onClickSelectAllTag}
                            className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-all ${
                                isAllTagSelected
                                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-400/30 hover:bg-indigo-500/30"
                                    : "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30"
                            }`}
                        >
                            Select All
                        </button>
                    </div>

                    {/* Gender Filter */}
                    <div className="flex flex-row space-x-2 mb-4">
                        <div className="text-sm font-medium text-purple-300 mb-2">Gender</div>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(voiceGenderTagRecord).map((tagName) => {
                            const isActive = voiceGenderTagRecord[tagName];


                            // Tailwind 동적 클래스 문제 해결: 조건문으로 전체 클래스 반환
                            const getTagClasses = () => {
                                if (!isActive) {
                                    return "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30";
                                }

                                switch (tagName) {
                                    case 'male': return "bg-blue-500/20 text-blue-300 border-blue-400/30";
                                    case 'female': return "bg-red-500/20 text-red-300 border-red-400/30";
                                    case 'neutral': return "bg-gray-500/20 text-gray-300 border-gray-400/30";
                                    default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
                                    }
                                };

                            // 표시할 라벨 결정
                            const getDisplayLabel = () => {
                                switch (tagName) {
                                    case 'male': return 'Male';
                                    case 'female': return 'Female';
                                    case 'neutral': return 'Neutral';
                                    default: return tagName;
                                }
                            };

                            return (
                                <button
                                    key={tagName}
                                    onClick={() => {
                                        onToggleVoiceGenderTag(tagName);
                                    }}
                                    className={`text-xs px-2 py-1 rounded-full border font-medium transition-all ${getTagClasses()}`}
                                >
                                    {getDisplayLabel()}
                                </button>
                            );
                        })}
                        </div>
                    </div>

                    {/* Age Filter */}
                    <div className="flex flex-row space-x-2 items-center">
                        <div className="text-sm font-medium text-purple-300 mb-2">Age</div>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(voiceAgeTagRecord).map((tagName) => {
                            const isActive = voiceAgeTagRecord[tagName];

                            // Tailwind 동적 클래스 문제 해결: 조건문으로 전체 클래스 반환
                            const getTagClasses = () => {
                                if (!isActive) {
                                    return "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30";
                                }

                                switch (tagName) {
                                    case 'young': return "bg-green-500/20 text-green-300 border-green-400/30";
                                    case 'middle_aged': return "bg-purple-500/20 text-purple-300 border-purple-400/30";
                                    case 'old': return "bg-orange-500/20 text-orange-300 border-orange-400/30";
                                    default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
                                }
                            };
                            // 표시할 라벨 결정
                            const getDisplayLabel = () => {
                                switch (tagName) {
                                    case 'young': return 'Young';
                                    case 'middle_aged': return 'Adult';
                                    case 'old': return 'Senior';
                                    default: return tagName;
                                }
                            };

                            return (
                                <button
                                    key={tagName}
                                    onClick={() => {
                                        onToggleVoiceAgeTag(tagName);
                                    }}
                                    className={`text-xs px-2 py-1 rounded-full border font-medium transition-all ${getTagClasses()}`}
                                >
                                    {getDisplayLabel()}
                                </button>
                            );
                        })}
                        </div>
                    </div>
                </div>

                {/* Accent Filter */}
                <div className="flex flex-row space-x-2 items-center mb-4">
                    <div className="text-sm font-medium text-purple-300 mb-2">Accent</div>
                    <div className="flex flex-wrap gap-2">
                        {Object.keys(voiceAccentTagRecord).map((tagName) => {
                            const isActive = voiceAccentTagRecord[tagName];

                            const getTagClasses = () => {
                                if (!isActive) {
                                    return "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30";
                                }
                                return "bg-cyan-500/20 text-cyan-300 border-cyan-400/30";
                            };

                            const getDisplayLabel = () => {
                                switch (tagName) {
                                    case 'american': return 'American';
                                    case 'british': return 'British';
                                    case 'standard': return 'Standard';
                                    case 'australian': return 'Australian';
                                    default: return tagName.charAt(0).toUpperCase() + tagName.slice(1);
                                }
                            };

                            return (
                                <button
                                    key={tagName}
                                    onClick={() => {
                                        onToggleVoiceAccentTag(tagName);
                                    }}
                                    className={`text-xs px-2 py-1 rounded-full border font-medium transition-all ${getTagClasses()}`}
                                >
                                    {getDisplayLabel()}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Voice Selection */}
                    <div>
                        <div className="grid grid-cols-1 gap-3">
                            {filteredVoiceList.map((voice) => {
                                return (
                                    <VoiceSelectionPanelItem
                                        key={voice.id}
                                        voice={voice}
                                        selectedVoiceId={selectedVoiceId}
                                        playingSoundId={playingSoundId}
                                        onSelectVoice={onSelectVoice}
                                        onClickPlayAndPauseButton={onClickPlayAndPauseButton}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default memo(VoiceSelectionPanel);