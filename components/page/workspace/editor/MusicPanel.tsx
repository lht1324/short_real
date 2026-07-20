'use client'

import {memo, useCallback, useEffect, useRef, useState} from "react";
import {MusicData} from "@/lib/api/types/supabase/VideoGenerationTasks";
import MusicItem from "@/components/page/workspace/editor/MusicItem";

interface MusicPanelProps {
    musicDataList: MusicData[];
    videoDuration: number;
    onSelectMusic: (musicIndex: number) => void;
}

function MusicPanel({
    musicDataList,
    videoDuration,
    onSelectMusic,
}: MusicPanelProps) {
    // Audio 인스턴스는 ref로 관리
    const audioRef = useRef<HTMLAudioElement | null>(null);
    // 진행 중인 play() Promise 추적 - cleanupAudio에서 race condition 방지용
    const pendingPlayRef = useRef<Promise<void> | null>(null);

    // UI에 영향을 주는 값들만 state로 관리
    const [selectedItemIndex, setSelectedItemIndex] = useState(0);
    const [playingMusicIndex, setPlayingMusicIndex] = useState<number | null>(null);
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const [musicCurrentTime, setMusicCurrentTime] = useState(0);
    const [musicProgress, setMusicProgress] = useState(0);

    // 오디오 종료 핸들러
    const handleAudioEnded = useCallback(() => {
        setPlayingMusicIndex(null);
        setIsMusicPlaying(false);
        setMusicCurrentTime(0);
        setMusicProgress(0);
    }, []);

    // 오디오 에러 핸들러
    const handleAudioError = useCallback((error: Event) => {
        console.error('Audio playback error:', error);
        setPlayingMusicIndex(null);
        setIsMusicPlaying(false);
        setMusicCurrentTime(0);
        setMusicProgress(0);
    }, []);

    // 타임 업데이트 핸들러
    const handleTimeUpdate = useCallback(() => {
        if (audioRef.current) {
            const currentTime = audioRef.current.currentTime;
            const duration = audioRef.current.duration;
            setMusicCurrentTime(currentTime);
            setMusicProgress(duration > 0 ? (currentTime / duration) * 100 : 0);
        }
    }, []);

    // 오디오 이벤트 리스너 정리 함수
    // play()가 pending 상태일 때 pause()를 직접 호출하면 AbortError가 발생하므로
    // pendingPlayRef를 통해 play()가 완료된 후 pause()를 호출한다
    const cleanupAudio = useCallback(() => {
        if (audioRef.current) {
            const audio = audioRef.current;
            audioRef.current = null;
            audio.removeEventListener('ended', handleAudioEnded);
            audio.removeEventListener('error', handleAudioError);
            audio.removeEventListener('timeupdate', handleTimeUpdate);

            const doPause = () => {
                audio.pause();
                audio.currentTime = 0;
            };

            if (pendingPlayRef.current) {
                // play()가 resolve/reject된 후 pause 실행 (AbortError 방지)
                pendingPlayRef.current.then(doPause, doPause);
                pendingPlayRef.current = null;
            } else {
                doPause();
            }
        }
        setIsMusicPlaying(false);
        setMusicCurrentTime(0);
        setMusicProgress(0);
    }, [handleAudioEnded, handleAudioError, handleTimeUpdate]);

    // 새로운 오디오 초기화
    const initializeAudio = useCallback((audioUrl: string, musicIndex: number) => {
        cleanupAudio();

        const audio = new Audio(audioUrl);
        audio.addEventListener('ended', handleAudioEnded);
        audio.addEventListener('error', handleAudioError);
        audio.addEventListener('timeupdate', handleTimeUpdate);

        audioRef.current = audio;
        setSelectedItemIndex(prevIndex => prevIndex != musicIndex ? musicIndex : prevIndex);
        setPlayingMusicIndex(musicIndex);
        setIsMusicPlaying(true); // 낙관적 업데이트 - 실패 시 cleanupAudio가 false로 되돌림

        const playPromise = audio.play();
        pendingPlayRef.current = playPromise;

        playPromise
            .then(() => {
                pendingPlayRef.current = null;
            })
            .catch((error: Error) => {
                pendingPlayRef.current = null;
                // AbortError는 pause() 또는 언마운트로 인한 정상적인 중단 - 무시
                if (error.name === 'AbortError') return;
                console.error('Failed to play audio:', error);
                cleanupAudio();
                setPlayingMusicIndex(null);
            });
    }, [cleanupAudio, handleAudioEnded, handleAudioError, handleTimeUpdate]);

    const onClickMusicItem = useCallback((index: number) => {
        setSelectedItemIndex(index);
        onSelectMusic(index);

        if (isMusicPlaying) {
            cleanupAudio();
        }
    }, [onSelectMusic, isMusicPlaying, cleanupAudio]);

    // 재생/일시정지 토글 핸들러
    const onToggleMusicPlay = useCallback((musicIndex: number) => {
        const targetMusicData = musicDataList[musicIndex];
        if (!targetMusicData?.audioUrl) return;

        // 1. 재생 중인 음악 없음 -> 새 음악 재생
        if (playingMusicIndex === null) {
            initializeAudio(targetMusicData.audioUrl, musicIndex);
            return;
        }

        // 2-1. 같은 아이템 클릭 -> 일시정지/재개
        if (playingMusicIndex === musicIndex) {
            if (audioRef.current) {
                if (isMusicPlaying) {
                    audioRef.current.pause();
                    setIsMusicPlaying(false);
                } else {
                    const playPromise = audioRef.current.play();
                    pendingPlayRef.current = playPromise;

                    playPromise
                        .then(() => {
                            pendingPlayRef.current = null;
                            setIsMusicPlaying(true);
                        })
                        .catch((error: Error) => {
                            pendingPlayRef.current = null;
                            if (error.name === 'AbortError') return;
                            console.error('Failed to resume audio:', error);
                            cleanupAudio();
                            setPlayingMusicIndex(null);
                        });
                }
            }
            return;
        }

        // 2-2. 다른 아이템 클릭 -> 기존 음악 정지 후 새 음악 재생
        initializeAudio(targetMusicData.audioUrl, musicIndex);
    }, [musicDataList, playingMusicIndex, isMusicPlaying, initializeAudio, cleanupAudio]);

    const onSeekMusic = useCallback((musicIndex: number, timeInSeconds: number) => {
        const targetMusicData = musicDataList[musicIndex];
        if (!targetMusicData?.audioUrl) return;

        // 1. 해당 음악이 재생 중인 경우 -> seek만 수행
        if (playingMusicIndex === musicIndex && audioRef.current) {
            audioRef.current.currentTime = timeInSeconds;

            // 일시정지 상태면 재생
            if (!isMusicPlaying) {
                const playPromise = audioRef.current.play();
                pendingPlayRef.current = playPromise;

                playPromise
                    .then(() => {
                        pendingPlayRef.current = null;
                        setIsMusicPlaying(true);
                    })
                    .catch((error: Error) => {
                        pendingPlayRef.current = null;
                        if (error.name === 'AbortError') return;
                        console.error('Failed to resume audio:', error);
                        cleanupAudio();
                        setPlayingMusicIndex(null);
                    });
            }
            return;
        }

        // 2. 다른 음악이거나 재생 중이 아닌 경우 -> 새로운 오디오 생성 후 seek
        cleanupAudio();

        const audio = new Audio(targetMusicData.audioUrl);
        audio.addEventListener('ended', handleAudioEnded);
        audio.addEventListener('error', handleAudioError);
        audio.addEventListener('timeupdate', handleTimeUpdate);

        audioRef.current = audio;
        setSelectedItemIndex(prevIndex => prevIndex !== musicIndex ? musicIndex : prevIndex);
        setPlayingMusicIndex(musicIndex);

        audio.currentTime = timeInSeconds;
        const playPromise = audio.play();
        pendingPlayRef.current = playPromise;

        playPromise
            .then(() => {
                pendingPlayRef.current = null;
                setIsMusicPlaying(true);
            })
            .catch((error: Error) => {
                pendingPlayRef.current = null;
                if (error.name === 'AbortError') return;
                console.error('Failed to play audio:', error);
                cleanupAudio();
                setPlayingMusicIndex(null);
            });
    }, [musicDataList, playingMusicIndex, isMusicPlaying, cleanupAudio, handleAudioEnded, handleAudioError, handleTimeUpdate]);

    const onClickOpenEditModalForIndex = useCallback((index: number) => {
        return () => {
            onSelectMusic(index);
        };
    }, [onSelectMusic]);

    // 컴포넌트 언마운트 시 오디오 정리
    useEffect(() => {
        return () => {
            cleanupAudio();
        };
    }, [cleanupAudio]);

    return (
        <div className="p-4 space-y-4">
            {musicDataList.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                    Musics were not generated.
                </div>
            ) : (
                <>
                    {/* 공통 태그 섹션 — 이 음악들의 공통 분위기/특징 */}
                    {musicDataList[0]?.tagList && musicDataList[0].tagList.length > 0 && (
                        <div className="px-1 pb-1">
                            <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-[0.15em] mb-2.5">
                                Track Characteristics
                            </p>
                            <div className="flex flex-row flex-wrap gap-1.5">
                                {musicDataList[0].tagList.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700/60"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-4 h-px bg-white/5"/>
                        </div>
                    )}

                    {/* 음악 아이템 리스트 */}
                    <div className="space-y-3">
                        {musicDataList.map((musicData, index) => {
                            const isSelected = index === selectedItemIndex;

                            return <MusicItem
                                key={index}
                                musicData={musicData}
                                videoDuration={videoDuration}
                                isSelected={isSelected}
                                isPlaying={isSelected && isMusicPlaying}
                                progress={isSelected ? musicProgress : 0}
                                onClickItem={() => onClickMusicItem(index)}
                                onClickPlayButton={() => onToggleMusicPlay(index)}
                                onClickOpenEditModal={onClickOpenEditModalForIndex(index)}
                                onSeek={(timeInSeconds) => onSeekMusic(index, timeInSeconds)}
                            />
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

export default memo(MusicPanel);