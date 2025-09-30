'use client'

import {memo, useCallback, useEffect, useMemo, useState} from "react";
import {Play, Square} from "lucide-react";
import {Voice} from "@/api/types/eleven-labs/Voice";
import {voiceClientAPI} from "@/api/client/voiceClientAPI";

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
    const isAllTagSelected = useMemo(() => {
        return Object.values(voiceGenderTagRecord).every((isTagSelected) => isTagSelected) &&
            Object.values(voiceAgeTagRecord).every((isTagSelected) => isTagSelected);
    }, [voiceGenderTagRecord, voiceAgeTagRecord]);
    const filteredVoiceList = useMemo(() => {
        const anyGenderSelected = Object.values(voiceGenderTagRecord).some(v => v);
        const anyAgeSelected = Object.values(voiceAgeTagRecord).some(v => v);

        return voiceList.filter((voice) => {
            if (!voice.labels?.gender || !voice.labels?.age || (!anyGenderSelected && !anyAgeSelected)) {
                return false;
            }

            const isEnabledGender = anyGenderSelected
                ? voiceGenderTagRecord[voice.labels.gender]
                : true;
            const isEnabledAge = anyAgeSelected
                ? voiceAgeTagRecord[voice.labels.age]
                : true;

            return isEnabledGender && isEnabledAge;
        })
    }, [voiceList, voiceGenderTagRecord, voiceAgeTagRecord]);

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
        // 1개, 2개 이상
        // 1개 -> 기존 거 해제하고 다른 걸로
        // 2개 ->
        setVoiceAgeTagRecord(prev => ({
            ...prev,
            [tagName]: !prev[tagName]
        }));
    }, []);

    const onClickSelectAllTag = useCallback(() => {
        setVoiceGenderTagRecord((prev) => {
            const newRecord: Record<string, boolean> = { };
            Object.keys(prev).forEach((tagName) => {
                newRecord[tagName] = !isAllTagSelected;
            });
            return newRecord;
        });
        setVoiceAgeTagRecord((prev) => {
            const newRecord: Record<string, boolean> = { };
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

    useEffect(() => {
        const loadData = async () => {
            const voiceDataList = await voiceClientAPI.getVoices();

            // 모든 gender와 age 값들을 수집
            const genderTags = new Set<string>();
            const ageTags = new Set<string>();

            voiceDataList.forEach((voiceData) => {
                const labels = voiceData.labels;
                if (labels?.gender) {
                    genderTags.add(labels.gender);
                }
                if (labels?.age) {
                    ageTags.add(labels.age);
                }
            });

            // 중복 제거된 태그들을 isSelected: true로 설정하여 배열로 변환
            const uniqueGenderTagNameList = Array.from(genderTags).map((genderTagName) => {
                return genderTagName;
            });
            const uniqueAgeTagNameList = Array.from(ageTags).map((ageTagName) => {
                return ageTagName;
            });
            const uniqueGenderTagRecord: Record<string, boolean> = { }
            const uniqueAgeTagRecord: Record<string, boolean> = { }

            uniqueGenderTagNameList.forEach((uniqueGenderTagName) => {
                uniqueGenderTagRecord[uniqueGenderTagName] = true;
            });
            uniqueAgeTagNameList.forEach((uniqueAgeTagName) => {
                uniqueAgeTagRecord[uniqueAgeTagName] = true;
            })

            setVoiceList(voiceDataList);

            setVoiceGenderTagRecord(uniqueGenderTagRecord);
            setVoiceAgeTagRecord(uniqueAgeTagRecord);
            onChangeIsLoading(false);
        }

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
        <div className="w-[400px] flex-shrink-0 bg-gray-900/30 backdrop-blur-sm border-r border-purple-500/20 overflow-y-auto">
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

                            // 태그별 색상 결정
                            const getTagColor = () => {
                                switch (tagName) {
                                    case 'male': return "blue";
                                    case 'female': return "red";
                                    default: return "gray";
                                }
                            };

                            // 표시할 라벨 결정
                            const getDisplayLabel = () => {
                                switch (tagName) {
                                    case 'male': return 'Male';
                                    case 'female': return 'Female';
                                    default: return tagName;
                                }
                            };

                            const tagColor = getTagColor();
                            const tagColorTailwind = isActive
                                ? `bg-${tagColor}-500/20 text-${tagColor}-300 border-${tagColor}-400/30`
                                : "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30";

                            return (
                                <button
                                    key={tagName}
                                    onClick={() => {
                                        onToggleVoiceGenderTag(tagName);
                                    }}
                                    className={`text-xs px-2 py-1 rounded-full border font-medium transition-all ${tagColorTailwind}`}
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

                            // 태그별 색상 결정
                            const getTagColor = () => {
                                switch (tagName) {
                                    case 'young': return "green";
                                    case 'middle_aged': return "purple"
                                    case 'old': return "orange"
                                    default: return "gray"
                                }
                            };

                            // 표시할 라벨 결정
                            const getDisplayLabel = () => {
                                switch (tagName) {
                                    case 'young': return 'Young';
                                    case 'middle_aged': return 'Adult';
                                    case 'old': return 'Senior';
                                    case 'neutral': return 'Neutral';
                                    default: return tagName;
                                }
                            };

                            const tagColor = getTagColor();
                            const tagColorTailwind = isActive
                                ? `bg-${tagColor}-500/20 text-${tagColor}-300 border-${tagColor}-400/30`
                                : "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30";

                            return (
                                <button
                                    key={tagName}
                                    onClick={() => {
                                        onToggleVoiceAgeTag(tagName);
                                    }}
                                    className={`text-xs px-2 py-1 rounded-full border font-medium transition-all ${tagColorTailwind}`}
                                >
                                    {getDisplayLabel()}
                                </button>
                            );
                        })}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Voice Selection */}
                    <div>
                        <div className="grid grid-cols-2 gap-3">
                            {filteredVoiceList.map((voice) => {
                                const getGenderColor = (gender?: string) => {
                                    switch (gender) {
                                        case "male": return "blue";
                                        case "female": return "red";
                                        default: return "gray";
                                    }
                                }
                                const getAgeColor = (age?: string) => {
                                    switch (age) {
                                        case "young": return "green";
                                        case "middle_aged": return "purple";
                                        case "old": return "orange";
                                        default: return "gray";
                                    }
                                }
                                const labels = voice.labels;
                                const gender = labels?.gender;
                                const age = labels?.age;
                                const genderDisplay = gender === 'male'
                                    ? 'Male'
                                    : gender === 'female'
                                        ? 'Female'
                                        : gender === 'neutral'
                                            ? 'Neutral'
                                            : '';
                                const ageDisplay = age === 'young'
                                    ? 'Young'
                                    : age === 'middle_aged'
                                        ? 'Adult'
                                        : age === 'old'
                                            ? 'Senior'
                                            : '';
                                const genderColor = getGenderColor(gender);
                                const ageColor = getAgeColor(age);

                                return (
                                    <div
                                        key={voice.id}
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
                                                    <div className="pl-3 text-white font-medium text-base">{voice.name}</div>
                                                    <div className="flex pl-2 gap-1.5">
                                                        {genderDisplay && (<span
                                                            className={`text-xs px-2 py-1 rounded-full border font-medium bg-${genderColor}-500/20 text-${genderColor}-300 border-${genderColor}-400/30`}
                                                        >
                                                            {genderDisplay}
                                                        </span>)}
                                                        {ageDisplay && (<span
                                                            className={`text-xs px-2 py-1 rounded-full border font-medium bg-${ageColor}-500/20 text-${ageColor}-300 border-${ageColor}-400/30`}
                                                        >
                                                            {ageDisplay}
                                                        </span>)}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                className="p-1.5 rounded-full bg-gray-700/50 hover:bg-gray-600/50 transition-colors flex-shrink-0 ml-2"
                                                onClick={(e) => {
                                                    e.stopPropagation();

                                                    if (!currentAudio || playingSoundId !== voice.id) {
                                                        onClickPlaySoundPreview(voice.id, voice.previewUrl);
                                                    } else {
                                                        onClickStopSoundPreview();
                                                    }
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