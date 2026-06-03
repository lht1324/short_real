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
import {aiModelDataClient} from "@/lib/api/client/aiModelDataClient";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";

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
    const [aiModelList, setAiModelList] = useState<AIModelData[]>([]);
    const [isAiModelLoading, setIsAiModelLoading] = useState(true);
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
        const fetchData = async () => {
            try {
                const newFamilyList = FONT_FAMILY_LIST.sort((a, b) => a.name.localeCompare(b.name));
                setFontFamilyList(newFamilyList);
                
                const [voices, aiModels] = await Promise.all([
                    voiceClientAPI.getVoices(),
                    aiModelDataClient.getAIModelData()
                ]);
                setVoiceList(voices);
                setAiModelList(aiModels);
            } catch (error) {
                console.error("Failed to load initial data", error);
            } finally {
                setIsVoiceLoading(false);
                setIsAiModelLoading(false);
            }
        };
        fetchData();
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
            const defaultT2i = aiModelList.find(m => m.category === 'text-to-image')?.id || 'ca637a97-f060-4b81-a7d4-118a6f4aac0c';
            const defaultI2i = aiModelList.find(m => m.category === 'image-to-image')?.id || '79a506ac-eced-4643-b017-c8a2bb0f028b';
            const defaultI2v = aiModelList.find(m => m.category === 'image-to-video')?.id || '326a9a71-26a9-4142-8371-5467f316bcd6';

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
                ai_model_config: {
                    t2iModelId: defaultT2i,
                    i2iModelId: defaultI2i,
                    i2vModelId: defaultI2v,
                }
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
    }, [seriesList.length, user?.id, voiceList, isActionPending, aiModelList]);

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
        <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden">
            {/* Global Action Loading Overlay */}
            {isActionPending && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-zinc-900/80 border border-white/10 shadow-2xl">
                        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
                        <p className="text-sm font-medium text-zinc-300">
                            Processing...
                        </p>
                    </div>
                </div>
            )}

            {/* Floating Status Pill */}
            {saveStatus !== 'idle' && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border backdrop-blur-md shadow-lg transition-all ${
                        saveStatus === 'saving' ? 'bg-zinc-900/80 border-white/10 text-zinc-300' :
                            saveStatus === 'saved' ? 'bg-emerald-900/20 border-emerald-500/20 text-emerald-300' :
                                'bg-red-900/20 border-red-500/20 text-red-300'
                    }`}>
                        {saveStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {saveStatus === 'saved' && <CheckCircle className="w-3.5 h-3.5" />}
                        {saveStatus === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
                        <span className="text-[13px] font-medium">
                            {saveStatus === 'saving' ? 'Syncing...' :
                                saveStatus === 'saved' ? 'Saved' :
                                    'Connection lost'}
                        </span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between py-3 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md relative z-20">
                <div className="flex items-center" style={{paddingLeft: '16px'}}>
                    <Image
                        src="/logo/logo-64.png"
                        alt="Short Real"
                        width={48}
                        height={48}
                        className="w-12 h-12 cursor-pointer"
                        onClick={() => router.push('/')}
                    />
                    <div className="flex flex-col ml-3">
                        <span className="text-2xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent cursor-default leading-none">
                            Autopilot
                        </span>
                        <p className="text-zinc-500 text-[13px] mt-0.5 cursor-default">
                            Automation for your English faceless channel.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 mr-6">
                    <div className="flex items-center gap-2 z-50">
                        <div className="relative">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`flex items-center justify-between w-48 px-3 h-10 bg-zinc-900/50 border rounded-lg transition-all ${
                                    isDropdownOpen ? 'border-zinc-600 bg-zinc-800' : 'border-white/10 hover:border-white/20'
                                }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    {seriesList.length === 0 ? (
                                        <span className="text-zinc-500 text-[13px] font-medium">No Series</span>
                                    ) : (
                                        <>
                                            <span className="text-[13px] font-medium text-zinc-200 truncate">{currentSeries?.name}</span>
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${currentSeries?.is_active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-zinc-600'}`}></span>
                                        </>
                                    )}
                                </div>
                                <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                                    <div className="absolute top-full right-0 mt-1.5 w-56 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                                        {seriesList.length === 0 ? (
                                            <div className="p-3 text-[13px] text-zinc-500 text-center">Create your first series to get started.</div>
                                        ) : (
                                            <div className="py-1">
                                                {seriesList.map((series) => (
                                                    <button
                                                        key={series.id}
                                                        onClick={() => {
                                                            setCurrentSeriesId(series.id);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                                                            currentSeriesId === series.id ? 'bg-white/5 text-zinc-100' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <span className="text-[13px] font-medium truncate">{series.name}</span>
                                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${series.is_active ? 'bg-emerald-400' : 'bg-zinc-600'}`}></span>
                                                        </div>
                                                        {currentSeriesId === series.id && <Check className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />}
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
                                className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-all ${
                                    seriesList.length === 0
                                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                                        : 'border-white/10 bg-zinc-900/50 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                                }`}
                                title="Add New Series"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-1"></div>

                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-zinc-900/50 border border-white/10 rounded-lg">
                        <Coins className="w-4 h-4 text-zinc-400" />
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-[11px] text-zinc-500 font-medium">Credits</span>
                            <span className="text-[13px] font-medium text-zinc-200">{userCreditCount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Background Effects - Toned down significantly */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500 rounded-full blur-[120px]"></div>
            </div>

            {isInitialLoading ? (
                <div className="flex h-[calc(100vh-73px)] items-center justify-center relative z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                </div>
            ) : (
                <div className="flex h-[calc(100vh-73px)] relative z-10">
                    {/* Left Sidebar */}
                    <WorkspaceSidebar activeItem={WorkspaceSidebarItem.AUTOPILOT} />

                    {currentSeries ? (
                        <>
                            {/* Middle area */}
                            <div className="flex-1 flex min-w-0 overflow-hidden">
                                {/* Col 2: Niche Config */}
                                <div className="flex-[1.0] min-w-0 border-r border-white/5 overflow-y-auto custom-scrollbar">
                                    <AutopilotConfigPanel
                                        currentSeries={currentSeries}
                                        updateSeries={updateCurrentSeries}
                                        voiceList={voiceList}
                                        isVoiceLoading={isVoiceLoading}
                                        aiModelList={aiModelList}
                                        isAiModelLoading={isAiModelLoading}
                                    />
                                </div>

                                {/* Col 3: Caption Style */}
                                <div className="flex-[0.6] min-w-0 border-r border-white/5 bg-zinc-900/20 flex flex-col overflow-hidden">
                                    <div className="px-5 pt-4 pb-2 flex-shrink-0">
                                        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
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
                                <div className="flex-[0.4] min-w-0 border-r border-white/5 bg-black/20 flex flex-col overflow-hidden">
                                    <div className="px-5 pt-4 pb-2 flex-shrink-0">
                                        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
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
                                aiModelList={aiModelList}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                            <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-2xl text-center space-y-4 max-w-sm">
                                <Sparkles className="w-8 h-8 text-zinc-500 mx-auto" />
                                <h2 className="text-xl font-medium text-zinc-200">No Series Found</h2>
                                <p className="text-sm text-zinc-500 leading-relaxed">
                                    Create your first series to start automating your channel.
                                </p>
                                <button
                                    onClick={onClickAddSeries}
                                    className="px-6 py-2.5 bg-white text-black rounded-lg font-medium text-sm hover:bg-zinc-200 transition-colors mt-2"
                                >
                                    Create Series
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