'use client'

import {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Check, ChevronDown} from "lucide-react";
import {FontFamily} from "@/lib/FontFamilyList";
import {getFontFullShape} from "@/components/remotion/fonts";

interface FontFamilyDropdownProps {
    fontFamilyList: FontFamily[];
    value: string;
    triggerFontFullShape: string;
    triggerFontWeight: number;
    onChange: (fontFamilyName: string) => void;
}

interface DropdownPosition {
    top: number;
    left: number;
    width: number;
}

function FontFamilyDropdown({
    fontFamilyList,
    value,
    triggerFontFullShape,
    triggerFontWeight,
    onChange,
}: FontFamilyDropdownProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<DropdownPosition | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    // 미리보기용 대표 weight: 400이 있으면 400, 없으면 400과 가장 가까운 값 (거리 같으면 큰 값)
    const previewWeightMap = useMemo(() => {
        const map = new Map<string, number>();
        fontFamilyList.forEach((fontFamily) => {
            const weightList = fontFamily.weightList.map((variant) => variant.weight);
            if (weightList.length === 0) {
                map.set(fontFamily.name, 400);
                return;
            }
            const previewWeight = weightList.reduce((closest, weight) => {
                const diff = Math.abs(weight - 400);
                const closestDiff = Math.abs(closest - 400);
                if (diff < closestDiff) return weight;
                if (diff === closestDiff) return Math.max(closest, weight);
                return closest;
            }, weightList[0]);
            map.set(fontFamily.name, previewWeight);
        });
        return map;
    }, [fontFamilyList]);

    const selectedIndex = useMemo(() => {
        return fontFamilyList.findIndex((fontFamily) => fontFamily.name === value);
    }, [fontFamilyList, value]);

    const onOpenDropdown = useCallback(() => {
        const trigger = triggerRef.current;
        const wrapper = wrapperRef.current;
        if (!trigger || !wrapper) return;
        const triggerRect = trigger.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        setPosition({
            top: triggerRect.bottom - wrapperRect.top + 8,
            left: triggerRect.left - wrapperRect.left,
            width: triggerRect.width,
        });
        setActiveIndex(selectedIndex !== -1 ? selectedIndex : 0);
        setIsOpen(true);
    }, [selectedIndex]);

    const onCloseDropdown = useCallback(() => {
        setIsOpen(false);
        setPosition(null);
    }, []);

    // 외부 클릭 감지 (mousedown 기반: open 직후 동일 클릭 이벤트의 우발 close 방지)
    useEffect(() => {
        if (!isOpen) return;

        const onDocumentMouseDown = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setPosition(null);
            }
        };
        const onDocumentKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                setPosition(null);
            }
        };

        document.addEventListener('mousedown', onDocumentMouseDown);
        document.addEventListener('keydown', onDocumentKeyDown);
        return () => {
            document.removeEventListener('mousedown', onDocumentMouseDown);
            document.removeEventListener('keydown', onDocumentKeyDown);
        };
    }, [isOpen]);

    const onSelectFont = useCallback((fontFamilyName: string) => {
        onChange(fontFamilyName);
        onCloseDropdown();
    }, [onChange, onCloseDropdown]);

    // 활성 항목 스크롤 추적
    useEffect(() => {
        if (!isOpen || !panelRef.current) return;
        const activeItem = panelRef.current.querySelector<HTMLElement>('[data-active="true"]');
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    }, [isOpen, activeIndex]);

    const onTriggerKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            onOpenDropdown();
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpenDropdown();
        } else if (event.key === 'Escape' && isOpen) {
            onCloseDropdown();
        }
    }, [isOpen, onOpenDropdown, onCloseDropdown]);

    const onPanelKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        if (fontFamilyList.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((prev) => (prev + 1) % fontFamilyList.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((prev) => (prev - 1 + fontFamilyList.length) % fontFamilyList.length);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const target = fontFamilyList[activeIndex];
            if (target) {
                onSelectFont(target.name);
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            onCloseDropdown();
        }
    }, [fontFamilyList, activeIndex, onSelectFont, onCloseDropdown]);

    return (
        <div ref={wrapperRef} className="relative">
            <button
                ref={triggerRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={isOpen ? onCloseDropdown : onOpenDropdown}
                onKeyDown={onTriggerKeyDown}
                className="w-full flex items-center justify-between gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-base cursor-pointer transition-colors duration-200 hover:border-white/25 focus:border-zinc-500 focus:outline-none"
                style={{
                    fontFamily: triggerFontFullShape,
                    fontWeight: triggerFontWeight,
                }}
            >
                <span className="truncate">{value}</span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-zinc-400 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && position && (
                <div
                    ref={panelRef}
                    role="listbox"
                    aria-label="Font Family"
                    onKeyDown={onPanelKeyDown}
                    className="absolute z-[100] max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-md shadow-2xl shadow-black/60 py-1.5 origin-top"
                    style={{
                        top: position.top,
                        left: position.left,
                        width: position.width,
                    }}
                >
                        {fontFamilyList.map((fontFamily, index) => {
                            const previewWeight = previewWeightMap.get(fontFamily.name) ?? 400;
                            const isSelected = fontFamily.name === value;
                            const isActive = index === activeIndex;

                            return (
                                <button
                                    key={fontFamily.name}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    data-active={isActive}
                                    onClick={() => onSelectFont(fontFamily.name)}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-white text-base transition-colors duration-150 ${
                                        isActive ? 'bg-white/10' : ''
                                    }`}
                                    style={{
                                        fontFamily: getFontFullShape(fontFamily.name, previewWeight),
                                        fontWeight: previewWeight,
                                    }}
                                >
                                    <span className="truncate">{fontFamily.name}</span>
                                    {isSelected && <Check size={14} className="shrink-0 text-white/80" />}
                                </button>
                            );
                        })}
                    </div>
            )}
        </div>
    );
}

FontFamilyDropdown.displayName = 'FontFamilyDropdown';

export default memo(FontFamilyDropdown);