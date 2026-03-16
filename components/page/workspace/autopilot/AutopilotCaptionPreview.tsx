'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaptionConfigState } from "@/components/page/workspace/editor/WorkspaceEditorPageClient";
import Image from "next/image";
import { Properties } from "csstype";
import { Check } from "lucide-react";

interface AutopilotCaptionPreviewProps {
    captionConfigState: CaptionConfigState;
    selectedFontFamilyFullShape: string;
    backgroundImageUrl?: string;
    onChangeCaptionConfigState: (captionConfigState: CaptionConfigState) => void;
}

const POSITION_PRESETS = [
    { label: 'Bottom', captionPosition: 80 },
    { label: 'Middle', captionPosition: 50 },
    { label: 'Top',    captionPosition: 15 },
];

function AutopilotCaptionPreview({
    captionConfigState,
    selectedFontFamilyFullShape,
    backgroundImageUrl,
    onChangeCaptionConfigState,
}: AutopilotCaptionPreviewProps) {
    const mockupRef = useRef<HTMLDivElement>(null);
    const [mockupHeight, setMockupHeight] = useState(120);
    const [screenHeight, setScreenHeight] = useState(1080);

    useEffect(() => {
        setScreenHeight(window.screen.height);
    }, []);

    useEffect(() => {
        const el = mockupRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            const height = entries[0]?.contentRect.height;
            if (height > 0) setMockupHeight(height);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const scale = useMemo(() => mockupHeight / screenHeight, [mockupHeight, screenHeight]);

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
                    ? `${(activeOutlineThickness / 100) * 12 * 0.7 * scale}px ${activeOutlineColor}`
                    : '0px transparent'
                : isInactiveOutlineEnabled
                    ? `${(inactiveOutlineThickness / 100) * 12 * 0.7 * scale}px ${inactiveOutlineColor}`
                    : '0px transparent',
        };
    }, [captionConfigState, selectedFontFamilyFullShape, scale]);

    const activeWordStyle  = useMemo(() => makeWordStyle(true),  [makeWordStyle]);
    const inactiveWordStyle = useMemo(() => makeWordStyle(false), [makeWordStyle]);

    const onSelectPreset = useCallback((captionPosition: number) => {
        onChangeCaptionConfigState({ ...captionConfigState, captionPosition });
    }, [captionConfigState, onChangeCaptionConfigState]);

    return (
        <div className="h-full w-full flex flex-col gap-4 p-4 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col items-center gap-6 w-full">
                {POSITION_PRESETS.map((preset, idx) => {
                    const isSelected = captionConfigState.captionPosition === preset.captionPosition;
                    const topPercent = (preset.captionPosition / 100) * 80;

                    return (
                        <button
                            key={preset.label}
                            onClick={() => onSelectPreset(preset.captionPosition)}
                            className="flex flex-col items-center gap-2 w-full group"
                        >
                            {/* Label */}
                            <span className={`text-[11px] font-bold self-start transition-colors ${
                                isSelected ? 'text-purple-300' : 'text-gray-500 group-hover:text-gray-400'
                            }`}>
                                {preset.label}
                            </span>

                            {/* Mockup */}
                            <div
                                ref={idx === 0 ? mockupRef : undefined}
                                className={`relative w-full rounded-xl overflow-hidden border-2 transition-all duration-200 shadow-lg ${
                                    isSelected
                                        ? 'border-purple-400 shadow-purple-500/30'
                                        : 'border-purple-500/20 group-hover:border-purple-500/50'
                                }`}
                                style={{ aspectRatio: '9 / 16' }}
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
                                    <p className="text-center leading-tight px-1 break-words">
                                        <span style={activeWordStyle}>Lorem ipsum<br/></span>
                                        <span style={inactiveWordStyle}>dolor sit amet</span>
                                    </p>
                                </div>

                                {isSelected && (
                                    <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                                        <Check className="w-2.5 h-2.5 text-white" />
                                    </div>
                                )}

                                <div className="absolute inset-0 pointer-events-none border-[4px] border-black/40 rounded-xl" />
                                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white/15 rounded-full" />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default memo(AutopilotCaptionPreview);