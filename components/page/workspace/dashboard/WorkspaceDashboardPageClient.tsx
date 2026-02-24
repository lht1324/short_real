'use client'

import {memo, useCallback, useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {Coins, ListTodo, Plus, Loader2} from 'lucide-react';
import {
    ExportPlatform,
    ExportStatus,
    VideoGenerationTask,
    VideoGenerationTaskStatus
} from "@/api/types/supabase/VideoGenerationTasks";
import Image from "next/image";
import {videoClientAPI} from "@/api/client/videoClientAPI";
import {useAuth} from "@/context/AuthContext";
import {useRouter, useSearchParams} from "next/navigation";
import DashboardItem from "@/components/page/workspace/dashboard/DashboardItem";
import DefaultModal from "@/components/public/DefaultModal";
import {createBrowserClient} from "@supabase/ssr";
import TaskDeleteLoadingModal from "@/components/page/workspace/dashboard/TaskDeleteLoadingModal";
import {Polar} from "@polar-sh/sdk";
import {polarClientAPI} from "@/api/client/polarClientAPI";
import CheckoutResultDialog, {
    CheckoutResultDialogData
} from "@/components/page/workspace/dashboard/CheckoutResultDialog";
import ExportResultModal from "@/components/page/workspace/dashboard/export-result-modal/ExportResultModal";
import {ExportResult} from "@/components/page/workspace/dashboard/export-result-modal/ExportResult";

export interface TaskData {
    id: string;
    title?: string;
    description?: string;
    status: VideoGenerationTaskStatus;
    sceneCount: number;
    processedSceneCount?: number;
    videoDuration: number;
    progress?: number; // 0-100
    currentStep: number;
    totalStep: number;
    createdAt: Date;
    updatedAt: Date;
    selectedVoiceId?: string;
    selectedStyleId?: string;
    isGenerationFailed: boolean;
}

function WorkspaceDashboardPageClient() {
    // Draft 마저 작성하는 버튼 추가
    const router = useRouter();
    const searchParams = useSearchParams();

    const { user } = useAuth();
    const [taskDataList, setTaskDataList] = useState<TaskData[]>([]);
    const [exportResults, setExportResults] = useState<ExportResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const customerSessionToken = useMemo(() => {
        return searchParams.get('customer_session_token');
    }, [searchParams]);

    const userCreditCount = useMemo(() => {
        return user?.credit_count ?? 0;
    }, [user?.credit_count]);

    const [checkoutResultDialogData, setCheckoutResultDialogData] = useState<CheckoutResultDialogData | null>(null);

    // Virtual tabs for navigation consistency
    const virtualTabs = useMemo(() => [
        { id: 'dashboard', icon: ListTodo, name: 'Tasks', href: '/workspace/dashboard', active: true },
        { id: 'create', icon: Plus, name: 'Create', href: '/workspace/create' }
    ], []);

    const [pendingCancelTaskId, setPendingCancelTaskId] = useState<string | null>(null);
    const [pendingExportTaskId, setPendingExportTaskId] = useState<string | null>(null);
    const [pendingExportPlatform, setPendingExportPlatform] = useState<ExportPlatform | null>(null);

    const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
    const [showCancelLoadingModal, setShowCancelLoadingModal] = useState(false);

    const [showRetryLoadingModal, setShowRetryLoadingModal] = useState(false);

    const [showTikTokExportConsentModal, setShowTikTokExportConsentModal] = useState(false);

    const [isExportingVideo, setIsExportingVideo] = useState(false);
    const [isInitializingExportState, setIsInitializingExportState] = useState(false);

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

            switch (pendingExportPlatform) {
                case ExportPlatform.YOUTUBE: {
                    window.location.href = `/api/video/export/youtube/oauth?taskId=${pendingExportTaskId}`;
                    return;
                }
                case ExportPlatform.TIKTOK: {
                    window.location.href = `/api/video/export/tiktok/oauth?taskId=${pendingExportTaskId}`;
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
    }, [user?.id, pendingExportTaskId, pendingExportPlatform]);

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
        console.log('Retry generation:', taskId);
    }, []);

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
            VideoGenerationTaskStatus.STITCHING_VIDEOS,
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
            // progress: Math.round(((currentStepIndex + 1) / processingSteps.length) * 100),
            progress: parseFloat((((currentStepIndex + 1) / processingSteps.length) * 100).toFixed(1)),
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
        const {progress, currentStep, totalStep} = calculateProgress(status);

        return {
            id: task.id,
            title: task.video_title,
            description: task.video_description,
            status: status,
            videoDuration: task.scene_breakdown_list.reduce((acc, sceneData) => {
                return acc + sceneData.sceneDuration;
            }, 0),
            sceneCount: task.scene_breakdown_list.length,
            processedSceneCount: task.processed_scene_count,
            progress: progress,
            currentStep: currentStep,
            totalStep: totalStep,
            createdAt: new Date(task.created_at),
            updatedAt: new Date(task.updated_at),
            selectedVoiceId: task.selected_voice_id,
            selectedStyleId: task.selected_style_id,
            isGenerationFailed: task.is_generation_failed,
        };
    }, [calculateProgress]);

    useEffect(() => {
        if (user?.id) {
            // 타임아웃 설정
            const timeout = setTimeout(() => {
                setIsLoading(false);
            }, 15000);

            // 초기 데이터 로드
            const loadData = async () => {
                try {
                    const videoGenerationTaskList = await videoClientAPI.getVideoTasksByUserId(user?.id);

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
                        return videoGenerationTask.export_status === ExportStatus.UPLOADING;
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

            console.log('[Realtime] 구독 시작, user.id:', user.id);

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
                        console.log('[Realtime] 이벤트 수신:', payload);

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

                                setIsExportingVideo(updatedTask.export_status === ExportStatus.UPLOADING);

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
                    console.log('[Realtime] 구독 상태:', status);
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
                    creditCount: productData.planData.creditCount,
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
        <div className="min-h-screen bg-black text-white">
            {/* Top Header - Same as Create */}
            <div className="flex items-center justify-between py-4 border-b border-purple-500/20 bg-gray-900/50 backdrop-blur-sm">
                <div className="flex items-center" style={{paddingLeft: '16px'}}>
                    <Image
                        src="/logo/logo-64.png"
                        alt="Short Real"
                        width={64}
                        height={64}
                        className="w-16 h-16 cursor-pointer"
                        onClick={() => {
                            router.push('/');
                        }}
                    />
                    <div className="flex flex-col ml-4">
                        <span className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                            Dashboard
                        </span>
                        <p className="text-gray-400 text-base pl-0.5">
                            Your tasks&#39; progresses here.
                        </p>
                    </div>
                </div>

                <div className="flex flex-row w-fit items-center gap-2">
                    <div className="flex items-center space-x-2 mr-6 px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg backdrop-blur-sm hover:border-purple-400/50 transition-all">
                        <Coins className="w-5 h-5 text-yellow-400" />
                        <div className="flex flex-col">
                            <span className="text-xs text-purple-300">Credits</span>
                            <span className="text-lg font-bold text-yellow-400">{userCreditCount.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="pr-6">
                        <Link
                            href="/workspace/create"
                            className="group bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-purple-500/25"
                        >
                            <Plus size={20} />
                            <span>Start New Task</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Vaporwave Background Effects */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur-3xl"></div>
            </div>

            <div className="flex h-[calc(100vh-97px)]">
                {/* Left Virtual Tab Sidebar */}
                <div className="w-20 bg-gray-900/50 backdrop-blur-sm border-r border-purple-500/20 flex flex-col items-center py-4 space-y-4">
                    {virtualTabs.map((tab) => {
                        const IconComponent = tab.icon;
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={`size-[calc(4px*16)] rounded-lg flex flex-col items-center justify-center transition-all border ${
                                    tab.active 
                                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-purple-400/50 shadow-lg' 
                                        : 'text-gray-400 hover:text-pink-400 hover:bg-gray-800/50 border-transparent hover:border-purple-500/30'
                                }`}
                                title={tab.name}
                            >
                                <IconComponent size={24} />
                                <span className="text-sm mt-1.5 leading-tight">{tab.name}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* Main Content Panel */}
                <div className="flex-1 bg-gray-900/30 backdrop-blur-sm overflow-y-auto">
                    <div className="p-6">
                        <div className="text-purple-300 text-2xl font-medium mb-6">Current Video Tasks</div>

                        {taskDataList.length === 0 ? (
                            <div className="max-w-4xl">
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Plus size={24} className="text-white" />
                                    </div>
                                    <p className="text-gray-400 text-lg mb-4">No tasks yet</p>
                                    <Link
                                        href="/workspace/create"
                                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl text-base font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25"
                                    >
                                        <Plus size={16} />
                                        <span>Start New Task</span>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 max-w-4xl">
                                {taskDataList.sort((a, b) => {
                                    return b.updatedAt.getTime() - a.updatedAt.getTime();
                                }).map((taskData, index) => {
                                    return <DashboardItem
                                        key={taskData.id}
                                        taskData={taskData}
                                        index={index}
                                        onClickDownload={onClickDownload}
                                        onClickExport={(taskId, platform) => {
                                            setPendingExportTaskId(taskId);
                                            setPendingExportPlatform(platform);
                                            setShowTikTokExportConsentModal(true);
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
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                        <p className="text-gray-300 text-xl font-medium">Loading tasks...</p>
                        <p className="text-gray-500 text-sm mt-2">Please wait a moment</p>
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
                <div className="fixed bottom-8 right-8 z-50 flex items-center gap-4 bg-gray-900/90 backdrop-blur-md border border-purple-500/30 rounded-2xl p-4 shadow-2xl shadow-purple-500/10 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="relative flex items-center justify-center w-10 h-10 bg-purple-500/10 rounded-full">
                        <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                        <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-gray-900 rounded-full animate-pulse"></span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-base font-bold text-white">Exporting Video...</span>
                        <span className="text-sm text-purple-200/70">Sending to platform</span>
                    </div>
                </div>
            )}

            {showTikTokExportConsentModal && <DefaultModal
                title="Export to TikTok"
                message={
                    "By continuing, you authorize ShortReal AI to upload this video to your TikTok account on your behalf.\n\n" +
                    "• Only this video will be uploaded — no other actions will be taken.\n" +
                    "• Processing may take a few minutes after upload.\n" +
                    "• You can remove access at any time from your TikTok settings."
                }
                confirmText="Authorize & Continue"
                cancelText="Cancel"
                onClickConfirm={async () => {
                    setShowTikTokExportConsentModal(false);
                    await onClickExport();
                }}
                onClickCancel={() => {
                    setShowTikTokExportConsentModal(false);
                    setPendingExportTaskId(null);
                    setPendingExportPlatform(null);
                }}
            />}
        </div>
    )
}

export default memo(WorkspaceDashboardPageClient);