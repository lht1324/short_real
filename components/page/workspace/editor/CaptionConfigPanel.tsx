'use client'

import {memo, useCallback, useEffect, useMemo, useRef} from "react";
import {getFontWeightName} from "@/utils/fontUtils";
import {CaptionConfigState} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";
import {FontVariant} from "@/api/types/google-fonts/GoogleFont";
import {AccordionSection} from "@/components/public/Accordion";

interface CaptionConfigPanelProps {
    captionConfigState: CaptionConfigState;
    fontFamilyNameList: string[];
    selectedFontFamilyWeightList: FontVariant[];
    selectedFontFamilyFullShape: string;
    onChangeCaptionConfigState: (captionConfigState: CaptionConfigState) => void;
}

function CaptionConfigPanel({
    captionConfigState,
    fontFamilyNameList,
    selectedFontFamilyWeightList,
    selectedFontFamilyFullShape,
    onChangeCaptionConfigState,
}: CaptionConfigPanelProps) {
    const fontSizeInputRef = useRef<HTMLInputElement>(null);

    // Font settings state
    const fontFamilyName = useMemo(() => {
        return captionConfigState.fontFamilyName;
    }, [captionConfigState.fontFamilyName]);
    const fontSize = useMemo(() => {
        return captionConfigState.fontSize;
    }, [captionConfigState.fontSize]);
    const fontWeight = useMemo(() => {
        return captionConfigState.fontWeight;
    }, [captionConfigState.fontWeight]);

    // Shadow settings state
    const isShadowEnabled = useMemo(() => {
        return captionConfigState.isShadowEnabled;
    }, [captionConfigState.isShadowEnabled]);
    const shadowIntensity = useMemo(() => {
        return captionConfigState.shadowIntensity;
    }, [captionConfigState.shadowIntensity]);
    const shadowThickness = useMemo(() => {
        return captionConfigState.shadowThickness;
    }, [captionConfigState.shadowThickness]);

    // Color settings state
    const activeColor = useMemo(() => {
        return captionConfigState.activeColor;
    }, [captionConfigState.activeColor]);
    const inactiveColor = useMemo(() => {
        return captionConfigState.inactiveColor;
    }, [captionConfigState.inactiveColor]);
    const activeOutlineColor = useMemo(() => {
        return captionConfigState.activeOutlineColor;
    }, [captionConfigState.activeOutlineColor]);
    const inactiveOutlineColor = useMemo(() => {
        return captionConfigState.inactiveOutlineColor;
    }, [captionConfigState.inactiveOutlineColor]);
    const activeOutlineColorThickness = useMemo(() => {
        return captionConfigState.activeOutlineThickness;
    }, [captionConfigState.activeOutlineThickness]);
    const inactiveOutlineColorThickness = useMemo(() => {
        return captionConfigState.inactiveOutlineThickness;
    }, [captionConfigState.inactiveOutlineThickness]);
    const activeOutlineEnabled = useMemo(() => {
        return captionConfigState.activeOutlineEnabled;
    }, [captionConfigState.activeOutlineEnabled]);
    const inactiveOutlineEnabled = useMemo(() => {
        return captionConfigState.inactiveOutlineEnabled;
    }, [captionConfigState.inactiveOutlineEnabled]);

    // Font settings state
    const onChangeFontFamilyName = useCallback((newFontFamilyName: string) => {
        onChangeCaptionConfigState({
            ...captionConfigState,
            fontFamilyName: newFontFamilyName,
        })
    }, [captionConfigState, onChangeCaptionConfigState]);
    const onChangeFontSize = useCallback((newFontSize: number) => {
        onChangeCaptionConfigState({
            ...captionConfigState,
            fontSize: newFontSize,
        })
    }, [captionConfigState, onChangeCaptionConfigState]);
    const onChangeFontWeight = useCallback((newFontWeight: number) => {
        onChangeCaptionConfigState({
            ...captionConfigState,
            fontWeight: newFontWeight,
        })
    }, [captionConfigState, onChangeCaptionConfigState]);

    // Shadow settings state
    const onChangeIsShadowEnabled = useCallback((isEnabled: boolean) => {
        onChangeCaptionConfigState({
            ...captionConfigState,
            isShadowEnabled: isEnabled,
        })
    }, [captionConfigState, onChangeCaptionConfigState]);
    const onChangeShadowIntensity = useCallback((newShadowIntensity: number) => {
        onChangeCaptionConfigState({
            ...captionConfigState,
            shadowIntensity: newShadowIntensity,
        })
    }, [captionConfigState, onChangeCaptionConfigState]);
    const onChangeShadowThickness = useCallback((newShadowThickness: number) => {
        onChangeCaptionConfigState({
            ...captionConfigState,
            shadowThickness: newShadowThickness,
        })
    }, [captionConfigState, onChangeCaptionConfigState]);

    // Color settings state
    const onChangeActiveColor = useCallback((newColor: string) => {
        onChangeCaptionConfigState({
            ...captionConfigState,
            activeColor: newColor,
        })
    }, [captionConfigState, onChangeCaptionConfigState]);
    const onChangeInactiveColor = useCallback((newColor: string) => {
        onChangeCaptionConfigState({
            ...captionConfigState,
            inactiveColor: newColor,
        })
    }, [captionConfigState, onChangeCaptionConfigState]);
    const onChangeActiveOutlineColor = useCallback((newColor: string) => {
        onChangeCaptionConfigState({
            ...captionConfigState,
            activeOutlineColor: newColor,
        })
    }, [captionConfigState, onChangeCaptionConfigState]);
    const onChangeInactiveOutlineColor = useCallback((newColor: string) => {
        onChangeCaptionConfigState({
            ...captionConfigState,
            inactiveOutlineColor: newColor,
        })
    }, [captionConfigState, onChangeCaptionConfigState]);
    const onChangeActiveOutlineColorThickness = useCallback((newThickness: number) => {
        onChangeCaptionConfigState({
            ...captionConfigState,
            activeOutlineThickness: newThickness,
        })
    }, [captionConfigState, onChangeCaptionConfigState]);
    const onChangeInactiveOutlineColorThickness = useCallback((newThickness: number) => {
        onChangeCaptionConfigState({
            ...captionConfigState,
            inactiveOutlineThickness: newThickness,
        })
    }, [captionConfigState, onChangeCaptionConfigState]);
    const onChangeActiveOutlineEnabled = useCallback((isEnabled: boolean) => {
        onChangeCaptionConfigState({
            ...captionConfigState,
            activeOutlineEnabled: isEnabled,
        })
    }, [captionConfigState, onChangeCaptionConfigState]);
    const onChangeInactiveOutlineEnabled = useCallback((isEnabled: boolean) => {
        onChangeCaptionConfigState({
            ...captionConfigState,
            inactiveOutlineEnabled: isEnabled,
        })
    }, [captionConfigState, onChangeCaptionConfigState]);

    useEffect(() => {
        if (isShadowEnabled) {
            document.getElementById("shadow-section")?.scrollIntoView({
                behavior: "smooth",
                block: "end",
            })
        }
    }, [isShadowEnabled]);

    return (
        // <div id="shadow-section" className="p-4 space-y-6">
        <div id="shadow-section" className="flex-1 min-h-0 p-4 space-y-6 overflow-y-auto">
            {/*<div className="text-purple-300 text-2xl font-medium mb-4">Caption</div>*/}

            {/* Font Section */}
            <AccordionSection id="font" title="Font" defaultExpanded={true}>
                {/* Font Family */}
                <div className="space-y-2">
                    <label className="text-white text-base font-medium">Font Family</label>
                    <select
                        value={fontFamilyName}
                        onChange={(e) => onChangeFontFamilyName(e.target.value)}
                        style={{
                            fontFamily: selectedFontFamilyFullShape,
                            fontWeight: fontWeight,
                        }}
                        className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none cursor-pointer"
                    >
                        {fontFamilyNameList.map((fontFamilyName, index) => {
                            return <option
                                key={`${fontFamilyName}_${index}`}
                                value={fontFamilyName}
                                style={{ fontFamily: `${fontFamilyName}` }}
                            >
                                {fontFamilyName}
                            </option>
                        })}
                    </select>
                </div>

                {/* Font Size */}
                <div className="space-y-2">
                    <label className="text-white text-base font-medium">Font Size</label>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <input
                                ref={fontSizeInputRef}
                                type="number"
                                min="36"
                                max="84"
                                value={fontSize}
                                onInput={(e) => {
                                    const input = e.target as HTMLInputElement;
                                    let inputValue = input.value;

                                    // Remove leading zeros except for just "0"
                                    if (inputValue.length > 1 && inputValue.startsWith('0')) {
                                        inputValue = inputValue.replace(/^0+/, '');
                                        if (inputValue === '') inputValue = '0';
                                        input.value = inputValue;
                                    }

                                    // Allow empty or 0 values, but limit max to 84
                                    if (inputValue === '') {
                                        onChangeFontSize(0);
                                    } else {
                                        const numValue = parseInt(inputValue) || 0;
                                        onChangeFontSize(Math.min(84, numValue));
                                    }
                                }}
                                onBlur={(e) => {
                                    const input = e.target as HTMLInputElement;
                                    const numValue = parseInt(input.value) || 0;
                                    // 입력 완료 시 최소값 36 체크
                                    if (numValue > 0 && numValue < 36) {
                                        onChangeFontSize(36);
                                    }
                                }}
                                className="w-12 bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-gray-400 text-base">px</span>
                        </div>
                        <input
                            type="range"
                            min="36"
                            max="84"
                            value={fontSize}
                            onChange={(e) => onChangeFontSize(parseInt(e.target.value))}
                            className="flex-1 accent-purple-500"
                        />
                    </div>
                </div>

                {/* Font Weight */}
                <div className="space-y-2">
                    <label className="text-white text-base font-medium">Font Weight</label>
                    <div className="flex items-center space-x-4">
                        <select
                            className="w-20 bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none cursor-pointer"
                            onChange={(e) => { onChangeFontWeight(parseInt(e.target.value)) }}
                            value={fontWeight}
                            style={{
                                fontFamily: fontFamilyName,
                                fontWeight: fontWeight
                            }}
                        >
                            {selectedFontFamilyWeightList.map((fontVariant, index) => {
                                return <option
                                    key={`${fontVariant.weight}_${index}`}
                                    value={fontVariant.weight}
                                >
                                    {`${fontVariant.weight}`}
                                </option>
                            })}
                        </select>
                        <input
                            type="range"
                            min={selectedFontFamilyWeightList.length > 0 ? Math.min(...selectedFontFamilyWeightList.map(w => w.weight)) : 100}
                            max={selectedFontFamilyWeightList.length > 0 ? Math.max(...selectedFontFamilyWeightList.map(w => w.weight)) : 900}
                            step="100"
                            value={fontWeight}
                            onChange={(e) => onChangeFontWeight(parseInt(e.target.value))}
                            className="flex-1 accent-purple-500"
                        />
                    </div>
                </div>
            </AccordionSection>

            {/* Text Section (renamed from Colors) */}
            <AccordionSection id="text" title="Text" defaultExpanded={true}>
                {/* Active Color */}
                <div className="space-y-2">
                    <label className="text-gray-300 text-base">Active Color</label>
                    <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full border border-purple-500/30" style={{backgroundColor: activeColor}}></div>
                        <div className="flex items-center flex-1">
                            <span className="bg-gray-800/50 border border-purple-500/30 border-r-0 rounded-l-lg px-3 py-2 text-white text-base">#</span>
                            <input
                                type="text"
                                value={activeColor.replace('#', '')}
                                onKeyDown={(e) => {
                                    if (!/[0-9A-Fa-f]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                                onChange={(e) => {
                                    onChangeActiveColor(`#${e.target.value.toUpperCase()}`);
                                }}
                                placeholder="FFFFFF"
                                maxLength={6}
                                className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded-r-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Inactive Color */}
                <div className="space-y-2">
                    <label className="text-gray-300 text-base">Inactive Color</label>
                    <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full border border-purple-500/30" style={{backgroundColor: inactiveColor}}></div>
                        <div className="flex items-center flex-1">
                            <span className="bg-gray-800/50 border border-purple-500/30 border-r-0 rounded-l-lg px-3 py-2 text-white text-base">#</span>
                            <input
                                type="text"
                                value={inactiveColor.replace('#', '')}
                                onKeyDown={(e) => {
                                    if (!/[0-9A-Fa-f]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                                onChange={(e) => {
                                    onChangeInactiveColor(`#${e.target.value.toUpperCase()}`);
                                }}
                                placeholder="A0A0A0"
                                maxLength={6}
                                className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded-r-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                    </div>
                </div>
            </AccordionSection>

            {/* Outline Section */}
            <AccordionSection id="outline" title="Outline" defaultExpanded={false}>
                {/* Active Outline */}
                <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                        <label className="text-white text-base">Active Outline</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={activeOutlineEnabled}
                                onChange={(e) => {
                                    onChangeActiveOutlineEnabled(e.target.checked);
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border border-purple-500/30 peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-purple-600"></div>
                        </label>
                    </div>
                    {activeOutlineEnabled && (
                        <div className="space-y-2 pl-4">
                            <div className="space-y-2">
                                <label className="text-gray-300 text-sm">Color</label>
                                <div className="flex items-center space-x-3">
                                    <div className="w-6 h-6 rounded-full border border-purple-500/30" style={{backgroundColor: activeOutlineColor}}></div>
                                    <div className="flex items-center flex-1">
                                        <span className="bg-gray-800/50 border border-purple-500/30 border-r-0 rounded-l-lg px-3 py-2 text-white text-base">#</span>
                                        <input
                                            type="text"
                                            value={activeOutlineColor.replace('#', '')}
                                            onKeyDown={(e) => {
                                                if (!/[0-9A-Fa-f]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            onChange={(e) => {
                                                onChangeActiveOutlineColor(`#${e.target.value.toUpperCase()}`);
                                            }}
                                            placeholder="000000"
                                            maxLength={6}
                                            className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded-r-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-gray-300 text-sm">Thickness</label>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={activeOutlineColorThickness}
                                            onInput={(e) => {
                                                const input = e.target as HTMLInputElement;
                                                let inputValue = input.value;

                                                // Remove leading zeros except for just "0"
                                                if (inputValue.length > 1 && inputValue.startsWith('0')) {
                                                    inputValue = inputValue.replace(/^0+/, '');
                                                    if (inputValue === '') inputValue = '0';
                                                    input.value = inputValue;
                                                }

                                                // Allow empty or 0 values, but limit max to 100
                                                if (inputValue === '') {
                                                    onChangeActiveOutlineColorThickness(0);
                                                } else {
                                                    const numValue = parseInt(inputValue) || 0;
                                                    onChangeActiveOutlineColorThickness(Math.min(100, numValue));
                                                }
                                            }}
                                            className="w-20 bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="text-gray-400 text-base">%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={activeOutlineColorThickness}
                                        onChange={(e) => onChangeActiveOutlineColorThickness(parseInt(e.target.value))}
                                        className="flex-1 accent-purple-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Inactive Outline */}
                <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                        <label className="text-white text-base">Inactive Outline</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={inactiveOutlineEnabled}
                                onChange={(e) => {
                                    onChangeInactiveOutlineEnabled(e.target.checked)
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border border-purple-500/30 peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-purple-600"></div>
                        </label>
                    </div>
                    {inactiveOutlineEnabled && (
                        <div className="space-y-2 pl-4">
                            <div className="space-y-2">
                                <label className="text-gray-300 text-sm">Color</label>
                                <div className="flex items-center space-x-3">
                                    <div className="w-6 h-6 rounded-full border border-purple-500/30" style={{backgroundColor: inactiveOutlineColor}}></div>
                                    <div className="flex items-center flex-1">
                                        <span className="bg-gray-800/50 border border-purple-500/30 border-r-0 rounded-l-lg px-3 py-2 text-white text-base">#</span>
                                        <input
                                            type="text"
                                            value={inactiveOutlineColor.replace('#', '')}
                                            onKeyDown={(e) => {
                                                if (!/[0-9A-Fa-f]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            onChange={(e) => {
                                                onChangeInactiveOutlineColor(`#${e.target.value.toUpperCase()}`);
                                            }}
                                            placeholder="404040"
                                            maxLength={6}
                                            className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded-r-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-gray-300 text-sm">Thickness</label>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={inactiveOutlineColorThickness}
                                            onInput={(e) => {
                                                const input = e.target as HTMLInputElement;
                                                let inputValue = input.value;

                                                // Remove leading zeros except for just "0"
                                                if (inputValue.length > 1 && inputValue.startsWith('0')) {
                                                    inputValue = inputValue.replace(/^0+/, '');
                                                    if (inputValue === '') inputValue = '0';
                                                    input.value = inputValue;
                                                }

                                                // Allow empty or 0 values, but limit max to 100
                                                if (inputValue === '') {
                                                    onChangeInactiveOutlineColorThickness(0);
                                                } else {
                                                    const numValue = parseInt(inputValue) || 0;
                                                    onChangeInactiveOutlineColorThickness(Math.min(100, numValue));
                                                }
                                            }}
                                            className="w-20 bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="text-gray-400 text-base">%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={inactiveOutlineColorThickness}
                                        onChange={(e) => onChangeInactiveOutlineColorThickness(parseInt(e.target.value))}
                                        className="flex-1 accent-purple-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </AccordionSection>

            {/* Shadow Section */}
            <AccordionSection id="shadow" title="Shadow" defaultExpanded={false}>
                <div className="flex items-center space-x-3">
                    <label className="text-white text-base">Enable Shadow</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isShadowEnabled}
                            onChange={(e) => onChangeIsShadowEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-400 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border border-purple-500/30 peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-purple-600"></div>
                    </label>
                </div>

                {isShadowEnabled && (
                    <div className="space-y-4 pl-4">
                        {/* Intensity */}
                        <div className="space-y-2">
                            <label className="text-white text-base font-medium">Intensity</label>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={shadowIntensity}
                                        onInput={(e) => {
                                            const input = e.target as HTMLInputElement;
                                            let inputValue = input.value;

                                            // Remove leading zeros except for just "0"
                                            if (inputValue.length > 1 && inputValue.startsWith('0')) {
                                                inputValue = inputValue.replace(/^0+/, '');
                                                if (inputValue === '') inputValue = '0';
                                                input.value = inputValue;
                                            }

                                            // Allow empty or 0 values, but limit max to 100
                                            if (inputValue === '') {
                                                onChangeShadowIntensity(0);
                                            } else {
                                                const numValue = parseInt(inputValue) || 0;
                                                onChangeShadowIntensity(Math.min(100, numValue));
                                            }
                                        }}
                                        className="w-20 bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="text-gray-400 text-base">%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={shadowIntensity}
                                    onChange={(e) => onChangeShadowIntensity(parseInt(e.target.value))}
                                    className="flex-1 accent-purple-500"
                                />
                            </div>
                        </div>

                        {/* Thickness */}
                        <div className="space-y-2">
                            <label className="text-white text-base font-medium">Thickness</label>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={shadowThickness}
                                        onInput={(e) => {
                                            const input = e.target as HTMLInputElement;
                                            let inputValue = input.value;

                                            // Remove leading zeros except for just "0"
                                            if (inputValue.length > 1 && inputValue.startsWith('0')) {
                                                inputValue = inputValue.replace(/^0+/, '');
                                                if (inputValue === '') inputValue = '0';
                                                input.value = inputValue;
                                            }

                                            // Allow empty or 0 values, but limit max to 100
                                            if (inputValue === '') {
                                                onChangeShadowThickness(0);
                                            } else {
                                                const numValue = parseInt(inputValue) || 0;
                                                onChangeShadowThickness(Math.min(100, numValue));
                                            }
                                        }}
                                        className="w-20 bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-base focus:border-purple-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={shadowThickness}
                                    onChange={(e) => onChangeShadowThickness(parseInt(e.target.value))}
                                    className="flex-1 accent-purple-500"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </AccordionSection>
        </div>
    )
}

export default memo(CaptionConfigPanel);