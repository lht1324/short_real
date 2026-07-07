'use client'

import {memo, useCallback, useEffect, useMemo, useState} from "react";
import {
    AlertCircle,
    BarChart3,
    CheckCircle2,
    ChevronDown,
    Clock,
    DollarSign,
    Globe,
    Info,
    Loader2,
    Pause,
    Play,
    Sparkles,
    Trash2
} from 'lucide-react';
import {ExportPlatform} from "@/lib/api/types/supabase/VideoGenerationTasks";
import {AutopilotData} from "@/lib/api/types/supabase/AutopilotData";
import {cronToWeekly, weeklyToCron} from "@/lib/utils/cronUtils";
import {autopilotDataClientAPI, AutopilotPlatformConnection} from "@/lib/api/client/autopilotDataClientAPI";
import PlatformAccountCard from "@/components/page/workspace/autopilot/PlatformAccountCard";
import ExportSettingsModal from "@/components/page/workspace/dashboard/export-settings-modal/ExportSettingsModal";
import {ExportPrivacySetting} from "@/components/page/workspace/dashboard/export-settings-modal/ExportPrivacySetting";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";

const DAYS_OF_WEEK = [
    { id: 1, label: 'M' },
    { id: 2, label: 'T' },
    { id: 3, label: 'W' },
    { id: 4, label: 'T' },
    { id: 5, label: 'F' },
    { id: 6, label: 'S' },
    { id: 0, label: 'S' },
];

interface AutopilotControlPanelProps {
    currentSeries: AutopilotData;
    updateSeries: (updateData: Partial<AutopilotData>) => void;
    isSaving: boolean;
    isDirty: boolean;
    validation: { isValid: boolean; reasons: string[] };
    onClickSaveConfig: (runImmediately?: boolean) => void;
    onClickDeleteConfig: () => void;
    aiModelList: AIModelData[];
    isFalAiKeyMissing: boolean;
}

