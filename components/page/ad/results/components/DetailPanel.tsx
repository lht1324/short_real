'use client'

import { memo, useCallback, useEffect, useState } from 'react';
import { Download, Wand2 } from 'lucide-react';
import {
    AD_SIZE_PRESETS,
    AdCandidate,
    AdDerivedImage,
    AdTask,
} from "@/lib/api/client/ad/adClientAPI";

const PRESET_ASPECT_CLASS: Record<string, string> = {
    '1:1': 'aspect-square',
    '4:5': 'aspect-[4/5]',
    '9:16': 'aspect-[9/16]',
    '1.91:1': 'aspect-[1910/1000]',
};

/*
 * 로컬 mock — 사이즈 파생 (결정론적 크롭) 시뮬레이션.
 * 실 구현 시 adClientAPI.postDerivedSize 호출로 교체할 것.
 */
function mockDeriveSize(
    taskId: string,
    candidateId: string,
    presetId: string,
    url: string,
): Promise<AdDerivedImage> {
    return new Promise((resolve) => {
        setTimeout(() => {
            const preset = AD_SIZE_PRESETS.find((item) => item.id === presetId) ?? AD_SIZE_PRESETS[0];
            resolve({
                id: `${candidateId}-${presetId}`,
                taskId,
                candidateId,
                presetId,
                label: preset.label,
                url,
                width: preset.width,
                height: preset.height,
            });
        }, 800);
    });
}

interface DetailPanelProps {
    task: AdTask;
    candidate: AdCandidate | null;
    candidateIndex: number;
}

function DetailPanel({ task, candidate, candidateIndex }: DetailPanelProps) {
    const [selectedPresetId, setSelectedPresetId] = useState<string>(AD_SIZE_PRESETS[0].id);
    const [derived, setDerived] = useState<AdDerivedImage | null>(null);
    const [isDeriving, setIsDeriving] = useState(false);
    const [derivedError, setDerivedError] = useState<string | null>(null);

    const selectedPreset = AD_SIZE_PRESETS.find((preset) => preset.id === selectedPresetId) ?? AD_SIZE_PRESETS[0];

    const onClickPreset = useCallback((presetId: string) => {
        setSelectedPresetId(presetId);
        setDerived(null);
    }, []);

    // 후보 변경 시 해당 후보의 파생 사이즈 로드
    useEffect(() => {
        if (!candidate) {
            setDerived(null);
            return;
        }
        setDerived(null);
        setDerivedError(null);

        let cancelled = false;
        (async () => {
            try {
                setIsDeriving(true);
                const result = await mockDeriveSize(task.id, candidate.id, selectedPresetId, candidate.url);
                if (!cancelled) {
                    setDerived(result);
                }
            } catch (err) {
                if (!cancelled) {
                    setDerivedError(err instanceof Error ? err.message : 'Failed to derive size');
                }
            } finally {
                if (!cancelled) {
                    setIsDeriving(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [candidate, task.id, selectedPresetId]);

    const onClickEditor = useCallback(() => {
        window.alert(
            'The layout editor arrives in the next phase. You will fine-tune typography, layers, and free crop there. Your layout will open with the current design as the default.'
        );
    }, []);

    if (!candidate) {
        return (
            <aside className="rounded-[1.5rem] border border-hairline bg-surface p-6">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Details</span>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-text1">Select a candidate</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-text2">
                    Choose a candidate on the left to export sizes and download it.
                </p>
            </aside>
        );
    }

    return (
        <aside className="rounded-[1.5rem] border border-hairline bg-surface p-6">
            <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Details</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text2">
                    {candidate.score !== null ? `${candidate.score.toFixed(1)} / 10` : 'score skipped'}
                </span>
            </div>

            <h2 className="mb-5 text-lg font-bold tracking-tight text-text1">
                Candidate {String(candidateIndex + 1).padStart(2, '0')}
            </h2>

            {/* 변환 미리보기 */}
            <div className={`relative mb-4 w-full overflow-hidden rounded-xl border border-hairline ${PRESET_ASPECT_CLASS[selectedPreset.id]}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={derived?.url ?? candidate.url}
                    alt={`${selectedPreset.label} preview`}
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute left-2.5 top-2.5 rounded-full bg-surface/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text1 backdrop-blur-sm">
                    {selectedPreset.label} · {selectedPreset.width}×{selectedPreset.height}
                </span>
            </div>

            {/* 사이즈 프리셋 */}
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text2">Available sizes</p>
            <div className="grid grid-cols-2 gap-2">
                {AD_SIZE_PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        type="button"
                        onClick={() => onClickPreset(preset.id)}
                        className={`rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                            selectedPresetId === preset.id
                                ? 'border-accent bg-surface'
                                : 'border-hairline hover:border-text2/50'
                        }`}
                    >
                        <span className="block text-[13px] font-medium text-text1">{preset.label}</span>
                        <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-text2">
                            {preset.width}×{preset.height}
                        </span>
                    </button>
                ))}
            </div>

            {derivedError && (
                <p className="mt-3 text-[12px] leading-relaxed text-[#F87171]">{derivedError}</p>
            )}

            {/* 다운로드 */}
            <div className="mt-5 space-y-2.5">
                <a
                    href={derived?.url ?? candidate.url}
                    download={`shortreal-ad-${selectedPreset.id}-${candidate.id}.webp`}
                    className={`flex w-full items-center justify-center gap-2 rounded-full bg-text1 px-5 py-3 text-[13px] font-semibold text-canvas transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                        isDeriving ? 'pointer-events-none opacity-50' : ''
                    }`}
                >
                    <Download className="h-4 w-4" strokeWidth={2.2} />
                    <span>{isDeriving ? 'Preparing…' : `Download ${selectedPreset.label}`}</span>
                </a>
                <a
                    href={candidate.url}
                    download={`shortreal-ad-original-${candidate.id}.webp`}
                    className="flex w-full items-center justify-center rounded-full border border-hairline px-5 py-2.5 text-[13px] font-medium text-text2 transition-colors hover:border-text2/50 hover:text-text1"
                >
                    Download original ({task.request.aspectRatio})
                </a>
            </div>

            {/* 에디터 (MVP 2차, 자리만) */}
            <div className="mt-5 border-t border-hairline pt-5">
                <button
                    type="button"
                    onClick={onClickEditor}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-[13px] font-medium text-text1 transition-colors hover:border-text2/50"
                >
                    <Wand2 className="h-4 w-4" strokeWidth={1.8} />
                    <span>Open in editor</span>
                </button>
                <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-text2">
                    Editor ships in the next phase
                </p>
            </div>
        </aside>
    );
}

export default memo(DetailPanel);
