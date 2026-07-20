'use client'

import {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import Image from "next/image";
import {MusicData} from "@/lib/api/types/supabase/VideoGenerationTasks";

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
        const seconds = Math.floor(parseFloat((musicData.duration % 60).toFixed(0)));
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
                ? 'border-zinc-500 bg-zinc-800/80 shadow-sm'
                : 'border-white/5 bg-zinc-900/40 hover:border-white/10 hover:bg-zinc-900/60'
            }`}
            onClick={onClickItemInternal}
        >
            <div className="space-y-3">
                {/* Row 1: 이미지 + 타이틀 */}
                <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/5 flex-shrink-0">
                        {musicData.imageUrl ? (
                            <Image
                                src={musicData.imageUrl}
                                className="object-cover"
                                alt={musicData.title}
                                width={96}
                                height={96}
                            />
                        ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                <svg className="w-12 h-12 text-zinc-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                </svg>
                            </div>
                        )}
                    </div>
                    <div className="text-zinc-100 text-[15px] font-medium">{musicData.title}</div>
                </div>

                {/* Row 3: 타임라인 + 재생/편집 버튼 */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between text-zinc-400 text-[11px] font-medium tracking-wide">
                            <span>0:00</span>
                            <span>{formattedDuration}</span>
                        </div>
                        <div
                            ref={timelineRef}
                            className="w-full h-1.5 bg-white/10 rounded-full relative cursor-pointer hover:bg-white/20 transition-colors group/timeline"
                            onMouseDown={onMouseDownTimeline}
                            onClick={onClickTimeline}
                        >
                            <div
                                className="h-full bg-indigo-500 rounded-full relative pointer-events-none"
                                style={{
                                    width: `${progress}%`,
                                    transition: isDragging ? 'none' : 'width 0.1s linear',
                                }}
                            >
                                {/* 인디케이터 */}
                                {progress > 0 && (
                                    <div
                                        className="absolute top-1/2 left-full w-0 h-0 group-hover/timeline:w-3 group-hover/timeline:h-3 bg-white rounded-full shadow-lg pointer-events-none transition-all duration-200"
                                        style={{
                                            transform: 'translate(-50%, -50%)',
                                        }}
                                    ></div>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        className="flex-shrink-0 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
                        onClick={onClickPlayButtonInternal}
                    >
                        {isPlaying ? (
                            <svg className="w-4 h-4 text-zinc-200" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 text-zinc-200 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default memo(MusicItem);