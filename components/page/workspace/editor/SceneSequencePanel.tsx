'use client'

import {memo, useEffect, useState} from "react";
import Image from "next/image";
import {CaptionData, SceneRealTime} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";
import {imageClientAPI} from "@/lib/api/client/imageClientAPI";
import SceneSequenceItem from "@/components/page/workspace/editor/SceneSequenceItem";
import SceneImageLightboxModal from "@/components/page/workspace/editor/SceneImageLightboxModal";

interface ImageData {
    url: string;
    isLoaded: boolean;
}

interface SceneSequencePanelProps {
    taskId: string;
    captionDataList: CaptionData[];
    currentSceneIndex: number;
    aspectRatio: '16:9' | '9:16';
    sceneRealStartTimes: SceneRealTime[];
    onClickSceneSequence: (sceneStartSec: number) => void;
    onFinishLoading: () => void;
    onImagesLoaded?: (urls: string[]) => void;
    onClickZoomImage?: (index: number) => void;
}

function SceneSequencePanel({
    taskId,
    captionDataList,
    currentSceneIndex,
    aspectRatio,
    sceneRealStartTimes,
    onClickSceneSequence,
    onFinishLoading,
    onImagesLoaded,
    onClickZoomImage,
}: SceneSequencePanelProps) {
    // 컴포넌트 내부 주석은 정책 상 구현하기 애매해서 남겨둔 부분
    // 선택은 클릭으로 선택하는 걸 빼고 자동으로 테두리 바꿔주는 기능으로 남기자
    const [isLoading, setIsLoading] = useState(true);
    const [imageDataList, setImageDataList] = useState<ImageData[]>([]);
    const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(null);

    useEffect(() => {
        if (taskId && captionDataList.length > 0 && imageDataList.length === 0) {
            const loadData = async () => {
                const imageSignedUrlList = await imageClientAPI.getImages(taskId, captionDataList.length);
                const newImageDataList = imageSignedUrlList.map((imageUrl) => ({
                    url: imageUrl,
                    isLoaded: false,
                }));

                setImageDataList(newImageDataList);
                if (onImagesLoaded) {
                    onImagesLoaded(imageSignedUrlList);
                }
            }

            loadData().then(() => {
                setIsLoading(false);
            });
        }
    }, [taskId, captionDataList, imageDataList.length, onImagesLoaded]);

    useEffect(() => {
        const isEveryImageLoaded = imageDataList.every((imageData) => {
            return imageData.isLoaded;
        });

        if (isEveryImageLoaded) {
            onFinishLoading();
        }
    }, [imageDataList, onFinishLoading]);

    useEffect(() => {
        if (!isLoading) {
            onFinishLoading();
        }
    }, [isLoading, onFinishLoading]);

    return (
        <div className="p-4 space-y-4">
            <div className="text-zinc-100 text-[15px] uppercase tracking-wider font-medium mb-4">Scene</div>
            {captionDataList.map((captionData, index) => {
                const realTime = sceneRealStartTimes.find(r => r.sceneNumber === captionData.sceneNumber);
                return <SceneSequenceItem
                    key={index}
                    sceneIndex={index}
                    captionData={captionData}
                    imageUrl={imageDataList[index]?.url ?? ""}
                    isHovered={hoveredImageIndex === index}
                    isCurrentScene={currentSceneIndex === index}
                    isLastItem={index === captionDataList.length - 1}
                    aspectRatio={aspectRatio}
                    realStartSec={realTime?.realStartSec ?? captionData.startSec}
                    realEndSec={realTime?.realEndSec ?? captionData.endSec}
                    onClickSceneSequence={onClickSceneSequence}
                    onClickZoomImage={(idx) => {
                        if (onClickZoomImage) onClickZoomImage(idx);
                    }}
                    onClickRegenerateImage={(sceneNum) => {
                        alert(`[Image Regeneration]\nInitiating image generation pipeline for Scene #${sceneNum}.`);
                    }}
                    onClickRegenerateVideo={(sceneNum) => {
                        alert(`[Video Motion Generation]\nInitiating video motion pipeline for Scene #${sceneNum}.`);
                    }}
                    onClickOpenOption={(sceneNum) => {
                        alert(`[Scene Tonal Tuning]\nCustom AI model and prompt settings for Scene #${sceneNum} will open here.`);
                    }}
                    onLoadImage={() => {
                        setImageDataList((prevImageDataList) => {
                            return prevImageDataList.map((prevImageData, prevIndex) => {
                                return prevIndex === index
                                    ? {
                                        ...prevImageData,
                                        isLoaded: true,
                                    } : prevImageData;
                            });
                        });
                    }}
                    onMouseEnter={() => setHoveredImageIndex(index)}
                    onMouseLeave={() => setHoveredImageIndex(null)}
                />
            })}
        </div>
    )
}

export default memo(SceneSequencePanel);