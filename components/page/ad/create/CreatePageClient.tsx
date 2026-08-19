'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from "@/components/page/ad/app-header/AppHeader";
import PreviewCanvas from "@/components/page/ad/create/components/PreviewCanvas";
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
    const [previewRatio, setPreviewRatio] = useState<AdAspectRatio>('1:1');
    const [candidateCount, setCandidateCount] = useState(4);
    const [ctaEnabled, setCtaEnabled] = useState(false);

    // 생성 진행
    const [task, setTask] = useState<AdTask | null>(null);
    const [status, setStatus] = useState<AdTaskStatus | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 선택 비율 변경 시 미리보기 비율을 첫 번째 선택으로 동기화
    useEffect(() => {
        if (aspectRatios.length > 0 && !aspectRatios.includes(previewRatio)) {
            setPreviewRatio(aspectRatios[0]);
        }
    }, [aspectRatios, previewRatio]);

    const totalImages = useMemo(() => aspectRatios.length * candidateCount, [aspectRatios, candidateCount]);

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
            candidateCount,
            ctaEnabled,
        };

        const newTask = mockCreateTask(request);
        setTask(newTask);
        setStatus(newTask.status);
    }, [backgroundMode, backgroundPrompt, backgroundImage, product, person, aspectRatios, candidateCount, ctaEnabled]);

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
        return `${ratioCount} format${ratioCount > 1 ? 's' : ''} · ${candidateCount} candidate${candidateCount > 1 ? 's' : ''} per format`;
    }, [aspectRatios, candidateCount]);

    return (
        <>
            <AppHeader />

            <main className="mx-auto max-w-[1440px] px-8 pb-24 pt-32">
                <div className="grid gap-10 lg:grid-cols-[620px_1fr] lg:items-start">
                    {/* 컨트롤 패널 */}
                    <aside className="rounded-[1.5rem] border border-hairline bg-surface p-6 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
                        <div className="mb-1 flex items-center justify-between">
                            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                                Create
                            </span>
                        </div>
                        <h2 className="mb-6 text-xl font-bold tracking-tight text-text1">Compose your ad</h2>

                        {phase === 'form' && (
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
                                candidateCount={candidateCount}
                                ctaEnabled={ctaEnabled}
                                lockedRatio={
                                    backgroundMode === 'upload' && backgroundImage?.width && backgroundImage?.height
                                        ? { width: backgroundImage.width, height: backgroundImage.height }
                                        : null
                                }
                                onAspectRatiosChange={setAspectRatios}
                                onCandidateCountChange={setCandidateCount}
                                onCtaEnabledChange={setCtaEnabled}
                                onGenerate={onClickGenerate}
                                isGenerating={false}
                            />
                        )}

                        {phase === 'running' && (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-hairline bg-canvas px-4 py-3">
                                    <p className="text-[13px] font-medium text-text1">
                                        {totalImages} image{totalImages > 1 ? 's' : ''} · {aspectRatios.length}{' '}
                                        format{aspectRatios.length > 1 ? 's' : ''}
                                    </p>
                                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text2">
                                        {totalImages} image{totalImages > 1 ? 's' : ''} deducted from your plan
                                    </p>
                                </div>
                                <p className="text-[12px] leading-relaxed text-text2">
                                    Generation runs in the background. You can leave this page and come back to the
                                    result.
                                </p>
                            </div>
                        )}

                        {error && (
                            <p className="mt-5 rounded-xl border border-hairline bg-canvas px-3.5 py-3 text-[12px] leading-relaxed text-[#F87171]">
                                {error}
                            </p>
                        )}
                    </aside>

                    {/* 캔버스 */}
                    <div className="flex flex-col items-center gap-4 pt-2">
                        <PreviewCanvas
                            aspectRatio={previewRatio}
                            backgroundPrompt={backgroundMode === 'prompt' ? backgroundPrompt : null}
                            backgroundImage={backgroundMode === 'upload' ? backgroundImage : null}
                            product={product}
                            person={person}
                            status={status}
                        />
                        {phase === 'form' && aspectRatios.length > 1 && (
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {aspectRatios.map((ratio) => (
                                    <button
                                        key={ratio}
                                        type="button"
                                        onClick={() => setPreviewRatio(ratio)}
                                        className={`rounded-full border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                                            previewRatio === ratio
                                                ? 'border-accent text-accent'
                                                : 'border-hairline text-text2 hover:border-text2/50 hover:text-text1'
                                        }`}
                                    >
                                        {ratio}
                                    </button>
                                ))}
                            </div>
                        )}
                        {phase === 'form' && (
                            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                                {previewRatio} preview · layout rendered deterministically
                            </p>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}