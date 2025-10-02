'use client'

import {memo, useCallback, useMemo} from "react";
import {TaskData} from "@/components/page/workspace/dashboard/WorkspaceDashboardPageClient";
import {VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {Calendar, Clock, FileVideo, Download, X, Edit, AlertCircle, Loader2} from "lucide-react";
import Link from "next/link";

enum StatusGroup {
    PROCESSING = 'processing',
    EDITING = 'editing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    UNKNOWN = 'unknown',
}

interface DashboardItemProps {
    taskData: TaskData;
    onClickCancel: (taskId: string) => void;
    onClickDownload: (taskId: string) => void;
    onClickRetry: (taskId: string) => void;
}

function DashboardItem({
    taskData,
    onClickCancel,
    onClickDownload,
    onClickRetry,
}: DashboardItemProps) {
    // ==================== 상태 그룹핑 ====================
    const statusGroup = useMemo(() => {
        switch (taskData.status) {
            case VideoGenerationTaskStatus.DRAFTING:
            case VideoGenerationTaskStatus.GENERATING_VOICE:
            case VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT:
            case VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT:
            case VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT:
            case VideoGenerationTaskStatus.GENERATING_VIDEO:
            case VideoGenerationTaskStatus.STITCHING_VIDEOS:
            case VideoGenerationTaskStatus.MERGING_VIDEO_AND_AUDIO:
            case VideoGenerationTaskStatus.COMPOSING_MUSIC:
                return StatusGroup.PROCESSING;
            case VideoGenerationTaskStatus.EDITOR:
                return StatusGroup.EDITING;
            case VideoGenerationTaskStatus.COMPLETED:
                return StatusGroup.COMPLETED;
            case VideoGenerationTaskStatus.FAILED:
                return StatusGroup.FAILED;
            default:
                return StatusGroup.UNKNOWN;
        }
    }, [taskData.status]);

    const statusData = useMemo((): {
        tailWindGradient: string;
        description: string;
        emoji: string;
    } => {
        const status = taskData.status;
        const sceneCount = taskData.sceneCount;
        const processedSceneCount = taskData.processedSceneCount;

        switch (status) {
            case VideoGenerationTaskStatus.DRAFTING: return {
                tailWindGradient: 'from-purple-500 to-pink-500',
                description: 'Drafting script...',
                emoji: '📝'
            };
            case VideoGenerationTaskStatus.GENERATING_VOICE: return {
                tailWindGradient: 'from-blue-500 to-indigo-500',
                description: 'Voice actor is recording narration',
                emoji: '🎤'
            };
            case VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT: return {
                tailWindGradient: 'from-violet-500 to-purple-600',
                description: 'Art director is crafting style guide',
                emoji: '🎨'
            };
            case VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT: return {
                tailWindGradient: 'from-fuchsia-500 to-pink-600',
                description: 'Storyboard artist is designing scenes',
                emoji: '🖼️'
            };
            case VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT: return {
                tailWindGradient: 'from-indigo-500 to-blue-600',
                description: 'Cinematographer is planning camera work',
                emoji: '🎬'
            };
            case VideoGenerationTaskStatus.GENERATING_VIDEO: return {
                tailWindGradient: 'from-sky-500 to-cyan-500',
                description: `Director is shooting scenes (${processedSceneCount}/${sceneCount})`,
                emoji: '🎥'
            };
            case VideoGenerationTaskStatus.STITCHING_VIDEOS: return {
                tailWindGradient: 'from-teal-500 to-emerald-500',
                description: 'Editor is stitching clips together',
                emoji: '📼'
            };
            case VideoGenerationTaskStatus.MERGING_VIDEO_AND_AUDIO: return {
                tailWindGradient: 'from-amber-500 to-orange-500',
                description: 'Sound engineer is mixing audio',
                emoji: '🎧'
            };
            case VideoGenerationTaskStatus.COMPOSING_MUSIC: return {
                tailWindGradient: 'from-rose-500 to-red-500',
                description: 'Composer is creating background music',
                emoji: '🎹'
            };
            case VideoGenerationTaskStatus.EDITOR: return {
                tailWindGradient: 'from-cyan-500 to-blue-500',
                description: 'Ready for editing',
                emoji: '💻'
            };
            case VideoGenerationTaskStatus.COMPLETED: return {
                tailWindGradient: 'from-green-500 to-emerald-500',
                description: 'Completed',
                emoji: '✅'
            };
            case VideoGenerationTaskStatus.FAILED: return {
                tailWindGradient: 'from-red-500 to-pink-600',
                description: 'Failed',
                emoji: '❌'
            };
            default: return {
                tailWindGradient: 'from-gray-500 to-gray-600',
                description: 'Unknown status',
                emoji: '❓'
            };
        }
    }, [taskData]);

    // ==================== 시간 포맷 ====================
    const formatDate = useCallback((date: Date) => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }, []);

    const formatRelativeTime = useCallback((date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }, []);

    // ==================== 이벤트 핸들러 ====================
    const handleCancel = useCallback(() => {
        if (onClickCancel) {
            onClickCancel(taskData.id);
        }
    }, [taskData.id, onClickCancel]);

    const handleDownload = useCallback(() => {
        if (onClickDownload) {
            onClickDownload(taskData.id);
        }
    }, [taskData.id, onClickDownload]);

    const handleRetry = useCallback(() => {
        if (onClickRetry) {
            onClickRetry(taskData.id);
        }
    }, [taskData.id, onClickRetry]);

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6 hover:bg-gray-800/70 transition-all duration-300">
            <div className="flex items-start justify-between">
                {/* ==================== 왼쪽: 정보 영역 ==================== */}
                <div className="flex-1">
                    {/* 제목 */}
                    <h3 className="text-xl font-semibold text-white mb-3">
                        {taskData.title || 'Untitled Task'}
                    </h3>

                    {/* 메타 정보 행 1: 날짜, 씬 개수 */}
                    {(taskData.createdAt || taskData.sceneCount) && <div className="flex items-center space-x-6 text-gray-300 mb-2">
                        {taskData.createdAt && <span className="flex items-center space-x-2">
                            <Calendar size={16} className="text-purple-400" />
                            <span>Started: {formatDate(taskData.createdAt)}</span>
                        </span>}
                        {taskData.sceneCount && <span className="flex items-center space-x-2">
                            <FileVideo size={16} className="text-cyan-400" />
                            <span>{taskData.sceneCount} scenes</span>
                        </span>}
                    </div>}

                    {/* 메타 정보 행 2: 업데이트 시간 */}
                    {taskData.updatedAt && <div className="flex items-center space-x-2 text-gray-400 text-sm mb-3">
                        <Clock size={14} className="text-gray-500" />
                        <span>Last updated: {formatRelativeTime(taskData.updatedAt)}</span>
                    </div>}

                    {/* 상태 텍스트 */}
                    <div className="flex items-center space-x-2">
                        <div className="flex p-1 w-8 h-8 rounded-full bg-white items-center justify-center">
                            <span className="text-base">
                                {statusData.emoji}
                            </span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${statusData.tailWindGradient} text-white backdrop-blur-sm`}>
                            {statusData.description}
                        </span>
                    </div>

                    {/* ==================== Processing 상태: 진행률 바 ==================== */}
                    {statusGroup === StatusGroup.PROCESSING && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-400">
                                    {taskData.currentStep} / {taskData.totalStep}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {taskData.progress}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden relative">
                                <div
                                    className={`bg-gradient-to-r ${statusData.tailWindGradient} rounded-full h-full transition-all duration-500 relative overflow-hidden`}
                                    style={{ width: `${taskData.progress}%` }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ==================== Failed 상태: 에러 메시지 ==================== */}
                    {statusGroup === StatusGroup.FAILED && (
                        <div className="mt-4 flex items-start space-x-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-red-400 text-sm font-medium mb-1">Task failed</p>
                                <p className="text-gray-400 text-xs">
                                    An error occurred during video generation. Please try again.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ==================== Completed 상태: 선택된 옵션 표시 ==================== */}
                    {statusGroup === StatusGroup.COMPLETED && (taskData.selectedVoiceId || taskData.selectedStyleId) && (
                        <div className="mt-4 flex items-center space-x-4">
                            <div className="flex items-center space-x-2 text-xs text-gray-400">
                                {taskData.selectedVoiceId && (
                                    <span className="px-2 py-1 bg-purple-500/20 rounded border border-purple-500/30">
                                        Voice
                                    </span>
                                )}
                                {taskData.selectedStyleId && (
                                    <span className="px-2 py-1 bg-pink-500/20 rounded border border-pink-500/30">
                                        Style
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ==================== 오른쪽: 액션 버튼 영역 ==================== */}
                <div className="flex items-center space-x-3 ml-6">
                    {/* Editing 상태: Edit 버튼 */}
                    {statusGroup === StatusGroup.EDITING && (
                        <Link
                            href={`/workspace/editor?taskId=${taskData.id}`}
                            className="group bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-500/25 flex items-center space-x-2"
                        >
                            <Edit size={14} />
                            <span>Edit Video</span>
                        </Link>
                    )}

                    {/* Completed 상태: Download 버튼 */}
                    {statusGroup === StatusGroup.COMPLETED && (
                        <button
                            onClick={() => {
                                onClickDownload(taskData.id);
                            }}
                            className="group bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25 flex items-center space-x-2"
                        >
                            <Download size={14} />
                            <span>Download</span>
                        </button>
                    )}

                    {/* Processing/Editing 상태: Cancel 버튼 */}
                    {(statusGroup === StatusGroup.PROCESSING || statusGroup === StatusGroup.EDITING) && (
                        <button
                            onClick={() => {
                                onClickCancel(taskData.id);
                            }}
                            className="group bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-red-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/25 flex items-center space-x-2"
                        >
                            <X size={14} />
                            <span>Cancel</span>
                        </button>
                    )}

                    {/* Failed 상태: Retry 버튼 */}
                    {statusGroup === StatusGroup.FAILED && (
                        <button
                            onClick={() => {
                                onClickRetry(taskData.id);
                            }}
                            className="group bg-gradient-to-r from-orange-500 to-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-orange-600 hover:to-yellow-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-orange-500/25 flex items-center space-x-2"
                        >
                            <Loader2 size={14} />
                            <span>Retry</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default memo(DashboardItem);