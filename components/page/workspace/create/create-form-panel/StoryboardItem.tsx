'use client'

import {memo} from "react";
import {SceneData} from "@/lib/api/types/supabase/VideoGenerationTasks";

interface StoryboardItemProps {
    sceneData: SceneData;
    isVoicePlayingScene: boolean;
}

function StoryboardItem({
    sceneData,
    isVoicePlayingScene,
}: StoryboardItemProps) {
    return (
        <div className={`bg-zinc-950 rounded-xl overflow-hidden transition-all duration-300 relative ${
            isVoicePlayingScene
                ? 'border border-red-500/50 shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)]'
                : 'border border-white/10'
        }`}>
            {/* 클래퍼보드 상단 - 클랩 스틱 부분 (대비 완화) */}
            <div className="bg-zinc-800 border-b border-white/10 relative overflow-hidden" style={{height: '32px'}}>
                {/* 상단 줄무늬 - 오른쪽 향하는 대각선 */}
                <div className="absolute top-0 left-0 right-0 h-1/2" style={{
                    background: `repeating-linear-gradient(
                        45deg,
                        #3f3f46 0px,
                        #3f3f46 12px,
                        #18181b 12px,
                        #18181b 24px
                    )`
                }}></div>

                {/* 하단 줄무늬 - 왼쪽 향하는 대각선 */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2" style={{
                    background: `repeating-linear-gradient(
                        ${-(45 + 180)}deg,
                        #3f3f46 0px,
                        #3f3f46 12px,
                        #18181b 12px,
                        #18181b 24px
                    )`
                }}></div>

                {/* 가로 구분선 - 중앙 */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-zinc-950 transform -translate-y-px z-10"></div>

                {/* 은색 동그라미 - 힌지 장식 */}
                <div className="absolute top-1.5 left-3 w-5 h-5 rounded-full z-20 bg-zinc-400" style={{
                    background: `radial-gradient(circle at 30% 30%, #d4d4d8 0%, #a1a1aa 40%, #52525b 80%, #3f3f46 100%)`,
                    boxShadow: `inset 1px 1px 2px rgba(255, 255, 255, 0.4), inset -1px -1px 2px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0,0,0,0.5)`
                }}></div>
            </div>

            {/* 클래퍼보드 메인 영역 */}
            <div className="bg-zinc-950 p-4 relative">
                {/* LIVE 배지 - 우상단 (재생 중일 때만 표시, 펄스 약하게) */}
                {isVoicePlayingScene && (
                    <div className="absolute top-3 right-3 z-30 flex items-center space-x-1.5 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md backdrop-blur-sm">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-400 text-[10px] font-bold tracking-wider">LIVE</span>
                    </div>
                )}

                {/* 상단 영역: 좌상(Scene Number) + 우상(Narration) */}
                <div className="flex">
                    {/* 좌상: Scene Number */}
                    <div className="flex-shrink-0 w-24 border-r border-white/5 pr-4">
                        <div className="text-center h-full flex flex-col justify-center">
                            <div className="text-[10px] text-zinc-500 font-medium tracking-widest mb-1">SCENE</div>
                            <div className="text-3xl font-bold text-zinc-100">{sceneData.sceneNumber}</div>
                            <div className="text-[11px] text-zinc-400 font-medium mt-1">{sceneData.sceneDuration.toFixed(1)}s</div>
                        </div>
                    </div>

                    {/* 우상: Narration */}
                    <div className="flex-1 pl-4 min-w-0">
                        <div className="h-full flex flex-col">
                            <div className="text-[10px] text-zinc-500 font-medium tracking-widest mb-1.5">NARRATION</div>
                            <p className="text-[13px] text-zinc-300 font-medium leading-relaxed italic line-clamp-4">
                                "{sceneData.narration}"
                            </p>
                        </div>
                    </div>
                </div>

                {/* 가로 구분선 */}
                <div className="h-px bg-white/5 my-4"></div>

                {/* 하단: Scene Description */}
                <div>
                    <div className="text-[10px] text-zinc-500 font-medium tracking-widest mb-1.5">SCENE DESCRIPTION</div>
                    <p className="text-[13px] text-zinc-400 font-medium leading-relaxed">
                        {sceneData.imageGenPromptDirective}
                    </p>
                </div>
            </div>
        </div>
    )
}

export default memo(StoryboardItem);