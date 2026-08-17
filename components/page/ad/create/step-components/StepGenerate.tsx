'use client'

import { memo, useCallback } from 'react';
import { AdAspectRatio } from "@/lib/api/client/ad/adClientAPI";
import { AD_ASPECT_RATIOS, AD_CANDIDATE_OPTIONS } from "@/lib/api/client/ad/adClientAPI";

const RATIO_LABELS: Record<AdAspectRatio, string> = {
    '1:1': 'Square',
    '4:5': 'Portrait',
    '9:16': 'Story',
};

interface StepGenerateProps {
    aspectRatio: AdAspectRatio;
    candidateCount: number;
    ctaEnabled: boolean;
    lockedRatio?: { width: number; height: number } | null;
    onAspectRatioChange: (ratio: AdAspectRatio) => void;
    onCandidateCountChange: (count: number) => void;
    onCtaEnabledChange: (enabled: boolean) => void;
    onGenerate: () => void;
    onBack: () => void;
    isGenerating: boolean;
}

function StepGenerate({
    aspectRatio,
    candidateCount,
    ctaEnabled,
    lockedRatio,
    onAspectRatioChange,
    onCandidateCountChange,
    onCtaEnabledChange,
    onGenerate,
    onBack,
    isGenerating,
}: StepGenerateProps) {
    const onClickRatio = useCallback((ratio: AdAspectRatio) => {
        onAspectRatioChange(ratio);
    }, [onAspectRatioChange]);

    const onClickCount = useCallback((count: number) => {
        onCandidateCountChange(count);
    }, [onCandidateCountChange]);

    const onClickCta = useCallback((enabled: boolean) => {
        onCtaEnabledChange(enabled);
    }, [onCtaEnabledChange]);

    return (
        <div className="space-y-7">
            {/* 후보 수 */}
            <section>
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-text1">Candidates</h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text2">
                        per attempt
                    </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {AD_CANDIDATE_OPTIONS.map((count) => (
                        <button
                            key={count}
                            type="button"
                            onClick={() => onClickCount(count)}
                            className={`relative rounded-xl border px-2 py-3 text-center transition-all duration-200 ${
                                candidateCount === count
                                    ? 'border-accent bg-surface'
                                    : 'border-hairline hover:border-text2/50'
                            }`}
                        >
                            <span
                                className={`block text-[15px] font-semibold ${
                                    candidateCount === count ? 'text-text1' : 'text-text2'
                                }`}
                            >
                                {count}
                            </span>
                            <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-text2">
                                img
                            </span>
                            {count === 10 && (
                                <span className="absolute -top-2 right-2 rounded-full bg-accent px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-canvas">
                                    Pro
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <p className="mt-2.5 text-[12px] leading-relaxed text-text2">
                    All candidates are shown to you — scored and sorted, your call on the winner.
                </p>
            </section>

            {/* 비율 */}
            <section>
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-text1">Format</h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text2">
                        {lockedRatio ? 'from uploaded background' : 'native ratio'}
                    </span>
                </div>
                {lockedRatio ? (
                    <div className="rounded-xl border border-hairline bg-surface px-4 py-3.5">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[13px] font-medium text-text1">Locked to upload</p>
                            <span className="font-mono text-[11px] text-text2">
                                {lockedRatio.width}×{lockedRatio.height}
                            </span>
                        </div>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-text2">
                            Your background image&apos;s native ratio is preserved in generation. Crop and resize for
                            other formats in the editor later.
                        </p>
                    </div>
                ) : (
                <div className="grid grid-cols-3 gap-2">
                    {AD_ASPECT_RATIOS.map((ratio) => (
                        <button
                            key={ratio}
                            type="button"
                            onClick={() => onClickRatio(ratio)}
                            className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-3.5 transition-all duration-200 ${
                                aspectRatio === ratio
                                    ? 'border-accent bg-surface'
                                    : 'border-hairline hover:border-text2/50'
                            }`}
                        >
                            <span className="flex h-9 items-end gap-1.5">
                                <span
                                    className={`h-full w-4 rounded-[4px] border ${
                                        aspectRatio === ratio ? 'border-accent bg-canvas' : 'border-hairline bg-canvas'
                                    }`}
                                />
                                <span className="sr-only">{ratio}</span>
                            </span>
                            <span className="text-[12px] font-medium text-text1">{RATIO_LABELS[ratio]}</span>
                            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-text2">{ratio}</span>
                        </button>
                    ))}
                </div>
                )}
            </section>

            {/* CTA 버튼 */}
            <section className="flex items-center justify-between rounded-xl border border-hairline bg-surface px-4 py-3.5">
                <div>
                    <p className="text-[13px] font-medium text-text1">Round CTA button</p>
                    <p className="mt-0.5 text-[12px] text-text2">Add a “Shop now” style button to the layout.</p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={ctaEnabled}
                    onClick={() => onClickCta(!ctaEnabled)}
                    className={`relative h-7 w-[52px] shrink-0 rounded-full transition-colors duration-200 ${
                        ctaEnabled ? 'bg-accent' : 'bg-hairline'
                    }`}
                >
                    <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-[left] duration-200 ${
                            ctaEnabled ? 'left-[28px]' : 'left-1'
                        }`}
                    />
                </button>
            </section>

            {/* 실행 */}
            <div className="space-y-3 border-t border-hairline pt-5">
                <button
                    type="button"
                    onClick={onGenerate}
                    disabled={isGenerating}
                    className="w-full rounded-full bg-text1 px-6 py-3.5 text-[14px] font-semibold text-canvas transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                >
                    Generate {candidateCount} candidate{candidateCount > 1 ? 's' : ''}
                </button>
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-text2">
                    {candidateCount} image{candidateCount > 1 ? 's' : ''} deducted per attempt
                </p>
                <div className="flex items-center justify-center">
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={isGenerating}
                        className="rounded-full px-4 py-2 text-[13px] font-medium text-text2 transition-colors hover:text-text1 disabled:opacity-30"
                    >
                        Back
                    </button>
                </div>
            </div>
        </div>
    );
}

export default memo(StepGenerate);
