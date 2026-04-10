'use client'

import {memo, ReactNode, useCallback, useMemo, useState} from "react";
import {TaskData} from "@/components/page/workspace/dashboard/WorkspaceDashboardPageClient";
import {ExportPlatform, VideoGenerationTaskStatus} from "@/lib/api/types/supabase/VideoGenerationTasks";
import {
    AlertCircle,
    Calendar,
    Clock, Coins,
    Download,
    Edit,
    FileVideo,
    Image as ImageIcon,
    Loader2,
    Pencil,
    Share2,
    Wrench,
    X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
    RETRY_CREDIT_MUSIC_GENERATION,
    RETRY_CREDIT_PER_SCENE,
    RETRY_CREDIT_PER_VIDEO_DURATION
} from "@/lib/ADDITIONAL_CREDIT_AMOUNT";

enum StatusGroup {
    CREATING = 'creating',
    PROCESSING = 'processing',
    EDITING = 'editing',
    COMPLETED = 'completed',
    // FAILED = 'failed',
    UNKNOWN = 'unknown',
}

interface DashboardItemProps {
    taskData: TaskData;
    index: number;
    onClickEdit: (taskId: string) => void;
    onClickExport: (taskId: string, platform: ExportPlatform) => Promise<void>;
    onClickDownload: (taskId: string) => void;
    onClickRetry: (taskId: string) => void;
    onClickCancel: (taskId: string, status: VideoGenerationTaskStatus) => void;
}

