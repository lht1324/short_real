'use client'

import {memo, useCallback, useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {ListTodo, Plus} from 'lucide-react';
import {VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import Image from "next/image";
import {videoClientAPI} from "@/api/client/videoClientAPI";
import {useAuth} from "@/context/AuthContext";
import {useRouter} from "next/navigation";
import DashboardItem from "@/components/page/workspace/dashboard/DashboardItem";
import DefaultModal from "@/components/public/DefaultModal";

export interface TaskData {
    id: string;
    title?: string;
    status: VideoGenerationTaskStatus;
    sceneCount?: number;
    processedSceneCount?: number;
    progress?: number; // 0-100
    currentStep: number;
    totalStep: number;
    createdAt?: Date;
    updatedAt?: Date;
    selectedVoiceId?: string;
    selectedStyleId?: string;
}

function WorkspaceDashboardPageClient() {
    const router = useRouter();
    const { user } = useAuth();
    const [taskDataList, setTaskDataList] = useState<TaskData[]>([]);

    // Virtual tabs for navigation consistency
    const virtualTabs = useMemo(() => [
        { id: 'dashboard', icon: ListTodo, name: 'Tasks', href: '/workspace/dashboard', active: true },
        { id: 'create', icon: Plus, name: 'Create', href: '/workspace/create' }
    ], []);

    const [pendingCancelTaskId, setPendingCancelTaskId] = useState<string | null>(null);

    const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

    const onClickCancel = useCallback((taskId: string) => {
        setPendingCancelTaskId(taskId);
        setShowCancelConfirmModal(true);
    }, []);

    const onClickDownload = useCallback((taskId: string) => {
        // base URL로 래핑해서 video/download/[taskId] path 열어주고 거기서 보이게 하기
        console.log('Download video:', taskId);
    }, []);

    const onClickRetry = useCallback((taskId: string) => {
        console.log('Retry generation:', taskId);
    }, []);

    const cancelVideoGenerationTask = useCallback(async () => {
        // Row 삭제, Replicate 취소 요청, ...
        try {

        } catch (error) {

        }
    }, [pendingCancelTaskId]);

    // VideoGenerationTaskStatus 기반 진행률 계산
    const calculateProgress = useCallback((status: VideoGenerationTaskStatus): {
        progress: number;
        currentStep: number;
        totalStep: number;
    } => {
        // 정상 플로우 순서 정의
        const processingSteps = [
            VideoGenerationTaskStatus.DRAFTING,
            VideoGenerationTaskStatus.GENERATING_VOICE,
            VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT,
            VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT,
            VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT,
            VideoGenerationTaskStatus.GENERATING_VIDEO,
            VideoGenerationTaskStatus.STITCHING_VIDEOS,
            VideoGenerationTaskStatus.MERGING_VIDEO_AND_AUDIO,
            VideoGenerationTaskStatus.EDITOR,
            VideoGenerationTaskStatus.COMPOSING_MUSIC,
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

    useEffect(() => {
        if (user?.id) {
            const loadData = async () => {
                try {
                    const videoGenerationTaskList = await videoClientAPI.getVideoTasksByUserId(user?.id);

                    if (!videoGenerationTaskList) {
                        throw new Error("Cannot read videoGenerationTaskList. Try again.");
                    }

                    setTaskDataList(videoGenerationTaskList.filter((task) => {
                        return !!task.id && !!task.status && !!task.created_at && !!task.updated_at;
                    }).map((task): TaskData => {
                        const status = task.status as VideoGenerationTaskStatus;
                        const {
                            progress,
                            currentStep,
                            totalStep,
                        } = calculateProgress(status);

                        console.log(`[${task.id}]: ${task.scene_breakdown_list.length}`)
                        return {
                            id: task.id as string,
                            title: task.video_main_subject,
                            status: status,
                            sceneCount: task.scene_breakdown_list.length,
                            processedSceneCount: task.processed_scene_count,
                            progress: progress,
                            currentStep: currentStep,
                            totalStep: totalStep,
                            createdAt: new Date(task.created_at as string),
                            updatedAt: new Date(task.updated_at as string),
                            selectedVoiceId: task.selected_voice_id,
                            selectedStyleId: task.selected_style_id,
                        }
                    }))
                } catch (error) {
                    console.error("WorkspaceDashboardPage: ", error);
                    router.push("/");
                }
            }
            
            loadData().then();
        }
    }, [router, user?.id, calculateProgress]);

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
                        className="w-16 h-16"
                    />
                    <div className="flex flex-col ml-4">
                        <span className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                            Video Task Manager
                        </span>
                        <p className="text-gray-400 text-base pl-0.5">
                            Your tasks&#39; progresses here.
                        </p>
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
                                {taskDataList.map((taskData) => {
                                    return <DashboardItem
                                        key={taskData.id}
                                        taskData={taskData}
                                        onClickCancel={onClickCancel}
                                        onClickDownload={onClickDownload}
                                        onClickRetry={onClickRetry}
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
                onClickConfirm={() => {}}
                onClickCancel={() => {
                    setPendingCancelTaskId(null);
                    setShowCancelConfirmModal(false);
                }}
            />}
        </div>
    )
}

export default memo(WorkspaceDashboardPageClient);