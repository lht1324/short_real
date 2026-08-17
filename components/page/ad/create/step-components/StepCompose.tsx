'use client'

import { memo, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AdUploadedComponent } from "@/lib/api/client/ad/adClientAPI";
import UploadZone from "@/components/page/ad/create/components/UploadZone";

export type BackgroundMode = 'prompt' | 'upload';

interface StepComposeProps {
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
    onNext: () => void;
    onBack: () => void;
}

function StepCompose({
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
    onNext,
    onBack,
}: StepComposeProps) {
    const hasBackground = backgroundMode === 'prompt'
        ? backgroundPrompt.trim().length > 0
        : backgroundImage !== null;
    const hasSubject = product !== null || person !== null;
    const canNext = hasBackground && hasSubject;

    const onClickMode = useCallback((mode: BackgroundMode) => {
        onBackgroundModeChange(mode);
    }, [onBackgroundModeChange]);

    return (
        <div className="space-y-7">
            {/* 배경 */}
            <section>
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

                {backgroundMode === 'prompt' ? (
                    <div className="relative">
                        <textarea
                            value={backgroundPrompt}
                            onChange={(event) => onBackgroundPromptChange(event.target.value)}
                            rows={4}
                            placeholder="Describe the scene — e.g. Bright studio corner, soft morning light, minimal shelf with ceramic details, calm neutral palette."
                            className="w-full resize-none rounded-xl border border-hairline bg-canvas px-4 py-3 text-[13px] leading-relaxed text-text1 placeholder:text-text2/70 focus:border-text2/50 focus:outline-none"
                        />
                        <span className="mt-1.5 block text-right font-mono text-[10px] uppercase tracking-[0.14em] text-text2">
                            {backgroundPrompt.length} chars
                        </span>
                    </div>
                ) : (
                    <UploadZone
                        label="Background image"
                        hint="PNG or JPG · up to 10 MB"
                        description="Your storefront, cafe interior, or workspace — a real place text prompts can't recreate. A clean, wide shot without people works best."
                        notePlaceholder="e.g. Keep the storefront sign — remove people walking by"
                        file={backgroundImage}
                        onChange={onBackgroundImageChange}
                    />
                )}
            </section>

            <div className="h-px bg-hairline" />

            {/* 상품/인물 */}
            <section className="space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-text1">Subjects</h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text2">
                        at least one
                    </span>
                </div>

                <UploadZone
                    label="Product"
                    hint="PNG or JPG · up to 10 MB"
                    description="A clear product photo on a simple background. The AI keeps your product looking identical in every scene."
                    notePlaceholder="e.g. Use only the product — ignore the background"
                    file={product}
                    onChange={onProductChange}
                />

                <UploadZone
                    label="Person"
                    hint="PNG or JPG · up to 10 MB"
                    description="Optional — a well-lit portrait with the face clearly visible."
                    notePlaceholder="e.g. Keep the expression natural"
                    file={person}
                    onChange={onPersonChange}
                />

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

            <div className="flex items-center justify-between border-t border-hairline pt-5">
                <button
                    type="button"
                    onClick={onBack}
                    className="rounded-full px-4 py-2.5 text-[13px] font-medium text-text2 transition-colors hover:text-text1"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!canNext}
                    className="rounded-full bg-text1 px-6 py-2.5 text-[13px] font-semibold text-canvas transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}

export default memo(StepCompose);
