import {memo, useCallback, useState, ChangeEvent} from "react";
import {AlertTriangle, Sparkles, X} from "lucide-react";
import {ScriptGenerationRequest} from "@/api/types/open-ai/ScriptGeneration";
import {openAIClientAPI} from "@/api/client/openAIClientAPI";

interface ScriptGenerationModalProps {
    isGeneratingScript: boolean;
    onClickClose: () => void;
    onChangeIsGeneratingScript: (isGenerating: boolean) => void;
    onFinishGeneratingScript: (script: string) => void;
}

function ScriptGenerationModal({
    isGeneratingScript,
    onClickClose,
    onChangeIsGeneratingScript,
    onFinishGeneratingScript,
}: ScriptGenerationModalProps) {
    const [aiPrompt, setAiPrompt] = useState('');

    const onChangeAiPrompt = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
        setAiPrompt(e.target.value);
    }, []);

    const onClickGenerateScript = useCallback(async () => {
        if (!aiPrompt.trim()) return;

        onChangeIsGeneratingScript(true);

        try {
            // API 요청 데이터 구성
            const requestData: ScriptGenerationRequest = {
                userPrompt: aiPrompt,
            };

            console.log('Generating script with data:', requestData);

            // OpenAI API 호출
            const result = await openAIClientAPI.postOpenAIScript(requestData);

            if (!result.data) {
                throw new Error("Failed to generate script.");
            }

            onFinishGeneratingScript(result.data.script);
            setAiPrompt('');

        } catch (error) {
            console.error('Error generating script:', error);
            alert('An error occurred while generating script. Please try again.');
            onChangeIsGeneratingScript(false);
        }
    }, [aiPrompt, onChangeIsGeneratingScript, onFinishGeneratingScript]);

    return (
        <div
            onClick={onClickClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-900/95 backdrop-blur-sm border border-purple-500/30 rounded-xl max-w-lg w-full mx-4 overflow-hidden shadow-2xl"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-purple-300">
                            Generate Script with AI
                        </h3>
                        {!isGeneratingScript && <button
                            onClick={onClickClose}
                            className="text-gray-400 hover:text-pink-400 transition-colors p-1 rounded-lg hover:bg-gray-800/50"
                        >
                            <X size={18} />
                        </button>}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">What do you want to create?</label>
                            <textarea
                                // placeholder="Tell me about Elon Musk's early SpaceX struggles"
                                placeholder={`- Tell me about Elon Musk's early SpaceX struggles
- Air Jordan, 30 secs, 5 scenes, for Youtube Shorts
- George Washington's story, 8 scenes
- Tell me about NWA, 1 minute 
`}
                                value={aiPrompt}
                                onChange={onChangeAiPrompt}
                                rows={4}
                                className="w-full min-w-[120px] bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-400 focus:outline-none resize-none placeholder-gray-400 transition-all"
                            />
                        </div>

                        {/* Warning Message - Simplified */}
                        <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3">
                            <div className="flex items-start space-x-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-amber-100">
                                    <p className="font-medium">Be specific to avoid wasting credits</p>
                                    <p className="text-xs text-amber-200 mt-1">Vague requests may produce unwanted results.</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClickGenerateScript}
                            disabled={isGeneratingScript || !aiPrompt.trim()}
                            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25"
                        >
                            {isGeneratingScript ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    <span>Generate Script</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default memo(ScriptGenerationModal);