function AutopilotControlPanel({
    currentSeries,
    updateSeries,
    isSaving,
    isDirty,
    validation,
    onClickSaveConfig,
    onClickDeleteConfig,
    aiModelList,
    isFalAiKeyMissing,
}: AutopilotControlPanelProps) {
    // --- Internal UI State (Not persisted in DB) ---
    const [platformConnections, setPlatformConnections] = useState<AutopilotPlatformConnection | null>(null);
    const [isLoadingConnections, setIsLoadingConnections] = useState(true);
    const [settingsModalOpen, setSettingsModalOpen] = useState<ExportPlatform | null>(null);
    const [tempYoutubePrivacy, setTempYoutubePrivacy] = useState<ExportPrivacySetting | null>(null);
    const [tempYoutubeTokenId, setTempYoutubeTokenId] = useState<string | null>(null);
    const [tempTiktokPrivacy, setTempTiktokPrivacy] = useState<ExportPrivacySetting | null>(null);
    const [tempTiktokTokenId, setTempTiktokTokenId] = useState<string | null>(null);
    
    // Window Closed Confirmation Modal State
    const [showWindowClosedModal, setShowWindowClosedModal] = useState(false);
    const [runImmediatelyTemp, setRunImmediatelyTemp] = useState(false);
    const scheduleMode = 'weekly'; 

    // Fetch actual platform connection status using Client API
    useEffect(() => {
        const fetchConnections = async () => {
            if (!currentSeries.id) return;
            try {
                setIsLoadingConnections(true);
                const connections = await autopilotDataClientAPI.getAutopilotDataPlatformConnection(currentSeries.id);
                if (connections) {
                    setPlatformConnections(connections);
                }
            } catch (error) {
                console.error("Failed to fetch platform connections:", error);
            } finally {
                setIsLoadingConnections(false);
            }
        };

        fetchConnections();
    }, [currentSeries.id]);

    // --- Derived Schedule State ---
    const schedule = useMemo(() => cronToWeekly(currentSeries.schedule_cron), [currentSeries.schedule_cron]);
    const { days: selectedDays, hour: scheduledHour, minute: scheduledMinute } = schedule;

    // --- 2-Hour Window Logic ---
    const schedulingForecast = useMemo(() => {
        const now = new Date();
        try {
            const tz = currentSeries.user_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
            
            // 1. Get current hour and minute in target timezone
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
            });
            const parts = formatter.formatToParts(now);
            const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
            const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
            
            // 2. Get current weekday in target timezone
            const formatterDay = new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                weekday: 'short' // 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
            });
            const dayOfWeekStr = formatterDay.format(now);
            const dayMap: Record<string, number> = {
                'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
            };
            const targetTimezoneDay = dayMap[dayOfWeekStr] ?? now.getDay();
            
            const isTodayScheduled = selectedDays.includes(targetTimezoneDay);
            
            // Target generation time is 2 hours before scheduled upload
            let genHour = scheduledHour - 2;
            if (genHour < 0) genHour += 24;

            const currentTimeInMinutes = (currentHour * 60) + currentMinute;
            const genStartTimeInMinutes = (genHour * 60) + scheduledMinute;
            const uploadTimeInMinutes = (scheduledHour * 60) + scheduledMinute;
            
            // Closed only if today is scheduled, and current time is between generation start and upload time
            const isWindowClosed = isTodayScheduled && 
                                   (currentTimeInMinutes >= genStartTimeInMinutes) && 
                                   (currentTimeInMinutes < uploadTimeInMinutes);
            
            return {
                isWindowClosed,
                genTime: `${genHour.toString().padStart(2, '0')}:${scheduledMinute.toString().padStart(2, '0')}`,
                uploadTime: `${scheduledHour.toString().padStart(2, '0')}:${scheduledMinute.toString().padStart(2, '0')}`
            };
        } catch (e) {
            console.error("Timezone error:", e);
            return { isWindowClosed: false, genTime: '--:--', uploadTime: '--:--' };
        }
    }, [scheduledHour, scheduledMinute, selectedDays, currentSeries.user_timezone]);



    // --- Internal Handlers ---
    const onToggleDay = useCallback((dayId: number) => {
        const newDays = selectedDays.includes(dayId) 
            ? selectedDays.filter(id => id !== dayId) 
            : [...selectedDays, dayId];
        
        const newCron = weeklyToCron(newDays, scheduledHour, scheduledMinute);
        updateSeries({ schedule_cron: newCron });
    }, [selectedDays, scheduledHour, scheduledMinute, updateSeries]);

    const onClickPlatformSettings = useCallback((platform: ExportPlatform) => {
        if (platform === ExportPlatform.YOUTUBE) {
            setTempYoutubePrivacy(currentSeries.youtube_privacy ?? ExportPrivacySetting.UNLISTED);
            setTempYoutubeTokenId(currentSeries.youtube_token_id ?? null);
        } else {
            setTempTiktokPrivacy(currentSeries.tiktok_privacy ?? ExportPrivacySetting.PRIVATE);
            setTempTiktokTokenId(currentSeries.tiktok_token_id ?? null);
        }
        setSettingsModalOpen(platform);
    }, [currentSeries.youtube_privacy, currentSeries.youtube_token_id, currentSeries.tiktok_privacy, currentSeries.tiktok_token_id]);

    const onClickPlatformToggle = useCallback((platformId: ExportPlatform) => {
        updateSeries({
            platforms: {
                ...currentSeries.platforms,
                [platformId]: !currentSeries.platforms[platformId]
            }
        });
    }, [currentSeries.platforms, updateSeries]);

    const onClickPlatformConnect = useCallback((platformId: ExportPlatform) => {
        window.location.href = `/api/video/export/${platformId}/autopilot/oauth?seriesId=${currentSeries.id}&userId=${currentSeries.user_id}`;
    }, [currentSeries.id, currentSeries.user_id]);

    const onClickPlatformDisconnect = useCallback(async (platform: ExportPlatform) => {
        if (!confirm(`Are you sure you want to disconnect your ${platform} account from this series?`)) return;

        try {
            const success = await autopilotDataClientAPI.deleteAutopilotDataPlatformConnection(currentSeries.id, platform);
            if (success) {
                // UI 즉시 업데이트
                setPlatformConnections(prev => prev ? {
                    ...prev,
                    [platform]: { connected: false, handleName: null, displayName: null }
                } : null);

                // 만약 해당 플랫폼이 체크되어 있었다면 해제
                if (currentSeries.platforms[platform]) {
                    updateSeries({
                        platforms: {
                            ...currentSeries.platforms,
                            [platform]: false
                        }
                    });
                }
            }
        } catch (error) {
            console.error(`Failed to disconnect ${platform}:`, error);
            alert("Failed to disconnect account. Please try again.");
        }
    }, [currentSeries.id, currentSeries.platforms, updateSeries]);

    const onChangeHour = useCallback((hour: number) => {
        const newCron = weeklyToCron(selectedDays, hour, scheduledMinute);
        updateSeries({ schedule_cron: newCron });
    }, [selectedDays, scheduledMinute, updateSeries]);

    const onChangeMinute = useCallback((minute: number) => {
        const newCron = weeklyToCron(selectedDays, scheduledHour, minute);
        updateSeries({ schedule_cron: newCron });
    }, [selectedDays, scheduledHour, updateSeries]);

    const onChangeTimezone = useCallback((timezone: string) => {
        updateSeries({ user_timezone: timezone });
    }, [updateSeries]);

    const onChangePrivacySetting = useCallback((setting: ExportPrivacySetting) => {
        if (!settingsModalOpen) return;
        if (settingsModalOpen === ExportPlatform.YOUTUBE) {
            setTempYoutubePrivacy(setting);
        } else {
            setTempTiktokPrivacy(setting);
        }
    }, [settingsModalOpen]);

    const onChangeSelectedTokenId = useCallback((tokenId: string | null) => {
        if (!settingsModalOpen) return;
        if (settingsModalOpen === ExportPlatform.YOUTUBE) {
            setTempYoutubeTokenId(tokenId);
        } else {
            setTempTiktokTokenId(tokenId);
        }
    }, [settingsModalOpen]);

    const onClickConfirmSettings = useCallback(async () => {
        if (!settingsModalOpen) return;
        if (settingsModalOpen === ExportPlatform.YOUTUBE) {
            updateSeries({
                youtube_privacy: tempYoutubePrivacy,
                youtube_token_id: tempYoutubeTokenId
            });
        } else {
            updateSeries({
                tiktok_privacy: tempTiktokPrivacy,
                tiktok_token_id: tempTiktokTokenId
            });
        }
        setSettingsModalOpen(null);
    }, [settingsModalOpen, tempYoutubePrivacy, tempYoutubeTokenId, tempTiktokPrivacy, tempTiktokTokenId, updateSeries]);

    const onClickCancelSettings = useCallback(() => {
        setSettingsModalOpen(null);
    }, []);

    const onClickSaveConfigManual = useCallback(() => {
        if (schedulingForecast.isWindowClosed && currentSeries.is_active) {
            setRunImmediatelyTemp(false);
            setShowWindowClosedModal(true);
        } else {
            onClickSaveConfig(false);
        }
    }, [schedulingForecast.isWindowClosed, currentSeries.is_active, onClickSaveConfig]);
    
    // Internal UI Logic: Forecast
    const estimatedCost = useMemo(() => {
        const getPrice = (models: AIModelData[], id?: string, targetRes?: string) => {
            if (!id) return 0;
            const model = models.find(m => m.id === id);
            if (!model || !model.ai_model_price_list || model.ai_model_price_list.length === 0) return 0;
            
            const res = targetRes || '1080p';
            const matched = model.ai_model_price_list.find(p => p.unit.endsWith(res));
            return matched?.price_per_unit || model.ai_model_price_list[0].price_per_unit || 0;
        };

        const referenceModels = aiModelList.filter(m => m.category === 'text-to-image');
        const i2iModels = aiModelList.filter(m => m.category === 'image-to-image');
        const i2vModels = aiModelList.filter(m => m.category === 'image-to-video');

        const resolution = currentSeries.resolution || '1080p';
        const referenceImageModelId = currentSeries.ai_model_config?.referenceImageModelId;

        const characterPrice = getPrice(referenceModels, referenceImageModelId, '720p');
        const scenePrice = getPrice(i2iModels, currentSeries.ai_model_config?.sceneImageI2IModelId, resolution);
        const videoPrice = getPrice(i2vModels, currentSeries.ai_model_config?.videoModelId, resolution);
        
        return (characterPrice * 1) + (scenePrice * 6) + (videoPrice * 30);
    }, [aiModelList, currentSeries.ai_model_config, currentSeries.resolution]);

    const usageInfo = useMemo(() => {
        const weeklyCount = selectedDays.length;
        if (weeklyCount === 0) return { minVideos: 0, maxVideos: 0, actualMaxVideos: 0, isBonusApplied: false, minCost: 0, maxCost: 0 };

        const minVideos = weeklyCount * 4;
        const actualMaxVideos = (weeklyCount === 7) ? 31 : (weeklyCount * 4) + Math.min(weeklyCount, 3);
        
        // Bonus Logic: If max is 31 (daily), show as 30 but keep track of actual
        const isBonusApplied = actualMaxVideos === 31;
        const displayedMaxVideos = isBonusApplied ? 30 : actualMaxVideos;

        return {
            minVideos,
            maxVideos: displayedMaxVideos,
            actualMaxVideos,
            isBonusApplied,
            minCost: minVideos * estimatedCost,
            maxCost: actualMaxVideos * estimatedCost,
        };
    }, [selectedDays, estimatedCost]);

    return (
        <div className="w-80 h-full bg-zinc-900/60 border-l border-white/5 p-6 flex flex-col space-y-7 overflow-y-auto custom-scrollbar">
            {/* Activation Toggle */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Status</h4>
                    {!validation.isValid && (
                        <div className="group relative">
                            <AlertCircle size={16} className="text-red-400 cursor-help" />
                            <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-zinc-900 border border-red-500/30 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                <p className="text-[10px] text-red-300 font-bold uppercase mb-1">Required to Activate:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    {validation.reasons.map((reason, i) => (
                                        <li key={i} className="text-[10px] text-zinc-400">{reason}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => validation.isValid && updateSeries({ is_active: !currentSeries.is_active })}
                    disabled={!validation.isValid}
                    className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all font-medium text-sm ${
                        !validation.isValid ? 'opacity-50 cursor-not-allowed grayscale' : ''
                    }`}
                    style={{
                        backgroundColor: currentSeries.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(39, 39, 42, 0.5)',
                        color: currentSeries.is_active ? 'rgb(52, 211, 153)' : 'rgb(161, 161, 170)',
                        border: currentSeries.is_active ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                >
                    {currentSeries.is_active ? <Play size={16} /> : <Pause size={16} />}
                    {currentSeries.is_active ? 'ACTIVE' : 'PAUSED'}
                </button>
            </div>

            {/* Platform Selection */}
            <div className="space-y-3">
                <h4 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Platforms</h4>
                <div className="space-y-2">
                    {isLoadingConnections ? (
                        <div className="flex items-center justify-center p-6 bg-black/20 rounded-lg border border-white/5">
                            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                        </div>
                    ) : (
                        [
                            { id: ExportPlatform.YOUTUBE, label: 'YouTube', src: '/icons/youtube-logo.png', activeColor: 'bg-red-500/10 border-red-500/20', iconColor: 'text-red-500' },
                            { id: ExportPlatform.TIKTOK, label: 'TikTok', src: '/icons/tiktok-logo-white.svg', activeColor: 'bg-cyan-500/10 border-cyan-500/20', iconColor: 'text-cyan-400' },
                            { id: ExportPlatform.INSTAGRAM, label: 'Instagram Reels', src: '/icons/instagram-logo.png', activeColor: 'bg-pink-500/10 border-pink-500/20', iconColor: 'text-pink-500' }
                        ].map((platform) => {
                            const connection = platformConnections ? platformConnections[platform.id] : null;
                            const isConnected = !!connection?.connected;
                            const isInstagram = platform.id === ExportPlatform.INSTAGRAM;

                            return (
                                <PlatformAccountCard
                                    key={platform.id}
                                    platform={platform.id}
                                    logoSrc={platform.src}
                                    activeColor={platform.activeColor}
                                    iconColor={platform.iconColor}
                                    label={platform.label}
                                    isConnected={isConnected}
                                    isChecked={currentSeries.platforms[platform.id] === true}
                                    handleName={connection?.handleName}
                                    displayName={connection?.displayName}
                                    isDisabled={isInstagram}
                                    onClickToggle={() => onClickPlatformToggle(platform.id)}
                                    onClickConnect={() => onClickPlatformConnect(platform.id)}
                                    onClickSettings={() => onClickPlatformSettings(platform.id)}
                                    onClickDisconnect={() => onClickPlatformDisconnect(platform.id)}
                                />
                            );
                        })
                    )}
                </div>
            </div>

            {/* Schedule Config */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Schedule</h4>
                    <Clock size={16} className="text-zinc-500" />
                </div>
                
                <div className="space-y-4">
                    {/* Timezone Selection */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-zinc-500 mb-1 block ml-0.5 uppercase font-medium tracking-wider">Timezone</label>
                            <div className="group relative">
                                <Info size={12} className="text-zinc-500 cursor-help hover:text-zinc-300 transition-colors" />
                                <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-zinc-950 border border-white/10 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-[10px] text-zinc-400 leading-normal">
                                    Videos are generated and uploaded based on this timezone. We recommend setting this to your target audience&#39;s timezone.
                                </div>
                            </div>
                        </div>
                        <div className="relative group">
                            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                            <select 
                                value={currentSeries.user_timezone}
                                onChange={(e) => onChangeTimezone(e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-lg py-2 pl-9 pr-4 text-[11px] font-medium text-zinc-300 focus:outline-none focus:border-zinc-500 transition-all appearance-none cursor-pointer"
                            >
                                {Intl.supportedValuesOf('timeZone').map((tz) => (
                                    <option key={tz} value={tz} className="bg-zinc-900 text-white">
                                        {tz.replace(/_/g, ' ')}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronDown size={14} className="text-zinc-500" />
                            </div>
                        </div>
                    </div>

                    {/* Run Window Info */}
                    <div className="px-1 space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-zinc-500">Gen Window</span>
                            <span className="text-zinc-300">{schedulingForecast.genTime}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-zinc-500">Upload Time</span>
                            <span className="text-zinc-300">{schedulingForecast.uploadTime}</span>
                        </div>
                    </div>

                    {scheduleMode === 'weekly' ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex justify-between gap-1.5">
                                {DAYS_OF_WEEK.map((day) => (
                                    <button
                                        key={day.id}
                                        onClick={() => onToggleDay(day.id)}
                                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-all border ${
                                            selectedDays.includes(day.id) 
                                                ? 'bg-zinc-200 border-zinc-200 text-black shadow-sm' 
                                                : 'bg-black/20 border-white/5 text-zinc-500 hover:border-white/10'
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-zinc-500 mb-1.5 block ml-0.5 uppercase font-medium tracking-wider">Hour</label>
                                    <select 
                                        value={scheduledHour}
                                        onChange={(e) => onChangeHour(parseInt(e.target.value))}
                                        className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 transition-all appearance-none"
                                    >
                                        {Array.from({ length: 24 }).map((_, i) => (
                                            <option key={i} value={i} className="bg-zinc-900">{i.toString().padStart(2, '0')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-500 mb-1.5 block ml-0.5 uppercase font-medium tracking-wider">Minute</label>
                                    <select 
                                        value={scheduledMinute}
                                        onChange={(e) => onChangeMinute(parseInt(e.target.value))}
                                        className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 transition-all appearance-none"
                                    >
                                        {Array.from({ length: 60 }).map((_, i) => (
                                            <option key={i} value={i} className="bg-zinc-900">{i.toString().padStart(2, '0')}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : (
                        null
                    )}
                </div>
            </div>

            {/* Monthly Usage Summary */}
            <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Monthly Forecast</span>
                    <BarChart3 size={14} className="text-zinc-500" />
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <span className="text-[13px] text-zinc-400">Scheduled Videos</span>
                        <span className="text-xs font-medium text-zinc-300 bg-white/5 px-2 py-0.5 rounded border border-white/5">{usageInfo.minVideos} ~ {usageInfo.actualMaxVideos}</span>
                    </div>
                </div>

                <div className="bg-black/30 border border-white/5 rounded-lg p-3 flex flex-col space-y-1.5 relative group">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Est. BYOK Cost</span>
                        <Info size={12} className="text-zinc-600" />
                    </div>
                    
                    <div className="flex items-baseline gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-zinc-400 translate-y-0.5" />
                        <span className="text-xl font-bold text-zinc-100 tracking-tight">
                            {usageInfo.minCost.toFixed(2)} <span className="text-sm text-zinc-600 mx-0.5">~</span> {usageInfo.maxCost.toFixed(2)}
                        </span>
                    </div>

                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-zinc-800 border border-white/10 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity text-left z-10 pointer-events-none">
                        <p className="text-xs text-zinc-300 leading-relaxed">
                            Total estimated direct cost billed to your connected providers for this series based on your schedule.
                        </p>
                    </div>
                </div>
                

            </div>

            {/* Actions */}
            <div className="mt-auto pt-4 space-y-3">
                <button
                    onClick={onClickSaveConfigManual}
                    disabled={isSaving || !isDirty || !validation.isValid}
                    className={`w-full py-3 rounded-lg font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        isDirty && validation.isValid
                            ? 'bg-zinc-100 text-black hover:bg-white shadow-sm' 
                            : 'bg-zinc-800 text-zinc-500'
                    }`}
                >
                    {isSaving ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                        </div>
                    ) : isDirty ? 'Save Configuration' : 'Everything Saved'}
                </button>
                <button
                    onClick={onClickDeleteConfig}
                    className="w-full flex items-center justify-center gap-1.5 text-zinc-500 hover:text-red-400 text-[13px] font-medium transition-colors py-1.5"
                >
                    <Trash2 size={14} />
                    Delete Config
                </button>
            </div>

            {/* Settings Modal Integration */}
            {settingsModalOpen && (
                <ExportSettingsModal
                    userId={currentSeries.user_id}
                    platform={settingsModalOpen}
                    privacySetting={
                        settingsModalOpen === ExportPlatform.YOUTUBE
                            ? (tempYoutubePrivacy ?? ExportPrivacySetting.UNLISTED)
                            : (tempTiktokPrivacy ?? ExportPrivacySetting.PRIVATE)
                    }
                    onChangePrivacySetting={onChangePrivacySetting}
                    selectedTokenId={
                        settingsModalOpen === ExportPlatform.YOUTUBE
                            ? tempYoutubeTokenId
                            : tempTiktokTokenId
                    }
                    onChangeSelectedTokenId={onChangeSelectedTokenId}
                    aspectRatio={currentSeries.aspect_ratio ?? undefined}
                    confirmButtonText="Confirm"
                    onClickConfirm={onClickConfirmSettings}
                    onClickCancel={onClickCancelSettings}
                />
            )}

            {/* Today's Window Closed Confirmation Modal */}
            {showWindowClosedModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-auto shadow-2xl flex flex-col relative text-left">
                        <div className="flex items-center gap-2 text-amber-500 mb-2">
                            <AlertCircle size={20} />
                            <h3 className="text-base font-bold text-zinc-100 uppercase tracking-wider">Today&#39;s Window Closed</h3>
                        </div>
                        
                        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                            Today&#39;s video generation schedule has already passed. The next automated video will be generated and uploaded tomorrow.
                        </p>

                        <label className="flex items-start gap-2.5 cursor-pointer group bg-white/5 border border-white/5 hover:border-white/10 rounded-xl p-3.5 mb-6 transition-all select-none">
                            <div className="relative flex items-center mt-0.5">
                                <input
                                    type="checkbox"
                                    checked={runImmediatelyTemp}
                                    onChange={(e) => setRunImmediatelyTemp(e.target.checked)}
                                    className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-white/10 bg-black/20 transition-all checked:bg-zinc-200 checked:border-zinc-200 focus:outline-none"
                                />
                                <CheckCircle2 className="absolute h-3 w-3 text-black opacity-0 peer-checked:opacity-100 left-0.5 top-0.5 pointer-events-none transition-opacity" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">Start immediately</p>
                                <p className="text-[10px] leading-normal text-zinc-500">
                                    Generate and upload the first video right now, bypassing today&#39;s closed schedule.
                                </p>
                            </div>
                        </label>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowWindowClosedModal(false)}
                                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-xs font-semibold hover:bg-white/10 hover:text-white transition-all active:scale-[0.98] focus:outline-none"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onClickSaveConfig(runImmediatelyTemp);
                                    setShowWindowClosedModal(false);
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all active:scale-[0.98] focus:outline-none shadow-lg"
                            >
                                Save Config
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(AutopilotControlPanel);
