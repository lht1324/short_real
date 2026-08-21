'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from "@/components/page/ad/app-header/AppHeader";
import CreateForm, { BackgroundMode } from "@/components/page/ad/create/components/CreateForm";
import {
    AdAspectRatio,
    AdGenerateRequest,
    AdTask,
    AdTaskStatus,
    AdUploadedComponent,
} from "@/lib/api/client/ad/adClientAPI";

/*
 * 로컬 mock — 실 서버 구현 전까지 UI 플로우 검증용.
 * 태스크는 window 전역 객체(페이지 간 공유)에 두고, 진행 상태는 경과 시간 기반으로 계산한다.
 * 실 구현 시 이 mock과 adClientAPI 호출로 교체할 것.
 */
declare global {
    interface Window {
        __adMockTasks?: Record<string, AdTask>;
    }
}

const MOCK_STAGE_TIMINGS: { status: AdTaskStatus; afterMs: number }[] = [
    { status: 'queued', afterMs: 1200 },
    { status: 'generating', afterMs: 3200 },
    { status: 'designing', afterMs: 4600 },
    { status: 'rendering', afterMs: 5800 },
    { status: 'completed', afterMs: Number.MAX_SAFE_INTEGER },
];

function getMockStatusByElapsed(elapsedMs: number): AdTaskStatus {
    for (const stage of MOCK_STAGE_TIMINGS) {
        if (elapsedMs < stage.afterMs) {
            return stage.status;
        }
    }
    return 'completed';
}

