'use client'

import { memo, useEffect, useState } from "react";
import { CaptionData, SceneRealTime } from "@/components/page/workspace/editor/WorkspaceEditorPageClient";
import { imageClientAPI } from "@/lib/api/client/imageClientAPI";
import SceneSequenceItem from "@/components/page/workspace/editor/SceneSequenceItem";

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
    regeneratingImageMap?: Record<number, boolean>;
    regeneratingVideoMap?: Record<number, boolean>;
    onClickSceneSequence: (sceneStartSec: number) => void;
    onFinishLoading: () => void;
    onImagesLoaded?: (urls: string[]) => void;
    onClickZoomImage?: (index: number) => void;
    onOpenImageRegenerateModal?: (sceneNumber: number) => void;
    onOpenVideoRegenerateModal?: (sceneNumber: number) => void;
}

function SceneSequencePanel({
    taskId,
    captionDataList,
    currentSceneIndex,
    aspectRatio,
    sceneRealStartTimes,
    regeneratingImageMap = {},
    regeneratingVideoMap = {},
    onClickSceneSequence,
    onFinishLoading,
    onImagesLoaded,
    onClickZoomImage,
    onOpenImageRegenerateModal,
    onOpenVideoRegenerateModal,
}: SceneSequencePanelProps) {
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
                const sceneNum = captionData.sceneNumber;
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
                    isRegeneratingImage={!!regeneratingImageMap[sceneNum]}
                    isRegeneratingVideo={!!regeneratingVideoMap[sceneNum]}
                    onClickSceneSequence={onClickSceneSequence}
                    onClickZoomImage={(idx) => {
                        if (onClickZoomImage) onClickZoomImage(idx);
                    }}
                    onClickRegenerateImage={(num) => {
                        if (onOpenImageRegenerateModal) onOpenImageRegenerateModal(num);
                    }}
                    onClickRegenerateVideo={(num) => {
                        if (onOpenVideoRegenerateModal) onOpenVideoRegenerateModal(num);
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