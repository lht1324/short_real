'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, Download } from 'lucide-react';
import AdOverlay from "@/components/page/ad/results/components/AdOverlay";
import { AdDesignLayout } from "@/lib/api/client/ad/adClientAPI";

interface AdLightboxModalProps {
    imageUrl: string;
    ratioLabel: string;
    creativeIndex: number;
    design?: AdDesignLayout | null;
    score?: number | null;
    headline?: string | null;
    onClose: () => void;
}

function AdLightboxModal({ imageUrl, ratioLabel, creativeIndex, design, score, headline, onClose }: AdLightboxModalProps) {
    const headerRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);
    const screenHeight = window.screen.height;

    useEffect(() => {
        const el = headerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setHeaderHeight(Math.round(el.getBoundingClientRect().height)));
        ro.observe(el);
        setHeaderHeight(Math.round(el.getBoundingClientRect().height));
        return () => ro.disconnect();
    }, []);

    // 디버그용: 콘솔에 헤더 높이 출력 (사장님이 직접 보실 수 있게)
    useEffect(() => {
        if (headerHeight) console.log(`[AdLightboxModal] header height: ${headerHeight}px`);
    }, [headerHeight]);

    const onClickBackdrop = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    }, [onClose]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-6"
            onClick={onClickBackdrop}
            role="dialog"
            aria-modal="true"
        >
            <div className="flex max-h-[90vh] w-full max-w-[90vh] flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
                <div ref={headerRef} className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-3">
                    <div>
                        <p className="text-[13px] font-semibold text-text1">
                            Creative {String(creativeIndex + 1).padStart(2, '0')} · {ratioLabel}
                        </p>
                        {headline ? (
                            <p className="mt-0.5 line-clamp-1 text-[12px] text-text2">“{headline}”</p>
                        ) : (
                            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-text2">
                                {score != null ? `${score.toFixed(1)} / 10` : 'no score'}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={imageUrl}
                            download={`shortreal-creative-${creativeIndex + 1}-${ratioLabel}.png`}
                            className="inline-flex items-center gap-2 rounded-full bg-text1 px-4 py-1.5 text-[12px] font-medium text-canvas hover:opacity-90"
                        >
                            <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
                            Download
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-canvas text-text2 hover:bg-surface hover:text-text1"
                        >
                            <X className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 items-center justify-center overflow-auto bg-canvas p-4">
                    {(() => {
                        const [w, h] = ratioLabel.split(':').map(Number);
                        const isVertical = w <= h;
                        const maxWidth = screenHeight * 0.9 - 16; // 'calc(90vh - 16px)';
                        const maxHeight = screenHeight * 0.9 - headerHeight - 16; // `calc(90vh - ${headerHeight}px - 16px)`;
                        const width = isVertical ? maxHeight / h * w : maxWidth;
                        const height = isVertical ? maxHeight : maxWidth / w * h;

                        return (
                            <div
                                className="relative overflow-hidden rounded-xl shadow-2xl"
                                style={{
                                    aspectRatio: `${w} / ${h}`,
                                    // width: `min(90vw, calc(85vh * ${w} / ${h}))`,
                                    // height: `min(85vh, calc(90vw * ${h} / ${w}))`,
                                    // width: isVertical ? maxHeight / h * w : maxWidth,
                                    // height: isVertical ? maxHeight : maxWidth / w * h,
                                    // maxWidth: maxWidth,
                                    // maxHeight: maxHeight,
                                    width: `${width}px`,
                                    height: `${height}px`,
                                    maxWidth: `${maxWidth}px`,
                                    maxHeight: `${maxHeight}px`,
                                } as React.CSSProperties}
                            >
                                <Image
                                    src={imageUrl}
                                    alt={`Creative ${creativeIndex + 1} · ${ratioLabel}`}
                                    className={`object-cover max-w-[${maxWidth}px] max-h-[${maxHeight}px]`}
                                    width={width}
                                    height={height}
                                    unoptimized={false}
                                />
                                {design && <AdOverlay design={design} />}
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}

export default memo(AdLightboxModal);