function mockCreateTask(request: AdGenerateRequest): AdTask {
    const task: AdTask = {
        id: `mock-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        status: 'queued',
        request,
        candidates: [],
        error: null,
        createdAt: new Date().toISOString(),
    };
    window.__adMockTasks = {
        ...(window.__adMockTasks ?? {}),
        [task.id]: task,
    };
    return task;
}

function mockGetTask(taskId: string): AdTask | null {
    const task = window.__adMockTasks?.[taskId];
    if (!task) {
        return null;
    }
    const elapsedMs = Date.now() - new Date(task.createdAt).getTime();
    const status = getMockStatusByElapsed(elapsedMs);
    if (status !== task.status) {
        window.__adMockTasks = {
            ...(window.__adMockTasks ?? {}),
            [taskId]: { ...task, status },
        };
    }
    return window.__adMockTasks?.[taskId] ?? null;
}

export default function CreatePageClient() {
    const router = useRouter();

    const [phase, setPhase] = useState<'form' | 'running'>('form');

    // 구성 요소
    const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('prompt');
    const [backgroundPrompt, setBackgroundPrompt] = useState('');
    const [backgroundImage, setBackgroundImage] = useState<AdUploadedComponent | null>(null);
    const [product, setProduct] = useState<AdUploadedComponent | null>(null);
    const [person, setPerson] = useState<AdUploadedComponent | null>(null);

    // 생성 옵션
    const [aspectRatios, setAspectRatios] = useState<AdAspectRatio[]>(['1:1']);
    const [conceptCount, setConceptCount] = useState(4);
    const [ctaEnabled, setCtaEnabled] = useState(false);

    // 생성 진행
    const [task, setTask] = useState<AdTask | null>(null);
    const [status, setStatus] = useState<AdTaskStatus | null>(null);
    const [error, setError] = useState<string | null>(null);

    const hasBackground = useMemo(
        () => (backgroundMode === 'prompt' ? backgroundPrompt.trim().length > 0 : backgroundImage !== null),
        [backgroundMode, backgroundPrompt, backgroundImage],
    );

    const hasSubject = useMemo(() => product !== null || person !== null, [product, person]);

    const canGenerate = useMemo(
        () => hasBackground && hasSubject && aspectRatios.length > 0,
        [hasBackground, hasSubject, aspectRatios],
    );

    const totalImages = useMemo(() => aspectRatios.length * conceptCount, [aspectRatios, conceptCount]);

    const onClickGenerate = useCallback(() => {
        setError(null);
        setTask(null);
        setStatus(null);
        setPhase('running');

        const request: AdGenerateRequest = {
            backgroundPrompt: backgroundMode === 'prompt' ? backgroundPrompt.trim() || null : null,
            backgroundImage: backgroundMode === 'upload' ? backgroundImage : null,
            product,
            person,
            aspectRatios,
            conceptCount,
            ctaEnabled,
        };

        const newTask = mockCreateTask(request);
        setTask(newTask);
        setStatus(newTask.status);
    }, [backgroundMode, backgroundPrompt, backgroundImage, product, person, aspectRatios, conceptCount, ctaEnabled]);

    // 생성 진행 폴링
    useEffect(() => {
        if (phase !== 'running' || !task) {
            return;
        }

        let cancelled = false;
        const interval = setInterval(() => {
            const updated = mockGetTask(task.id);
            if (cancelled) {
                return;
            }
            if (!updated) {
                setError('Generation task not found. Please try again.');
                clearInterval(interval);
                setPhase('form');
                return;
            }
            setStatus(updated.status);

            if (updated.status === 'completed') {
                clearInterval(interval);
                router.push(`/ad/create/results?taskId=${updated.id}`);
            } else if (updated.status === 'failed') {
                clearInterval(interval);
                setError(updated.error ?? 'Generation failed. Please try again.');
                setPhase('form');
            }
        }, 700);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [phase, task, router]);

    const formatMeta = useMemo(() => {
        const ratioCount = aspectRatios.length;
        return `${conceptCount} creative${conceptCount > 1 ? 's' : ''} · ${ratioCount} format${
            ratioCount > 1 ? 's' : ''
        }`;
    }, [aspectRatios, conceptCount]);

    const hintText = !hasBackground
        ? 'Add a background to start.'
        : !hasSubject
          ? 'Add a product or person to start.'
          : 'Ready — assets are credited to your plan per batch.';

    const summaryText = useMemo(() => {
        const ratioCount = aspectRatios.length;
        return `${conceptCount} creative${conceptCount > 1 ? 's' : ''} in ${ratioCount} format${
            ratioCount > 1 ? 's' : ''
        } = ${totalImages} asset${totalImages > 1 ? 's' : ''}`;
    }, [aspectRatios.length, conceptCount, totalImages]);

    return (
        <>
            <AppHeader />

            <main className="mx-auto flex min-h-[100dvh] w-full max-w-[90rem] flex-col px-8 pb-6 pt-32">
                <h1 className="text-2xl font-bold tracking-tight text-text1">Create your ad</h1>
                <p className="mt-1 text-[13px] text-text2">
                    Upload your product, pick where it runs, and generate.
                </p>

                {phase === 'form' && (
                    <>
                        <div className="mt-6">
                            <CreateForm
                                backgroundMode={backgroundMode}
                                backgroundPrompt={backgroundPrompt}
                                backgroundImage={backgroundImage}
                                product={product}
                                person={person}
                                onBackgroundModeChange={setBackgroundMode}
                                onBackgroundPromptChange={setBackgroundPrompt}
                                onBackgroundImageChange={setBackgroundImage}
                                onProductChange={setProduct}
                                onPersonChange={setPerson}
                                aspectRatios={aspectRatios}
                                conceptCount={conceptCount}
                                ctaEnabled={ctaEnabled}
                                lockedRatio={
                                    backgroundMode === 'upload' && backgroundImage?.width && backgroundImage?.height
                                        ? { width: backgroundImage.width, height: backgroundImage.height }
                                        : null
                                }
                                onAspectRatiosChange={setAspectRatios}
                                onConceptCountChange={setConceptCount}
                                onCtaEnabledChange={setCtaEnabled}
                            />
                        </div>

                        {/* 실행 도크 — 페이지 배경과 분리된 툴바, 뷰포트 하단에 고정 */}
                        <div className="mt-auto bg-surface">
                            <div className="flex items-center justify-between gap-6 border-t border-hairline px-6 py-4 shadow-[0_-16px_32px_-24px_rgba(0,0,0,0.8)]">
                                <div className="min-w-0">
                                    <p className="text-[13px] font-medium text-text1">
                                        {conceptCount} creative{conceptCount > 1 ? 's' : ''} × {aspectRatios.length}{' '}
                                        format{aspectRatios.length > 1 ? 's' : ''} = {totalImages} asset
                                        {totalImages > 1 ? 's' : ''} · credited per batch
                                    </p>
                                    <p className="mt-0.5 text-[12px] leading-relaxed text-text2">{hintText}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClickGenerate}
                                    disabled={!canGenerate}
                                    className="w-[240px] shrink-0 rounded-full bg-text1 px-6 py-3.5 text-[14px] font-semibold text-canvas transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                                >
                                    Generate {totalImages} asset{totalImages > 1 ? 's' : ''}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {phase === 'running' && (
                    <div className="mt-6 space-y-4">
                        <div className="rounded-xl border border-hairline bg-surface px-4 py-3">
                            <p className="text-[13px] font-medium text-text1">
                                {totalImages} asset{totalImages > 1 ? 's' : ''} · {formatMeta}
                            </p>
                            <p className="mt-0.5 text-[11px] text-text2">
                                {totalImages} asset{totalImages > 1 ? 's' : ''} credited to your plan
                            </p>
                        </div>
                        <p className="text-[12px] leading-relaxed text-text2">
                            Generation runs in the background. You can leave this page and come back to the result.
                        </p>
                    </div>
                )}

                {error && (
                    <p className="mt-5 rounded-xl border border-hairline bg-surface px-3.5 py-3 text-[12px] leading-relaxed text-[#F87171]">
                        {error}
                    </p>
                )}
            </main>
        </>
    );
}