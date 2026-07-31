import {memo, useCallback, useState, ChangeEvent} from "react";
import {AlertTriangle, Sparkles, X, Loader2} from "lucide-react";
import {ScriptGenerationRequest} from "@/lib/api/types/open-ai/ScriptGeneration";
import {openAIClientAPI} from "@/lib/api/client/openAIClientAPI";

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
                className="bg-zinc-900 border border-white/10 rounded-xl max-w-lg w-full mx-4 overflow-hidden shadow-2xl"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-zinc-100">
                            Generate Script with AI
                        </h3>
                        {!isGeneratingScript && <button
                            onClick={onClickClose}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded hover:bg-white/5"
                        >
                            <X size={16} />
                        </button>}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[13px] font-medium text-zinc-400 mb-2">What do you want to create?</label>
                            <textarea
                                placeholder={`- Tell me about Elon Musk's early SpaceX struggles
- Air Jordan, 30 secs, 5 scenes, for Youtube Shorts
- George Washington's story, 8 scenes
- Tell me about NWA, 1 minute 
`}
                                value={aiPrompt}
                                onChange={onChangeAiPrompt}
                                rows={4}
                                className="w-full min-w-[120px] bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-zinc-100 text-[13px] focus:border-zinc-500 focus:outline-none resize-none placeholder-zinc-600 transition-all leading-relaxed"
                            />
                        </div>

                        <button
                            onClick={onClickGenerateScript}
                            disabled={isGeneratingScript || !aiPrompt.trim()}
                            className="w-full bg-white hover:bg-zinc-200 text-black px-4 py-2.5 rounded-lg font-medium text-[13px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm"
                        >
                            {isGeneratingScript ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={14} className="text-indigo-600" />
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