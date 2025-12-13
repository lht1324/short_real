import {memo, useCallback, useEffect, useRef, useState} from "react";
import {Coins, Film, Play, Square} from "lucide-react";
import StoryboardItem from "@/components/page/workspace/create/create-form-panel/StoryboardItem";
import {SceneData} from "@/api/types/supabase/VideoGenerationTasks";

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
                    <label className="block text-xl font-semibold text-purple-300">
                        Storyboard
                    </label>
                    {voiceUrl && (
                        <button
                            className="flex items-center space-x-1 px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 transition-colors border border-purple-400/30"
                            onClick={onClickPlayAndStopButton}
                        >
                            {isPlayingVoice ? (
                                <Square size={12} className="text-purple-300" />
                            ) : (
                                <Play size={12} className="text-purple-300" />
                            )}
                            <span className="text-xs text-purple-300 font-medium">Preview</span>
                        </button>
                    )}
                    {!isGeneratingStoryboardData && <label className="text-xs text-purple-300 font-medium">
                        {expectedVideoTotalDuration.toFixed(1)} secs
                    </label>}
                </div>
                <div className="relative group">
                    <div className="flex flex-row space-x-2 items-center">
                        {sceneDataList.length > 0 && videoTitle && videoDescription && (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-white/10 rounded-lg">
                                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                                <span className="text-xs font-medium">-2</span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={onClickGenerateStoryboard}
                            disabled={isGeneratingStoryboardData || !script.trim() || !selectedVoiceId}
                            className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                        >
                            {isGeneratingStoryboardData ? (
                                <>
                                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Generating...</span>
                                </>
                            ) : sceneDataList.length === 0 && !videoTitle ? (
                                <span>Generate Storyboard</span>
                            ) : (
                                <span>Regenerate Storyboard</span>
                            )}
                        </button>
                    </div>

                    {/* 툴팁 오버레이 */}
                    {(!script.trim() || !selectedVoiceId) && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-sm border border-purple-500/30 rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-xl">
                            <div className="text-xs font-medium text-purple-300 mb-2">Requirements</div>
                            <div className="space-y-1.5">
                                <div className="flex items-center space-x-2 text-xs">
                                    <span>{script.trim() ? '🟢' : '🔴'}</span>
                                    <span className={script.trim() ? 'text-green-300' : 'text-gray-400'}>
                                                            Script written
                                                        </span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs">
                                    <span>{selectedVoiceId ? '🟢' : '🔴'}</span>
                                    <span className={selectedVoiceId ? 'text-green-300' : 'text-gray-400'}>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
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
                <div className="text-center py-8 px-4 bg-gray-800/30 border border-gray-600/30 rounded-lg">
                    {isGeneratingStoryboardData ? (
                        // 로딩 중 상태
                        <>
                            <div className="text-purple-400 mb-4">
                                <div className="w-16 h-16 mx-auto mb-4 relative">
                                    <div className="absolute inset-0 border-4 border-purple-200/20 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                                    <div className="absolute inset-2 border-2 border-purple-300/40 border-b-transparent rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                                </div>
                            </div>
                            <p className="text-base text-purple-300 font-medium mb-2">AI Screenwriter at Work</p>
                            <p className="text-sm text-gray-400">Crafting your storyboard with cinematic precision...</p>
                            <div className="mt-4 flex justify-center space-x-1">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                            </div>
                        </>
                    ) : (
                        // 빈 상태
                        <>
                            <div className="text-gray-400 mb-2">
                                <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            </div>
                            <p className="text-base text-gray-400 font-medium">No storyboard generated yet</p>
                            <p className="text-sm text-gray-500 mt-1">Generate a storyboard to see scene breakdown</p>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default memo(StoryboardSection);