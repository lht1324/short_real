'use client'

import {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import Image from "next/image";
import { Coins, ChevronDown, Plus, Check, Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import {useRouter} from "next/navigation";
import {useAuth} from "@/context/AuthContext";
import {voiceClientAPI} from "@/lib/api/client/voiceClientAPI";
import {Voice} from "@/lib/api/types/eleven-labs/Voice";
import {ExportPlatform} from "@/lib/api/types/supabase/VideoGenerationTasks";
import DefaultModal from "@/components/public/DefaultModal";
import WorkspaceSidebar from "@/components/public/WorkspaceSidebar";
import {WorkspaceSidebarItem} from "@/components/public/WorkspaceSidebarItem";
import AutopilotConfigPanel from "./AutopilotConfigPanel";
import AutopilotControlPanel from "./AutopilotControlPanel";
import AutopilotCaptionPreview from "./AutopilotCaptionPreview";
import CaptionConfigPanel, {ColorPickerType} from "@/components/page/workspace/editor/CaptionConfigPanel";
import ColorPickerPopover from "@/components/page/workspace/editor/ColorPickerPopover";
import { NICHE_DATA_LIST } from "@/lib/niches";
import {AutopilotData} from "@/lib/api/types/supabase/AutopilotData";
import {autopilotDataClientAPI} from "@/lib/api/client/autopilotDataClientAPI";
import {cronToWeekly} from "@/lib/utils/cronUtils";
import FONT_FAMILY_LIST, {FontFamily} from "@/lib/FontFamilyList";
import { fontMap, type FontName } from "@/lib/fonts";
import {CaptionConfigState} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";

const INITIAL_CAPTION_CONFIG_STATE: CaptionConfigState = {
    fontFamilyName: "Poppins",
    fontSize: 48,
    fontWeight: 900,
    captionPosition: 80,
    captionHeight: 0,
    showCaptionLine: true,
    activeColor:'#FFFFFF',
    inactiveColor:'#AAAAAA',
    isActiveOutlineEnabled: true,
    activeOutlineColor:'#000000',
    activeOutlineThickness: 50,
    isInactiveOutlineEnabled: true,
    inactiveOutlineColor:'#000000',
    inactiveOutlineThickness: 50,
}

interface ColorPickerState {
    isOpen: boolean;
    type: ColorPickerType | null;
    position: { top: number; left: number };
    color: string;
}

function WorkspaceAutopilotPageClient() {
    const router = useRouter();
    const { user } = useAuth();

    const [seriesList, setSeriesList] = useState<AutopilotData[]>([]);
    const [lastSavedSeriesList, setLastSavedSeriesList] = useState<AutopilotData[]>([]);
    const [currentSeriesId, setCurrentSeriesId] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isActionPending, setIsActionPending] = useState(false);

    const [captionConfigState, setCaptionConfigState] = useState<CaptionConfigState>(INITIAL_CAPTION_CONFIG_STATE);
    const [fontFamilyList, setFontFamilyList] = useState<FontFamily[]>([]);
    const [isCaptionEnabled, setIsCaptionEnabled] = useState(true);
    const [colorPickerState, setColorPickerState] = useState<ColorPickerState>({
        isOpen: false,
        type: null,
        position: { top: 0, left: 0 },
        color: '#FFFFFF'
    });
    const captionConfigStateRef = useRef(captionConfigState);
    useEffect(() => {
        captionConfigStateRef.current = captionConfigState;
    }, [captionConfigState]);

    const currentSeries = useMemo(() => {
        if (!currentSeriesId) return seriesList[0] || null;
        return seriesList.find(s => s.id === currentSeriesId) || seriesList[0] || null;
    }, [seriesList, currentSeriesId]);

    const selectedFontFamily = useMemo(() => {
        return fontFamilyList.find((fontFamily) => {
            return fontFamily.name === captionConfigState.fontFamilyName;
        });
    }, [fontFamilyList, captionConfigState.fontFamilyName]);

    const selectedFontFamilyWeightList = useMemo(() => {
        return selectedFontFamily?.weightList ?? [];
    }, [selectedFontFamily?.weightList]);

    const selectedFontFamilyFullShape = useMemo(() => {
        const fontName = selectedFontFamily?.name as FontName;
        const nextFont = fontMap[fontName];
        return nextFont ? nextFont.style.fontFamily : `'${selectedFontFamily?.name}', '${selectedFontFamily?.generic}'`;
    }, [selectedFontFamily]);

    const updateCurrentSeries = useCallback((updateData: Partial<AutopilotData>) => {
        if (!currentSeriesId) return;
        setSeriesList(prev => prev.map(s => s.id === currentSeriesId ? { ...s, ...updateData } : s));
    }, [currentSeriesId]);

    const onChangeCaptionConfigState = useCallback((newCaptionConfigState: CaptionConfigState) => {
        setCaptionConfigState(newCaptionConfigState);
    }, []);

    const onToggleIsCaptionEnabled = useCallback(() => {
        setIsCaptionEnabled(prev => !prev);
    }, []);

    const onOpenColorPicker = useCallback((type: ColorPickerType, anchor: HTMLElement) => {
        const rect = anchor.getBoundingClientRect();
        const state = captionConfigStateRef.current;
        let currentColor = '#FFFFFF';
        switch (type) {
            case 'activeColor': currentColor = state.activeColor; break;
            case 'inactiveColor': currentColor = state.inactiveColor; break;
            case 'activeOutlineColor': currentColor = state.activeOutlineColor; break;
            case 'inactiveOutlineColor': currentColor = state.inactiveOutlineColor; break;
        }
        setColorPickerState({
            isOpen: true,
            type: type,
            position: { top: rect.bottom + 8, left: rect.left },
            color: currentColor
        });
    }, []);

    const onCloseColorPicker = useCallback(() => {
        setColorPickerState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const onChangeColorPickerColor = useCallback((newColor: string) => {
        setColorPickerState(prev => {
            if (!prev.type) return prev;

            const newCaptionState = { ...captionConfigStateRef.current };
            switch (prev.type) {
                case 'activeColor': newCaptionState.activeColor = newColor.toUpperCase(); break;
                case 'inactiveColor': newCaptionState.inactiveColor = newColor.toUpperCase(); break;
                case 'activeOutlineColor': newCaptionState.activeOutlineColor = newColor.toUpperCase(); break;
                case 'inactiveOutlineColor': newCaptionState.inactiveOutlineColor = newColor.toUpperCase(); break;
            }
            setCaptionConfigState(newCaptionState);

            return { ...prev, color: newColor };
        });
    }, []);

    const isDirty = useMemo(() => {
        if (!currentSeries) return false;
        const lastSaved = lastSavedSeriesList.find(s => s.id === currentSeries.id);
        if (!lastSaved) return true;
        return JSON.stringify(currentSeries) !== JSON.stringify(lastSaved);
    }, [currentSeries, lastSavedSeriesList]);

    const validation = useMemo(() => {
        if (!currentSeries) return { isValid: false, reasons: [] };
        const reasons: string[] = [];
        if (!currentSeries.name.trim()) reasons.push("Name is required");
        if (!currentSeries.voice_id) reasons.push("Voice is not selected");
        const hasPlatform = Object.values(currentSeries.platforms).some(v => v === true);
        if (!hasPlatform) reasons.push("Select at least one platform");
        const schedule = cronToWeekly(currentSeries.schedule_cron);
        if (schedule.days.length === 0) reasons.push("Select at least one day");
        if (!currentSeries.niche_preset_id && !currentSeries.niche_value?.trim()) {
            reasons.push("Niche description is empty");
        }
        return { isValid: reasons.length === 0, reasons };
    }, [currentSeries]);

    const [voiceList, setVoiceList] = useState<Voice[]>([]);
    const [isVoiceLoading, setIsVoiceLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);

    const userCreditCount = useMemo(() => user?.credit_count ?? 0, [user]);

    const fetchAutopilotList = useCallback(async () => {
        if (!user?.id) return;
        setIsInitialLoading(true);
        const data = await autopilotDataClientAPI.getAutopilotDataByUserId(user.id);
        setSeriesList(data);
        setLastSavedSeriesList(JSON.parse(JSON.stringify(data)));
        if (data.length > 0 && !currentSeriesId) {
            setCurrentSeriesId(data[0].id);
            setCaptionConfigState(data[0].caption_config ?? INITIAL_CAPTION_CONFIG_STATE);
        }
        setIsInitialLoading(false);
    }, [user?.id, currentSeriesId]);

    useEffect(() => {
        fetchAutopilotList();
    }, [fetchAutopilotList]);

    useEffect(() => {
        const fetchVoices = async () => {
            try {
                const newFamilyList = FONT_FAMILY_LIST.sort((a, b) => a.name.localeCompare(b.name));
                setFontFamilyList(newFamilyList);
                const voices = await voiceClientAPI.getVoices();
                setVoiceList(voices);
            } catch (error) {
                console.error("Failed to load voices/fonts", error);
            } finally {
                setIsVoiceLoading(false);
            }
        };
        fetchVoices();
    }, []);

    const onClickSaveConfig = useCallback(async (runImmediately?: boolean) => {
        if (!currentSeries || !isDirty || isSaving || !validation.isValid) return;
        setIsSaving(true);
        setSaveStatus('saving');

        const currentSeriesWithCaptionConfigState: AutopilotData = {
            ...currentSeries,
            caption_config: captionConfigStateRef.current,
        }
        const result = await autopilotDataClientAPI.patchAutopilotDataBySeriesId(
            currentSeries.id, 
            currentSeriesWithCaptionConfigState,
            runImmediately
        );

        if (result) {
            setLastSavedSeriesList(prev => {
                const index = prev.findIndex(s => s.id === result.id);
                if (index > -1) {
                    const newList = [...prev];
                    newList[index] = JSON.parse(JSON.stringify(result));
                    return newList;
                }
                return [...prev, JSON.parse(JSON.stringify(result))];
            });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } else {
            setSaveStatus('error');
        }
        setIsSaving(false);
    }, [currentSeries, isDirty, isSaving, validation.isValid]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (isDirty && !isSaving && validation.isValid) {
                onClickSaveConfig();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [isDirty, isSaving, onClickSaveConfig, validation.isValid]);

    const onClickAddSeries = useCallback(async () => {
        if (seriesList.length >= 4 || !user?.id || isActionPending) return;
        setIsActionPending(true);
        try {
            const newSeriesTemplate: Partial<AutopilotData> = {
                user_id: user.id,
                name: `Series ${seriesList.length + 1}`,
                is_active: false,
                niche_preset_id: NICHE_DATA_LIST[0].uiMetadata.id,
                niche_value: '',
                voice_id: voiceList[0]?.id || '',
                platforms: {
                    [ExportPlatform.YOUTUBE]: null,
                    [ExportPlatform.TIKTOK]: null,
                    [ExportPlatform.INSTAGRAM]: null,
                },
                schedule_cron: '0 10 * * *',
                user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                topic_history: [],
                caption_config: INITIAL_CAPTION_CONFIG_STATE,
            };
            const created = await autopilotDataClientAPI.postAutopilotData(newSeriesTemplate);
            if (created) {
                setSeriesList(prev => [...prev, created]);
                setLastSavedSeriesList(prev => [...prev, JSON.parse(JSON.stringify(created))]);
                setCurrentSeriesId(created.id);
            }
        } catch (error) {
            console.error("Failed to add series", error);
        } finally {
            setIsActionPending(false);
        }
    }, [seriesList.length, user?.id, voiceList, isActionPending]);

    const onClickDeleteConfig = useCallback(async () => {
        if (!currentSeries || isActionPending) return;
        if (confirm(`Are you sure you want to delete "${currentSeries.name}"?`)) {
            setIsActionPending(true);
            try {
                const success = await autopilotDataClientAPI.deleteAutopilotDataBySeriesId(currentSeries.id);
                if (success) {
                    setSeriesList(prev => {
                        const newList = prev.filter(s => s.id !== currentSeries.id);
                        if (newList.length > 0) {
                            setCurrentSeriesId(newList[0].id);
                        } else {
                            setCurrentSeriesId(null);
                        }
                        return newList;
                    });
                    setLastSavedSeriesList(prev => prev.filter(s => s.id !== currentSeries.id));
                }
            } catch (error) {
                console.error("Failed to delete series", error);
            } finally {
                setIsActionPending(false);
            }
        }
    }, [currentSeries, isActionPending]);

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            {/* Global Action Loading Overlay */}
            {isActionPending && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-gray-900/50 border border-purple-500/20 shadow-2xl">
                        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                        <p className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                            Processing...
                        </p>
                    </div>
                </div>
            )}

            {/* Floating Status Pill */}
            {saveStatus !== 'idle' && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className={`flex items-center gap-2.5 px-5 py-2 rounded-full border backdrop-blur-md shadow-2xl transition-all ${
                        saveStatus === 'saving' ? 'bg-purple-900/40 border-purple-500/50 text-purple-100' :
                            saveStatus === 'saved' ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-100' :
                                'bg-red-900/40 border-red-500/50 text-red-100'
                    }`}>
                        {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
                        {saveStatus === 'saved' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        {saveStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                        <span className="text-sm font-bold tracking-tight">
                            {saveStatus === 'saving' ? 'Syncing your changes...' :
                                saveStatus === 'saved' ? 'Changes secured' :
                                    'Connection lost - retry'}
                        </span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between py-4 border-b border-purple-500/20 bg-gray-900/50 backdrop-blur-sm relative z-20">
                <div className="flex items-center" style={{paddingLeft: '16px'}}>
                    <Image
                        src="/logo/logo-64.png"
                        alt="Short Real"
                        width={64}
                        height={64}
                        className="w-16 h-16 cursor-pointer"
                        onClick={() => router.push('/')}
                    />
                    <div className="flex flex-col ml-4">
                        <span className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent cursor-default">
                            Autopilot
                        </span>
                        <p className="text-gray-400 text-base pl-0.5 mt-1 cursor-default">
                            Hands-off automation for your English faceless channel.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 mr-6">
                    <div className="flex items-center gap-2 z-50">
                        <div className="relative">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`flex items-center justify-between w-48 px-4 h-[54px] bg-gray-900/50 border rounded-lg backdrop-blur-sm transition-all ${
                                    isDropdownOpen ? 'border-purple-400/80 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'border-purple-500/30 hover:border-purple-400/50'
                                }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    {seriesList.length === 0 ? (
                                        <span className="text-gray-400 text-sm font-medium">No Series</span>
                                    ) : (
                                        <>
                                            <span className="text-sm font-bold text-white truncate">{currentSeries?.name}</span>
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${currentSeries?.is_active ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                                        </>
                                    )}
                                </div>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-gray-900/90 border border-purple-500/30 rounded-xl backdrop-blur-md shadow-xl z-50 overflow-hidden">
                                        {seriesList.length === 0 ? (
                                            <div className="p-4 text-sm text-gray-400 text-center">Create your first series to get started.</div>
                                        ) : (
                                            <div className="py-2">
                                                {seriesList.map((series) => (
                                                    <button
                                                        key={series.id}
                                                        onClick={() => {
                                                            setCurrentSeriesId(series.id);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                                                            currentSeriesId === series.id ? 'bg-purple-600/20 text-purple-100' : 'text-gray-300 hover:bg-white/5'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <span className="text-sm font-medium truncate">{series.name}</span>
                                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${series.is_active ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                                                        </div>
                                                        {currentSeriesId === series.id && <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {seriesList.length < 4 && (
                            <button
                                onClick={onClickAddSeries}
                                className={`flex items-center justify-center w-[54px] h-[54px] rounded-lg border border-dashed transition-all ${
                                    seriesList.length === 0
                                        ? 'border-purple-400 bg-purple-600/20 text-purple-300 animate-pulse'
                                        : 'border-purple-500/40 bg-gray-900/50 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/60'
                                }`}
                                title="Add New Series"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <div className="h-8 w-px bg-purple-500/20 mx-1"></div>

                    <div className="flex items-center space-x-2 px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg backdrop-blur-sm hover:border-purple-400/50 transition-all">
                        <Coins className="w-5 h-5 text-yellow-400" />
                        <div className="flex flex-col">
                            <span className="text-xs text-purple-300">Credits</span>
                            <span className="text-lg font-bold text-yellow-400">{userCreditCount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Background Effects */}
            <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
            </div>

            {isInitialLoading ? (
                <div className="flex h-[calc(100vh-97px)] items-center justify-center relative z-10">
                    <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                </div>
            ) : (
                <div className="flex h-[calc(100vh-97px)] relative z-10">
                    {/* Left Sidebar */}
                    <WorkspaceSidebar activeItem={WorkspaceSidebarItem.AUTOPILOT} />

                    {currentSeries ? (
                        <>
                            {/* Middle area */}
                            <div className="flex-1 flex min-w-0 overflow-hidden">
                                {/* Col 2: Niche Config */}
                                <div className="flex-[1.0] min-w-0 border-r border-purple-500/20 overflow-y-auto custom-scrollbar">
                                    <AutopilotConfigPanel
                                        currentSeries={currentSeries}
                                        updateSeries={updateCurrentSeries}
                                        voiceList={voiceList}
                                        isVoiceLoading={isVoiceLoading}
                                    />
                                </div>

                                {/* Col 3: Caption Style */}
                                <div className="flex-[0.6] min-w-0 border-r border-purple-500/20 bg-gray-900/20 flex flex-col overflow-hidden">
                                    <div className="px-6 pt-5 pb-1 flex-shrink-0">
                                        <p className="text-[10px] font-bold text-purple-400/60 uppercase tracking-[0.15em]">
                                            Caption Style
                                        </p>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                                        <CaptionConfigPanel
                                            isCaptionEnabled={isCaptionEnabled}
                                            captionConfigState={captionConfigState}
                                            fontFamilyList={fontFamilyList}
                                            selectedFontFamilyWeightList={selectedFontFamilyWeightList}
                                            selectedFontFamilyFullShape={selectedFontFamilyFullShape}
                                            onToggleIsCaptionEnabled={onToggleIsCaptionEnabled}
                                            onChangeCaptionConfigState={onChangeCaptionConfigState}
                                            onOpenColorPicker={onOpenColorPicker}
                                        />
                                    </div>
                                </div>

                                {/* Col 4: Preview */}
                                <div className="flex-[0.4] min-w-0 border-r border-purple-500/20 bg-black/30 flex flex-col overflow-hidden">
                                    <div className="px-6 pt-5 pb-1 flex-shrink-0">
                                        <p className="text-[10px] font-bold text-purple-400/60 uppercase tracking-[0.15em]">
                                            Preview
                                        </p>
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        <AutopilotCaptionPreview
                                            captionConfigState={captionConfigState}
                                            selectedFontFamilyFullShape={selectedFontFamilyFullShape}
                                            onChangeCaptionConfigState={onChangeCaptionConfigState}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Col 5: Right Control Panel */}
                            <AutopilotControlPanel
                                currentSeries={currentSeries}
                                updateSeries={updateCurrentSeries}
                                isSaving={isSaving}
                                isDirty={isDirty}
                                validation={validation}
                                onClickSaveConfig={onClickSaveConfig}
                                onClickDeleteConfig={onClickDeleteConfig}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                            <div className="p-6 bg-gray-900/40 border border-purple-500/20 rounded-3xl backdrop-blur-sm text-center space-y-4 max-w-md">
                                <Sparkles className="w-12 h-12 text-purple-400 mx-auto" />
                                <h2 className="text-2xl font-bold text-white">No Autopilot Found</h2>
                                <p className="text-gray-400 leading-relaxed">
                                    Start your faceless automation journey by creating your first autopilot series.
                                </p>
                                <button
                                    onClick={onClickAddSeries}
                                    className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-transform"
                                >
                                    Create First Series
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showSaveSuccessModal && (
                <DefaultModal
                    title="Config Saved"
                    message="Your Autopilot configuration has been saved successfully."
                    cancelText="Close"
                    onClickCancel={() => setShowSaveSuccessModal(false)}
                />
            )}

            {colorPickerState.isOpen && (
                <ColorPickerPopover
                    color={colorPickerState.color}
                    onChange={onChangeColorPickerColor}
                    position={colorPickerState.position}
                    onClose={onCloseColorPicker}
                />
            )}
        </div>
    );
}

export default memo(WorkspaceAutopilotPageClient);