'use client'

import {memo, ReactNode, useCallback, useMemo, useState} from "react";
import {TaskData} from "@/components/page/workspace/dashboard/WorkspaceDashboardPageClient";
import {ExportPlatform, SceneGenerationStatus, VideoGenerationTaskStatus} from "@/lib/api/types/supabase/VideoGenerationTasks";
import {
    AlertCircle,
    Calendar,
    Clock,
    Download,
    Edit,
    FileVideo,
    Image as ImageIcon,
    Loader2,
    Pencil,
    Share2,
    Wrench,
    X,
    FileText,
    Palette,
    Video,
    Mic,
    Music,
    MonitorPlay,
    Sparkles,
    CheckCircle2,
    HelpCircle
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";

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
    aiModelDataList: AIModelData[];
    onClickEdit: (taskId: string) => void;
    onClickExport: (taskId: string, platform: ExportPlatform) => Promise<void>;
    onClickDownload: (taskId: string) => void;
    onClickRetry: (taskId: string) => void;
    onClickCancel: (taskId: string, status: VideoGenerationTaskStatus) => void;
}

function DashboardItem({
    taskData,
    index,
    aiModelDataList,
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
            default:
                return StatusGroup.UNKNOWN;
        }
    }, [taskData.status]);

    const statusData = useMemo((): {
        colorClass: string;
        bgClass: string;
        description: string;
        icon: ReactNode;
    } => {
        const status = taskData.status;
        const sceneCount = taskData.sceneCount;
        const processedSceneCount = taskData.processedSceneCount;

        if (!taskData.isGenerationFailed) {
            switch (status) {
                case VideoGenerationTaskStatus.DRAFTING:
                case VideoGenerationTaskStatus.GENERATING_VOICE: return {
                    colorClass: 'text-zinc-400',
                    bgClass: 'bg-zinc-500/10 border-zinc-500/20',
                    description: 'Drafting script...',
                    icon: <FileText size={14} />
                };
                case VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT: return {
                    colorClass: 'text-purple-400',
                    bgClass: 'bg-purple-500/10 border-purple-500/20',
                    description: 'Crafting style guide',
                    icon: <Palette size={14} />
                };
                case VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT: return {
                    colorClass: 'text-pink-400',
                    bgClass: 'bg-pink-500/10 border-pink-500/20',
                    description: 'Designing scenes',
                    icon: <ImageIcon size={14} />
                };
                case VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT: return {
                    colorClass: 'text-indigo-400',
                    bgClass: 'bg-indigo-500/10 border-indigo-500/20',
                    description: 'Planning camera work',
                    icon: <Video size={14} />
                };
                case VideoGenerationTaskStatus.GENERATING_VIDEO: return {
                    colorClass: 'text-amber-400',
                    bgClass: 'bg-amber-500/10 border-amber-500/20',
                    description: `Shooting scenes (${processedSceneCount}/${sceneCount})`,
                    icon: <FileVideo size={14} />
                };
                case VideoGenerationTaskStatus.STITCHING_VIDEOS: return {
                    colorClass: 'text-blue-400',
                    bgClass: 'bg-blue-500/10 border-blue-500/20',
                    description: 'Recording voiceover',
                    icon: <Mic size={14} />
                };
                case VideoGenerationTaskStatus.COMPOSING_MUSIC: return {
                    colorClass: 'text-rose-400',
                    bgClass: 'bg-rose-500/10 border-rose-500/20',
                    description: 'Creating background music',
                    icon: <Music size={14} />
                };
                case VideoGenerationTaskStatus.EDITOR: return {
                    colorClass: 'text-cyan-400',
                    bgClass: 'bg-cyan-500/10 border-cyan-500/20',
                    description: 'Ready for editing',
                    icon: <MonitorPlay size={14} />
                };
                case VideoGenerationTaskStatus.FINALIZING: return {
                    colorClass: 'text-violet-400',
                    bgClass: 'bg-violet-500/10 border-violet-500/20',
                    description: 'Finishing touches',
                    icon: <Sparkles size={14} />
                };
                case VideoGenerationTaskStatus.COMPLETED: return {
                    colorClass: 'text-emerald-400',
                    bgClass: 'bg-emerald-500/10 border-emerald-500/20',
                    description: 'Completed',
                    icon: <CheckCircle2 size={14} />
                };
                default: return {
                    colorClass: 'text-zinc-500',
                    bgClass: 'bg-white/5 border-white/10',
                    description: 'Unknown status',
                    icon: <HelpCircle size={14} />
                };
            }
        } else {
            return {
                colorClass: 'text-red-400',
                bgClass: 'bg-red-500/10 border-red-500/20',
                description: 'Failed',
                icon: <AlertCircle size={14} />
            };
        }
    }, [taskData]);

    const retryPrice = useMemo(() => {
        if (!taskData.isGenerationFailed || !taskData.aiModelConfig) return null;

        const { status, failedImageCount, failedVideoDuration, resolution, estimatedCharacterCount, aiModelConfig, sceneCount } = taskData;
        const effectiveResolution = resolution ?? '720p';

        const findPricePerUnit = (modelId: string, res: string, type: 'image' | 'video'): number | null => {
            const model = aiModelDataList.find(m => m.id === modelId);
            if (!model || !model.ai_model_price_list || model.ai_model_price_list.length === 0) return null;

            const targetUnit = `${type}_${res.toLowerCase()}`;
            const matched = model.ai_model_price_list.find(p => p.unit === targetUnit || p.unit.endsWith(res));
            if (matched) return matched.price_per_unit;

            return model.ai_model_price_list[0].price_per_unit;
        };

        switch (status) {
            case VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT: {
                if (!estimatedCharacterCount) return null;
                const price = findPricePerUnit(aiModelConfig.referenceImageModelId, '720p', 'image');
                if (price === null) return null;

                return price * estimatedCharacterCount;
            }
            case VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT: {
                const price = findPricePerUnit(aiModelConfig.sceneImageI2IModelId, effectiveResolution, 'image');
                const count = failedImageCount && failedImageCount > 0 ? failedImageCount : (sceneCount || 1);

                if (price === null) return null;

                return price * count;
            }
            case VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT:
            case VideoGenerationTaskStatus.GENERATING_VIDEO: {
                const price = findPricePerUnit(aiModelConfig.videoModelId, effectiveResolution, 'video');
                const duration = failedVideoDuration && failedVideoDuration > 0 ? failedVideoDuration : ((sceneCount || 1) * 4);

                if (price === null) return null;

                return price * Math.round(duration);
            }
            default:
                return null;
        }
    }, [taskData, aiModelDataList]);

    const retryTooltipContent = useMemo(() => {
        if (!taskData.isGenerationFailed || !taskData.aiModelConfig || retryPrice === null) return null;

        const { status, failedImageCount, failedVideoDuration, resolution, estimatedCharacterCount, aiModelConfig, sceneCount } = taskData;
        const effectiveResolution = resolution ?? '720p';

        const findModel = (modelId: string) => aiModelDataList.find(m => m.id === modelId) ?? null;
        const findPricePerUnit = (modelId: string, res: string, type: 'image' | 'video'): number | null => {
            const model = findModel(modelId);
            if (!model || !model.ai_model_price_list || model.ai_model_price_list.length === 0) return null;

            const targetUnit = `${type}_${res.toLowerCase()}`;
            const matched = model.ai_model_price_list.find(p => p.unit === targetUnit || p.unit.endsWith(res));
            if (matched) return matched.price_per_unit;

            return model.ai_model_price_list[0].price_per_unit;
        };
        const formatUSD = (val: number) => `$${val.toFixed(4)}`;

        const containerClasses = "bg-zinc-900 border border-white/10 rounded-lg shadow-xl p-3 min-w-[220px] z-50";
        const headerClasses = "flex items-center gap-1.5 mb-1.5 pb-2 border-b border-white/5 text-[14px] font-medium";
        const modelNameClasses = "text-xs text-zinc-500 mb-2 truncate";
        const rowClasses = "flex justify-between items-center text-[13px] text-zinc-400 mb-1.5";
        const totalRowClasses = "flex justify-between items-center pt-2 mt-1 border-t border-white/5 text-[13px] font-medium text-zinc-200";

        const renderReceipt = (
            title: string,
            colorClass: string,
            icon: ReactNode,
            modelName: string,
            details: { label: string; value: string }[]
        ) => (
            <div className={containerClasses}>
                <div className={`${headerClasses} ${colorClass}`}>
                    {icon}
                    <span>{title}</span>
                </div>
                <div className={modelNameClasses}>{modelName}</div>
                {details.map((detail, i) => (
                    <div key={i} className={rowClasses}>
                        <span>{detail.label}</span>
                        <span className="text-zinc-300">{detail.value}</span>
                    </div>
                ))}
                <div className={totalRowClasses}>
                    <span>Est. BYOK Cost</span>
                    <span>{formatUSD(retryPrice)}</span>
                </div>
            </div>
        );

        switch (status) {
            case VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT: {
                const model = findModel(aiModelConfig.referenceImageModelId);
                if (!model || !estimatedCharacterCount) return null;
                const price = findPricePerUnit(aiModelConfig.referenceImageModelId, '720p', 'image');
                if (price === null) return null;
                return renderReceipt(
                    "Character Sheet",
                    "text-purple-400",
                    <ImageIcon size={14} />,
                    model.display_name,
                    [
                        { label: "Characters", value: `${estimatedCharacterCount}` },
                        { label: "Price / character", value: formatUSD(price) },
                    ]
                );
            }
            case VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT: {
                const model = findModel(aiModelConfig.sceneImageI2IModelId);
                if (!model) return null;

                const price = findPricePerUnit(aiModelConfig.sceneImageI2IModelId, effectiveResolution, 'image');
                const count = failedImageCount && failedImageCount > 0 ? failedImageCount : (sceneCount || 1);

                if (price === null) return null;

                return renderReceipt(
                    "Scene Images",
                    "text-pink-400",
                    <ImageIcon size={14} />,
                    model.display_name,
                    [
                        { label: "Failed Scenes", value: `${count}` },
                        { label: "Price / scene", value: formatUSD(price) },
                    ]
                );
            }
            case VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT:
            case VideoGenerationTaskStatus.GENERATING_VIDEO: {
                const model = findModel(aiModelConfig.videoModelId);
                if (!model) return null;

                const price = findPricePerUnit(aiModelConfig.videoModelId, effectiveResolution, 'video');
                const duration = failedVideoDuration && failedVideoDuration > 0 ? failedVideoDuration : ((sceneCount || 1) * 4);

                if (price === null) return null;

                return renderReceipt(
                    "Video Generation",
                    "text-blue-400",
                    <FileVideo size={14} />,
                    model.display_name,
                    [
                        { label: "Retry duration", value: `${Math.round(duration)}s` },
                        { label: "Price / sec", value: formatUSD(price) },
                    ]
                );
            }
            default:
                return null;
        }
    }, [taskData, aiModelDataList, retryPrice]);

    // ==================== 설명 텍스트 포맷팅 ====================
    const formattedDescription = useMemo(() => {
        if (!taskData.description) return null;
        const text = taskData.description;

        const match = text.match(/(?:^|\s)(#)/);

        if (match && match.index !== undefined) {
            const splitIndex = match.index;
            const part1 = text.substring(0, splitIndex).trimEnd();
            const hashIndex = text.indexOf('#', splitIndex);
            const part2 = text.substring(hashIndex);

            if (part1.length === 0) return part2; 
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
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
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
        <div className="bg-zinc-900/40 rounded-xl border border-white/5 p-5 hover:bg-zinc-900/60 transition-colors duration-200">
            <div className="flex items-start justify-between">
                {/* ==================== 왼쪽: 정보 영역 ==================== */}
                <div className="flex-1 min-w-0 pr-4">
                    {/* 제목 */}
                    <div className={`flex items-center gap-2 ${taskData.description ? 'mb-1.5' : 'mb-3'}`}>
                        <h3 className="text-[15px] font-medium text-zinc-100 truncate">
                            {taskData.title || 'Untitled Task'}
                        </h3>
                        <button
                            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded hover:bg-white/5 flex-shrink-0"
                            aria-label="Edit title and description"
                            onClick={() => {
                                onClickEdit(taskData.id);
                            }}
                        >
                            <Pencil size={12} />
                        </button>
                    </div>

                    {/* 설명 */}
                    {formattedDescription && (
                        <p className="text-[13px] text-zinc-500 mb-3.5 whitespace-pre-wrap leading-relaxed line-clamp-2">
                            {formattedDescription}
                        </p>
                    )}

                    {/* 메타 정보 */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-zinc-500 text-[11px] mb-3.5">
                        <span className="flex items-center gap-1.5">
                            <Clock size={12} className="text-zinc-600" />
                            <span>{formatRelativeTime(taskData.updatedAt)}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-zinc-600" />
                            <span>{formatDate(taskData.createdAt)}</span>
                        </span>
                        {taskData.sceneCount && (
                            <span className="flex items-center gap-1.5">
                                <FileVideo size={12} className="text-zinc-600" />
                                <span>{taskData.sceneCount} scenes</span>
                            </span>
                        )}
                    </div>

                    {/* 상태 텍스트 */}
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${statusData.bgClass} ${statusData.colorClass}`}>
                            {statusData.icon}
                            <span className="text-[11px] font-medium tracking-wide uppercase">
                                {statusData.description}
                            </span>
                        </div>
                    </div>

                    {/* ==================== Processing 상태: 진행률 바 ==================== */}
                    {statusGroup === StatusGroup.PROCESSING && !taskData.isGenerationFailed && (
                        <div className="mt-4 max-w-sm">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                                    Step {taskData.currentStep} of {taskData.totalStep}
                                </span>
                                <span className="text-[10px] font-medium text-zinc-400">
                                    {taskData.progress}%
                                </span>
                            </div>
                            <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-indigo-500 rounded-full h-full transition-all duration-500"
                                    style={{ width: `${taskData.progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* ==================== Failed 상태: 에러 메시지 ==================== */}
                    {taskData.isGenerationFailed && (
                        <div className="mt-4 flex items-start gap-2 bg-red-500/5 border border-red-500/10 rounded-lg p-2.5 max-w-sm">
                            <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-red-400 text-xs font-medium mb-0.5">Task failed</p>
                                <p className="text-zinc-500 text-[11px]">
                                    An error occurred during video generation. Please try again.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ==================== 오른쪽: 액션 버튼 영역 ==================== */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                    {/* Drafting 상태: Continue Draft 버튼 */}
                    {taskData.status === VideoGenerationTaskStatus.DRAFTING && taskData.id && (
                        <Link
                            href={`/workspace/create?taskId=${taskData.id}`}
                            className="bg-white/10 hover:bg-white/20 text-zinc-200 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1.5 border border-white/5"
                        >
                            <Edit size={14} />
                            <span>Continue</span>
                        </Link>
                    )}

                    {/* Editing 상태: Edit 버튼 */}
                    {taskData.status === VideoGenerationTaskStatus.EDITOR && !taskData.isGenerationFailed && (
                        <Link
                            href={`/workspace/editor?taskId=${taskData.id}`}
                            className="bg-white text-black px-3 py-1.5 rounded-lg text-[13px] font-medium hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
                        >
                            <Edit size={14} />
                            <span>Edit Video</span>
                        </Link>
                    )}

                    {/* Completed 상태: Download 버튼 */}
                    {statusGroup === StatusGroup.COMPLETED && (
                        <button
                            onClick={handleDownload}
                            className="bg-white/5 hover:bg-white/10 text-zinc-300 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1.5 border border-white/5"
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
                                className="bg-white text-black px-3 py-1.5 rounded-lg text-[13px] font-medium hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
                            >
                                <Share2 size={14} />
                                <span>Export</span>
                            </button>

                            {showExportPopover && (
                                <div className="absolute top-full right-0 pt-2 z-50">
                                    <div className="bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
                                        {/* YouTube Shorts */}
                                        <button
                                            className="w-full px-4 py-3 flex items-center text-zinc-300 hover:bg-white/5 hover:text-zinc-100 transition-colors group"
                                            onClick={async () => { await onClickExport(taskData.id, ExportPlatform.YOUTUBE); }}
                                        >
                                            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <Image
                                                    src="/icons/youtube-logo.png"
                                                    alt="YouTube"
                                                    width={20}
                                                    height={16}
                                                    className="object-contain"
                                                />
                                            </div>
                                            <span className="text-[13px] font-medium flex-1 text-left pl-2">YouTube Shorts</span>
                                        </button>

                                        <div className="h-px w-full bg-white/5" />

                                        {/* TikTok */}
                                        <button
                                            className="w-full px-4 py-3 flex items-center text-zinc-300 hover:bg-white/5 hover:text-zinc-100 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                            onClick={async () => { await onClickExport(taskData.id, ExportPlatform.TIKTOK); }}
                                        >
                                            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <Image
                                                    src="/icons/tiktok-logo-white.svg"
                                                    alt="TikTok"
                                                    width={18}
                                                    height={18}
                                                    className="object-contain"
                                                />
                                            </div>
                                            <span className="text-[13px] font-medium flex-1 text-left pl-2">TikTok</span>
                                        </button>

                                        <div className="h-px w-full bg-white/5" />

                                        {/* Instagram Reels */}
                                        <button
                                            disabled={true}
                                            className="w-full px-4 py-3 flex items-center text-zinc-500 transition-colors cursor-not-allowed"
                                            onClick={async () => { await onClickExport(taskData.id, ExportPlatform.INSTAGRAM); }}
                                        >
                                            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 opacity-50">
                                                <Image
                                                    src="/icons/instagram-logo.png"
                                                    alt="Instagram"
                                                    width={16}
                                                    height={16}
                                                    className="object-contain grayscale"
                                                />
                                            </div>
                                            <span className="text-[13px] font-medium flex-1 text-left pl-2 flex items-center gap-1.5">
                                                Instagram
                                                <Wrench size={10} className="text-zinc-600" />
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Failed 상태: Retry 버튼 */}
                    {taskData.isGenerationFailed && (
                        <div
                            className="relative"
                            onMouseEnter={() => setShowRetryTooltip(true)}
                            onMouseLeave={() => setShowRetryTooltip(false)}
                        >
                            <button
                                onClick={handleRetry}
                                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1.5"
                            >
                                <Loader2 size={14} />
                                <span>Retry</span>
                            </button>
                            {showRetryTooltip && retryTooltipContent && (
                                <div className={`absolute right-0 ${index !== 0 ? "bottom-full mb-2" : "top-full mt-2"} z-50`}>
                                    {retryTooltipContent}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cancel 버튼 (항상 마지막에) */}
                    {statusGroup !== StatusGroup.COMPLETED && (
                        <button
                            onClick={handleCancel}
                            className="text-zinc-500 hover:text-red-400 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1"
                            title="Cancel task"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default memo(DashboardItem);