'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from "@/components/page/ad/app-header/AppHeader";
import PreviewCanvas from "@/components/page/ad/create/components/PreviewCanvas";
import StepCompose, { BackgroundMode } from "@/components/page/ad/create/step-components/StepCompose";
import StepGenerate from "@/components/page/ad/create/step-components/StepGenerate";
import {
    AdAspectRatio,
    AdGenerateRequest,
    AdTask,
    AdTaskStatus,
    AdUploadedComponent,
} from "@/lib/api/client/ad/adClientAPI";

const STEP_TITLES = ['Compose your ad', 'Set generation options', 'Generating your candidates'];

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

    const [step, setStep] = useState<1 | 2 | 3>(1);

    // 스텝 1 — 구성 요소
    const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('prompt');
    const [backgroundPrompt, setBackgroundPrompt] = useState('');
    const [backgroundImage, setBackgroundImage] = useState<AdUploadedComponent | null>(null);
    const [product, setProduct] = useState<AdUploadedComponent | null>(null);
    const [person, setPerson] = useState<AdUploadedComponent | null>(null);

    // 스텝 2 — 생성 옵션
    const [aspectRatio, setAspectRatio] = useState<AdAspectRatio>('1:1');
    const [candidateCount, setCandidateCount] = useState(4);
    const [ctaEnabled, setCtaEnabled] = useState(false);

    // 스텝 3 — 생성 진행
    const [task, setTask] = useState<AdTask | null>(null);
    const [status, setStatus] = useState<AdTaskStatus | null>(null);
    const [error, setError] = useState<string | null>(null);

    const onClickGenerate = useCallback(() => {
        setError(null);
        setTask(null);
        setStatus(null);
        setStep(3);

        const request: AdGenerateRequest = {
            backgroundPrompt: backgroundMode === 'prompt' ? backgroundPrompt.trim() || null : null,
            backgroundImage: backgroundMode === 'upload' ? backgroundImage : null,
            product,
            person,
            aspectRatio,
            candidateCount,
            ctaEnabled,
        };

        const newTask = mockCreateTask(request);
        setTask(newTask);
        setStatus(newTask.status);
    }, [backgroundMode, backgroundPrompt, backgroundImage, product, person, aspectRatio, candidateCount, ctaEnabled]);

    // 생성 진행 폴링
    useEffect(() => {
        if (step !== 3 || !task) {
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
                setStep(2);
                return;
            }
            setStatus(updated.status);

            if (updated.status === 'completed') {
                clearInterval(interval);
                router.push(`/ad/create/results?taskId=${updated.id}`);
            } else if (updated.status === 'failed') {
                clearInterval(interval);
                setError(updated.error ?? 'Generation failed. Please try again.');
                setStep(2);
            }
        }, 700);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [step, task, router]);

    const stepTitle = useMemo(() => STEP_TITLES[step - 1], [step]);

    return (
        <>
            <AppHeader />

            <main className="mx-auto max-w-6xl px-6 pb-24 pt-32">
                <div className="grid gap-10 lg:grid-cols-[400px_1fr] lg:items-start">
                    {/* 컨트롤 패널 */}
                    <aside className="rounded-[1.5rem] border border-hairline bg-surface p-6 lg:sticky lg:top-28">
                        <div className="mb-1 flex items-center justify-between">
                            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                                Create
                            </span>
                            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                                Step {step === 3 ? 2 : step} of 2
                            </span>
                        </div>

                        <div className="mb-5 flex gap-1.5">
                            {[1, 2].map((index) => (
                                <div
                                    key={index}
                                    className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
                                        step > index || step === 3 ? 'bg-accent' : 'bg-hairline'
                                    }`}
                                />
                            ))}
                        </div>

                        <h2 className="mb-6 text-xl font-bold tracking-tight text-text1">{stepTitle}</h2>

                        {step === 1 && (
                            <StepCompose
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
                                onNext={() => setStep(2)}
                                onBack={() => router.push('/ad')}
                            />
                        )}

                        {step === 2 && (
                            <StepGenerate
                                aspectRatio={aspectRatio}
                                candidateCount={candidateCount}
                                ctaEnabled={ctaEnabled}
                                lockedRatio={
                                    backgroundMode === 'upload' && backgroundImage?.width && backgroundImage?.height
                                        ? { width: backgroundImage.width, height: backgroundImage.height }
                                        : null
                                }
                                onAspectRatioChange={setAspectRatio}
                                onCandidateCountChange={setCandidateCount}
                                onCtaEnabledChange={setCtaEnabled}
                                onGenerate={onClickGenerate}
                                onBack={() => setStep(1)}
                                isGenerating={false}
                            />
                        )}

                        {step === 3 && (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-hairline bg-canvas px-4 py-3">
                                    <p className="text-[13px] font-medium text-text1">
                                        {candidateCount} candidate{candidateCount > 1 ? 's' : ''} · {aspectRatio}
                                    </p>
                                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text2">
                                        {candidateCount} image{candidateCount > 1 ? 's' : ''} deducted from your plan
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
                            aspectRatio={aspectRatio}
                            backgroundPrompt={backgroundMode === 'prompt' ? backgroundPrompt : null}
                            backgroundImage={backgroundMode === 'upload' ? backgroundImage : null}
                            product={product}
                            person={person}
                            status={status}
                        />
                        {step < 3 && (
                            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                                {aspectRatio} preview · layout rendered deterministically
                            </p>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}
