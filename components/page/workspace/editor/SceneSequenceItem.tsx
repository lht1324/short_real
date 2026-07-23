'use client'

import {memo, useMemo} from "react";
import Image from "next/image";
import {Image as ImageIcon, Video, Settings, Maximize2, RefreshCw, RotateCcw} from "lucide-react";
import {CaptionData} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";

interface SceneSequenceItemProps {
    captionData: CaptionData;
    imageUrl: string;
    isHovered: boolean;
    isCurrentScene: boolean;
    isLastItem: boolean;
    aspectRatio: '16:9' | '9:16';
    realStartSec: number;
    realEndSec: number;
    onClickSceneSequence: (sceneStartSec: number) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onLoadImage: () => void;
    onClickRegenerateImage?: (sceneNumber: number) => void;
    onClickRegenerateVideo?: (sceneNumber: number) => void;
    onClickOpenOption?: (sceneNumber: number) => void;
    onClickZoomImage?: (sceneIndex: number) => void;
    sceneIndex?: number;
}

function SceneSequenceItem({
    captionData,
    imageUrl,
    isHovered,
    isCurrentScene,
    isLastItem,
    aspectRatio,
    realStartSec,
    realEndSec,
    onClickSceneSequence,
    onMouseEnter,
    onMouseLeave,
    onLoadImage,
    onClickRegenerateImage,
    onClickRegenerateVideo,
    onClickOpenOption,
    onClickZoomImage,
    sceneIndex = 0,
}: SceneSequenceItemProps) {
    const sceneStartSec = realStartSec;
    const sceneEndSec = realEndSec;

    const is16by9 = useMemo(() => aspectRatio === '16:9', [aspectRatio]);

    if (is16by9) {
        // 16:9 레이아웃: 썸네일 상단(전체 폭) + 텍스트 하단 세로 스택
        return (
            <div
                className={`
                    relative rounded-xl border transition-all cursor-pointer backdrop-blur-sm bg-zinc-900/40 hover:bg-zinc-900/60 overflow-hidden
                    ${isCurrentScene ? "border-zinc-500 shadow-sm" : "border-white/5"}
                    ${isHovered ? 'z-50' : 'z-0'}
                `}
                onClick={() => {
                    onClickSceneSequence(captionData.sceneNumber === 1 ? 0.00 : captionData.startSec + 0.1);
                }}
            >
                {/* 썸네일 — 상단, 16:9 비율 */}
                <div
                    className="relative w-full overflow-hidden group"
                    style={{ aspectRatio: '16/9' }}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                >
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            className="object-cover"
                            alt={`Scene ${captionData.sceneNumber}`}
                            fill
                            sizes="(max-width: 768px) 100vw, 320px"
                            onLoad={onLoadImage}
                        />
                    ) : (
                        <div className="w-full h-full bg-zinc-800">
                            <div className="w-full h-full bg-gradient-to-t from-black/20 to-transparent"/>
                        </div>
                    )}

                    {/* Scene 번호 뱃지 */}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 rounded text-zinc-300 text-[11px] font-medium font-mono z-10">
                        #{captionData.sceneNumber}
                    </div>

                    {/* 썸네일 확대 전용 돋보기 버튼 (상단 우측 단독) */}
                    <div className="absolute top-2 right-2 flex items-center bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/10 opacity-90 group-hover:opacity-100 transition-opacity z-10">
                        <button
                            type="button"
                            title="Inspect Image Lightbox"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onClickZoomImage) onClickZoomImage(sceneIndex);
                            }}
                            className="p-1 rounded text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <Maximize2 size={13} />
                        </button>
                    </div>
                </div>

                {/* 텍스트 하단 스택 */}
                <div className="p-3.5 flex flex-col gap-2">
                    <p className="text-zinc-400 text-[12px] leading-relaxed line-clamp-2">
                        {captionData.script}
                    </p>
                    
                    {/* 타임코드 (좌) + 슬림 아이콘 캡슐 바 (우) */}
                    <div className="flex items-center justify-between pt-1">
                        <span className="text-zinc-500 text-[11px] font-mono">
                            ⏱ {sceneStartSec.toFixed(2)}s – {sceneEndSec.toFixed(2)}s
                        </span>

                        {/* 럭셔리 슬림 아이콘 캡슐 바 (호버 시 재시도 RefreshCw 아이콘으로 모핑) */}
                        <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md p-1 rounded-lg border border-white/10">
                            <button
                                type="button"
                                title="Regenerate Image"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onClickRegenerateImage) onClickRegenerateImage(captionData.sceneNumber);
                                }}
                                className="group/btn relative p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                            >
                                <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                                    <ImageIcon size={13} className="transition-all duration-200 group-hover/btn:opacity-0 group-hover/btn:scale-75 group-hover/btn:rotate-45" />
                                    <RefreshCw size={12} className="absolute inset-0 m-auto opacity-0 scale-75 -rotate-45 transition-all duration-200 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:rotate-0 text-amber-400" />
                                </div>
                            </button>
                            <button
                                type="button"
                                title="Regenerate Video"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onClickRegenerateVideo) onClickRegenerateVideo(captionData.sceneNumber);
                                }}
                                className="group/btn relative p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                            >
                                <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                                    <Video size={13} className="transition-all duration-200 group-hover/btn:opacity-0 group-hover/btn:scale-75 group-hover/btn:rotate-45" />
                                    <RefreshCw size={12} className="absolute inset-0 m-auto opacity-0 scale-75 -rotate-45 transition-all duration-200 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:rotate-0 text-cyan-400" />
                                </div>
                            </button>
                            <button
                                type="button"
                                title="Scene Model Options"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onClickOpenOption) onClickOpenOption(captionData.sceneNumber);
                                }}
                                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <Settings size={13} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 9:16 레이아웃 (기존): 텍스트 좌 + 썸네일 우
    return (
        <div
            key={captionData.sceneNumber}
            className={`
                        relative p-4 rounded-xl border transition-all cursor-pointer backdrop-blur-sm bg-zinc-900/40 hover:bg-zinc-900/60
                        ${isCurrentScene ? "border-zinc-500 shadow-sm" : "border-white/5"}
                        ${isHovered ? 'z-50' : 'z-0'}
                    `}
            onClick={() => {
                onClickSceneSequence(captionData.sceneNumber === 1 ? 0.00 : captionData.startSec + 0.1);
            }}
        >
            <div className="flex items-stretch justify-between">
                {/* 텍스트 구역 */}
                <div className="flex flex-1 flex-col justify-between mr-3">
                    <div className="space-y-2">
                        <div className="text-zinc-100 text-[13px] font-medium tracking-wide">Scene #{captionData.sceneNumber}</div>
                        
                        <p className="text-zinc-400 text-[12px] leading-relaxed line-clamp-3">
                            {captionData.script}
                        </p>
                    </div>

                    {/* 하단 행: 좌 측 타임코드 & 우 측 슬림 아이콘 캡슐 바 */}
                    <div className="flex items-center justify-between pt-3">
                        <div className="text-zinc-500 text-[11px] font-mono">
                            ⏱ {sceneStartSec.toFixed(2)}s ~ {sceneEndSec.toFixed(2)}s
                        </div>

                        {/* 우 측 럭셔리 슬림 글래스 아이콘 캡슐 바 (호버 시 재시도 RefreshCw 아이콘으로 모핑) */}
                        <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md p-1 rounded-lg border border-white/10">
                            <button
                                type="button"
                                title="Regenerate Image"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onClickRegenerateImage) onClickRegenerateImage(captionData.sceneNumber);
                                }}
                                className="group/btn relative p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                            >
                                <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                                    <ImageIcon size={13} className="transition-all duration-200 group-hover/btn:opacity-0 group-hover/btn:scale-75 group-hover/btn:rotate-45" />
                                    <RefreshCw size={12} className="absolute inset-0 m-auto opacity-0 scale-75 -rotate-45 transition-all duration-200 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:rotate-0 text-amber-400" />
                                </div>
                            </button>
                            <button
                                type="button"
                                title="Regenerate Video"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onClickRegenerateVideo) onClickRegenerateVideo(captionData.sceneNumber);
                                }}
                                className="group/btn relative p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                            >
                                <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                                    <Video size={13} className="transition-all duration-200 group-hover/btn:opacity-0 group-hover/btn:scale-75 group-hover/btn:rotate-45" />
                                    <RefreshCw size={12} className="absolute inset-0 m-auto opacity-0 scale-75 -rotate-45 transition-all duration-200 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:rotate-0 text-cyan-400" />
                                </div>
                            </button>
                            <button
                                type="button"
                                title="Scene Model Options"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onClickOpenOption) onClickOpenOption(captionData.sceneNumber);
                                }}
                                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <Settings size={13} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 썸네일 구역 */}
                <div className="relative flex-shrink-0">
                    <div
                        className="relative w-32 rounded-lg overflow-hidden border border-white/10 cursor-pointer transition-all group"
                        style={{aspectRatio: '9/16'}}
                        onMouseEnter={() => {
                             onMouseEnter();
                        }}
                        onMouseLeave={() => {
                            onMouseLeave();
                        }}
                    >
                        {imageUrl ? (
                            <Image
                                src={imageUrl}
                                className="object-cover"
                                alt={`Scene ${captionData.sceneNumber}`}
                                width={128}
                                height={228}
                                onLoad={() => { onLoadImage() }}
                            />
                        ) : (
                            <div className="w-full h-full bg-zinc-800">
                                <div className="w-full h-full bg-gradient-to-t from-black/20 to-transparent"></div>
                            </div>
                        )}

                        {/* 썸네일 확대 전용 돋보기 버튼 (상단 우측 단독) */}
                        <div className="absolute top-1.5 right-1.5 flex items-center bg-black/70 backdrop-blur-md p-1 rounded-lg border border-white/10 opacity-90 group-hover:opacity-100 transition-opacity z-10">
                            <button
                                type="button"
                                title="Inspect Image Lightbox"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onClickZoomImage) onClickZoomImage(sceneIndex);
                                }}
                                className="p-1 rounded text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <Maximize2 size={12} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default memo(SceneSequenceItem);