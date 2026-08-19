'use client'

import { memo, useCallback, useMemo } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { AdAspectRatio, AdUploadedComponent } from "@/lib/api/client/ad/adClientAPI";
import { AD_ASPECT_RATIOS, AD_CONCEPT_OPTIONS } from "@/lib/api/client/ad/adClientAPI";
import UploadZone from "@/components/page/ad/create/components/UploadZone";

export type BackgroundMode = 'prompt' | 'upload';

const RATIO_LABELS: Record<AdAspectRatio, string> = {
    '1:1': 'Square',
    '4:5': 'Portrait',
    '9:16': 'Story',
};

const RATIO_MINI_CLASS: Record<AdAspectRatio, string> = {
    '1:1': 'h-4 w-4',
    '4:5': 'h-5 w-4',
    '9:16': 'h-8 w-4',
};

interface CreateFormProps {
    backgroundMode: BackgroundMode;
    backgroundPrompt: string;
    backgroundImage: AdUploadedComponent | null;
    product: AdUploadedComponent | null;
    person: AdUploadedComponent | null;
    onBackgroundModeChange: (mode: BackgroundMode) => void;
    onBackgroundPromptChange: (prompt: string) => void;
    onBackgroundImageChange: (file: AdUploadedComponent | null) => void;
    onProductChange: (file: AdUploadedComponent | null) => void;
    onPersonChange: (file: AdUploadedComponent | null) => void;
    aspectRatios: AdAspectRatio[];
    conceptCount: number;
    ctaEnabled: boolean;
    lockedRatio?: { width: number; height: number } | null;
    onAspectRatiosChange: (ratios: AdAspectRatio[]) => void;
    onConceptCountChange: (count: number) => void;
    onCtaEnabledChange: (enabled: boolean) => void;
    onGenerate: () => void;
    isGenerating: boolean;
}

