'use client'

import { memo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, Palette, Plus, X } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { AdAspectRatio, AdUploadedComponent } from "@/lib/api/client/ad/adClientAPI";
import { AD_ASPECT_RATIO_INFO, AD_CONCEPT_OPTIONS } from "@/lib/api/client/ad/adClientAPI";
import UploadZone from "@/components/page/ad/create/components/UploadZone";

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
    product: AdUploadedComponent | null;
    person: AdUploadedComponent | null;
    onProductChange: (file: AdUploadedComponent | null) => void;
    onPersonChange: (file: AdUploadedComponent | null) => void;
    aspectRatios: AdAspectRatio[];
    conceptCount: number;
    ctaEnabled: boolean;
    brandPalette: string[] | null;
    onAspectRatiosChange: (ratios: AdAspectRatio[]) => void;
    onConceptCountChange: (count: number) => void;
    onCtaEnabledChange: (enabled: boolean) => void;
    onBrandPaletteChange: (palette: string[] | null) => void;
}

function CreateForm({
    product,
    person,
    onProductChange,
    onPersonChange,
    aspectRatios,
    conceptCount,
    ctaEnabled,
    brandPalette,
    onAspectRatiosChange,
    onConceptCountChange,
    onCtaEnabledChange,
    onBrandPaletteChange,
}: CreateFormProps) {
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

    const [pickerColor, setPickerColor] = useState('#111111');
    const [activePickerIndex, setActivePickerIndex] = useState<number | null>(null);

    const onAddColor = useCallback(() => {
        const current = brandPalette ?? [];
        if (current.length >= 5) return;
        const next = [...current, pickerColor.toUpperCase()];
        onBrandPaletteChange(next);
        setActivePickerIndex(null);
    }, [brandPalette, pickerColor, onBrandPaletteChange]);

    const onRemoveColor = useCallback((index: number) => {
        const current = brandPalette ?? [];
        const next = current.filter((_, i) => i !== index);
        onBrandPaletteChange(next.length === 0 ? null : next);
        setActivePickerIndex(null);
    }, [brandPalette, onBrandPaletteChange]);

    const onChangeColor = useCallback((index: number, color: string) => {
        const current = brandPalette ?? [];
        const next = current.map((c, i) => (i === index ? color.toUpperCase() : c));
        onBrandPaletteChange(next);
    }, [brandPalette, onBrandPaletteChange]);

    return (
        <div className="space-y-5">
            {/* Subjects — product/person only, background is AI-generated per creative */}
            <section className="rounded-[1.5rem] border border-hairline bg-surface p-5 sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-[16px] font-semibold tracking-tight text-text1">Subjects</h3>
                        <p className="mt-1 text-[13px] leading-relaxed text-text2">
                            Upload your product or person — the AI paints a different background for each creative.
                        </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-hairline bg-canvas px-3 py-1 text-[11px] font-medium text-text2">
                        at least one
                    </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 sm:items-stretch">
                    <div className="flex flex-col">
                        <UploadZone
                            label="Product"
                            tall
                            help="A clear product photo on a simple background. The AI keeps your product identical in every scene. JPG, PNG or WebP, up to 10 MB."
                            notePlaceholder="e.g. Show only the product, drop the background"
                            file={product}
                            onChange={onProductChange}
                        />
                    </div>

                    <div className="flex flex-col">
                        <UploadZone
                            label="Person"
                            tall
                            help="Optional — a well-lit portrait with the face clearly visible. JPG, PNG or WebP, up to 10 MB."
                            notePlaceholder="e.g. Keep the natural expression"
                            file={person}
                            onChange={onPersonChange}
                        />
                    </div>
                </div>

                {/* Brand palette — optional 3-5 hex, 상시 노출하되 한 줄로 압축해 0스크롤 유지 */}
                <div className="mt-4 flex items-center gap-3 rounded-full border border-hairline bg-canvas px-3 py-2">
                    <div className="flex shrink-0 items-center gap-2">
                        <Palette className="h-3.5 w-3.5 text-text2" strokeWidth={1.8} />
                        <h4 className="text-[13px] font-medium text-text1">Brand colors</h4>
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text2">optional</span>
                    </div>
                    <span className="hidden text-[11px] text-text2 sm:inline">3–5 hex · AI weaves into materials</span>
                    <div className="ml-auto flex flex-wrap items-center gap-1.5">
                        {(brandPalette ?? []).map((hex, index) => (
                            <div key={`${hex}-${index}`} className="group relative flex items-center gap-2 rounded-full border border-hairline bg-surface pl-1 pr-2 py-1">
                                <button
                                    type="button"
                                    onClick={() => setActivePickerIndex(activePickerIndex === index ? null : index)}
                                    className="h-6 w-6 shrink-0 rounded-full border border-black/10 shadow-sm"
                                    style={{ backgroundColor: hex }}
                                    aria-label={`Edit color ${hex}`}
                                />
                                <span className="font-mono text-[11px] font-medium text-text1">{hex}</span>
                                <button
                                    type="button"
                                    onClick={() => onRemoveColor(index)}
                                    className="rounded-full p-0.5 text-text2 hover:bg-canvas hover:text-text1"
                                    aria-label={`Remove ${hex}`}
                                >
                                    <X className="h-3 w-3" strokeWidth={2} />
                                </button>
                                {activePickerIndex === index && (
                                    <div className="absolute left-0 top-full z-20 mt-2 rounded-xl border border-hairline bg-surface p-3 shadow-xl">
                                        <HexColorPicker color={hex} onChange={(c) => onChangeColor(index, c)} />
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <span className="font-mono text-[11px] text-text2">{hex}</span>
                                            <button type="button" onClick={() => setActivePickerIndex(null)} className="rounded-full bg-text1 px-3 py-1 text-[11px] font-medium text-canvas">Done</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {(brandPalette?.length ?? 0) < 5 && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 rounded-full border border-dashed border-hairline bg-surface px-2 py-1">
                                    <button
                                        type="button"
                                        onClick={() => setActivePickerIndex(activePickerIndex === -1 ? null : -1)}
                                        className="h-6 w-6 rounded-full border border-black/10 shadow-sm"
                                        style={{ backgroundColor: pickerColor }}
                                        aria-label="Pick new color"
                                    />
                                    <input
                                        value={pickerColor}
                                        onChange={(e) => setPickerColor(e.target.value.toUpperCase())}
                                        placeholder="#111111"
                                        className="w-[5.5rem] bg-transparent font-mono text-[11px] font-medium text-text1 placeholder:text-text2/60 focus:outline-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={onAddColor}
                                    disabled={(brandPalette?.length ?? 0) >= 5}
                                    className="inline-flex items-center gap-1 rounded-full bg-text1 px-3 py-1.5 text-[11px] font-medium text-canvas transition-colors hover:bg-text1/90 disabled:opacity-40"
                                >
                                    <Plus className="h-3 w-3" strokeWidth={2} />
                                    Add
                                </button>
                                {activePickerIndex === -1 && (
                                    <div className="absolute z-20 mt-2 rounded-xl border border-hairline bg-surface p-3 shadow-xl">
                                        <HexColorPicker color={pickerColor} onChange={(c) => setPickerColor(c.toUpperCase())} />
                                        <div className="mt-2 flex justify-end">
                                            <button type="button" onClick={() => setActivePickerIndex(null)} className="rounded-full bg-text1 px-3 py-1 text-[11px] font-medium text-canvas">Done</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {(brandPalette?.length ?? 0) > 0 && (brandPalette!.length < 3 || brandPalette!.length > 5) && (
                    <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-500">Add 3 to 5 colors for best results.</p>
                )}

                {product && person && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-900/30 dark:bg-amber-950/20"
                    >
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-500" strokeWidth={2} />
                        <p className="text-[12px] leading-relaxed text-amber-800 dark:text-amber-200/90">
                            Combining a product and a person in one scene can reduce composite quality. Consider
                            running them as separate generations.
                        </p>
                    </motion.div>
                )}
            </section>

            {/* 출력 설정 */}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
                <section className="rounded-[1.5rem] border border-hairline bg-surface p-5 sm:p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-[15px] font-semibold tracking-tight text-text1">Where will it run?</h3>
                        <span className="text-[12px] text-text2">pick one or more</span>
                    </div>
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
                                                        ? 'border-accent bg-accent/10 shadow-[0_0_0_1px_rgba(var(--accent),0.2)]'
                                                        : 'border-hairline bg-canvas hover:border-text2/40 hover:bg-surface'
                                                }`}
                                                style={{ aspectRatio: RATIO_ASPECT[ratio] }}
                                            >
                                                {selected && (
                                                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent shadow-sm">
                                                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
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
                </section>

                <div className="flex flex-col gap-5">
                    <section className="rounded-[1.5rem] border border-hairline bg-surface p-5 sm:p-6">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-[15px] font-semibold tracking-tight text-text1">How many options?</h3>
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
                                            : 'border-hairline bg-surface hover:border-text2/40'
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
                                        <span className="absolute -top-2 right-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                                            Pro
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="mt-2.5 text-[12px] leading-snug text-text2">
                            Each creative is generated in every format you select — backgrounds vary per creative.
                        </p>
                    </section>

                    <section className="flex items-center justify-between rounded-[1.5rem] border border-hairline bg-surface p-5 sm:p-6">
                        <div>
                            <p className="text-[13px] font-medium tracking-tight text-text1">Round CTA button</p>
                            <p className="mt-0.5 text-[12px] leading-relaxed text-text2">Add a &ldquo;Shop now&rdquo; style button to the layout.</p>
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
