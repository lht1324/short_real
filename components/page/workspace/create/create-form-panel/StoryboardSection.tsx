import {memo, useCallback, useEffect, useRef, useState} from "react";
import {AlertTriangle, Coins, Film, Play, Square, Loader2, CheckCircle2, Circle} from "lucide-react";
import StoryboardItem from "@/components/page/workspace/create/create-form-panel/StoryboardItem";
import {SceneData} from "@/lib/api/types/supabase/VideoGenerationTasks";

interface StoryboardSectionProps {
    script: string;
    sceneDataList: SceneData[];
    videoTitle: string | null;
    videoDescription: string | null;
    voiceUrl: string | null;
    expectedVideoTotalDuration: number;
    selectedVoiceId: string;
    isGeneratingStoryboardData: boolean;
    onClickGenerateStoryboard: () => void;
}

function StoryboardSection({
    script,
    sceneDataList,
    videoTitle,
    videoDescription,
    voiceUrl,
    expectedVideoTotalDuration,
    selectedVoiceId,
    isGeneratingStoryboardData,
    onClickGenerateStoryboard,
}: StoryboardSectionProps) {
    const narrationPreviewRef = useRef<HTMLAudioElement | null>(null);

    const [isPlayingVoice, setIsPlayingVoice] = useState<boolean>(false);
    const [currentPlayTime, setCurrentPlayTime] = useState<number>(0);

    const onClickPlayAndStopButton = useCallback(async () => {
        if (!voiceUrl) return;

        if (isPlayingVoice) {
            // 재생 중일 때: 정지
            if (narrationPreviewRef.current) {
                narrationPreviewRef.current.pause();
                narrationPreviewRef.current.currentTime = 0;
            }
            setIsPlayingVoice(false);
            setCurrentPlayTime(0);
        } else {
            // 재생 중이 아닐 때: 재생
            if (!narrationPreviewRef.current) {
                narrationPreviewRef.current = new Audio(voiceUrl);
                narrationPreviewRef.current.onended = () => {
                    setIsPlayingVoice(false);
                    setCurrentPlayTime(0);
                };
                narrationPreviewRef.current.ontimeupdate = () => {
                    if (narrationPreviewRef.current) {
                        setCurrentPlayTime(narrationPreviewRef.current.currentTime);
                    }
                };
            } else {
                // voiceUrl이 변경되었을 수 있으므로 src 업데이트
                narrationPreviewRef.current.src = voiceUrl;
                narrationPreviewRef.current.currentTime = 0;
            }
            await narrationPreviewRef.current.play();
            setIsPlayingVoice(true);
        }
    }, [voiceUrl, isPlayingVoice]);

    // 컴포넌트 언마운트 시 오디오 정지
    useEffect(() => {
        return () => {
            if (narrationPreviewRef.current) {
                narrationPreviewRef.current.pause();
                narrationPreviewRef.current = null;
            }
        };
    }, []);

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <label className="block text-[15px] font-medium text-zinc-100 uppercase tracking-wider">
                        Storyboard
                    </label>
                    {voiceUrl && (
                        <button
                            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                            onClick={onClickPlayAndStopButton}
                        >
                            {isPlayingVoice ? (
                                <Square size={12} className="text-zinc-300" fill="currentColor" />
                            ) : (
                                <Play size={12} className="text-zinc-300" fill="currentColor" />
                            )}
                            <span className="text-xs text-zinc-300 font-medium ml-0.5">Preview Voice</span>
                        </button>
                    )}
                    {!isGeneratingStoryboardData && <label className="text-xs text-zinc-500 font-medium">
                        {expectedVideoTotalDuration.toFixed(1)} secs
                    </label>}
                </div>
                <div className="relative group">
                    <div className="flex flex-row space-x-2 items-center">
                        <button
                            type="button"
                            onClick={onClickGenerateStoryboard}
                            disabled={isGeneratingStoryboardData || !script.trim() || !selectedVoiceId}
                            className="px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                        >
                            {isGeneratingStoryboardData ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Generating...</span>
                                </>
                            ) : (sceneDataList.length > 0 || !!videoTitle) ? (
                                <span>Regenerate Storyboard</span>
                            ) : (
                                <span>Generate Storyboard</span>
                            )}
                        </button>
                    </div>

                    {/* 툴팁 오버레이 */}
                    {(!script.trim() || !selectedVoiceId) && (
                        <div className="absolute top-full right-0 mt-3 w-56 bg-zinc-900 border border-white/10 rounded-lg p-3.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Requirements</div>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-[13px]">
                                    {script.trim() ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-zinc-700" />}
                                    <span className={script.trim() ? 'text-zinc-200' : 'text-zinc-500'}>
                                        Script written
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2 text-[13px]">
                                    {selectedVoiceId ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-zinc-700" />}
                                    <span className={selectedVoiceId ? 'text-zinc-200' : 'text-zinc-500'}>
                                        Voice selected
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Storyboard 그리드 */}
            {sceneDataList.length !== 0 && videoTitle && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
                    {sceneDataList.sort((a, b) => {
                        return a.sceneNumber - b.sceneNumber;
                    }).map((sceneData) => {
                        const sceneSubtitleSegmentList = sceneData.sceneSubtitleSegments ?? [];
                        const isVoicePlayingScene = isPlayingVoice && sceneSubtitleSegmentList && sceneSubtitleSegmentList.length > 0
                            ? currentPlayTime >= sceneSubtitleSegmentList[0].startSec &&
                            currentPlayTime <= sceneSubtitleSegmentList[sceneSubtitleSegmentList.length - 1].endSec
                            : false;

                        return <StoryboardItem
                            key={sceneData.sceneNumber}
                            sceneData={sceneData}
                            isVoicePlayingScene={isVoicePlayingScene}
                        />
                    })}
                </div>
            )}

            {/* 로딩 상태 또는 빈 상태 메시지 */}
            {sceneDataList.length === 0 && (
                <div className="text-center py-12 px-4 bg-zinc-900/30 border border-white/5 rounded-xl">
                    {isGeneratingStoryboardData ? (
                        // 로딩 중 상태
                        <>
                            <div className="text-zinc-400 mb-4">
                                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />
                                </div>
                            </div>
                            <p className="text-[15px] text-zinc-200 font-medium mb-1.5">AI Screenwriter at Work</p>
                            <p className="text-[13px] text-zinc-500">Crafting your storyboard with cinematic precision...</p>
                        </>
                    ) : (
                        // 빈 상태
                        <>
                            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Film className="w-5 h-5 text-zinc-600" />
                            </div>
                            <p className="text-[15px] text-zinc-300 font-medium">No storyboard generated yet</p>
                            <p className="text-[13px] text-zinc-500 mt-1">Write your script and generate to see the scene breakdown.</p>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default memo(StoryboardSection);