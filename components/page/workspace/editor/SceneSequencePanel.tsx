'use client'

import {memo, useEffect, useState} from "react";
import Image from "next/image";
import {CaptionData} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";
import {imageClientAPI} from "@/lib/api/client/imageClientAPI";
import SceneSequenceItem from "@/components/page/workspace/editor/SceneSequenceItem";

interface ImageData {
    url: string;
    isLoaded: boolean;
}

interface SceneSequencePanelProps {
    taskId: string;
    captionDataList: CaptionData[];
    currentSceneIndex: number;
    onClickSceneSequence: (sceneStartSec: number) => void;
    onFinishLoading: () => void;
}

function SceneSequencePanel({
    taskId,
    captionDataList,
    currentSceneIndex,
    onClickSceneSequence,
    onFinishLoading,
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
            }

            loadData().then(() => {
                setIsLoading(false);
            });
        }
    }, [taskId, captionDataList, imageDataList.length]);

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
            <div className="text-purple-300 text-2xl font-medium mb-4">Scene</div>
            {captionDataList.map((captionData, index) => {
                return <SceneSequenceItem
                    key={index}
                    captionData={captionData}
                    imageUrl={imageDataList[index]?.url ?? ""}
                    isHovered={hoveredImageIndex === index}
                    isCurrentScene={currentSceneIndex === index}
                    isLastItem={index === captionDataList.length - 1}
                    onClickSceneSequence={onClickSceneSequence}
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
                // return <div
                //     key={captionData.sceneNumber}
                //     className={`
                //         relative p-4 rounded-xl border transition-all cursor-default backdrop-blur-sm bg-gray-800/30
                //         ${isCurrentScene ? "border-pink-500" : "border-purple-500/20 hover:border-purple-400/40"}
                //         ${hoveredImageIndex === index ? 'z-50' : 'z-0'}
                //     `}
                //     onClick={() => {
                //         onClickSceneSequence(index === 0 ? 0.00 : sceneStartSec);
                //     }}
                // >
                //     <div className="flex items-start justify-between">
                //         <div className="flex flex-col space-y-3 flex-1 mr-4">
                //             {/* 시간 아래쪽으로 밀어주기 */}
                //             <div className="text-purple-300 text-lg font-medium">Scene #{index + 1}</div>
                //             <p className="text-white text-base leading-relaxed">
                //                 {captionData.script}
                //             </p>
                //             <span className="text-purple-300 text-base">⏱ {sceneStartSec.toFixed(2)}s ~ {sceneEndSec.toFixed(2)}s</span>
                //         </div>
                //         <div className="relative">
                //             <div
                //                 className="relative w-32 rounded-lg overflow-hidden border border-purple-500/30 flex-shrink-0 cursor-pointer hover:border-purple-400/50 transition-all"
                //                 style={{aspectRatio: '9/16'}}
                //                 onMouseEnter={() => setHoveredImageIndex(index)}
                //                 onMouseLeave={() => setHoveredImageIndex(null)}
                //             >
                //                 {imageDataList[index] ? (
                //                     <Image
                //                         src={imageDataList[index].url}
                //                         className="object-cover"
                //                         alt={`Scene ${index + 1}`}
                //                         fill
                //                         onLoad={() => {
                //                             setImageDataList((prevImageDataList) => {
                //                                 return prevImageDataList.map((prevImageData, prevIndex) => {
                //                                     return prevIndex === index
                //                                         ? {
                //                                             url: prevImageData.url,
                //                                             isLoaded: true,
                //                                         } : prevImageData;
                //                                 });
                //                             });
                //                         }}
                //                     />
                //                 ) : (
                //                     <div className="w-full h-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600">
                //                         <div className="w-full h-full bg-gradient-to-t from-black/20 to-transparent"></div>
                //                     </div>
                //                 )}
                //             </div>
                //
                //             {/* 확대된 이미지 툴팁 */}
                //             {hoveredImageIndex === index && imageDataList[index] && (
                //                 <div
                //                     className={hoveredImageIndex !== imageDataList.length - 1
                //                         ? "absolute right-0 top-0 w-64 rounded-lg overflow-hidden border-2 border-purple-400/80 shadow-2xl z-50 pointer-events-none"
                //                         : "absolute right-0 bottom-0 w-64 rounded-lg overflow-hidden border-2 border-purple-400/80 shadow-2xl z-50 pointer-events-none"
                //                     }
                //                     style={{aspectRatio: '9/16'}}
                //                 >
                //                     <Image
                //                         src={imageDataList[index].url}
                //                         alt={`Scene ${index + 1} - Enlarged`}
                //                         fill
                //                         className="object-cover"
                //                     />
                //                 </div>
                //             )}
                //         </div>
                //     </div>
                // </div>
            })}
        </div>
    )
}

export default memo(SceneSequencePanel);