'use client'

import { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check } from 'lucide-react';
import { AdAspectRatio, AdUploadedComponent } from "@/lib/api/client/ad/adClientAPI";
import { AD_ASPECT_RATIO_INFO, AD_CONCEPT_OPTIONS } from "@/lib/api/client/ad/adClientAPI";
import UploadZone from "@/components/page/ad/create/components/UploadZone";

export type BackgroundMode = 'prompt' | 'upload';

/*
 * 돌담 masonry — 3열 배치:
 *   9:16 | 4:5 + 2:3 | 16:9 + 1:1
 * 열 폭 비율 99:64:113 이면 각 열의 높이가 정확히 같아져
 * 서로 다른 비율 블록들이 빈틈없이 하나의 직사각형을 이룬다.
 */
const STONE_COLUMNS: { grow: number; ratios: AdAspectRatio[] }[] = [
    { grow: 99, ratios: ['9:16'] },
    { grow: 64, ratios: ['4:5', '2:3'] },
    { grow: 113, ratios: ['16:9', '1:1'] },
];

const RATIO_ASPECT: Record<AdAspectRatio, string> = {
    '1:1': '1 / 1',
    '4:5': '4 / 5',
    '9:16': '9 / 16',
    '16:9': '16 / 9',
    '2:3': '2 / 3',
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
}: CreateFormProps) {
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
            {/* 콘텐츠 입력 */}
            <div className="grid gap-5 lg:grid-cols-2">
                <section className="flex flex-col rounded-2xl border border-hairline bg-surface p-5">
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

                    <div className="flex min-h-[9rem] flex-1 flex-col">
                        <AnimatePresence mode="wait">
                            {backgroundMode === 'prompt' ? (
                                <motion.div
                                    key="prompt"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                    className="relative flex min-h-0 flex-1 flex-col"
                                >
                                    <textarea
                                        value={backgroundPrompt}
                                        onChange={(event) => onBackgroundPromptChange(event.target.value)}
                                        rows={3}
                                        placeholder="Describe the scene — e.g. Bright studio corner, soft morning light, minimal shelf with ceramic details, calm neutral palette."
                                        className="w-full flex-1 resize-none rounded-xl border border-hairline bg-canvas px-4 py-3 text-[13px] leading-relaxed text-text1 placeholder:text-text2/70 focus:border-text2/50 focus:outline-none"
                                        aria-label="Background description"
                                    />
                                    <span className="mt-1.5 block text-right text-[11px] text-text2">
                                        {backgroundPrompt.length} chars
                                    </span>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="upload"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                    className="flex flex-1 flex-col"
                                >
                                    <UploadZone
                                        label="Background image"
                                        tall
                                        help="Your storefront, cafe interior, or workspace — a real place text prompts can't recreate. A clean, wide shot without people works best. JPG, PNG or WebP, up to 10 MB."
                                        notePlaceholder="e.g. Keep the storefront sign, remove people walking by"
                                        file={backgroundImage}
                                        onChange={onBackgroundImageChange}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-hairline bg-surface p-5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[15px] font-semibold text-text1">Subjects</h3>
                        <span className="text-[12px] text-text2">at least one</span>
                    </div>

                    <div className="space-y-4">
                        <UploadZone
                            label="Product"
                            help="A clear product photo on a simple background. The AI keeps your product looking identical in every scene. JPG, PNG or WebP, up to 10 MB."
                            notePlaceholder="e.g. Show only the product, drop the background"
                            file={product}
                            onChange={onProductChange}
                        />

                        <UploadZone
                            label="Person"
                            help="Optional — a well-lit portrait with the face clearly visible. JPG, PNG or WebP, up to 10 MB."
                            notePlaceholder="e.g. Keep the natural expression"
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
            </div>

            {/* 출력 설정 */}
            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
                <section className="rounded-2xl border border-hairline bg-surface p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-[15px] font-semibold text-text1">Where will it run?</h3>
                        <span className="text-[12px] text-text2">
                            {lockedRatio ? 'from uploaded background' : 'pick one or more'}
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
                        <div className="flex justify-center">
                            <div className="flex w-full max-w-[32rem] gap-3">
                                {STONE_COLUMNS.map((column) => (
                                    <div
                                        key={column.grow}
                                        className="flex flex-col gap-3"
                                        style={{ flexGrow: column.grow, flexBasis: 0 }}
                                    >
                                        {column.ratios.map((ratio) => {
                                            const selected = aspectRatios.includes(ratio);
                                            return (
                                                <button
                                                    key={ratio}
                                                    type="button"
                                                    aria-pressed={selected}
                                                    onClick={() => onClickRatio(ratio)}
                                                    className={`relative flex w-full flex-col items-center justify-center gap-1 rounded-xl border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] ${
                                                        selected
                                                            ? 'border-accent bg-accent/10'
                                                            : 'border-hairline bg-canvas hover:border-text2/50'
                                                    }`}
                                                    style={{ aspectRatio: RATIO_ASPECT[ratio] }}
                                                >
                                                    {selected && (
                                                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent shadow-sm">
                                                            <Check className="h-3 w-3 text-canvas" strokeWidth={3} />
                                                        </span>
                                                    )}
                                                    <span className={`text-[12px] font-semibold leading-tight ${selected ? 'text-text1' : 'text-text2'}`}>
                                                        {AD_ASPECT_RATIO_INFO[ratio].label}
                                                    </span>
                                                    <span className={`px-2 text-center text-[10px] leading-tight ${selected ? 'text-text2' : 'text-text2/80'}`}>
                                                        {AD_ASPECT_RATIO_INFO[ratio].usage}
                                                    </span>
                                                    <span className={`font-mono text-[10px] uppercase tracking-[0.12em] ${selected ? 'text-accent' : 'text-text2/80'}`}>
                                                        {ratio}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                <div className="flex flex-col gap-5">
                    <section className="rounded-2xl border border-hairline bg-surface p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-[15px] font-semibold text-text1">How many options?</h3>
                            <span className="text-[12px] text-text2">per batch</span>
                        </div>
                        <div className="flex gap-2">
                            {AD_CONCEPT_OPTIONS.map((count) => (
                                <button
                                    key={count}
                                    type="button"
                                    onClick={() => onClickCount(count)}
                                    className={`relative flex-1 rounded-xl border px-2 py-3 text-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] ${
                                        conceptCount === count
                                            ? 'border-accent bg-accent/10'
                                            : 'border-hairline bg-surface hover:border-text2/50'
                                    }`}
                                >
                                    <span
                                        className={`block text-[15px] font-semibold ${
                                            conceptCount === count ? 'text-text1' : 'text-text2'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                    <span className="mt-0.5 block whitespace-nowrap text-[10px] text-text2">
                                        {count === 1 ? 'creative' : 'creatives'}
                                    </span>
                                    {count === 10 && (
                                        <span className="absolute -top-2 right-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-canvas">
                                            Pro
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="mt-2.5 text-[12px] leading-snug text-text2">
                            Each creative is generated in every format you select.
                        </p>
                    </section>

                    <section className="flex items-center justify-between rounded-2xl border border-hairline bg-surface p-5">
                        <div>
                            <p className="text-[13px] font-medium text-text1">Round CTA button</p>
                            <p className="mt-0.5 text-[12px] text-text2">Add a &ldquo;Shop now&rdquo; style button to the layout.</p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={ctaEnabled}
                            onClick={() => onClickCta(!ctaEnabled)}
                            className={`relative h-7 w-[3.25rem] shrink-0 rounded-full transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                ctaEnabled ? 'bg-accent' : 'bg-hairline'
                            }`}
                        >
                            <span
                                className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm shadow-black/20 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                    ctaEnabled ? 'translate-x-6' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default memo(CreateForm);