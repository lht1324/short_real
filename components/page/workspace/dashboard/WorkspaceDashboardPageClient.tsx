'use client'

import {memo, useCallback, useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {ListTodo, Loader2, Plus} from 'lucide-react';
import {
    AIModelConfig,
    ExportPlatform,
    ExportStatus,
    SceneGenerationStatus,
    VideoGenerationTask,
    VideoGenerationTaskStatus
} from "@/lib/api/types/supabase/VideoGenerationTasks";
import Image from "next/image";
import {videoClientAPI} from "@/lib/api/client/videoClientAPI";
import {useAuth} from "@/context/AuthContext";
import {useRouter, useSearchParams} from "next/navigation";
import DashboardItem from "@/components/page/workspace/dashboard/DashboardItem";
import DefaultModal from "@/components/public/DefaultModal";
import {createBrowserClient} from "@supabase/ssr";
import TaskDeleteLoadingModal from "@/components/page/workspace/dashboard/TaskDeleteLoadingModal";
import {Polar} from "@polar-sh/sdk";
import {polarClientAPI} from "@/lib/api/client/polarClientAPI";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";
import {aiModelDataClientAPI} from "@/lib/api/client/aiModelDataClientAPI";
import CheckoutResultDialog, {
    CheckoutResultDialogData
} from "@/components/page/workspace/dashboard/CheckoutResultDialog";
import ExportResultModal from "@/components/page/workspace/dashboard/export-result-modal/ExportResultModal";
import {ExportResult} from "@/components/page/workspace/dashboard/export-result-modal/ExportResult";
import MetadataEditModal from "@/components/public/MetadataEditModal";
import ExportSettingsModal from "@/components/page/workspace/dashboard/export-settings-modal/ExportSettingsModal";
import {ExportPrivacySetting} from "@/components/page/workspace/dashboard/export-settings-modal/ExportPrivacySetting";
import WorkspaceSidebar from "@/components/public/WorkspaceSidebar";
import {WorkspaceSidebarItem} from "@/components/public/WorkspaceSidebarItem";
import {AnimatePresence} from "framer-motion";

export interface TaskData {
    id: string;
    title?: string;
    description?: string;
    status: VideoGenerationTaskStatus;
    sceneCount: number;
    processedSceneCount?: number;
    failedImageCount?: number;
    failedVideoDuration?: number;
    progress?: number; // 0-100
    currentStep: number;
    totalStep: number;
    createdAt: Date;
    updatedAt: Date;
    isGenerationFailed: boolean;
    estimatedCharacterCount?: number;
    resolution?: '720p' | '1080p' | '2160p';
    aiModelConfig?: AIModelConfig;
    aspectRatio?: '16:9' | '9:16';
}

function WorkspaceDashboardPageClient() {
    // Draft 마저 작성하는 버튼 추가
    const router = useRouter();
    const searchParams = useSearchParams();

    const { user } = useAuth();
    const [taskDataList, setTaskDataList] = useState<TaskData[]>([]);
    const [exportResults, setExportResults] = useState<ExportResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [aiModelDataList, setAiModelDataList] = useState<AIModelData[]>([]);

    const customerSessionToken = useMemo(() => {
        return searchParams.get('customer_session_token');
    }, [searchParams]);

    const [checkoutResultDialogData, setCheckoutResultDialogData] = useState<CheckoutResultDialogData | null>(null);

    const [pendingEditTaskId, setPendingEditTaskId] = useState<string | null>(null);
    const [pendingCancelTaskId, setPendingCancelTaskId] = useState<string | null>(null);
    const [pendingExportTaskId, setPendingExportTaskId] = useState<string | null>(null);
    const [pendingExportPlatform, setPendingExportPlatform] = useState<ExportPlatform | null>(null);

    const [youtubePrivacySetting, setYoutubePrivacySetting] = useState<ExportPrivacySetting>(ExportPrivacySetting.PUBLIC);
    const [targetTokenId, setTargetTokenId] = useState<string | null>(null);

    const [showEditMetadataModal, setShowEditMetadataModal] = useState(false);
    const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
    const [showCancelLoadingModal, setShowCancelLoadingModal] = useState(false);

    const [showRetryLoadingModal, setShowRetryLoadingModal] = useState(false);

    const [showYoutubeExportSettingModal, setShowYoutubeExportSettingModal] = useState(false);
    const [showTikTokExportSettingModal, setShowTikTokExportSettingModal] = useState(false);
    const [showTikTokExportConsentModal, setShowTikTokExportConsentModal] = useState(false);

    const [isExportingVideo, setIsExportingVideo] = useState(false);
    const [isInitializingExportState, setIsInitializingExportState] = useState(false);

    const pendingEditTaskMetadata = useMemo(() => {
        const pendingEditTaskData = taskDataList.find((taskData) => {
            return taskData.id === pendingEditTaskId;
        });

        return pendingEditTaskData?.title && pendingEditTaskData?.description
            ? {
                title: pendingEditTaskData.title,
                description: pendingEditTaskData.description,
            } : null;
    }, [pendingEditTaskId, taskDataList]);

    const onClickEdit = useCallback((taskId: string) => {
        setPendingEditTaskId(taskId);
        setShowEditMetadataModal(true);
    }, []);

    const onClickCancel = useCallback((taskId: string, status: VideoGenerationTaskStatus) => {
        setPendingCancelTaskId(taskId);
        setShowCancelConfirmModal(true);
    }, []);

    const onClickExport = useCallback(async () => {
        try {
            if (!user?.id) {
                throw Error("User is invalid.");
            }

            if (!pendingExportTaskId || !pendingExportPlatform) {
                throw Error("Export data is not invalid.");
            }

            const targetTokenQuery = targetTokenId ? `&targetTokenId=${targetTokenId}` : '';

            switch (pendingExportPlatform) {
                case ExportPlatform.YOUTUBE: {
                    window.location.href = `/api/video/export/youtube/manual/oauth?taskId=${pendingExportTaskId}&privacySetting=${youtubePrivacySetting}${targetTokenQuery}`;
                    return;
                }
                case ExportPlatform.TIKTOK: {
                    window.location.href = `/api/video/export/tiktok/manual/oauth?taskId=${pendingExportTaskId}${targetTokenQuery}`;
                    return;
                }
                case ExportPlatform.INSTAGRAM: {
                    // To-Do
                    return;
                }
            }
        } catch (error) {
            console.error(error);
        }
    }, [user?.id, pendingExportTaskId, pendingExportPlatform, youtubePrivacySetting, targetTokenId]);

    const onClickDownload = useCallback(async (taskId: string) => {
        try {
            const videoGenerationTask = await videoClientAPI.getVideoTaskByTaskId(taskId);

            if (!videoGenerationTask || !videoGenerationTask.video_title) {
                console.error('Failed to get video generation task data:', taskId);
                return;
            }

            // videoClientAPI로 영상 URL 가져오기
            const fileName = `${videoGenerationTask.video_title}-${new Date().toLocaleTimeString()}.mp4`.replaceAll(" ", "-");
            const url = await videoClientAPI.getVideoFinalUrl(taskId, fileName);

            if (!url) {
                console.error('Failed to get video URL for task:', taskId);
                return;
            }

            // 임시 <a> 태그 생성해서 다운로드 트리거
            const a = document.createElement('a');

            a.href = url;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // 메모리 해제
            // window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
        }
    }, []);

    const onClickRetry = useCallback(async (taskId: string) => {
        try {
            setShowRetryLoadingModal(true);

            await videoClientAPI.postVideoTaskRetryByTaskId(taskId);

            setShowRetryLoadingModal(false);
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : 'Unknown error occurred. Try again.');
            setShowRetryLoadingModal(false);
        }
    }, []);

    const editMetadata = useCallback(async (title: string, description: string) => {
        if (!pendingEditTaskId) {
            throw Error("Task is invalid.");
        }

        const patchVideoTaskByTaskIdResult = await videoClientAPI.patchVideoTaskByTaskId(pendingEditTaskId, {
            video_title: title,
            video_description: description,
        });

        if (!patchVideoTaskByTaskIdResult) {
            throw Error("Patching the metadata of video generation task is failed.");
        }

        setPendingEditTaskId(null);
        setShowEditMetadataModal(false);
    }, [pendingEditTaskId]);

    const cancelVideoGenerationTask = useCallback(async () => {
        try {
            setShowCancelLoadingModal(true);

            if (!pendingCancelTaskId) throw new Error("Cancelled Task is not selected.");

            const currentCancelledTaskData = await videoClientAPI.getVideoTaskByTaskId(pendingCancelTaskId);

            if (!currentCancelledTaskData || !currentCancelledTaskData.status) throw new Error("Task not found.");

            const taskStatus = currentCancelledTaskData.status;

            // UI 상에서 지워주는 것도 추가해야 함

            switch (taskStatus) {
                case VideoGenerationTaskStatus.DRAFTING:
                case VideoGenerationTaskStatus.GENERATING_VOICE:
                case VideoGenerationTaskStatus.EDITOR: {
                    await videoClientAPI.deleteVideoTaskByTaskId(pendingCancelTaskId);

                    setShowCancelLoadingModal(false);
                    return;
                }
                default: {
                    await videoClientAPI.patchVideoTaskByTaskId(pendingCancelTaskId, {
                        is_user_cancelled_task: true,
                    });

                    setShowCancelLoadingModal(false);
                    return;
                }
            }
        } catch (error) {

        }
    }, [pendingCancelTaskId]);

    const onCloseExportResultModal = useCallback(async () => {
        setIsInitializingExportState(true);

        await Promise.all(
            exportResults.map((result) => {
                return videoClientAPI.patchVideoTaskByTaskId(result.taskId, {
                    export_status: null,
                    export_platform: null,
                });
            })
        );

        setIsInitializingExportState(false);
        setExportResults([]);
    }, [exportResults]);

    // VideoGenerationTaskStatus 기반 진행률 계산
    const calculateProgress = useCallback((status: VideoGenerationTaskStatus): {
        progress: number;
        currentStep: number;
        totalStep: number;
    } => {
        // 정상 플로우 순서 정의
        const processingSteps = [
            VideoGenerationTaskStatus.DRAFTING,
            // VideoGenerationTaskStatus.GENERATING_VOICE,
            VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT,
            VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT,
            VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT,
            VideoGenerationTaskStatus.GENERATING_VIDEO,
            VideoGenerationTaskStatus.COMPOSING_MUSIC,
            VideoGenerationTaskStatus.EDITOR,
            VideoGenerationTaskStatus.FINALIZING,
            VideoGenerationTaskStatus.COMPLETED,
        ];

        const currentStepIndex = processingSteps.indexOf(status);

        // Processing 단계가 아니면 진행률 계산 안 함
        if (currentStepIndex === -1) {
            return {
                progress: status === VideoGenerationTaskStatus.COMPLETED
                    ? 100
                    : 0,
                currentStep: status === VideoGenerationTaskStatus.COMPLETED
                    ? processingSteps.length
                    : 0,
                totalStep: processingSteps.length
            }
        }

        // (현재 단계 인덱스 + 1) / 전체 단계 수 * 100
        return {
            progress: parseFloat((((currentStepIndex + 1) / processingSteps.length) * 100).toFixed(2)),
            currentStep: currentStepIndex + 1,
            totalStep: processingSteps.length
        };
    }, []);

    // VideoGenerationTask를 TaskData로 변환하는 헬퍼 함수
    const convertToTaskData = useCallback((task: VideoGenerationTask): TaskData | null => {
        if (!task.id || !task.status || !task.created_at || !task.updated_at || task.is_generation_failed === undefined) {
            return null;
        }

        const status = task.status as VideoGenerationTaskStatus;
        const { progress, currentStep, totalStep } = calculateProgress(status);

        const sceneDataList = task.scene_breakdown_list;
        const isGenerationFailed = task.is_generation_failed;

        return {
            id: task.id,
            title: task.video_title,
            description: task.video_description,
            status: status,
            sceneCount: sceneDataList.length,
            processedSceneCount: !isGenerationFailed
                ? sceneDataList.filter((sceneData) => {
                    return sceneData.status === SceneGenerationStatus.COMPLETED;
                }).length
                : 0,
            failedImageCount: isGenerationFailed
                ? sceneDataList.filter((sceneData) => {
                    return sceneData.status === SceneGenerationStatus.GENERATING_IMAGE || sceneData.status === SceneGenerationStatus.FAILED;
                }).length
                : undefined,
            failedVideoDuration: isGenerationFailed
                ? sceneDataList.filter((sceneData) => {
                    return sceneData.status === SceneGenerationStatus.GENERATING_VIDEO || sceneData.status === SceneGenerationStatus.FAILED;
                }).reduce((acc, sceneData) => {
                    return acc + sceneData.sceneDuration;
                }, 0)
                : undefined,
            progress: progress,
            currentStep: currentStep,
            totalStep: totalStep,
            createdAt: new Date(task.created_at),
            updatedAt: new Date(task.updated_at),
            isGenerationFailed: task.is_generation_failed,
            estimatedCharacterCount: task.estimated_character_count,
            resolution: task.resolution ?? undefined,
            aspectRatio: task.aspect_ratio ?? undefined,
            aiModelConfig: task.ai_model_config ?? undefined,
        };
    }, [calculateProgress]);

    const onChangeYoutubePrivacySetting = useCallback((privacySetting: ExportPrivacySetting) => {
        setYoutubePrivacySetting(privacySetting);
    }, []);

    useEffect(() => {
        if (user?.id) {
            // 타임아웃 설정
            const timeout = setTimeout(() => {
                setIsLoading(false);
            }, 15000);

            // 초기 데이터 로드
            const loadData = async () => {
                try {
                    const [videoGenerationTaskList, fetchedAIModelDataList] = await Promise.all([
                        videoClientAPI.getVideoTasksByUserId(user?.id),
                        aiModelDataClientAPI.getAIModelData(),
                    ]);

                    setAiModelDataList(fetchedAIModelDataList);

                    if (!videoGenerationTaskList) {
                        throw new Error("Cannot read videoGenerationTaskList. Try again.");
                    }

                    const taskList = videoGenerationTaskList.filter((videoGenerationTask) => {
                        return !(videoGenerationTask.is_user_cancelled_task);
                    }).map((videoGenerationTask) => {
                        return convertToTaskData(videoGenerationTask);
                    }).filter((taskData) => {
                        return taskData !== null;
                    });

                    setTaskDataList(taskList);
                    setIsExportingVideo(videoGenerationTaskList.some((videoGenerationTask) => {
                        const {
                            export_status: exportStatus,
                            export_platform: exportPlatform,
                        } = videoGenerationTask;

                        return exportStatus === ExportStatus.UPLOADING && exportPlatform !== ExportPlatform.YOUTUBE;
                    }));

                    const pendingExportResults: ExportResult[] = videoGenerationTaskList
                        .filter((task) => !!task.export_status && task.export_status !== ExportStatus.UPLOADING)
                        .map((task) => ({
                            taskId: task.id,
                            title: task.video_title,
                            platform: task.export_platform as ExportPlatform,
                            status: task.export_status as (ExportStatus.SUCCESS | ExportStatus.FAILED),
                        }));

                    if (pendingExportResults.length > 0) {
                        setExportResults(pendingExportResults);
                    }
                } catch (error) {
                    console.error("WorkspaceDashboardPage: ", error);
                    setIsLoading(false);
                    router.push("/");
                }
            };

            loadData().then(() => {
                setIsLoading(false);
            });

            // Supabase Realtime 구독 설정
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const channel = supabase
                .channel('video_generation_tasks_changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*', // INSERT, UPDATE, DELETE 모두 수신
                        schema: 'public',
                        table: 'video_generation_tasks',
                        filter: `user_id=eq.${user.id}` // 현재 사용자의 task만 필터링
                    },
                    (payload) => {
                        switch (payload.eventType) {
                            case 'INSERT': {
                                // 새로운 task 추가
                                const newTask = payload.new as VideoGenerationTask;
                                const newTaskData = convertToTaskData(newTask);
                                if (newTaskData) {
                                    setTaskDataList((prevTaskDataList) => {
                                        return [newTaskData, ...prevTaskDataList]
                                    });
                                }
                                return;
                            }
                            case 'UPDATE': {
                                // 기존 task 업데이트
                                const updatedTask = payload.new as VideoGenerationTask;

                                setIsExportingVideo(updatedTask.export_status === ExportStatus.UPLOADING && updatedTask.export_platform !== ExportPlatform.YOUTUBE);

                                if (!!updatedTask.export_status && updatedTask.export_status !== ExportStatus.UPLOADING) {
                                    setExportResults((prev) => {
                                        // 같은 taskId가 이미 있으면 덮어쓰기, 없으면 추가
                                        const exists = prev.some((r) => r.taskId === updatedTask.id);
                                        const next = {
                                            taskId: updatedTask.id,
                                            title: updatedTask.video_title,
                                            platform: updatedTask.export_platform as ExportPlatform,
                                            status: updatedTask.export_status as ExportStatus.SUCCESS | ExportStatus.FAILED,
                                        };
                                        return exists
                                            ? prev.map((r) => r.taskId === updatedTask.id ? next : r)
                                            : [...prev, next];
                                    });
                                }
                                
                                const newTaskData = convertToTaskData(updatedTask);
                                if (newTaskData) {
                                    setTaskDataList((prevTaskDataList) =>
                                        prevTaskDataList.filter((prevTaskData) => {
                                            return prevTaskData.id !== newTaskData.id
                                                || (prevTaskData.id === newTaskData.id && !updatedTask.is_user_cancelled_task);
                                        }).map((prevTaskData) => {
                                            return prevTaskData.id === newTaskData.id
                                                ? newTaskData
                                                : prevTaskData;
                                        })
                                    );
                                }
                                return;
                            }
                            case 'DELETE': {
                                // task 삭제
                                const deletedTask = payload.old as VideoGenerationTask;
                                if (deletedTask.id) {
                                    setTaskDataList((prevTaskDataList) =>
                                        prevTaskDataList.filter((prevTaskData) => {
                                            return prevTaskData.id !== deletedTask.id;
                                        })
                                    );
                                }
                                return;
                            }
                        }
                    }
                )
                .subscribe((status) => {
                });

            return () => {
                clearTimeout(timeout);
                channel.unsubscribe();
            };
        }
    }, [router, user?.id, convertToTaskData]);

    useEffect(() => {
        if (customerSessionToken) {
            const polar = new Polar({
                server: process.env.NODE_ENV === 'production'
                    ? 'production'
                    : 'sandbox',
                accessToken: customerSessionToken,
            });

            const loadOrderData = async () => {
                const orderList = await polar.customerPortal.orders.list(
                    { customerSession: customerSessionToken },
                    {
                        limit: 1,
                        sorting: ["-created_at"],
                    },
                    { }
                );
                const productDataList = await polarClientAPI.getPolarProducts();

                const latestOrder = orderList.result.items[0];
                const productId = latestOrder.product?.id;

                const productData = productDataList?.find((productData) => {
                    return productData.id === productId;
                })

                if (!productData) {
                    throw new Error("Order data is invalid.");
                }

                setCheckoutResultDialogData({
                    planName: productData.name,
                    price: productData.price,
                    planId: productData.planId,
                })
            }

            loadOrderData().then();
        }
    }, [customerSessionToken]);

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        if (!user) {
            timeout = setTimeout(() => {
                router.push('/');
            }, 10000);
        }

        return () => {
            clearTimeout(timeout);
        };
    }, [user, router]);

    return (
        <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden">
            {/* Top Header - Matched to Autopilot */}
            <div className="flex items-center justify-between py-3 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md relative z-20">
                <div className="flex items-center" style={{paddingLeft: '1rem'}}>
                    <Image
                        src="/logo/logo-64.png"
                        alt="Short Real"
                        width={48}
                        height={48}
                        className="w-12 h-12 cursor-pointer"
                        onClick={() => {
                            router.push('/');
                        }}
                    />
                    <div className="flex flex-col ml-3">
                        <span className="text-2xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent cursor-default leading-none">
                            Dashboard
                        </span>
                        <p className="text-zinc-500 text-[13px] mt-0.5 cursor-default">
                            Your tasks&#39; progresses here.
                        </p>
                    </div>
                </div>

                <div className="pr-6">
                    <Link
                        href="/workspace/create"
                        className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center space-x-1.5 shadow-sm"
                    >
                        <Plus size={16} />
                        <span>Start New Task</span>
                    </Link>
                </div>
            </div>

            {/* Background Effects - Toned down significantly */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-[31.25rem] h-[31.25rem] bg-indigo-500 rounded-full blur-[7.5rem]"></div>
            </div>

            <div className="flex h-[calc(100vh-4.5625rem)] relative z-10">
                {/* Left Virtual Tab Sidebar */}
                <WorkspaceSidebar activeItem={WorkspaceSidebarItem.DASHBOARD} />

                {/* Main Content Panel */}
                <div className="flex-1 bg-transparent overflow-y-auto">
                    <div className="p-8 max-w-[75rem] mx-auto">
                        <div className="text-zinc-100 text-xl font-medium mb-6 tracking-tight">Current Tasks</div>

                        {taskDataList.length === 0 ? (
                            <div className="mt-12 p-8 bg-zinc-900/30 border border-white/5 rounded-2xl text-center space-y-4 max-w-sm mx-auto">
                                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <ListTodo size={20} className="text-zinc-500" />
                                </div>
                                <h2 className="text-lg font-medium text-zinc-200">No tasks yet</h2>
                                <p className="text-[13px] text-zinc-500 leading-relaxed">
                                    You haven&#39;t created any videos yet. Start your first task to see it here.
                                </p>
                                <Link
                                    href="/workspace/create"
                                    className="inline-flex items-center space-x-1.5 bg-white text-black px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors mt-2"
                                >
                                    <Plus size={16} />
                                    <span>Create Video</span>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {taskDataList.sort((a, b) => {
                                    return b.updatedAt.getTime() - a.updatedAt.getTime();
                                }).map((taskData, index) => {
                                    return <DashboardItem
                                        key={taskData.id}
                                        taskData={taskData}
                                        index={index}
                                        aiModelDataList={aiModelDataList}
                                        onClickEdit={onClickEdit}
                                        onClickDownload={onClickDownload}
                                        onClickExport={async (taskId, platform) => {
                                            setPendingExportTaskId(taskId);
                                            setPendingExportPlatform(platform);

                                            switch (platform) {
                                                case ExportPlatform.YOUTUBE: {
                                                    setShowYoutubeExportSettingModal(true);
                                                    break;
                                                }
                                                case ExportPlatform.TIKTOK: {
                                                    setShowTikTokExportSettingModal(true);
                                                    break;
                                                }
                                                case ExportPlatform.INSTAGRAM: {
                                                    /* To-Do */
                                                    break;
                                                }
                                            }
                                        }}
                                        onClickRetry={onClickRetry}
                                        onClickCancel={onClickCancel}
                                    />
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {showEditMetadataModal && pendingEditTaskMetadata && <MetadataEditModal
                modalTitle={"Edit Task Details"}
                initialTitle={pendingEditTaskMetadata.title}
                initialDescription={pendingEditTaskMetadata.description}
                onClose={() => {
                    setPendingEditTaskId(null);
                    setShowEditMetadataModal(false);
                }}
                onSave={editMetadata}
            />}
            {showCancelConfirmModal && <DefaultModal
                title="Cancel Task"
                message={"Are you sure you want to cancel this task?\n\n" +
                "⚠️ Warning: Credits used for this task will not be refunded."}
                confirmText="Yes"
                cancelText="No"
                onClickConfirm={async () => {
                    await cancelVideoGenerationTask();
                    setShowCancelConfirmModal(false);
                }}
                onClickCancel={() => {
                    setPendingCancelTaskId(null);
                    setShowCancelConfirmModal(false);
                }}
            />}

            {showCancelLoadingModal && <TaskDeleteLoadingModal/>}

            {showRetryLoadingModal && <TaskDeleteLoadingModal message="Retrying task..."/>}

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-zinc-900/80 border border-white/10 shadow-2xl">
                        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
                        <p className="text-sm font-medium text-zinc-300">Loading tasks...</p>
                    </div>
                </div>
            )}
            {checkoutResultDialogData && (<CheckoutResultDialog
                checkoutResultDialogData={checkoutResultDialogData}
                onClose={() => {
                    setCheckoutResultDialogData(null);
                    // url param에서 새로고침 없이 customer_session_token 제거
                }}
            />)}

            {exportResults.length > 0 && (
                <ExportResultModal
                    exportResultList={exportResults}
                    isInitializingExportState={isInitializingExportState}
                    onClose={onCloseExportResultModal}
                />
            )}

            {/* Video Exporting Floating Indicator */}
            {isExportingVideo && (
                <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="relative flex items-center justify-center w-8 h-8 bg-indigo-500/10 rounded-full">
                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-zinc-100">Exporting Video...</span>
                        <span className="text-[11px] text-zinc-500">Sending to platform</span>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {showYoutubeExportSettingModal && user?.id && <ExportSettingsModal
                    userId={user.id}
                    platform={ExportPlatform.YOUTUBE}
                    aspectRatio={taskDataList.find(t => t.id === pendingExportTaskId)?.aspectRatio}
                    privacySetting={youtubePrivacySetting}
                    onChangePrivacySetting={onChangeYoutubePrivacySetting}
                    selectedTokenId={targetTokenId}
                    onChangeSelectedTokenId={setTargetTokenId}
                    onClickConfirm={onClickExport}
                    onClickCancel={() => {
                        setShowYoutubeExportSettingModal(false);
                        setTargetTokenId(null);
                    }}
                />}

                {showTikTokExportSettingModal && user?.id && <ExportSettingsModal
                    userId={user.id}
                    platform={ExportPlatform.TIKTOK}
                    privacySetting={youtubePrivacySetting}
                    onChangePrivacySetting={onChangeYoutubePrivacySetting}
                    selectedTokenId={targetTokenId}
                    onChangeSelectedTokenId={setTargetTokenId}
                    onClickConfirm={onClickExport}
                    onClickCancel={() => {
                        setShowTikTokExportSettingModal(false);
                        setTargetTokenId(null);
                    }}
                />}
            </AnimatePresence>
        </div>
    )
}

export default memo(WorkspaceDashboardPageClient);