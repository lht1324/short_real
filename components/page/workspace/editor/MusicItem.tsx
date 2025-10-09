'use client'

import {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import Image from "next/image";
import {MusicData} from "@/api/types/supabase/VideoGenerationTasks";

interface MusicItemProps {
    musicData: MusicData;
    videoDuration: number;
    isSelected?: boolean;
    isPlaying?: boolean;
    progress?: number;
    onClickItem: () => void;
    onClickPlayButton?: () => void;
    onClickOpenEditModal?: () => void;
    onSeek?: (timeInSeconds: number) => void;
}

function MusicItem({
    musicData,
    videoDuration,
    isSelected = false,
    isPlaying = false,
    progress = 0,
    onClickItem,
    onClickPlayButton,
    onClickOpenEditModal,
    onSeek,
}: MusicItemProps) {
    const formattedDuration = useMemo(() => {
        const minutes = Math.floor(musicData.duration / 60);
        const seconds = musicData.duration % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, [musicData.duration]);

    const onClickPlayButtonInternal = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onClickPlayButton?.();
    }, [onClickPlayButton]);

    const onClickEditButton = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onClickOpenEditModal?.();
    }, [onClickOpenEditModal]);

    const timelineRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const wasDraggingRef = useRef(false);

    const seekToPosition = useCallback((clientX: number) => {
        if (!onSeek || !timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const width = rect.width;
        const ratio = Math.max(0, Math.min(1, clickX / width));
        const timeInSeconds = ratio * musicData.duration;

        onSeek(timeInSeconds);
    }, [musicData.duration, onSeek]);

    const onMouseDownTimeline = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault(); // 텍스트/이미지 선택 방지
        setIsDragging(true);
        wasDraggingRef.current = true;
        // 클릭 위치로 즉시 이동
        seekToPosition(e.clientX);
    }, [seekToPosition]);

    const onClickTimeline = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        // 드래그 후 click 이벤트 방지
    }, []);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        seekToPosition(e.clientX);
    }, [isDragging, seekToPosition]);

    const onMouseUp = useCallback(() => {
        setIsDragging(false);
        // 드래그가 끝난 후 짧은 시간 동안 클릭 무시
        setTimeout(() => {
            wasDraggingRef.current = false;
        }, 100);
    }, []);

    // 드래그 이벤트 리스너 등록
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            return () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
        }
    }, [isDragging, onMouseMove, onMouseUp]);

    const onClickItemInternal = useCallback((e: React.MouseEvent) => {
        // 드래그 직후 클릭은 무시
        if (wasDraggingRef.current) {
            e.stopPropagation();
            return;
        }
        if (!isSelected) {
            onClickItem();
        }
    }, [isSelected, onClickItem]);

    return (
        <div
            className={`
                relative p-4 rounded-xl border transition-all cursor-pointer backdrop-blur-sm
                ${isSelected
                ? 'border-pink-500 bg-pink-500/10'
                : 'border-purple-500/20 bg-gray-800/30 hover:border-purple-400/40 hover:bg-gray-800/50'
            }`}
            onClick={onClickItemInternal}
        >
            <div className="space-y-3">
                {/* Row 1: 이미지 + 타이틀 */}
                <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-purple-500/30 flex-shrink-0">
                        {musicData.imageUrl ? (
                            <Image
                                src={musicData.imageUrl}
                                className="object-cover"
                                alt={musicData.title}
                                width={96}
                                height={96}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 flex items-center justify-center">
                                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                </svg>
                            </div>
                        )}
                    </div>
                    <div className="text-white text-lg font-medium">{musicData.title}</div>
                </div>

                {/* Row 2: 태그 리스트 */}
                <div className="flex flex-row flex-wrap gap-2">
                    {musicData.tagList.map((tag, index) => (
                        <span
                            key={index}
                            className="px-2 py-1 text-xs rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Row 3: 타임라인 + 재생/편집 버튼 */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between text-white text-xs">
                            <span>0:00</span>
                            <span>{formattedDuration}</span>
                        </div>
                        <div
                            ref={timelineRef}
                            className="w-full h-2 bg-white/20 rounded-full relative cursor-pointer hover:bg-white/30 transition-colors"
                            onMouseDown={onMouseDownTimeline}
                            onClick={onClickTimeline}
                        >
                            <div
                                className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full relative pointer-events-none"
                                style={{
                                    width: `${progress}%`,
                                    transition: isDragging ? 'none' : 'width 0.1s linear',
                                }}
                            >
                                {/* 인디케이터 */}
                                {progress > 0 && (
                                    <div
                                        className="absolute top-1/2 left-full w-3 h-3 bg-white rounded-full shadow-lg pointer-events-none"
                                        style={{
                                            transform: 'translate(-50%, -50%)',
                                            boxShadow: '0 0 6px rgba(168, 85, 247, 0.6)'
                                        }}
                                    ></div>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        className="flex-shrink-0 p-2 rounded-full bg-gray-700/50 hover:bg-purple-500/50 transition-colors"
                        onClick={onClickPlayButtonInternal}
                    >
                        {isPlaying ? (
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        )}
                    </button>
                    {isSelected && (
                        <button
                            className="flex-shrink-0 px-3 py-2 rounded-lg bg-purple-500/50 hover:bg-purple-500/70 transition-colors text-white text-sm font-medium"
                            onClick={onClickEditButton}
                        >
                            Edit Music
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default memo(MusicItem);