'use client'

import {memo} from "react";
import {SceneData} from "@/api/types/supabase/VideoGenerationTasks";

function StoryboardItem({
    sceneData,
}: {
    sceneData: SceneData;
}) {
    return (
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-400 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            {/* 클래퍼보드 상단 - 클랩 스틱 부분 */}
            <div className="bg-gray-900 border-b-2 border-gray-400 relative overflow-hidden" style={{height: '40px'}}>
                {/* 상단 줄무늬 - 오른쪽 향하는 대각선 */}
                <div className="absolute top-0 left-0 right-0 h-1/2" style={{
                    background: `repeating-linear-gradient(
                        45deg,
                        #ffffff 0px,
                        #ffffff 12px,
                        #000000 12px,
                        #000000 24px
                    )`
                }}></div>

                {/* 하단 줄무늬 - 왼쪽 향하는 대각선 */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2" style={{
                    background: `repeating-linear-gradient(
                        -45deg,
                        #000000 0px,
                        #000000 12px,
                        #ffffff 12px,
                        #ffffff 24px
                    )`
                }}></div>

                {/* 가로 구분선 - 중앙에 검은 선 */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-black transform -translate-y-0.5 z-10"></div>

                {/* 은색 동그라미 - 왼쪽 상단 */}
                <div className="absolute top-2 left-3 w-6 h-6 rounded-full z-20" style={{
                    background: `radial-gradient(circle at 30% 30%,
                        #ffffff 0%,
                        #e5e7eb 15%,
                        #9ca3af 40%,
                        #6b7280 70%,
                        #374151 90%,
                        #1f2937 100%
                    )`,
                    boxShadow: `
                        inset 1px 1px 2px rgba(255, 255, 255, 0.8),
                        inset -1px -1px 2px rgba(0, 0, 0, 0.3),
                        0 2px 4px rgba(0, 0, 0, 0.2)
                    `
                }}></div>
            </div>

            {/* 클래퍼보드 메인 영역 - 검은색 배경 */}
            <div className="bg-black p-4 relative">
                {/* 상단 영역: 좌상(Scene Number) + 우상(Narration) */}
                <div className="flex">
                    {/* 좌상: Scene Number */}
                    <div className="flex-shrink-0 w-28">
                        <div className="bg-black p-3 text-center">
                            <div className="text-base text-white font-bold mb-1">SCENE</div>
                            <div className="text-2xl font-black text-white">{sceneData.sceneNumber}</div>
                            <div className="text-sm text-white font-bold mt-1">{sceneData.sceneDuration.toFixed(1)}s</div>
                        </div>
                    </div>

                    {/* 세로 구분선 */}
                    <div className="w-0.5 bg-white flex-shrink-0"></div>

                    {/* 우상: Narration */}
                    <div className="flex-1 pl-3">
                        <div className="bg-black p-3 h-full">
                            <div className="text-base text-white font-bold mb-2 text-center">NARRATION</div>
                            <p className="text-sm text-white font-semibold leading-relaxed line-clamp-3 italic">
                                {`"${sceneData.narration}"`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 가로 구분선 */}
                <div className="h-0.5 bg-white"></div>

                {/* 하단: Scene Description */}
                <div className="bg-black p-3">
                    <div className="text-base text-white font-bold mb-2 text-center">SCENE DESCRIPTION</div>
                    <p className="text-sm text-white font-semibold leading-relaxed line-clamp-4">
                        {sceneData.imageGenPromptDirective}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default memo(StoryboardItem);