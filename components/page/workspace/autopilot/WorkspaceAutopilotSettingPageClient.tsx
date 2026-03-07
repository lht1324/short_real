'use client'

import {memo, useCallback, useEffect, useMemo, useState} from "react";
import Image from "next/image";
import { Coins } from 'lucide-react';
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

function WorkspaceAutopilotSettingPageClient() {
    const router = useRouter();
    const { user } = useAuth();

    // --- DB-related Core State (Managed by Parent) ---
    const [autopilotName, setAutopilotName] = useState('My New Series');
    const [topicMode, setTopicMode] = useState<'preset' | 'custom'>('preset');
    const [selectedNiche, setSelectedNiche] = useState('space');
    const [customNiche, setCustomNiche] = useState('');
    const [selectedVoiceId, setSelectedVoiceId] = useState('');
    
    // Voice List (Fetched by Parent as it's common data)
    const [voiceList, setVoiceList] = useState<Voice[]>([]);
    const [isVoiceLoading, setIsVoiceLoading] = useState(true);

    // Platform & Scheduler State
    const [platforms, setPlatforms] = useState<Record<ExportPlatform, boolean>>({
        [ExportPlatform.YOUTUBE]: true,
        [ExportPlatform.TIKTOK]: false,
        [ExportPlatform.INSTAGRAM]: false,
    });
    const [scheduleMode, setScheduleMode] = useState<'weekly' | 'cron'>('weekly');
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
    const [scheduledHour, setScheduledHour] = useState(10);
    const [scheduledMinute, setScheduledMinute] = useState(0);
    const [cronExpression, setCronExpression] = useState('0 10 * * *');

    // System Status
    const [isActive, setIsActive] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);

    const userCreditCount = useMemo(() => user?.credit_count ?? 0, [user]);

    // --- Effects & Logic ---
    useEffect(() => {
        const fetchVoices = async () => {
            try {
                const voices = await voiceClientAPI.getVoices();
                setVoiceList(voices);
                if (voices.length > 0 && !selectedVoiceId) setSelectedVoiceId(voices[0].id);
            } catch (error) {
                console.error("Failed to load voices", error);
            } finally {
                setIsVoiceLoading(false);
            }
        };
        fetchVoices();
    }, [selectedVoiceId]);

    // --- Core Handlers (To be synced with DB later) ---
    const onClickToggleActive = useCallback(() => {
        setIsActive(prev => !prev);
    }, []);

    const onClickSaveConfig = useCallback(async () => {
        setIsSaving(true);
        /* To-Do: Combine all states and call DB Update API */
        setTimeout(() => {
            setIsSaving(false);
            setShowSaveSuccessModal(true);
        }, 1000);
    }, []);

    const onClickDeleteConfig = useCallback(() => {
        if (confirm("Are you sure you want to delete this Autopilot configuration?")) {
            // To-Do: Call Delete API
        }
    }, []);

    const onTogglePlatform = useCallback((platform: ExportPlatform) => {
        setPlatforms(prev => ({ ...prev, [platform]: !prev[platform] }));
    }, []);

    const onToggleDay = useCallback((dayId: number) => {
        setSelectedDays(prev => 
            prev.includes(dayId) ? prev.filter(id => id !== dayId) : [...prev, dayId]
        );
    }, []);

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
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
                        <p className="text-gray-400 text-base pl-0.5 cursor-default">
                            Hands-off automation for your English faceless channel.
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2 mr-6 px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg backdrop-blur-sm hover:border-purple-400/50 transition-all">
                    <Coins className="w-5 h-5 text-yellow-400" />
                    <div className="flex flex-col">
                        <span className="text-xs text-purple-300">Credits</span>
                        <span className="text-lg font-bold text-yellow-400">{userCreditCount.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Background Effects */}
            <div className="absolute inset-0 opacity-10 pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
            </div>

            <div className="flex h-[calc(100vh-97px)] relative z-10">
                {/* Left Sidebar */}
                <WorkspaceSidebar activeItem={WorkspaceSidebarItem.AUTOPILOT} />

                {/* Configuration Panel (Center) */}
                <AutopilotConfigPanel 
                    autopilotName={autopilotName}
                    setAutopilotName={setAutopilotName}
                    topicMode={topicMode}
                    setTopicMode={setTopicMode}
                    selectedNiche={selectedNiche}
                    setSelectedNiche={setSelectedNiche}
                    customNiche={customNiche}
                    setCustomNiche={setCustomNiche}
                    voiceList={voiceList}
                    isVoiceLoading={isVoiceLoading}
                    selectedVoiceId={selectedVoiceId}
                    setSelectedVoiceId={setSelectedVoiceId}
                />

                {/* Right Control Panel */}
                <AutopilotControlPanel 
                    isActive={isActive}
                    onClickToggleActive={onClickToggleActive}
                    platforms={platforms}
                    onTogglePlatform={onTogglePlatform}
                    scheduleMode={scheduleMode}
                    setScheduleMode={setScheduleMode}
                    selectedDays={selectedDays}
                    onToggleDay={onToggleDay}
                    scheduledHour={scheduledHour}
                    setScheduledHour={setScheduledHour}
                    scheduledMinute={scheduledMinute}
                    setScheduledMinute={setScheduledMinute}
                    cronExpression={cronExpression}
                    setCronExpression={setCronExpression}
                    isSaving={isSaving}
                    onClickSaveConfig={onClickSaveConfig}
                    onClickDeleteConfig={onClickDeleteConfig}
                />
            </div>

            {/* Success Modal */}
            {showSaveSuccessModal && (
                <DefaultModal
                    title="Config Saved"
                    message="Your Autopilot configuration has been saved successfully."
                    cancelText="Close"
                    onClickCancel={() => setShowSaveSuccessModal(false)}
                />
            )}
        </div>
    );
}

export default memo(WorkspaceAutopilotSettingPageClient);