function CreateForm({
    backgroundMode,
    backgroundPrompt,
    backgroundImage,
    product,
    person,
    onBackgroundModeChange,
    onBackgroundPromptChange,
    onBackgroundImageChange,
    onProductChange,
    onPersonChange,
    aspectRatios,
    conceptCount,
    ctaEnabled,
    lockedRatio,
    onAspectRatiosChange,
    onConceptCountChange,
    onCtaEnabledChange,
    onGenerate,
    isGenerating,
}: CreateFormProps) {
    const hasBackground = backgroundMode === 'prompt'
        ? backgroundPrompt.trim().length > 0
        : backgroundImage !== null;
    const hasSubject = product !== null || person !== null;
    const canGenerate = hasBackground && hasSubject && aspectRatios.length > 0;

    const totalImages = useMemo(() => aspectRatios.length * conceptCount, [aspectRatios, conceptCount]);

    const onClickMode = useCallback((mode: BackgroundMode) => {
        onBackgroundModeChange(mode);
    }, [onBackgroundModeChange]);

    const onClickRatio = useCallback(
        (ratio: AdAspectRatio) => {
            const selected = aspectRatios.includes(ratio);
            if (selected && aspectRatios.length === 1) {
                return;
            }
            onAspectRatiosChange(selected ? aspectRatios.filter((item) => item !== ratio) : [...aspectRatios, ratio]);
        },
        [aspectRatios, onAspectRatiosChange],
    );

    const onClickCount = useCallback((count: number) => {
        onConceptCountChange(count);
    }, [onConceptCountChange]);

    const onClickCta = useCallback((enabled: boolean) => {
        onCtaEnabledChange(enabled);
    }, [onCtaEnabledChange]);

    return (
        <div>
            <div className="grid gap-4 md:grid-cols-2">
                <section className="flex flex-col rounded-2xl border border-hairline p-5">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-[15px] font-semibold text-text1">Background</h3>
                        <div className="flex rounded-full border border-hairline p-0.5">
                            <button
                                type="button"
                                onClick={() => onClickMode('prompt')}
                                className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                                    backgroundMode === 'prompt' ? 'bg-text1 text-canvas' : 'text-text2 hover:text-text1'
                                }`}
                            >
                                Generate
                            </button>
                            <button
                                type="button"
                                onClick={() => onClickMode('upload')}
                                className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                                    backgroundMode === 'upload' ? 'bg-text1 text-canvas' : 'text-text2 hover:text-text1'
                                }`}
                            >
                                Upload
                            </button>
                        </div>
                    </div>

                    <div className="flex min-h-[10em] flex-1 flex-col">
                        {backgroundMode === 'prompt' ? (
                            <div className="relative flex min-h-0 flex-1 flex-col">
                                <textarea
                                    value={backgroundPrompt}
                                    onChange={(event) => onBackgroundPromptChange(event.target.value)}
                                    rows={3}
                                    placeholder="Describe the scene — e.g. Bright studio corner, soft morning light, minimal shelf with ceramic details, calm neutral palette."
                                    className="w-full flex-1 resize-none rounded-xl border border-hairline bg-canvas px-4 py-3 text-[13px] leading-relaxed text-text1 placeholder:text-text2/70 focus:border-text2/50 focus:outline-none"
                                />
                                <span className="mt-1.5 block text-right font-mono text-[10px] uppercase tracking-[0.14em] text-text2">
                                    {backgroundPrompt.length} chars
                                </span>
                            </div>
                        ) : (
                            <UploadZone
                                label="Background image"
                                tall
                                help="Your storefront, cafe interior, or workspace — a real place text prompts can't recreate. A clean, wide shot without people works best. PNG or JPG, up to 10 MB."
                                notePlaceholder="e.g. Keep the storefront sign — remove people walking by"
                                file={backgroundImage}
                                onChange={onBackgroundImageChange}
                            />
                        )}
                    </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-hairline p-5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[15px] font-semibold text-text1">Subjects</h3>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text2">
                            at least one
                        </span>
                    </div>

                    <div className="space-y-4">
                        <UploadZone
                            label="Product"
                            help="A clear product photo on a simple background. The AI keeps your product looking identical in every scene. PNG or JPG, up to 10 MB."
                            notePlaceholder="e.g. Use only the product — ignore the background"
                            file={product}
                            onChange={onProductChange}
                        />

                        <UploadZone
                            label="Person"
                            help="Optional — a well-lit portrait with the face clearly visible. PNG or JPG, up to 10 MB."
                            notePlaceholder="e.g. Keep the expression natural"
                            file={person}
                            onChange={onPersonChange}
                        />
                    </div>

                    {product && person && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-hairline bg-surface px-3.5 py-3">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />
                            <p className="text-[12px] leading-relaxed text-text2">
                                Combining a product and a person in one scene can reduce composite quality. Consider
                                running them as separate generations.
                            </p>
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-hairline p-5">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-[15px] font-semibold text-text1">Count</h3>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text2">
                            images
                        </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {AD_CONCEPT_OPTIONS.map((count) => (
                            <button
                                key={count}
                                type="button"
                                onClick={() => onClickCount(count)}
                                className={`relative rounded-xl border px-2 py-3 text-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] ${
                                    conceptCount === count
                                        ? 'border-accent bg-surface'
                                        : 'border-hairline hover:border-text2/50'
                                }`}
                            >
                                <span
                                    className={`block text-[15px] font-semibold ${
                                        conceptCount === count ? 'text-text1' : 'text-text2'
                                    }`}
                                >
                                    {count}
                                </span>
                                <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-text2">
                                    images
                                </span>
                                {count === 10 && (
                                    <span className="absolute -top-2 right-2 rounded-full bg-accent px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.1em] text-canvas">
                                        Pro
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <p className="mt-2.5 text-[11px] leading-snug text-text2">
                        Each image is generated in every format you select.
                    </p>
                </section>

                <section className="rounded-2xl border border-hairline p-5">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-[15px] font-semibold text-text1">Formats</h3>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text2">
                            {lockedRatio ? 'from uploaded background' : 'select one or more'}
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
                                Your background image&apos;s native ratio is preserved — run separate generations for
                                other formats.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {AD_ASPECT_RATIOS.map((ratio) => {
                                const selected = aspectRatios.includes(ratio);
                                return (
                                    <button
                                        key={ratio}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => onClickRatio(ratio)}
                                        className={`relative flex flex-col items-center gap-2 rounded-xl border px-2 py-3.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] ${
                                            selected
                                                ? 'border-accent bg-surface'
                                                : 'border-hairline hover:border-text2/50'
                                        }`}
                                    >
                                        {selected && (
                                            <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent">
                                                <Check className="h-2.5 w-2.5 text-canvas" strokeWidth={3} />
                                            </span>
                                        )}
                                        <span className="flex h-9 items-end gap-1.5">
                                            <span
                                                className={`rounded-[4px] border ${RATIO_MINI_CLASS[ratio]} ${
                                                    selected ? 'border-accent bg-canvas' : 'border-hairline bg-canvas'
                                                }`}
                                            />
                                            <span className="sr-only">{ratio}</span>
                                        </span>
                                        <span className="text-[12px] font-medium text-text1">{RATIO_LABELS[ratio]}</span>
                                        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-text2">{ratio}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="flex items-center justify-between rounded-2xl border border-hairline p-5 md:col-span-2">
                    <div>
                        <p className="text-[13px] font-medium text-text1">Round CTA button</p>
                        <p className="mt-0.5 text-[12px] text-text2">Add a “Shop now” style button to the layout.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={ctaEnabled}
                        onClick={() => onClickCta(!ctaEnabled)}
                        className={`relative h-7 w-[52px] shrink-0 rounded-full transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                            ctaEnabled ? 'bg-accent' : 'bg-hairline'
                        }`}
                    >
                        <span
                            className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm shadow-black/20 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                ctaEnabled ? 'translate-x-[24px]' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </section>
            </div>

            {/* 실행 */}
            <div className="mt-6 space-y-3">
                <button
                    type="button"
                    onClick={onGenerate}
                    disabled={!canGenerate || isGenerating}
                    className="w-full rounded-full bg-text1 px-6 py-3.5 text-[14px] font-semibold text-canvas transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                >
                    Generate {totalImages} image{totalImages > 1 ? 's' : ''}
                </button>
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-text2">
                    {conceptCount} image{conceptCount > 1 ? 's' : ''} × {aspectRatios.length} format
                    {aspectRatios.length > 1 ? 's' : ''} = {totalImages} image{totalImages > 1 ? 's' : ''} deducted
                    per attempt
                </p>
                {!hasBackground && (
                    <p className="text-center text-[12px] leading-relaxed text-text2">
                        Add a background to start.
                    </p>
                )}
                {hasBackground && !hasSubject && (
                    <p className="text-center text-[12px] leading-relaxed text-text2">
                        Add a product or person to start.
                    </p>
                )}
            </div>
        </div>
    );
}

export default memo(CreateForm);