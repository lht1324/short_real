'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaptionConfigState } from "@/components/page/workspace/editor/WorkspaceEditorPageClient";
import Image from "next/image";
import { Properties } from "csstype";
import { Maximize2 } from "lucide-react";

const EDITOR_VERTICAL_MOCKUP_HEIGHT = 590;
const EDITOR_HORIZONTAL_MOCKUP_HEIGHT = 443;

interface AutopilotCaptionPreviewProps {
    captionConfigState: CaptionConfigState;
    selectedFontFamilyFullShape: string;
    backgroundImageUrl?: string;
    onChangeCaptionConfigState: (captionConfigState: CaptionConfigState) => void;
    aspectRatio?: '9:16' | '16:9';
    previewMode?: 'normal' | 'wide';
    onChangePreviewMode?: (mode: 'normal' | 'wide') => void;
}

function AutopilotCaptionPreview({
    captionConfigState,
    selectedFontFamilyFullShape,
    backgroundImageUrl,
    onChangeCaptionConfigState,
    aspectRatio = '9:16',
    previewMode = 'normal',
    onChangePreviewMode,
}: AutopilotCaptionPreviewProps) {
    const mockupRef = useRef<HTMLDivElement>(null);
    const [mockupHeight, setMockupHeight] = useState<number>(590);

    useEffect(() => {
        const el = mockupRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            const height = entries[0]?.contentRect.height;
            if (height > 0) {
                setMockupHeight(height);
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const scale = useMemo(() => {
        const baseScale = 0.7;
        if (aspectRatio === '16:9') {
            return (mockupHeight / EDITOR_HORIZONTAL_MOCKUP_HEIGHT) * baseScale;
        } else {
            return (mockupHeight / EDITOR_VERTICAL_MOCKUP_HEIGHT) * baseScale;
        }
    }, [aspectRatio, mockupHeight]);

    const makeWordStyle = useCallback((isActive: boolean): Properties => {
        const {
            fontSize, fontWeight,
            activeColor, inactiveColor,
            isActiveOutlineEnabled, activeOutlineColor, activeOutlineThickness,
            isInactiveOutlineEnabled, inactiveOutlineColor, inactiveOutlineThickness,
        } = captionConfigState;

        return {
            fontFamily: selectedFontFamilyFullShape,
            fontSize: `${fontSize * scale}px`,
            fontWeight,
            lineHeight: '1.2',
            paintOrder: 'stroke fill',
            color: isActive ? activeColor : inactiveColor,
            WebkitTextStroke: isActive
                ? isActiveOutlineEnabled
                    ? `${(activeOutlineThickness / 100) * 12 * scale}px ${activeOutlineColor}`
                    : '0px transparent'
                : isInactiveOutlineEnabled
                    ? `${(inactiveOutlineThickness / 100) * 12 * scale}px ${inactiveOutlineColor}`
                    : '0px transparent',
        };
    }, [captionConfigState, selectedFontFamilyFullShape, scale]);

    const activeWordStyle  = useMemo(() => makeWordStyle(true),  [makeWordStyle]);
    const inactiveWordStyle = useMemo(() => makeWordStyle(false), [makeWordStyle]);

    const topPercent = useMemo(() => {
        return (captionConfigState.captionPosition / 100) * 80;
    }, [captionConfigState.captionPosition]);

    return (
        <div className="h-full w-full flex items-center justify-center p-4 relative">
            {/* Wide Editor Guide Banner */}
            {previewMode === 'wide' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/90 border border-zinc-800/80 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                    <span className="text-[11px] font-semibold text-zinc-300 whitespace-nowrap">
                        Wide Editor Active. Close to restore saving/config tools.
                    </span>
                    <button
                        type="button"
                        onClick={() => onChangePreviewMode?.('normal')}
                        className="px-2.5 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-bold border border-white/5 transition-all cursor-pointer focus:outline-none"
                    >
                        Close
                    </button>
                </div>
            )}

            {/* Single Large Mockup Canvas */}
            <div
                ref={mockupRef}
                className="relative rounded-2xl overflow-hidden border-2 border-purple-500/20 bg-zinc-900 shadow-2xl transition-all duration-200"
                style={aspectRatio === '16:9' ? {
                    aspectRatio: '16 / 9',
                    width: '100%',
                    height: 'auto',
                } : {
                    aspectRatio: '9 / 16',
                    height: '100%',
                    maxHeight: previewMode === 'wide' ? '600px' : '480px',
                    width: 'auto',
                }}
            >
                {backgroundImageUrl ? (
                    <Image src={backgroundImageUrl} alt="Preview" fill className="object-cover" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-1/4 left-1/4 w-8 h-8 bg-pink-500 rounded-full blur-xl" />
                            <div className="absolute bottom-1/3 right-1/4 w-6 h-6 bg-purple-500 rounded-full blur-xl" />
                        </div>
                    </div>
                )}

                {/* Caption */}
                <div
                    className="absolute inset-x-0 overflow-hidden"
                    style={{ top: `${topPercent}%`, bottom: 0 }}
                >
                    <p className="text-center leading-tight px-2 break-words">
                        <span style={activeWordStyle}>Make it short,<br/></span>
                        <span style={inactiveWordStyle}>make it real</span>
                    </p>
                </div>

                {/* Floating Expand Buttons Group inside Mockup */}
                <div className="absolute right-3 bottom-3 z-30 flex items-center gap-2">
                    {/* Wide Edit Mode Toggle */}
                    <button
                        type="button"
                        onClick={() => onChangePreviewMode?.(previewMode === 'wide' ? 'normal' : 'wide')}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg hover:scale-105 active:scale-95 focus:outline-none ${
                            previewMode === 'wide'
                                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white'
                                : 'bg-black/60 hover:bg-black/85 border-white/10 text-zinc-300 hover:text-white'
                        }`}
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>{previewMode === 'wide' ? 'Close Wide' : 'Wide Edit'}</span>
                    </button>
                </div>

                <div className="absolute inset-0 pointer-events-none border-[6px] border-black/40 rounded-2xl" />
                {aspectRatio !== '16:9' && (
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/15 rounded-full" />
                )}
            </div>
        </div>
    );
}

export default memo(AutopilotCaptionPreview);