function DashboardItem({
    taskData,
    index,
    onClickEdit,
    onClickExport,
    onClickDownload,
    onClickRetry,
    onClickCancel,
}: DashboardItemProps) {
    // ==================== 상태 그룹핑 ====================
    const statusGroup = useMemo(() => {
        switch (taskData.status) {
            case VideoGenerationTaskStatus.GENERATING_VOICE:
            case VideoGenerationTaskStatus.DRAFTING:
                return StatusGroup.CREATING;
            case VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT:
            case VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT:
            case VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT:
            case VideoGenerationTaskStatus.GENERATING_VIDEO:
            case VideoGenerationTaskStatus.STITCHING_VIDEOS:
            case VideoGenerationTaskStatus.COMPOSING_MUSIC:
            case VideoGenerationTaskStatus.FINALIZING:
                return StatusGroup.PROCESSING;
            case VideoGenerationTaskStatus.EDITOR:
                return StatusGroup.EDITING;
            case VideoGenerationTaskStatus.COMPLETED:
                return StatusGroup.COMPLETED;
            // case VideoGenerationTaskStatus.FAILED:
            //     return StatusGroup.FAILED;
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

        if (!taskData.isGenerationFailed) {
            switch (status) {
                // 의도됨
                case VideoGenerationTaskStatus.DRAFTING:
                case VideoGenerationTaskStatus.GENERATING_VOICE: return {
                    tailWindGradient: 'from-slate-500 to-zinc-400',
                    description: 'Drafting script...',
                    emoji: '📝'
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
                    tailWindGradient: 'from-amber-400 to-yellow-500',
                    description: `Director is shooting scenes (${processedSceneCount}/${sceneCount})`,
                    emoji: '🎥'
                };
                // 의도됨
                case VideoGenerationTaskStatus.STITCHING_VIDEOS: return {
                    tailWindGradient: 'from-blue-500 to-indigo-500',
                    description: 'Voice actor is recording into video',
                    emoji: '🎤'
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
                case VideoGenerationTaskStatus.FINALIZING: return {
                    tailWindGradient: 'from-violet-500 to-purple-500',
                    description: 'Producer is putting finishing touches',
                    emoji: '✨'
                };
                case VideoGenerationTaskStatus.COMPLETED: return {
                    tailWindGradient: 'from-green-500 to-emerald-500',
                    description: 'Completed',
                    emoji: '✅'
                };
                default: return {
                    tailWindGradient: 'from-gray-500 to-gray-600',
                    description: 'Unknown status',
                    emoji: '❓'
                };
            }
        } else {
            return {
                tailWindGradient: 'from-red-500 to-pink-600',
                description: 'Failed',
                emoji: '❌'
            };
        }
    }, [taskData]);

    const retryPrice = useMemo(() => {
        const {
            status,
            sceneCount,
            videoDuration,
        } = taskData;

        if (taskData.isGenerationFailed) {
            switch (status) {
                case VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT: return RETRY_CREDIT_PER_SCENE * sceneCount;
                case VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT:
                case VideoGenerationTaskStatus.GENERATING_VIDEO: return RETRY_CREDIT_PER_VIDEO_DURATION * Math.ceil(videoDuration);
                case VideoGenerationTaskStatus.COMPOSING_MUSIC: return RETRY_CREDIT_MUSIC_GENERATION;
                default: return null;
            }
        } else {
            return null;
        }
    }, [taskData]);

    const retryTooltipContent = useMemo(() => {
        const {
            status,
            sceneCount,
            videoDuration,
        } = taskData;

        if (!taskData.isGenerationFailed) return null;

        const containerClasses = "bg-gray-900/95 border border-white/10 rounded-lg shadow-xl p-3 min-w-[180px] backdrop-blur-md";
        const headerClasses = "flex items-center gap-2 mb-2 pb-2 border-b border-white/10 text-base font-semibold";
        const rowClasses = "flex justify-between items-center text-sm text-white/90 mb-1";
        const totalRowClasses = "flex justify-between items-center pt-2 mt-2 border-t border-white/10 text-sm font-bold text-white";

        const renderReceipt = (title: string, colorClass: string, icon: ReactNode, details: { label: ReactNode; value: ReactNode }[], total: number | null) => (
            <div className={containerClasses}>
                <div className={`${headerClasses} ${colorClass}`}>
                    {icon}
                    <span>{title}</span>
                </div>
                {details.map((detail, index) => (
                    <div key={index} className={rowClasses}>
                        <span>{detail.label}</span>
                        <span className="text-gray-200 flex items-center gap-1">{detail.value}</span>
                    </div>
                ))}
                <div className={totalRowClasses}>
                    <span>Total Cost</span>
                    <div className="flex items-center text-yellow-400">
                        <Coins size={12} className="mr-1" />
                        {total}
                    </div>
                </div>
            </div>
        );

        const CostLabel = ({ suffix }: { suffix: string }) => (
            <div className="flex items-center gap-1 text-white/90">
                <Coins size={12} className="text-yellow-300/90" />
                <span>per {suffix}</span>
            </div>
        );

        const CreditValue = ({ value }: { value: number | string }) => (
            <div className="flex items-center gap-1">
                <Coins size={12} className="text-yellow-300/90" />
                <span>{value}</span>
            </div>
        );

        switch (status) {
            case VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT:
                return renderReceipt(
                    "Image Generation",
                    "text-amber-400",
                    <ImageIcon size={14} />,
                    [
                        { label: "Scenes", value: sceneCount },
                        { label: <CostLabel suffix="scene" />, value: <CreditValue value={RETRY_CREDIT_PER_SCENE} /> },
                    ],
                    retryPrice
                );
            case VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT:
            case VideoGenerationTaskStatus.GENERATING_VIDEO:
                const duration = Math.ceil(videoDuration || 0);
                return renderReceipt(
                    "Video Generation",
                    "text-blue-400",
                    <FileVideo size={14} />,
                    [
                        { label: "Duration", value: `${duration}s` },
                        { label: <CostLabel suffix="sec" />, value: <CreditValue value={RETRY_CREDIT_PER_VIDEO_DURATION} /> },
                    ],
                    retryPrice
                );
            case VideoGenerationTaskStatus.COMPOSING_MUSIC:
                return renderReceipt(
                    "Music Composition",
                    "text-rose-400",
                    <Clock size={14} />,
                    [
                        { label: "Type", value: "Fixed Cost" },
                        { label: "Cost", value: <CreditValue value={RETRY_CREDIT_MUSIC_GENERATION} /> },
                    ],
                    RETRY_CREDIT_MUSIC_GENERATION
                );
            default:
                return renderReceipt(
                    "Regeneration",
                    "text-gray-300",
                    <Loader2 size={14} />,
                    [
                        { label: "Type", value: "Estimated" },
                        { label: "Cost", value: <CreditValue value={retryPrice ?? '-'} /> },
                    ],
                    retryPrice
                );
        }
    }, [taskData, retryPrice]);

    // ==================== 설명 텍스트 포맷팅 ====================
    const formattedDescription = useMemo(() => {
        if (!taskData.description) return null;
        const text = taskData.description;

        // 첫 해시태그 찾기 (문자열 시작 혹은 공백 뒤에 오는 #)
        const match = text.match(/(?:^|\s)(#)/);

        if (match && match.index !== undefined) {
            const splitIndex = match.index;
            const part1 = text.substring(0, splitIndex).trimEnd();
            // splitIndex 이후 첫 '#' 위치 찾기
            const hashIndex = text.indexOf('#', splitIndex);
            const part2 = text.substring(hashIndex);

            // 앞부분이 비어있지 않으면 개행 추가, 비어있으면(해시태그로 시작) 그대로 혹은 취향껏
            // 요청사항: "첫 해시태그 앞에 줄바꿈 두 개"
            // part1이 빈 문자열이어도 \n\n#tag가 됨.
            if (part1.length === 0) return part2; // 해시태그로 시작하면 굳이 줄바꿈 안 함 (선택사항, 하지만 보통 이게 자연스러움)
            return `${part1}\n\n${part2}`;
        }

        return text;
    }, [taskData.description]);

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

    // ==================== 팝오버 상태 ====================
    const [showExportPopover, setShowExportPopover] = useState(false);
    const [showRetryTooltip, setShowRetryTooltip] = useState(false);

    // ==================== 이벤트 핸들러 ====================
    const handleCancel = useCallback(() => {
        onClickCancel(taskData.id, taskData.status);
    }, [taskData.id, taskData.status, onClickCancel]);

    const handleDownload = useCallback(() => {
        onClickDownload(taskData.id);
    }, [taskData.id, onClickDownload]);

    const handleRetry = useCallback(() => {
        onClickRetry(taskData.id);
    }, [taskData.id, onClickRetry]);

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6 hover:bg-gray-800/70 transition-all duration-300">
            <div className="flex items-start justify-between">
                {/* ==================== 왼쪽: 정보 영역 ==================== */}
                <div className="flex-1">
                    {/* 제목 */}
                    <div className={`flex items-center gap-2 ${taskData.description ? 'mb-1' : 'mb-3'}`}>
                        <h3 className="text-xl font-semibold text-white truncate">
                            {taskData.title || 'Untitled Task'}
                        </h3>
                        <button
                            className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 flex-shrink-0"
                            aria-label="Edit title and description"
                            onClick={() => {
                                onClickEdit(taskData.id);
                            }}
                        >
                            <Pencil size={14} />
                        </button>
                    </div>

                    {/* 설명 */}
                    {formattedDescription && (
                        <p className="text-sm text-gray-400 mb-3 whitespace-pre-wrap leading-relaxed">
                            {formattedDescription}
                        </p>
                    )}

                    {/* 메타 정보 행 1: 날짜, 씬 개수 */}
                    {(taskData.sceneCount) && <div className="flex items-center space-x-6 text-gray-300 mb-2">
                        <span className="flex items-center space-x-2">
                            <Calendar size={16} className="text-purple-400" />
                            <span>Started: {formatDate(taskData.createdAt)}</span>
                        </span>
                        {taskData.sceneCount && <span className="flex items-center space-x-2">
                            <FileVideo size={16} className="text-cyan-400" />
                            <span>{taskData.sceneCount} scenes</span>
                        </span>}
                    </div>}

                    {/* 메타 정보 행 2: 업데이트 시간 */}
                    <div className="flex items-center space-x-2 text-gray-400 text-sm mb-3">
                        <Clock size={14} className="text-gray-500" />
                        <span>Last updated: {formatRelativeTime(taskData.updatedAt)}</span>
                    </div>

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

                    {/* ==================== Failed 상태: 에러 메시지 ==================== */}
                    {/*{statusGroup === StatusGroup.FAILED && (*/}
                    {taskData.isGenerationFailed && (
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
                </div>

                {/* ==================== 오른쪽: 액션 버튼 영역 ==================== */}
                <div className="flex items-center space-x-3 ml-6">
                    {/* Drafting 상태: Continue Draft 버튼 */}
                    {taskData.status === VideoGenerationTaskStatus.DRAFTING && taskData.id && (
                        <Link
                            href={`/workspace/create?taskId=${taskData.id}`}
                            className="group bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25 flex items-center space-x-2"
                        >
                            <Edit size={14} />
                            <span>Continue Draft</span>
                        </Link>
                    )}

                    {/* Editing 상태: Edit 버튼 */}
                    {/*{statusGroup === StatusGroup.EDITING && (*/}
                    {taskData.status === VideoGenerationTaskStatus.EDITOR && !taskData.isGenerationFailed && (
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
                            onClick={handleDownload}
                            className="group bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25 flex items-center space-x-2"
                        >
                            <Download size={14} />
                            <span>Download</span>
                        </button>
                    )}

                    {/* Completed 상태: Export 버튼 */}
                    {statusGroup === StatusGroup.COMPLETED && (
                        <div
                            className="relative"
                            onMouseEnter={() => setShowExportPopover(true)}
                            onMouseLeave={() => setShowExportPopover(false)}
                        >
                            <button
                                className="group bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/25 flex items-center space-x-2"
                            >
                                <Share2 size={14} />
                                <span>Export</span>
                            </button>

                            {showExportPopover && (
                                <div className="absolute top-full right-0 pt-2 z-50">
                                    <div className="bg-gray-800 border border-purple-500/30 rounded-lg shadow-xl overflow-hidden min-w-[200px]">
                                        {/* YouTube Shorts */}
                                        <button
                                            className="w-full h-14 flex items-center text-white hover:bg-gray-700/50 transition-colors"
                                            onClick={async () => { await onClickExport(taskData.id, ExportPlatform.YOUTUBE); }}
                                        >
                                            <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
                                                <Image
                                                    src="/icons/youtube-logo.png"
                                                    alt="YouTube"
                                                    width={36}
                                                    height={32}
                                                    className="object-contain"
                                                />
                                            </div>
                                            <span className="text-sm flex-1 text-left pl-2">YouTube Shorts</span>
                                        </button>

                                        <div className="border-t border-purple-500/20" />

                                        {/* TikTok */}
                                        <button
                                            className="w-full h-14 flex items-center text-white hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                            onClick={async () => { await onClickExport(taskData.id, ExportPlatform.TIKTOK); }}
                                        >
                                            <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
                                                <Image
                                                    src="/icons/tiktok-logo-white.svg"
                                                    alt="TikTok"
                                                    width={32}
                                                    height={32}
                                                    className="object-contain"
                                                />
                                            </div>
                                            <span className="text-sm flex-1 text-left pl-2 flex items-center gap-2">TikTok</span>
                                        </button>

                                        <div className="border-t border-purple-500/20" />

                                        {/* Instagram Reels */}
                                        <button
                                            disabled={true}
                                            className="w-full h-14 flex items-center text-white hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                            onClick={async () => { await onClickExport(taskData.id, ExportPlatform.INSTAGRAM); }}
                                        >
                                            <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
                                                <Image
                                                    src="/icons/instagram-logo.png"
                                                    alt="Instagram"
                                                    width={28}
                                                    height={28}
                                                    className="object-contain"
                                                />
                                            </div>
                                            <span className="text-sm flex-1 text-left pl-2 flex items-center gap-2">
                                                Instagram Reels
                                                <span className="px-1.5 py-1 bg-gray-600/50 rounded-full flex items-center opacity-100">
                                                    <Wrench size={12} className="text-yellow-300" />
                                                </span>
                                            </span>
                                        </button>

                                        <div className="border-t border-purple-500/20" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Failed 상태: Retry 버튼 */}
                    {/*{statusGroup === StatusGroup.FAILED && (*/}
                    {taskData.isGenerationFailed && (
                        <div
                            className="relative"
                            onMouseEnter={() => setShowRetryTooltip(true)}
                            onMouseLeave={() => setShowRetryTooltip(false)}
                        >
                            <button
                                onClick={handleRetry}
                                className="group bg-gradient-to-r from-orange-500 to-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:from-orange-600 hover:to-yellow-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-orange-500/25 flex items-center gap-1.5"
                            >
                                <Loader2 size={16} />
                                <span>Retry</span>
                                <span className="flex items-center text-xs opacity-90 border-l border-white/30 pl-1.5 ml-0.5">
                                    <Coins size={12} className="mr-0.5 text-yellow-200" />
                                    {retryPrice}
                                </span>
                            </button>
                            {showRetryTooltip && retryTooltipContent && (
                                <div className={`absolute right-0 ${index !== 0 ? "bottom-full mb-2" : "top-full mt-2"} z-50`}>
                                    {retryTooltipContent}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Processing/Editing 상태: Cancel 버튼 */}
                    {statusGroup !== StatusGroup.COMPLETED && (
                        <button
                            onClick={handleCancel}
                            className="group bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-red-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/25 flex items-center space-x-2"
                        >
                            <X size={14} />
                            <span>Cancel</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default memo(DashboardItem);