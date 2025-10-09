'use client'

import {memo, useMemo} from "react";
import Image from "next/image";
import {CaptionData} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";

interface SceneSequenceItemProps {
    captionData: CaptionData;
    imageUrl: string;
    isHovered: boolean;
    isCurrentScene: boolean;
    isLastItem: boolean;
    onClickSceneSequence: (sceneStartSec: number) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onLoadImage: () => void;
}

function SceneSequenceItem({
    captionData,
    imageUrl,
    isHovered,
    isCurrentScene,
    isLastItem,
    onClickSceneSequence,
    onMouseEnter,
    onMouseLeave,
    onLoadImage,
}: SceneSequenceItemProps) {
    const sceneStartSec = useMemo(() => {
        return captionData.startSec;
    }, [captionData.startSec]);
    const sceneEndSec = useMemo(() => {
        return captionData.endSec;
    }, [captionData.endSec]);

    return (
        <div
            key={captionData.sceneNumber}
            className={`
                        relative p-4 rounded-xl border transition-all cursor-pointer backdrop-blur-sm bg-gray-800/30
                        ${isCurrentScene ? "border-pink-500" : "border-purple-500/20 hover:border-purple-400/40"}
                        ${isHovered ? 'z-50' : 'z-0'}
                    `}
            onClick={() => {
                onClickSceneSequence(captionData.sceneNumber === 1 ? 0.00 : sceneStartSec);
            }}
        >
            <div className="flex items-stretch justify-between">
                <div className="flex flex-1 flex-col justify-between mr-4">
                    <div className="space-y-3">
                        <div className="text-purple-300 text-lg font-medium">Scene #{captionData.sceneNumber}</div>
                        <p className="text-white text-base leading-relaxed">
                            {captionData.script}
                        </p>
                    </div>
                    <span className="text-purple-300 text-base pt-3">⏱ {sceneStartSec.toFixed(2)}s ~ {sceneEndSec.toFixed(2)}s</span>
                </div>
                <div className="relative">
                    <div
                        className="relative w-32 rounded-lg overflow-hidden border border-purple-500/30 flex-shrink-0 cursor-pointer hover:border-purple-400/50 transition-all"
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
                            <div className="w-full h-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600">
                                <div className="w-full h-full bg-gradient-to-t from-black/20 to-transparent"></div>
                            </div>
                        )}
                    </div>

                    {/* 확대된 이미지 툴팁 */}
                    {isHovered && imageUrl && (
                        <div
                            className={!isLastItem
                                ? "absolute right-0 top-0 w-64 rounded-lg overflow-hidden border-2 border-purple-400/80 shadow-2xl z-50 pointer-events-none"
                                : "absolute right-0 bottom-0 w-64 rounded-lg overflow-hidden border-2 border-purple-400/80 shadow-2xl z-50 pointer-events-none"
                            }
                            style={{aspectRatio: '9/16'}}
                        >
                            <Image
                                src={imageUrl}
                                alt={`Scene ${captionData.sceneNumber} - Enlarged`}
                                width={256}
                                height={456}
                                className="object-cover"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default memo(SceneSequenceItem);