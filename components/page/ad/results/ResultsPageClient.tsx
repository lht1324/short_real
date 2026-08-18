'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import AppHeader from "@/components/page/ad/app-header/AppHeader";
import CandidateCard from "@/components/page/ad/results/components/CandidateCard";
import DetailPanel from "@/components/page/ad/results/components/DetailPanel";
import {
    AdAspectRatio,
    AdCandidate,
    AdTask,
    AdTaskStatus,
} from "@/lib/api/client/ad/adClientAPI";

/*
 * 로컬 mock — 실 서버 구현 전까지 UI 플로우 검증용.
 * CreatePageClient가 window 전역 객체에 만든 태스크를 읽어,
 * 경과 시간 기반으로 상태를 계산하고, 완료 시점에 시드 기반 가라 후보를 생성한다.
 * 실 구현 시 adClientAPI.getTask 호출로 교체할 것.
 */
declare global {
    interface Window {
        __adMockTasks?: Record<string, AdTask>;
    }
}

const MOCK_IMAGE_POOL = [
    '/preview/demo_main_center.webp',
    '/preview/demo_main_left.webp',
    '/preview/demo_main_right.webp',
    '/preview/demo_camera.webp',
    '/preview/demo_atmosphere.webp',
    '/preview/demo_physics.webp',
    '/preview/demo_framing.webp',
    '/preview/demo_good_example.webp',
    '/preview/demo_bad_example.webp',
];

const MOCK_HEADLINES = [
    'Meet your new favorite.',
    'The one you will actually use.',
    'Comfort, perfected.',
    'Upgrade your everyday.',
    'Made for real mornings.',
    'Small details. Big difference.',
    'The everyday essential.',
    'Worth waking up for.',
];

const MOCK_BRANDS = ['LUMEN', 'NORDIC CO.', 'DRIFT', 'HALO'];

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

