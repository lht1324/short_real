'use client'

import {memo, useEffect, useMemo, useState} from "react";
import {
    AlertCircle,
    BarChart3,
    CheckCircle2,
    ChevronDown,
    Clock,
    Coins,
    Globe,
    Loader2,
    Pause,
    Play,
    Sparkles,
    Trash2
} from 'lucide-react';
import {ExportPlatform} from "@/lib/api/types/supabase/VideoGenerationTasks";
import {AutopilotData} from "@/lib/api/types/supabase/AutopilotData";
import {cronToWeekly, weeklyToCron} from "@/lib/utils/cronUtils";
import PlatformConnectButton from "@/components/page/workspace/autopilot/PlatformConnectButton";
import PlatformCheckbox from "@/components/page/workspace/autopilot/PlatformCheckbox";

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
}

function AutopilotControlPanel({
    currentSeries,
    updateSeries,
    isSaving,
    isDirty,
    validation,
    onClickSaveConfig,
    onClickDeleteConfig,
}: AutopilotControlPanelProps) {
    // --- Internal UI State (Not persisted in DB) ---
    const [runImmediately, setRunImmediately] = useState(false);
    const scheduleMode = 'weekly'; 

    // --- Derived Schedule State ---
    const schedule = useMemo(() => cronToWeekly(currentSeries.schedule_cron), [currentSeries.schedule_cron]);
    const { days: selectedDays, hour: scheduledHour, minute: scheduledMinute } = schedule;

    // --- 2-Hour Window Logic ---
    const schedulingForecast = useMemo(() => {
        // Get current time in the series' timezone
        const now = new Date();
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: currentSeries.user_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
            });
            
            const parts = formatter.formatToParts(now);
            const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
            const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
            
            // Target generation time is 2 hours before scheduled upload
            let genHour = scheduledHour - 2;
            if (genHour < 0) genHour += 24;

            // Is today's generation window closed? 
            const currentTimeInMinutes = (currentHour * 60) + currentMinute;
            const genStartTimeInMinutes = (genHour * 60) + scheduledMinute;
            
            // If the current time is past the generation start time, the window is closed for today.
            const isWindowClosed = currentTimeInMinutes >= genStartTimeInMinutes;
            
            return {
                isWindowClosed,
                genTime: `${genHour.toString().padStart(2, '0')}:${scheduledMinute.toString().padStart(2, '0')}`,
                uploadTime: `${scheduledHour.toString().padStart(2, '0')}:${scheduledMinute.toString().padStart(2, '0')}`
            };
        } catch (e) {
            console.error("Timezone error:", e);
            return { isWindowClosed: false, genTime: '--:--', uploadTime: '--:--' };
        }
    }, [scheduledHour, scheduledMinute, currentSeries.user_timezone]);

    // Reset runImmediately if window opens or series changes
    useEffect(() => {
        setRunImmediately(false);
    }, [schedulingForecast.isWindowClosed, currentSeries.id]);

    // --- Internal Handlers ---
    const onToggleDay = (dayId: number) => {
        const newDays = selectedDays.includes(dayId) 
            ? selectedDays.filter(id => id !== dayId) 
            : [...selectedDays, dayId];
        
        const newCron = weeklyToCron(newDays, scheduledHour, scheduledMinute);
        updateSeries({ schedule_cron: newCron });
    };

    const onChangeHour = (hour: number) => {
        const newCron = weeklyToCron(selectedDays, hour, scheduledMinute);
        updateSeries({ schedule_cron: newCron });
    };

    const onChangeMinute = (minute: number) => {
        const newCron = weeklyToCron(selectedDays, scheduledHour, minute);
        updateSeries({ schedule_cron: newCron });
    };

    const onChangeTimezone = (timezone: string) => {
        updateSeries({ user_timezone: timezone });
    };
    
    // Internal UI Logic: Forecast
    const usageInfo = useMemo(() => {
        const weeklyCount = selectedDays.length;
        if (weeklyCount === 0) return { min: 0, max: 0, actualMax: 0, isBonusApplied: false };

        const minVideos = weeklyCount * 4;
        const actualMaxVideos = (weeklyCount === 7) ? 31 : (weeklyCount * 4) + Math.min(weeklyCount, 3);
        
        const minCredits = minVideos * 100;
        const actualMaxCredits = actualMaxVideos * 100;
        
        // Bonus Logic: If max is 3100 (daily), show as 3000 but keep track of actual
        const isBonusApplied = actualMaxCredits === 3100;
        const displayedMaxCredits = isBonusApplied ? 3000 : actualMaxCredits;

        return {
            min: minCredits,
            max: displayedMaxCredits,
            actualMax: actualMaxCredits,
            isBonusApplied
        };
    }, [selectedDays]);

    return (
        <div className="w-80 bg-gray-900/60 border-l border-purple-500/20 p-6 flex flex-col space-y-7 overflow-y-auto custom-scrollbar">
            {/* Activation Toggle */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Status</h4>
                    {!validation.isValid && (
                        <div className="group relative">
                            <AlertCircle size={16} className="text-red-400 cursor-help" />
                            <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-gray-900 border border-red-500/30 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                <p className="text-[10px] text-red-300 font-bold uppercase mb-1">Required to Activate:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    {validation.reasons.map((reason, i) => (
                                        <li key={i} className="text-[10px] text-gray-400">{reason}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => validation.isValid && updateSeries({ is_active: !currentSeries.is_active })}
                    disabled={!validation.isValid}
                    className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 transition-all font-bold text-lg ${
                        !validation.isValid ? 'opacity-50 cursor-not-allowed grayscale' : ''
                    }`}
                    style={{
                        backgroundColor: currentSeries.is_active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(31, 41, 55, 1)',
                        color: currentSeries.is_active ? 'rgb(74, 222, 128)' : 'rgb(156, 163, 175)',
                        border: currentSeries.is_active ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(55, 65, 81, 1)'
                    }}
                >
                    {currentSeries.is_active ? <Play size={20} /> : <Pause size={20} />}
                    {currentSeries.is_active ? 'ACTIVE' : 'PAUSED'}
                </button>
            </div>

            {/* Platform Selection */}
            <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Platforms</h4>
                <div className="space-y-2.5">
                    {[
                        { id: ExportPlatform.YOUTUBE, label: 'YouTube Shorts', shortLabel: 'YouTube', src: '/icons/youtube-logo.png', activeColor: 'bg-red-500/10 border-red-500/40', iconColor: 'text-red-500' },
                        { id: ExportPlatform.TIKTOK, label: 'TikTok', shortLabel: 'TikTok', src: '/icons/tiktok-logo-white.svg', activeColor: 'bg-cyan-500/10 border-cyan-500/40', iconColor: 'text-cyan-400' },
                        { id: ExportPlatform.INSTAGRAM, label: 'Instagram Reels', shortLabel: 'Instagram', src: '/icons/instagram-logo.png', activeColor: 'bg-pink-500/10 border-pink-500/40', iconColor: 'text-pink-500' }
                    ].map((platform) => {
                        const isConnected = currentSeries.platforms[platform.id] !== undefined;
                        const isDisabled = platform.id === ExportPlatform.INSTAGRAM;

                        if (isConnected) {
                            return (
                                <PlatformCheckbox
                                    key={platform.id}
                                    logoSrc={platform.src}
                                    activeColor={platform.activeColor}
                                    iconColor={platform.iconColor}
                                    label={platform.label}
                                    isChecked={currentSeries.platforms[platform.id] === true}
                                    isDisabled={isDisabled}
                                    onClick={() => updateSeries({
                                        platforms: { 
                                            ...currentSeries.platforms, 
                                            [platform.id]: !currentSeries.platforms[platform.id] 
                                        }
                                    })}
                                />
                            );
                        } else {
                            return (
                                <PlatformConnectButton
                                    key={platform.id}
                                    logoSrc={platform.src}
                                    text={`Connect ${platform.shortLabel}`}
                                    onClick={() => {
                                        window.location.href = `/api/video/export/${platform.id}/autopilot/oauth?seriesId=${currentSeries.id}`;
                                    }}
                                    isDisabled={isDisabled}
                                />
                            );
                        }
                    })}
                </div>
            </div>

            {/* Schedule Config */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Schedule</h4>
                    <Clock size={20} className="text-purple-400" />
                </div>
                
                <div className="space-y-4">
                    {/* Timezone Selection */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 mb-1 block ml-1 uppercase font-bold tracking-wider">Timezone</label>
                        <div className="relative group">
                            <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400/70 pointer-events-none" />
                            <select 
                                value={currentSeries.user_timezone}
                                onChange={(e) => onChangeTimezone(e.target.value)}
                                className="w-full bg-black/40 border border-purple-500/10 rounded-xl py-2.5 pl-9 pr-4 text-[11px] font-bold text-gray-300 focus:outline-none focus:border-purple-500/40 transition-all appearance-none cursor-pointer"
                            >
                                {Intl.supportedValuesOf('timeZone').map((tz) => (
                                    <option key={tz} value={tz} className="bg-gray-900 text-white">
                                        {tz.replace(/_/g, ' ')}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronDown size={14} className="text-gray-500" />
                            </div>
                        </div>
                    </div>

                    {/* Run Window Info */}
                    <div className="px-1 space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-purple-400/80">Generation (2h Prior)</span>
                            <span className="text-white">{schedulingForecast.genTime}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-pink-400/80">Upload Time</span>
                            <span className="text-white">{schedulingForecast.uploadTime}</span>
                        </div>
                    </div>
                    {/* Mode selection commented out for now as requested */}
                    {/* <div className="flex bg-black/40 p-1.5 rounded-xl border border-purple-500/10">
                        <button 
                            onClick={() => setScheduleMode('weekly')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${scheduleMode === 'weekly' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}
                        >
                            WEEKLY
                        </button>
                        <button 
                            onClick={() => setScheduleMode('cron')}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${scheduleMode === 'cron' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}
                        >
                            CRON
                        </button>
                    </div> */}

                    {scheduleMode === 'weekly' ? (
                        <div className="h-[110px] space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex justify-between gap-1.5">
                                {DAYS_OF_WEEK.map((day) => (
                                    <button
                                        key={day.id}
                                        onClick={() => onToggleDay(day.id)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${
                                            selectedDays.includes(day.id) 
                                                ? 'bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-500/20' 
                                                : 'bg-black/20 border-white/5 text-gray-500 hover:border-white/20'
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1.5 block ml-1 uppercase font-bold tracking-wider">Hour</label>
                                    <select 
                                        value={scheduledHour}
                                        onChange={(e) => onChangeHour(parseInt(e.target.value))}
                                        className="w-full bg-black/40 border border-purple-500/30 rounded-lg p-2 text-base text-white focus:outline-none focus:border-purple-500/60 transition-all"
                                    >
                                        {Array.from({ length: 24 }).map((_, i) => (
                                            <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1.5 block ml-1 uppercase font-bold tracking-wider">Minute</label>
                                    <select 
                                        value={scheduledMinute}
                                        onChange={(e) => onChangeMinute(parseInt(e.target.value))}
                                        className="w-full bg-black/40 border border-purple-500/30 rounded-lg p-2 text-base text-white focus:outline-none focus:border-purple-500/60 transition-all"
                                    >
                                        {Array.from({ length: 60 }).map((_, i) => (
                                            <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Cron input commented out for now as requested */
                        /* <div className="h-[110px] space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-center gap-2 mb-2 text-yellow-500/70 ml-1">
                                <Info size={14} />
                                <span className="text-xs font-medium uppercase tracking-tight">Expert Cron Expression</span>
                            </div>
                            <input
                                type="text"
                                value={currentSeries.schedule_cron}
                                onChange={(e) => updateSeries({ schedule_cron: e.target.value })}
                                className="w-full bg-black/40 border border-purple-500/30 rounded-lg p-3 text-sm text-white font-mono focus:outline-none focus:border-purple-500/60 transition-all shadow-inner"
                                placeholder="0 10 * * *"
                            />
                            <p className="text-xs text-gray-600 px-1">
                                Format: Min Hr Day Mon DayOfWeek
                            </p>
                        </div> */
                        null
                    )}
                </div>
            </div>

            {/* Monthly Usage Summary */}
            <div className="bg-white/5 rounded-2xl border border-white/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Monthly Usage</span>
                    <BarChart3 size={16} className="text-purple-400" />
                </div>
                <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-yellow-400" />
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-2xl font-black text-white">
                            {usageInfo.min.toLocaleString()} ~ {usageInfo.max.toLocaleString()}
                        </span>
                        {usageInfo.isBonusApplied && (
                            <span className="relative inline-flex items-center text-[18px] text-gray-500/60 font-bold ml-0.5 whitespace-nowrap">
                                {usageInfo.actualMax.toLocaleString()}
                                <div className="absolute inset-x-0 h-[2px] bg-purple-500/60 -rotate-12 transform scale-x-100" />
                            </span>
                        )}
                    </div>
                </div>
                
                {usageInfo.isBonusApplied && (
                    <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 animate-in fade-in zoom-in-95 duration-300">
                        <Sparkles size={18} className="text-purple-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-black text-purple-300 uppercase tracking-tight">Full Coverage Unlocked</p>
                            <p className="text-[13px] text-purple-200/90 leading-snug font-bold">
                                Extra days in 31-day months are on us. Enjoy daily uploads at no extra cost! 🎁
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="mt-auto pt-6 space-y-4">
                {schedulingForecast.isWindowClosed && (
                    <div className="bg-gray-800/50 border border-purple-500/20 rounded-xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-2 text-yellow-500/90">
                            <AlertCircle size={16} />
                            <span className="text-[11px] font-black uppercase tracking-wider">Today&#39;s window closed</span>
                        </div>
                        
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center mt-0.5">
                                <input
                                    type="checkbox"
                                    checked={runImmediately}
                                    onChange={(e) => setRunImmediately(e.target.checked)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-purple-500/30 bg-black/40 transition-all checked:bg-purple-600 checked:border-purple-400 focus:outline-none"
                                />
                                <CheckCircle2 className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.75 top-0.75 pointer-events-none transition-opacity" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-gray-200 group-hover:text-purple-300 transition-colors">Start first video immediately</p>
                                <p className="text-[10px] leading-relaxed text-gray-500 font-medium">
                                    {runImmediately 
                                        ? "Starting now! May be uploaded earlier or later than scheduled." 
                                        : "First video will be uploaded tomorrow at the scheduled time."}
                                </p>
                            </div>
                        </label>
                    </div>
                )}

                <button
                    onClick={() => onClickSaveConfig(runImmediately)}
                    disabled={isSaving || !isDirty || !validation.isValid}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed ${
                        isDirty && validation.isValid
                            ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-purple-500/25' 
                            : 'bg-gray-800 text-gray-500'
                    }`}
                >
                    {isSaving ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Saving...</span>
                        </div>
                    ) : isDirty ? 'Save Configuration' : 'Everything Saved'}
                </button>
                <button
                    onClick={onClickDeleteConfig}
                    className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-red-400 text-base font-medium transition-colors py-2"
                >
                    <Trash2 size={18} />
                    Delete Config
                </button>
            </div>
        </div>
    );
}

export default memo(AutopilotControlPanel);
