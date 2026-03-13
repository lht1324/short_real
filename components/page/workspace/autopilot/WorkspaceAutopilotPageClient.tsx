'use client'

import {memo, useCallback, useEffect, useMemo, useState} from "react";
import Image from "next/image";
import { Coins, ChevronDown, Plus, Check } from 'lucide-react';
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
import { NICHE_DATA_LIST } from "@/lib/niches";
import {AutopilotData} from "@/lib/api/types/supabase/AutopilotData";


function WorkspaceAutopilotPageClient() {
    const router = useRouter();
    const { user } = useAuth();

    // --- Series Management (Dummy State) ---
    const [seriesList, setSeriesList] = useState<AutopilotData[]>([
        {
            id: '1',
            user_id: 'user-1',
            name: 'My New Series',
            is_active: true,
            niche_preset_id: NICHE_DATA_LIST[0]?.uiMetadata?.id || 'space',
            niche_value: '',
            voice_id: '',
            platforms: {
                [ExportPlatform.YOUTUBE]: true,
                [ExportPlatform.TIKTOK]: false,
                [ExportPlatform.INSTAGRAM]: false,
            },
            schedule_cron: '0 10 * * *',
        },
        {
            id: '2',
            user_id: 'user-1',
            name: 'History Daily',
            is_active: false,
            niche_preset_id: undefined,
            niche_value: 'Interesting history facts about the Roman Empire',
            voice_id: '',
            platforms: {
                [ExportPlatform.YOUTUBE]: true,
                [ExportPlatform.TIKTOK]: true,
                [ExportPlatform.INSTAGRAM]: false,
            },
            schedule_cron: '30 15 * * *',
        }
    ]);
    const [currentSeriesId, setCurrentSeriesId] = useState('1');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const currentSeries = useMemo(() => {
        return seriesList.find(s => s.id === currentSeriesId) || seriesList[0];
    }, [seriesList, currentSeriesId]);

    const updateCurrentSeries = useCallback((updateData: Partial<AutopilotData>) => {
        setSeriesList(prev => prev.map(s => s.id === currentSeriesId ? { ...s, ...updateData } : s));
    }, [currentSeriesId]);

    // Voice List (Fetched by Parent as it's common data)
    const [voiceList, setVoiceList] = useState<Voice[]>([]);
    const [isVoiceLoading, setIsVoiceLoading] = useState(true);

    // System Status
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);

    const userCreditCount = useMemo(() => user?.credit_count ?? 0, [user]);

    // --- Effects & Logic ---
    useEffect(() => {
        const fetchVoices = async () => {
            try {
                const voices = await voiceClientAPI.getVoices();
                setVoiceList(voices);
                // Do not auto-set voice ID here, let the series handle it or keep default.
            } catch (error) {
                console.error("Failed to load voices", error);
            } finally {
                setIsVoiceLoading(false);
            }
        };
        fetchVoices();
    }, []);

    // --- Core Handlers (To be synced with DB later) ---
    const onClickAddSeries = useCallback(() => {
        if (seriesList.length >= 4) return;
        
        const newId = Math.random().toString(36).substr(2, 9);
        const newSeries: AutopilotData = {
            id: newId,
            user_id: user?.id || 'user-1',
            name: 'My New Series',
            is_active: false,
            niche_preset_id: NICHE_DATA_LIST[0].uiMetadata.id,
            niche_value: '',
            voice_id: voiceList[0]?.id || '',
            platforms: {
                [ExportPlatform.YOUTUBE]: true,
                [ExportPlatform.TIKTOK]: false,
                [ExportPlatform.INSTAGRAM]: false,
            },
            schedule_cron: '0 10 * * *',
        };
        setSeriesList(prev => [...prev, newSeries]);
        setCurrentSeriesId(newId);
    }, [seriesList.length, user?.id, voiceList]);

    const onClickSaveConfig = useCallback(async () => {
        setIsSaving(true);
        // To-Do: Call actual API autopilotDataClientAPI.patchAutopilotDataBySeriesId
        setTimeout(() => {
            setIsSaving(false);
            setShowSaveSuccessModal(true);
        }, 1000);
    }, []);

    const onClickDeleteConfig = useCallback(() => {
        if (confirm("Are you sure you want to delete this Autopilot configuration?")) {
            setSeriesList(prev => {
                const newList = prev.filter(s => s.id !== currentSeriesId);
                if (newList.length > 0) {
                    setCurrentSeriesId(newList[0].id);
                }
                return newList;
            });
        }
    }, [currentSeriesId]);

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
                        <p className="text-gray-400 text-base pl-0.5 mt-1 cursor-default">
                            Hands-off automation for your English faceless channel.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 mr-6">
                    {/* Series Dropdown & Add Button */}
                    <div className="flex items-center gap-2 z-50">
                        {/* Dropdown */}
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

                            {/* Dropdown Menu */}
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

                        {/* Add Button */}
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

                    {/* Divider */}
                    <div className="h-8 w-px bg-purple-500/20 mx-1"></div>

                    {/* Credits */}
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

            <div className="flex h-[calc(100vh-97px)] relative z-10">
                {/* Left Sidebar */}
                <WorkspaceSidebar activeItem={WorkspaceSidebarItem.AUTOPILOT} />

                {/* Configuration Panel (Center) */}
                <AutopilotConfigPanel 
                    currentSeries={currentSeries}
                    updateSeries={updateCurrentSeries}
                    voiceList={voiceList}
                    isVoiceLoading={isVoiceLoading}
                />

                {/* Right Control Panel */}
                <AutopilotControlPanel 
                    currentSeries={currentSeries}
                    updateSeries={updateCurrentSeries}
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

export default memo(WorkspaceAutopilotPageClient);