function hashString(value: string): number {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pickShuffled<T>(pool: T[], count: number, rand: () => number): T[] {
    const shuffled = [...pool].sort(() => rand() - 0.5);
    if (count <= shuffled.length) {
        return shuffled.slice(0, count);
    }
    const result: T[] = [];
    while (result.length < count) {
        result.push(shuffled[result.length % shuffled.length]);
    }
    return result;
}

function pickByRatio<T>(pool: T[], rand: () => number): T {
    return pool[Math.floor(rand() * pool.length)];
}

function buildCandidate(id: string, ratio: AdAspectRatio, rand: () => number, ctaEnabled: boolean): AdCandidate {
    const headlineX = 7 + rand() * 3;
    const headlineY = 58 + rand() * 12;

    const design = {
        headline: {
            text: pickByRatio(MOCK_HEADLINES, rand),
            x: headlineX,
            y: headlineY,
            maxWidth: 78 + rand() * 8,
            align: 'left' as const,
            fontSizePct: 6.5 + rand() * 2,
        },
        cta: ctaEnabled
            ? {
                  text: pickByRatio(['Shop now', 'Buy now', 'Get yours'], rand),
                  x: headlineX,
                  y: headlineY + 9.5 + rand() * 2,
                  widthPct: 24 + rand() * 6,
                  fontSizePct: 2.3,
              }
            : null,
        logo: {
            brand: pickByRatio(MOCK_BRANDS, rand),
            x: 7,
            y: 5.5,
            widthPct: 18,
            fontSizePct: 3.2,
        },
        scrim: true,
    };

    return {
        id,
        url: pickByRatio(MOCK_IMAGE_POOL, rand),
        ratio,
        score: null,
        design,
    };
}

function mockGetTask(taskId: string): AdTask | null {
    const tasks = window.__adMockTasks ?? {};
    const task = tasks[taskId];
    if (!task) {
        return null;
    }

    const elapsedMs = Date.now() - new Date(task.createdAt).getTime();
    const status = getMockStatusByElapsed(elapsedMs);

    if (status === 'completed' && task.candidates.length === 0) {
        const rand = mulberry32(hashString(taskId));
        const count = task.request.candidateCount;

        const candidates: AdCandidate[] = task.request.aspectRatios.flatMap((ratio) => {
            const urls = pickShuffled(MOCK_IMAGE_POOL, count, rand);
            return urls.map((url, index) => {
                const candidate = buildCandidate(
                    `${taskId}-${ratio}-candidate-${index + 1}`,
                    ratio,
                    rand,
                    task.request.ctaEnabled,
                );
                candidate.url = url;
                if (count > 1) {
                    candidate.score = Math.round((6.2 + rand() * 2.9) * 10) / 10;
                }
                return candidate;
            });
        });

        window.__adMockTasks = { ...tasks, [taskId]: { ...task, status: 'completed', candidates } };
        return window.__adMockTasks[taskId];
    }

    if (status !== task.status) {
        window.__adMockTasks = { ...tasks, [taskId]: { ...task, status } };
    }

    return window.__adMockTasks?.[taskId] ?? null;
}

interface ResultsPageClientProps {
    taskId: string | null;
}

interface RatioGroup {
    ratio: AdAspectRatio;
    candidates: AdCandidate[];
}

export default function ResultsPageClient({ taskId }: ResultsPageClientProps) {
    const [task, setTask] = useState<AdTask | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

    // 태스크 로드 (완료 전이면 폴링)
    useEffect(() => {
        if (!taskId) {
            setError('No generation task found. Start a new generation first.');
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        let interval: ReturnType<typeof setInterval> | null = null;

        const loadTask = () => {
            const loaded = mockGetTask(taskId);
            if (cancelled) {
                return;
            }
            if (!loaded) {
                setError('No generation task found. Start a new generation first.');
                setIsLoading(false);
                if (interval) {
                    clearInterval(interval);
                }
                return;
            }
            setTask(loaded);

            if (loaded.status === 'completed') {
                setIsLoading(false);
                if (interval) {
                    clearInterval(interval);
                }
                setSelectedCandidateId((current) => current ?? loaded.candidates[0]?.id ?? null);
            } else if (loaded.status === 'failed') {
                setIsLoading(false);
                setError(loaded.error ?? 'Generation failed. Please try again.');
                if (interval) {
                    clearInterval(interval);
                }
            }
        };

        loadTask();
        if (!taskId.startsWith('mock-task-')) {
            return;
        }

        interval = setInterval(loadTask, 700);
        return () => {
            cancelled = true;
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [taskId]);

    // 비율별 그룹 (그룹 내 점수 내림차순)
    const ratioGroups = useMemo<RatioGroup[]>(() => {
        if (!task) {
            return [];
        }
        return task.request.aspectRatios.map((ratio) => ({
            ratio,
            candidates: task.candidates
                .filter((candidate) => candidate.ratio === ratio)
                .sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
        }));
    }, [task]);

    const selectedIndex = useMemo(() => {
        if (!task || !selectedCandidateId) {
            return -1;
        }
        return task.candidates.findIndex((candidate) => candidate.id === selectedCandidateId);
    }, [task, selectedCandidateId]);

    const onClickCandidate = useCallback((candidateId: string) => {
        setSelectedCandidateId(candidateId);
    }, []);

    const selectedCandidate = selectedIndex >= 0 && task ? task.candidates[selectedIndex] : null;

    const totalCount = task?.candidates.length ?? 0;
    const headerMeta = useMemo(() => {
        if (!task) {
            return '';
        }
        const formatCount = task.request.aspectRatios.length;
        return `${totalCount} image${totalCount > 1 ? 's' : ''} · ${formatCount} format${formatCount > 1 ? 's' : ''}${
            task.request.ctaEnabled ? ' · CTA on' : ''
        } · downloads unlimited`;
    }, [task, totalCount]);

    return (
        <>
            <AppHeader />

            <main className="mx-auto max-w-[1600px] px-8 pb-24 pt-32">
                <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                            Results
                        </span>
                        <h1 className="mt-2 max-w-[18ch] text-3xl font-bold tracking-tight text-text1">
                            Your candidates are ready
                        </h1>
                        {task && (
                            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                                {headerMeta}
                            </p>
                        )}
                    </div>
                    <a
                        href="/ad/create"
                        className="flex items-center gap-2 rounded-full bg-text1 px-5 py-2.5 text-[13px] font-semibold text-canvas transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
                        <span>New generation</span>
                    </a>
                </header>

                {isLoading && (
                    <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
                        <div className="grid gap-5 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                            {[0, 1, 2, 3].map((index) => (
                                <div
                                    key={index}
                                    className={`animate-pulse rounded-[1.5rem] border border-hairline bg-surface ${
                                        index % 2 === 0 ? 'aspect-square' : 'aspect-[4/5]'
                                    }`}
                                />
                            ))}
                        </div>
                        <div className="animate-pulse rounded-[1.5rem] border border-hairline bg-surface" />
                    </div>
                )}

                {!isLoading && error && (
                    <div className="flex flex-col items-center gap-4 rounded-[1.5rem] border border-hairline bg-surface px-8 py-16 text-center">
                        <p className="text-[13px] leading-relaxed text-[#F87171]">{error}</p>
                        <a
                            href="/ad/create"
                            className="rounded-full bg-text1 px-6 py-2.5 text-[13px] font-semibold text-canvas transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Start a new generation
                        </a>
                    </div>
                )}

                {!isLoading && !error && task && (
                    <div className="grid gap-10 xl:grid-cols-[1fr_360px] xl:items-start">
                        <div className="space-y-10">
                            {ratioGroups.map((group) => (
                                <section key={group.ratio}>
                                    <div className="mb-4 flex items-baseline justify-between gap-4">
                                        <h2 className="text-lg font-bold tracking-tight text-text1">
                                            {group.ratio}
                                        </h2>
                                        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                                            {group.candidates.length} candidate
                                            {group.candidates.length > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="grid gap-5 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                                        {group.candidates.map((candidate, index) => (
                                            <CandidateCard
                                                key={candidate.id}
                                                candidate={candidate}
                                                index={index}
                                                selected={candidate.id === selectedCandidateId}
                                                onSelect={() => onClickCandidate(candidate.id)}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>

                        <div className="xl:sticky xl:top-28">
                            <DetailPanel
                                task={task}
                                candidate={selectedCandidate}
                                candidateIndex={selectedIndex}
                            />
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}