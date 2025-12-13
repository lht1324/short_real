import {ChangeEvent, memo, useCallback, useMemo, useState} from "react";
import {Coins, Film, Play, Sparkles, Square} from "lucide-react";
import {SceneData} from "@/api/types/supabase/VideoGenerationTasks";
import StoryboardSection from "@/components/page/workspace/create/create-form-panel/StoryboardSection";
import {PostOpenAISceneRequest} from "@/api/types/api/open-ai/scene/PostOpenAISceneRequest";
import {openAIClientAPI} from "@/api/client/openAIClientAPI";
import {StoryboardData} from "@/api/types/api/open-ai/scene/PostOpenAISceneResponse";

interface CreateFormPanelProps {
    script: string;
    sceneDataList: SceneData[];
    videoTitle: string | null;
    videoDescription: string | null;
    voiceUrl: string | null;
    selectedVoiceId: string;
    expectedVideoTotalDuration: number;
    isGeneratingStoryboardData: boolean;
    onChangeScript: (e: ChangeEvent<HTMLTextAreaElement>) => void;
    onClickGenerateWithAI: () => void;
    onClickGenerateStoryboard: () => void;
}

function CreateFormPanel({
    script,
    sceneDataList,
    videoTitle,
    videoDescription,
    voiceUrl,
    selectedVoiceId,
    expectedVideoTotalDuration,
    isGeneratingStoryboardData,
    onChangeScript,
    onClickGenerateWithAI,
    onClickGenerateStoryboard,
}: CreateFormPanelProps) {
    // 예상 영상 시간 계산 (2.5단어/초 기준)
    const estimatedDuration = useMemo(() => {
        if (!script.trim()) return 0;
        const wordCount = script.split(' ').length;
        return Math.round(wordCount / 2.5);
    }, [script]);

    return (
        <div className="flex-[4.3] bg-gray-900/30 backdrop-blur-sm border-r border-purple-500/20 overflow-y-auto">
            <div className="p-6">
                <div className="text-purple-300 text-2xl font-medium mb-6">Create New Video</div>

                <div className="space-y-6">

                    {/* Script Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                                <label className="block text-xl font-semibold text-purple-300">
                                    Script
                                </label>
                                {script.trim() && (
                                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-sm font-medium rounded border border-blue-400/30">
                                        ~{estimatedDuration}s
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={onClickGenerateWithAI}
                                className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center space-x-1"
                            >
                                <Sparkles size={14} />
                                <span>Generate with AI</span>
                            </button>
                        </div>
                        <textarea
                            value={script}
                            onChange={onChangeScript}
                            placeholder="Describe what you want to create. Be as detailed as possible..."
                            rows={6}
                            className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all resize-none text-base"
                        />
                    </div>

                    {/* Storyboard Section */}
                    <StoryboardSection
                        script={script}
                        sceneDataList={sceneDataList}
                        videoTitle={videoTitle}
                        videoDescription={videoDescription}
                        voiceUrl={voiceUrl}
                        expectedVideoTotalDuration={expectedVideoTotalDuration}
                        selectedVoiceId={selectedVoiceId}
                        isGeneratingStoryboardData={isGeneratingStoryboardData}
                        onClickGenerateStoryboard={onClickGenerateStoryboard}
                    />

                    {/* Visual Style Selection */}
                    {/*<div>*/}
                    {/*    <button*/}
                    {/*        type="button"*/}
                    {/*        onClick={() => setIsStyleExpanded(!isStyleExpanded)}*/}
                    {/*        className="flex items-center text-xl font-semibold text-purple-300 mb-4 hover:text-purple-200 transition-colors"*/}
                    {/*    >*/}
                    {/*        <span>Visual Style</span>*/}
                    {/*        <span className="ml-2">*/}
                    {/*            {isStyleExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}*/}
                    {/*        </span>*/}
                    {/*    </button>*/}
                    {/*    {isStyleExpanded && (*/}
                    {/*        <div className="grid grid-cols-2 gap-3">*/}
                    {/*        {styleList.map((style) => (*/}
                    {/*            <button*/}
                    {/*                key={style.id}*/}
                    {/*                onClick={() => { setSelectedStyleId(style.id); }}*/}
                    {/*                className={`w-full p-3 rounded-lg border transition-all text-left ${*/}
                    {/*                    selectedStyleId === style.id*/}
                    {/*                        ? 'border-pink-500 bg-pink-500/10'*/}
                    {/*                        : 'border-purple-500/30 bg-gray-800/30 hover:border-purple-400/50'*/}
                    {/*                }`}*/}
                    {/*            >*/}
                    {/*                <div className="text-white font-medium text-base">{style.name}</div>*/}
                    {/*                <div className="text-gray-400 text-sm mt-1">{style.description}</div>*/}
                    {/*            </button>*/}
                    {/*        ))}*/}
                    {/*        </div>*/}
                    {/*    )}*/}
                    {/*</div>*/}
                </div>
            </div>
        </div>
    )
}

export default memo(CreateFormPanel);