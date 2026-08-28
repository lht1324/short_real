'use client'

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AppHeader from "@/components/page/ad/app-header/AppHeader";
import CreateForm from "@/components/page/ad/create/components/CreateForm";
import {
    AdAspectRatio,
    AdUploadedComponent,
} from "@/lib/api/client/ad/adClientAPI";
import { adProjectClientAPI } from "@/lib/api/client/ad/adProjectClientAPI";
import { postFormFetch } from "@/lib/api/client/baseFetch";

function inferFileExtension(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'png';
    if (ext === 'jpg') return 'jpeg';
    if (['jpeg', 'png', 'webp'].includes(ext)) return ext;
    return 'png';
}

export default function CreatePageClient() {
    const router = useRouter();

    // 구성 요소 — background는 AI가 creative마다 생성
    const [product, setProduct] = useState<AdUploadedComponent | null>(null);
    const [person, setPerson] = useState<AdUploadedComponent | null>(null);

    // 생성 옵션
    const [aspectRatios, setAspectRatios] = useState<AdAspectRatio[]>(['1:1']);
    const [conceptCount, setConceptCount] = useState(4);
    const [ctaEnabled, setCtaEnabled] = useState(false);
    const [brandPalette, setBrandPalette] = useState<string[] | null>(null);

    // 생성 진행
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasSubject = useMemo(() => product !== null || person !== null, [product, person]);

    const canGenerate = useMemo(
        () => hasSubject && aspectRatios.length > 0 && !isGenerating,
        [hasSubject, aspectRatios, isGenerating],
    );

    const totalImages = useMemo(() => aspectRatios.length * conceptCount, [aspectRatios, conceptCount]);

    const onClickGenerate = useCallback(async () => {
        if (!hasSubject || isGenerating) return;

        setError(null);
        setIsGenerating(true);

        try {
            const validPalette = brandPalette && brandPalette.length >= 3 && brandPalette.length <= 5 ? brandPalette : null;

            const productImage = product
                ? {
                      imageFileExtension: inferFileExtension(product.fileName),
                      note: product.note,
                  }
                : null;

            const personImage = person
                ? {
                      imageFileExtension: inferFileExtension(person.fileName),
                      note: person.note,
                  }
                : null;

            const { batchId } = await adProjectClientAPI.createProject({
                productImage,
                personImage,
                aspectRatios,
                conceptCount,
                ctaEnabled,
                brandPalette: validPalette,
            });

            // 원본 이미지 업로드 — batch 생성 직후 FormData로 전송 (gateway multipart 지원)
            // 업로드는 실패해도 batch 생성 자체는 유효하므로 폴백 진행
            const hasUpload = Boolean(product?.file || person?.file);
            if (hasUpload) {
                try {
                    const formData = new FormData();
                    if (product?.file) formData.append('product', product.file);
                    if (person?.file) formData.append('person', person.file);
                    await postFormFetch(`/api/ad/ad-generation-batches/${batchId}/images`, formData);
                } catch (uploadError) {
                    console.warn('[Create] original image upload failed, fallback to text-only:', uploadError);
                }
            }

            router.push(`/ad/projects/${batchId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start generation. Please try again.');
            setIsGenerating(false);
        }
    }, [hasSubject, isGenerating, product, person, aspectRatios, conceptCount, ctaEnabled, brandPalette, router]);

    const hintText = !hasSubject
        ? 'Add a product or person to start — the AI paints a different background for each creative.'
        : 'Ready — each creative gets its own AI background. Success assets only are credited.';

    return (
        <>
            <AppHeader />

            <main className="mx-auto flex min-h-[100dvh] w-full max-w-[90rem] flex-col px-6 pb-4 pt-24 sm:px-8">
                <h1 className="text-2xl font-bold tracking-tight text-text1">Create your ad</h1>
                <p className="mt-1 text-[12px] text-text2">
                    Upload your product, pick where it runs, and generate.
                </p>

                <div className="mt-4">
                    <CreateForm
                        product={product}
                        person={person}
                        onProductChange={setProduct}
                        onPersonChange={setPerson}
                        aspectRatios={aspectRatios}
                        conceptCount={conceptCount}
                        ctaEnabled={ctaEnabled}
                        brandPalette={brandPalette}
                        onAspectRatiosChange={setAspectRatios}
                        onConceptCountChange={setConceptCount}
                        onCtaEnabledChange={setCtaEnabled}
                        onBrandPaletteChange={setBrandPalette}
                    />
                </div>

                {/* 실행 도크 — 페이지 배경과 분리된 툴바, 뷰포트 하단에 고정 */}
                <div className="mt-4 bg-surface">
                    <div className="flex items-center justify-between gap-6 border-t border-hairline px-5 py-3 shadow-[0_-16px_32px_-24px_rgba(0,0,0,0.8)]">
                        <div className="min-w-0">
                            <p className="text-[13px] font-medium text-text1">
                                {conceptCount} creative{conceptCount > 1 ? 's' : ''} × {aspectRatios.length}{' '}
                                format{aspectRatios.length > 1 ? 's' : ''} = {totalImages} asset
                                {totalImages > 1 ? 's' : ''} · success only credited
                            </p>
                            <p className="mt-0.5 text-[12px] leading-relaxed text-text2">{hintText}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClickGenerate}
                            disabled={!canGenerate}
                            className="w-[240px] shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-text1 px-6 py-3.5 text-[14px] font-semibold text-canvas transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                        >
                            {isGenerating && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                            Generate {totalImages} asset{totalImages > 1 ? 's' : ''}
                        </button>
                    </div>
                </div>

                {error && (
                    <p className="mt-5 rounded-xl border border-hairline bg-surface px-3.5 py-3 text-[12px] leading-relaxed text-[#F87171]">
                        {error}
                    </p>
                )}
            </main>
        </>
    );
}