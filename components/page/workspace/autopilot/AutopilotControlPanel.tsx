'use client'

import {memo, useMemo} from "react";
import Image from "next/image";
import {
    Clock,
    CheckCircle2,
    Play,
    Pause,
    Trash2,
    Info,
    AlertCircle,
    TrendingDown
} from 'lucide-react';
import {ExportPlatform} from "@/lib/api/types/supabase/VideoGenerationTasks";

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
    isActive: boolean;
    onClickToggleActive: () => void;
    platforms: Record<ExportPlatform, boolean>;
    onTogglePlatform: (platform: ExportPlatform) => void;
    scheduleMode: 'weekly' | 'cron';
    setScheduleMode: (mode: 'weekly' | 'cron') => void;
    selectedDays: number[];
    onToggleDay: (dayId: number) => void;
    scheduledHour: number;
    setScheduledHour: (hour: number) => void;
    scheduledMinute: number;
    setScheduledMinute: (minute: number) => void;
    cronExpression: string;
    setCronExpression: (expr: string) => void;
    isSaving: boolean;
    onClickSaveConfig: () => void;
    onClickDeleteConfig: () => void;
}

function AutopilotControlPanel({
    isActive,
    onClickToggleActive,
    platforms,
    onTogglePlatform,
    scheduleMode,
    setScheduleMode,
    selectedDays,
    onToggleDay,
    scheduledHour,
    setScheduledHour,
    scheduledMinute,
    setScheduledMinute,
    cronExpression,
    setCronExpression,
    isSaving,
    onClickSaveConfig,
    onClickDeleteConfig,
}: AutopilotControlPanelProps) {
    
    // Internal UI Logic: Forecast
    const monthlyUsageForecast = useMemo(() => {
        if (scheduleMode === 'cron') return 'Variable';
        const weeklyCount = selectedDays.length;
        if (weeklyCount === 0) return { min: 0, max: 0 };

        const minVideos = weeklyCount * 4;
        const maxVideos = (weeklyCount === 7) ? 31 : (weeklyCount * 4) + Math.min(weeklyCount, 3);
        
        return {
            min: minVideos * 100,
            max: maxVideos * 100
        };
    }, [selectedDays, scheduleMode]);

    const isUsageTight = useMemo(() => {
        if (typeof monthlyUsageForecast === 'string') return false;
        // Logic: 7 days selected && [TBD: Plan check]
        return selectedDays.length === 7 && true; 
    }, [selectedDays, monthlyUsageForecast]);

    return (
        <div className="w-80 bg-gray-900/60 border-l border-purple-500/20 p-6 flex flex-col space-y-8 overflow-y-auto custom-scrollbar">
            {/* Activation Toggle */}
            <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Status</h4>
                <button
                    onClick={onClickToggleActive}
                    className="w-full py-4 rounded-xl flex items-center justify-center gap-3 transition-all font-bold text-lg"
                    style={{
                        backgroundColor: isActive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(31, 41, 55, 1)',
                        color: isActive ? 'rgb(74, 222, 128)' : 'rgb(156, 163, 175)',
                        border: isActive ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(55, 65, 81, 1)'
                    }}
                >
                    {isActive ? <Play size={20} /> : <Pause size={20} />}
                    {isActive ? 'ACTIVE' : 'PAUSED'}
                </button>
            </div>

            {/* Platform Selection */}
            <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Platforms</h4>
                <div className="space-y-2.5">
                    {[
                        { id: ExportPlatform.YOUTUBE, label: 'YouTube Shorts', src: '/icons/youtube-logo.png', activeColor: 'bg-red-500/10 border-red-500/40', iconColor: 'text-red-500' },
                        { id: ExportPlatform.TIKTOK, label: 'TikTok', src: '/icons/tiktok-logo.svg', activeColor: 'bg-cyan-500/10 border-cyan-500/40', iconColor: 'text-cyan-400' },
                        { id: ExportPlatform.INSTAGRAM, label: 'Instagram Reels', src: '/icons/instagram-logo.png', activeColor: 'bg-pink-500/10 border-pink-500/40', iconColor: 'text-pink-500' }
                    ].map((platform) => (
                        <div 
                            key={platform.id}
                            onClick={() => onTogglePlatform(platform.id)}
                            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                                platforms[platform.id] ? platform.activeColor : 'bg-black/20 border-white/5 opacity-60'
                            }`}
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="w-7 h-7 relative">
                                    <Image src={platform.src} alt={platform.label} fill className="object-contain" />
                                </div>
                                <span className={`text-sm font-bold ${platforms[platform.id] ? 'text-white' : 'text-gray-500'}`}>{platform.label}</span>
                            </div>
                            {platforms[platform.id] && <CheckCircle2 size={18} className={platform.iconColor} />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Schedule Config */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Schedule</h4>
                    <Clock size={20} className="text-purple-400" />
                </div>
                
                <div className="space-y-4">
                    <div className="flex bg-black/40 p-1.5 rounded-xl border border-purple-500/10">
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
                    </div>

                    {scheduleMode === 'weekly' ? (
                        <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
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
                                        onChange={(e) => setScheduledHour(parseInt(e.target.value))}
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
                                        onChange={(e) => setScheduledMinute(parseInt(e.target.value))}
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
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-center gap-2 mb-2 text-yellow-500/70 ml-1">
                                <Info size={14} />
                                <span className="text-xs font-medium uppercase tracking-tight">Expert Cron Expression</span>
                            </div>
                            <input
                                type="text"
                                value={cronExpression}
                                onChange={(e) => setCronExpression(e.target.value)}
                                className="w-full bg-black/40 border border-purple-500/30 rounded-lg p-3 text-sm text-white font-mono focus:outline-none focus:border-purple-500/60 transition-all shadow-inner"
                                placeholder="0 10 * * *"
                            />
                            <p className="text-xs text-gray-600 px-1">
                                Format: Min Hr Day Mon DayOfWeek
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Monthly Usage Summary */}
            <div className="bg-white/5 rounded-2xl border border-white/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Monthly Usage</span>
                    <TrendingDown size={16} className="text-green-400" />
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white">
                        {typeof monthlyUsageForecast === 'string' 
                            ? monthlyUsageForecast 
                            : `~${monthlyUsageForecast.min.toLocaleString()} - ${monthlyUsageForecast.max.toLocaleString()}`}
                    </span>
                    <span className="text-gray-500 text-xs font-bold uppercase">Cr</span>
                </div>
                
                {isUsageTight && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                        <AlertCircle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-yellow-500 uppercase tracking-tight">Limit Caution</p>
                            <p className="text-xs text-yellow-500/80 leading-snug">
                                Daily generation will consume ~3,100 Cr in 31-day months. Ensure your balance covers the extra day.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="mt-auto pt-6 space-y-4">
                <button
                    onClick={onClickSaveConfig}
                    disabled={isSaving}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save Configuration'}
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
