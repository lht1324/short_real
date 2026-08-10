'use client'

import {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import Image from "next/image";
import { ChevronDown, Plus, Check, Loader2, CheckCircle, AlertCircle, Sparkles, Trash2 } from 'lucide-react';
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { voiceClientAPI } from "@/lib/api/client/voiceClientAPI";
import { Voice } from "@/lib/api/types/eleven-labs/Voice";
import { ExportPlatform } from "@/lib/api/types/supabase/VideoGenerationTasks";
import DefaultModal from "@/components/public/DefaultModal";
import WorkspaceSidebar from "@/components/public/WorkspaceSidebar";
import { WorkspaceSidebarItem } from "@/components/public/WorkspaceSidebarItem";
import AutopilotConfigPanel from "./AutopilotConfigPanel";
import AutopilotControlPanel from "./AutopilotControlPanel";
import AutopilotCaptionPreview from "./AutopilotCaptionPreview";
import CaptionConfigPanel, {ColorPickerType} from "@/components/page/workspace/editor/CaptionConfigPanel";
import ColorPickerPopover from "@/components/page/workspace/editor/ColorPickerPopover";
import { NICHE_DATA_LIST } from "@/lib/niches";
import { AutopilotData } from "@/lib/api/types/supabase/AutopilotData";
import { autopilotDataClientAPI } from "@/lib/api/client/autopilotDataClientAPI";
import { cronToWeekly } from "@/lib/utils/cronUtils";
import FONT_FAMILY_LIST, {FontFamily} from "@/lib/FontFamilyList";
import { fontMap, type FontName } from "@/lib/fonts";
import { CaptionConfigState } from "@/components/page/workspace/editor/WorkspaceEditorPageClient";
import { aiModelDataClientAPI } from "@/lib/api/client/aiModelDataClientAPI";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";
import { getAutopilotLimitByPlan } from "@/lib/utils/subscriptionUtils";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";
import { isAutopilotWindowClosed } from "@/lib/utils/cronUtils";

const INITIAL_CAPTION_CONFIG_STATE: CaptionConfigState = {
    fontFamilyName: "Poppins",
    fontSize: 72,
    fontWeight: 900,
    captionPosition: 80,
    captionChunkSize: 'auto',
    captionAnimation: 'pop',
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

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showActiveLimitModal, setShowActiveLimitModal] = useState(false);

    const maxSeriesLimit = useMemo(() => {
        return getAutopilotLimitByPlan(user?.plan);
    }, [user?.plan]);

    const maxActiveLimit = useMemo(() => {
        return getAutopilotLimitByPlan(user?.plan);
    }, [user?.plan]);

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

    const [voiceList, setVoiceList] = useState<Voice[]>([]);
    const [isVoiceLoading, setIsVoiceLoading] = useState(true);
    const [aiModelList, setAiModelList] = useState<AIModelData[]>([]);
    const [isAiModelLoading, setIsAiModelLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
    const [previewMode, setPreviewMode] = useState<'normal' | 'wide'>('normal');

    const updateCurrentSeries = useCallback((updateData: Partial<AutopilotData>) => {
        if (!currentSeriesId) return;

        // is_active를 활성화하려는 경우, 동시 활성화 개수 제한 체크
        if (updateData.is_active === true) {
            const activeCount = seriesList.filter(s => s.id !== currentSeriesId && s.is_active).length;
            if (activeCount >= maxActiveLimit) {
                setShowActiveLimitModal(true);
                return;
            }
        }

        setSeriesList(prev => prev.map(s => {
            if (s.id !== currentSeriesId) return s;

            // Handle resolution fallback if video model changes
            if (updateData.ai_model_config?.videoModelId && updateData.ai_model_config.videoModelId !== s.ai_model_config?.videoModelId) {
                const newModelId = updateData.ai_model_config.videoModelId;
                const newModel = aiModelList.find(m => m.id === newModelId);
                const currentResolution = updateData.resolution || s.resolution || '1080p';

                if (newModel && newModel.ai_model_price_list) {
                    const supportedResolutions = newModel.ai_model_price_list.map(p => {
                        if (p.unit.includes('720p')) return '720p';
                        if (p.unit.includes('1080p')) return '1080p';
                        if (p.unit.includes('2160p')) return '2160p';
                        return null;
                    }).filter(Boolean);

                    if (supportedResolutions.length > 0 && !supportedResolutions.includes(currentResolution)) {
                        // Fallback to the highest supported resolution if current is not supported
                        const fallbackResolution = supportedResolutions.includes('1080p') ? '1080p' : (supportedResolutions.includes('720p') ? '720p' : supportedResolutions[0]);
                        return { ...s, ...updateData, resolution: fallbackResolution as '720p' | '1080p' | '2160p' };
                    }
                }
            }

            return { ...s, ...updateData };
        }));
    }, [currentSeriesId, aiModelList, seriesList, maxActiveLimit]);

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

    const isFalAiKeyMissing = useMemo(() => {
        return !user?.fal_ai_api_key;
    }, [user?.fal_ai_api_key]);

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
        if (isFalAiKeyMissing) {
            reasons.push("fal.ai API key is required");
        }
        return { isValid: reasons.length === 0, reasons };
    }, [currentSeries, isFalAiKeyMissing]);

    const fetchAutopilotList = useCallback(async () => {
        if (!user?.id) return;
        setIsInitialLoading(true);
        const data = await autopilotDataClientAPI.getAutopilotDataByUserId(user.id);
        
        const patchedData = data.map(series => {
            // Check if it's missing the reference ID (legacy data)
            if (!series.ai_model_config || !series.ai_model_config.referenceImageModelId) {
                const legacyT2i = series.ai_model_config?.sceneImageT2IModelId;
                
                return {
                    ...series,
                    ai_model_config: {
                        referenceImageModelId: legacyT2i || user?.preferred_ai_model_config?.referenceImageModelId || 'd59b7307-ab54-4efd-82f5-62649c2976cc',
                        sceneImageT2IModelId: user?.preferred_ai_model_config?.sceneImageT2IModelId || '918afd0a-cc7d-41dc-ad42-914c224ef04b',
                        sceneImageI2IModelId: series.ai_model_config?.sceneImageI2IModelId || user?.preferred_ai_model_config?.sceneImageI2IModelId || '5c094112-82c3-4dee-998f-7f8438ab30c8',
                        videoModelId: series.ai_model_config?.videoModelId || user?.preferred_ai_model_config?.videoModelId || 'b5382c55-f9bb-45e9-bfcf-7b98224ae81c',
                    }
                };
            }
            return series;
        });

        const limit = getAutopilotLimitByPlan(user?.plan);
        const activeSeries = patchedData.filter(s => s.is_active);

        let finalData = patchedData;
        if (activeSeries.length > limit) {
            let activeCount = 0;
            finalData = patchedData.map(series => {
                if (series.is_active) {
                    if (activeCount < limit) {
                        activeCount++;
                        return series;
                    } else {
                        autopilotDataClientAPI.patchAutopilotDataBySeriesId(series.id, { is_active: false });
                        return { ...series, is_active: false };
                    }
                }
                return series;
            });
        }

        setSeriesList(finalData);
        setLastSavedSeriesList(JSON.parse(JSON.stringify(finalData)));
        if (finalData.length > 0 && !currentSeriesId) {
            setCurrentSeriesId(finalData[0].id);
            setCaptionConfigState(finalData[0].caption_config ?? INITIAL_CAPTION_CONFIG_STATE);
        }
        setIsInitialLoading(false);
    }, [user, currentSeriesId]);

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
                    aiModelDataClientAPI.getAIModelData()
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

        const currentConfig = currentSeries.ai_model_config;
        let inferredSceneT2iId = currentConfig?.sceneImageT2IModelId;

        if (currentConfig?.sceneImageI2IModelId) {
            const selectedI2iModel = aiModelList.find(m => m.id === currentConfig.sceneImageI2IModelId);
            const companionT2iModel = aiModelList.find(
                m => m.category === 'text-to-image' && m.display_name === selectedI2iModel?.display_name
            );
            inferredSceneT2iId = companionT2iModel ? companionT2iModel.id : '1bd90bd4-e476-40e9-8a1e-1649288786e7';
        }

        const currentSeriesWithCaptionConfigState: AutopilotData = {
            ...currentSeries,
            caption_config: captionConfigStateRef.current,
            ai_model_config: currentConfig ? {
                ...currentConfig,
                sceneImageT2IModelId: inferredSceneT2iId || '1bd90bd4-e476-40e9-8a1e-1649288786e7'
            } : undefined
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
    }, [currentSeries, isDirty, isSaving, validation.isValid, aiModelList]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (isDirty && !isSaving && validation.isValid) {
                // 윈도우가 닫혀 있는 상태이면서 시리즈를 활성화하려고 한다면 자동 저장을 건너뛰어서
                // 사용자가 수동 저장을 통해 경고 모달을 인지하고 즉시 시작 여부를 직접 결정할 수 있게 유도함
                const isClosed = currentSeries && isAutopilotWindowClosed(currentSeries.schedule_cron, currentSeries.user_timezone);
                if (isClosed && currentSeries?.is_active) {
                    return;
                }

                onClickSaveConfig();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [isDirty, isSaving, onClickSaveConfig, validation.isValid, currentSeries]);

    // 해상도가 변경될 때 미지원 비디오 모델을 호환되는 모델로 자동 스위칭해 주는 효과
    useEffect(() => {
        if (!currentSeries || aiModelList.length === 0) return;

        const resolution = currentSeries.resolution || '1080p';
        const selectedI2vId = currentSeries.ai_model_config?.videoModelId;
        if (!selectedI2vId) return;

        // 현재 선택된 비디오 모델 조회
        const currentI2vModel = aiModelList.find(m => m.id === selectedI2vId);
        if (!currentI2vModel || !currentI2vModel.ai_model_price_list) return;

        const targetUnit = resolution === '720p' ? 'video_720p' : resolution === '1080p' ? 'video_1080p' : 'video_2160p';
        const supportsCurrentRes = currentI2vModel.ai_model_price_list.some(p => p.unit === targetUnit);

        // 현재 비디오 모델이 해상도를 지원하지 않는다면 다른 호환되는 비디오 모델로 변경
        if (!supportsCurrentRes) {
            const compatibleI2vModel = aiModelList.find(m => {
                if (m.category !== 'image-to-video' || !m.ai_model_price_list) return false;
                return m.ai_model_price_list.some(p => p.unit === targetUnit);
            });

            if (compatibleI2vModel && compatibleI2vModel.id) {
                updateCurrentSeries({
                    ai_model_config: {
                        ...(currentSeries.ai_model_config || {
                            referenceImageModelId: 'd59b7307-ab54-4efd-82f5-62649c2976cc',
                            sceneImageT2IModelId: '918afd0a-cc7d-41dc-ad42-914c224ef04b',
                            sceneImageI2IModelId: '5c094112-82c3-4dee-998f-7f8438ab30c8',
                        }),
                        videoModelId: compatibleI2vModel.id,
                    }
                });
            }
        }
    }, [currentSeries?.resolution, aiModelList, currentSeries?.ai_model_config?.videoModelId, updateCurrentSeries, currentSeries]);

    // 종횡비가 16:9로 변경될 때 자막 위치를 Bottom(80)으로 자동 스위칭(보정)해 주는 효과
    useEffect(() => {
        if (!currentSeries) return;

        const ratio = currentSeries.aspect_ratio || '9:16';
        if (ratio === '16:9' && captionConfigState.captionPosition !== 80) {
            setCaptionConfigState(prev => ({
                ...prev,
                captionPosition: 80
            }));
        }
    }, [currentSeries?.aspect_ratio, captionConfigState.captionPosition, currentSeries]);

    const onClickAddSeries = useCallback(async () => {
        if (!user?.id || isActionPending) return;

        if (seriesList.length >= maxSeriesLimit) {
            setShowUpgradeModal(true);
            return;
        }

        setIsActionPending(true);
        try {
            const defaultReference = user?.preferred_ai_model_config?.referenceImageModelId || 'd59b7307-ab54-4efd-82f5-62649c2976cc';
            const defaultSceneT2i = user?.preferred_ai_model_config?.sceneImageT2IModelId || '918afd0a-cc7d-41dc-ad42-914c224ef04b';
            const defaultI2i = user?.preferred_ai_model_config?.sceneImageI2IModelId || '5c094112-82c3-4dee-998f-7f8438ab30c8';
            const defaultI2v = user?.preferred_ai_model_config?.videoModelId || 'b5382c55-f9bb-45e9-bfcf-7b98224ae81c';

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
                resolution: '1080p',
                aspect_ratio: '9:16',
                ai_model_config: {
                    referenceImageModelId: defaultReference,
                    sceneImageT2IModelId: defaultSceneT2i,
                    sceneImageI2IModelId: defaultI2i,
                    videoModelId: defaultI2v,
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
    }, [seriesList.length, user, voiceList, isActionPending, maxSeriesLimit]);

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

                        {seriesList.length > 0 && currentSeries && (
                            <button
                                onClick={onClickDeleteConfig}
                                className="flex items-center justify-center w-10 h-10 rounded-lg border border-white/10 bg-zinc-900/50 text-zinc-400 hover:bg-red-950/20 hover:border-red-500/30 hover:text-red-400 transition-all"
                                title={`Delete "${currentSeries.name}"`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Background Effects - Toned down significantly */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500 rounded-full blur-[120px]"></div>
            </div>

            {/* Plan Exceeded Warning Banner */}
            {seriesList.length > maxSeriesLimit && (
                <div className="bg-amber-950/40 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between z-20 relative animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2 text-amber-400 text-[13px] font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>You are exceeding the series limit ({maxSeriesLimit}) of your current plan. Some series cannot be activated.</span>
                    </div>
                    <button
                        onClick={() => router.push('/profile')}
                        className="text-[12px] font-semibold text-amber-400 hover:text-amber-300 underline shrink-0"
                    >
                        Upgrade Plan
                    </button>
                </div>
            )}

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
                                        isFalAiKeyMissing={isFalAiKeyMissing}
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
                                            showPositionSelector={true}
                                            aspectRatio={currentSeries.aspect_ratio || '9:16'}
                                        />
                                    </div>
                                </div>

                                {/* Col 4: Preview */}
                                <div className={`transition-all duration-300 ease-in-out ${previewMode === 'wide' ? 'flex-[1.2]' : 'flex-[0.6]'} min-w-0 border-r border-white/5 bg-black/20 flex flex-col overflow-hidden`}>
                                    <div className="px-5 pt-4 pb-2 flex-shrink-0 flex items-center justify-between">
                                        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                                            Preview
                                        </p>
                                        {previewMode === 'wide' && (
                                            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full animate-pulse">
                                                Live Wide Editor Active
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        <AutopilotCaptionPreview
                                            captionConfigState={captionConfigState}
                                            selectedFontFamilyFullShape={selectedFontFamilyFullShape}
                                            onChangeCaptionConfigState={onChangeCaptionConfigState}
                                            aspectRatio={currentSeries.aspect_ratio || '9:16'}
                                            previewMode={previewMode}
                                            onChangePreviewMode={setPreviewMode}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Col 5: Right Control Panel */}
                            <div className={`transition-all duration-300 ease-in-out flex-shrink-0 h-full overflow-hidden ${
                                previewMode === 'wide'
                                    ? 'w-0 opacity-0 pointer-events-none'
                                    : 'w-80 opacity-100'
                            }`}>
                                <AutopilotControlPanel
                                    currentSeries={currentSeries}
                                    updateSeries={updateCurrentSeries}
                                    isSaving={isSaving}
                                    isDirty={isDirty}
                                    validation={validation}
                                    onClickSaveConfig={onClickSaveConfig}
                                    onClickDeleteConfig={onClickDeleteConfig}
                                    aiModelList={aiModelList}
                                    isFalAiKeyMissing={isFalAiKeyMissing}
                                />
                            </div>
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

            {showUpgradeModal && (
                <DefaultModal
                    title="Upgrade Required"
                    message={`You have reached the maximum number of Autopilot series allowed for your current plan (${maxSeriesLimit} series).\n\nUpgrade your plan to unlock more series.`}
                    confirmText="Upgrade Plan"
                    cancelText="Close"
                    onClickConfirm={() => {
                        setShowUpgradeModal(false);
                        router.push('/profile');
                    }}
                    onClickCancel={() => setShowUpgradeModal(false)}
                />
            )}

            {showActiveLimitModal && (
                <DefaultModal
                    title="Active Limit Reached"
                    message={`You can only activate up to ${maxActiveLimit} series simultaneously on your current plan.\n\nPlease deactivate one of your currently active series first, or upgrade your plan.`}
                    confirmText="Upgrade Plan"
                    cancelText="Close"
                    onClickConfirm={() => {
                        setShowActiveLimitModal(false);
                        router.push('/profile');
                    }}
                    onClickCancel={() => setShowActiveLimitModal(false)}
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