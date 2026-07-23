'use client'

import {memo, useEffect, useCallback} from "react";
import Image from "next/image";
import {X, ChevronLeft, ChevronRight} from "lucide-react";
import {CaptionData} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";

interface SceneImageLightboxModalProps {
    isOpen: boolean;
    currentIndex: number | null;
    captionDataList: CaptionData[];
    imageUrlList: string[];
    aspectRatio: '16:9' | '9:16';
    onClose: () => void;
    onChangeIndex: (newIndex: number) => void;
}

function SceneImageLightboxModal({
    isOpen,
    currentIndex,
    captionDataList,
    imageUrlList,
    aspectRatio,
    onClose,
    onChangeIndex,
}: SceneImageLightboxModalProps) {
    const handlePrev = useCallback(() => {
        if (currentIndex === null || currentIndex <= 0) return;
        onChangeIndex(currentIndex - 1);
    }, [currentIndex, onChangeIndex]);

    const handleNext = useCallback(() => {
        if (currentIndex === null || currentIndex >= captionDataList.length - 1) return;
        onChangeIndex(currentIndex + 1);
    }, [currentIndex, captionDataList.length, onChangeIndex]);

    // ESC 키로 모달 닫기 및 키보드 화살표 씬 이동
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            } else if (e.key === "ArrowLeft") {
                handlePrev();
            } else if (e.key === "ArrowRight") {
                handleNext();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose, handlePrev, handleNext]);

    if (!isOpen || currentIndex === null || !captionDataList[currentIndex]) {
        return null;
    }

    const currentCaption = captionDataList[currentIndex];
    const currentImageUrl = imageUrlList[currentIndex] ?? "";
    const is16by9 = aspectRatio === '16:9';

    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < captionDataList.length - 1;

    return (
        <div
            className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl p-6 transition-opacity animate-in fade-in duration-200 select-none"
            onClick={onClose}
        >
            {/* 우 상단 닫기 버튼 */}
            <button
                type="button"
                onClick={onClose}
                className="absolute top-6 right-6 p-2.5 rounded-full bg-white/10 border border-white/15 text-zinc-300 hover:text-white hover:bg-white/20 transition-all cursor-pointer z-30"
                title="Close (ESC)"
            >
                <X size={20} />
            </button>

            {/* 전체 메인 컬럼 (Column) 래퍼 */}
            <div
                className="flex flex-col items-center justify-center gap-4 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 1층: 상단 HUD 버튼/캡슐 (위치 고정) */}
                <div className="flex items-center gap-3 bg-black/75 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 shadow-2xl select-none">
                    <button
                        type="button"
                        onClick={handlePrev}
                        disabled={!hasPrev}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-20 disabled:bg-transparent text-zinc-300 hover:text-white transition-all active:scale-90 cursor-pointer disabled:cursor-not-allowed"
                        title="Previous Scene (←)"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold tracking-widest text-zinc-100 font-mono">
                            SCENE {currentCaption.sceneNumber.toString().padStart(2, '0')}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                            ({currentIndex + 1} / {captionDataList.length})
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={handleNext}
                        disabled={!hasNext}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-20 disabled:bg-transparent text-zinc-300 hover:text-white transition-all active:scale-90 cursor-pointer disabled:cursor-not-allowed"
                        title="Next Scene (→)"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                {/* 2층: Row ( [좌버튼] - [이미지 프레임] - [우버튼] ) (relative 앵커) */}
                <div className="relative flex items-center justify-center gap-4 sm:gap-6">
                    {/* 좌측 이전 씬 버튼 */}
                    <div className="w-12 flex justify-end">
                        {hasPrev ? (
                            <button
                                type="button"
                                onClick={handlePrev}
                                className="p-3.5 rounded-full bg-black/75 border border-white/15 text-zinc-200 hover:text-white hover:bg-black/95 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-2xl backdrop-blur-md"
                                title="Previous Scene (←)"
                            >
                                <ChevronLeft size={22} />
                            </button>
                        ) : null}
                    </div>

                    {/* 이미지 프레임 (위치 및 크기 절대 고정) */}
                    <div
                        className="relative rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 flex-shrink-0"
                        style={{
                            height: '65vh',
                            maxHeight: '65vh',
                            aspectRatio: is16by9 ? '16/9' : '9/16',
                        }}
                    >
                        {currentImageUrl ? (
                            <Image
                                src={currentImageUrl}
                                alt={`Scene ${currentCaption.sceneNumber}`}
                                fill
                                className="object-contain"
                                priority
                            />
                        ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-500 text-sm">
                                No Image Available
                            </div>
                        )}
                    </div>

                    {/* 우측 다음 씬 버튼 */}
                    <div className="w-12 flex justify-start">
                        {hasNext ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="p-3.5 rounded-full bg-black/75 border border-white/15 text-zinc-200 hover:text-white hover:bg-black/95 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-2xl backdrop-blur-md"
                                title="Next Scene (→)"
                            >
                                <ChevronRight size={22} />
                            </button>
                        ) : null}
                    </div>

                    {/* 3층: 나레이션 자막 텍스트 박스 (2층 Row 하단에 absolute로 오버헤드 없이 아래쪽으로만 확장) */}
                    <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 w-full max-w-xl px-5 py-3 bg-black/75 backdrop-blur-md rounded-xl border border-white/10 text-center shadow-lg pointer-events-auto">
                        <p className="text-zinc-200 text-sm leading-relaxed line-clamp-2">
                            {currentCaption.script}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(SceneImageLightboxModal);
