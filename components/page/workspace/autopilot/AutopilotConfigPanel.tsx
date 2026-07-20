'use client'

import {memo, useCallback, useEffect, useMemo, useState} from "react";
import {Sparkles, FileText, Mic2, Zap, Info, Square, Play, CheckCircle2, Bot, ChevronDown, ChevronUp, MonitorPlay, Lock, AlertCircle, AlertTriangle} from 'lucide-react';
import {useRouter} from "next/navigation";
import Image from "next/image";
import {Voice} from "@/lib/api/types/eleven-labs/Voice";
import {NICHE_DATA_LIST} from "@/lib/niches";
import {AutopilotData} from "@/lib/api/types/supabase/AutopilotData";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";
import BYOKModelSelector from "@/components/public/BYOKModelSelector";
import VideoSpecsSelector from "@/components/public/VideoSpecsSelector";


interface AutopilotConfigPanelProps {
    currentSeries: AutopilotData;
    updateSeries: (updateData: Partial<AutopilotData>) => void;
    voiceList: Voice[];
    isVoiceLoading: boolean;
    aiModelList: AIModelData[];
    isAiModelLoading: boolean;
    isFalAiKeyMissing: boolean;
}

function AutopilotConfigPanel({
    currentSeries,
    updateSeries,
    voiceList,
    isVoiceLoading,
    aiModelList,
    isAiModelLoading,
    isFalAiKeyMissing,
}: AutopilotConfigPanelProps) {
    const router = useRouter();
    const topicMode = currentSeries.niche_preset_id ? 'preset' : 'custom';
    // Internal UI State: Audio
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const [isVoiceListExpanded, setIsVoiceListExpanded] = useState(false);

    // Filter Models
    const t2iModels = useMemo(() => aiModelList.filter(m => m.category === 'text-to-image'), [aiModelList]);
    const i2iModels = useMemo(() => aiModelList.filter(m => m.category === 'image-to-image'), [aiModelList]);
    const i2vModels = useMemo(() => aiModelList.filter(m => m.category === 'image-to-video'), [aiModelList]);

    // Current Selection
    const selectedT2iId = currentSeries.ai_model_config?.referenceImageModelId;
    const selectedI2iId = currentSeries.ai_model_config?.sceneImageI2IModelId;
    const selectedI2vId = currentSeries.ai_model_config?.videoModelId;



    // Price Calculation
    const getPrice = useCallback((models: AIModelData[], id?: string, targetRes?: string) => {
        if (!id) return 0;
        const model = models.find(m => m.id === id);
        if (!model || !model.ai_model_price_list || model.ai_model_price_list.length === 0) return 0;
        
        const res = targetRes || '1080p';
        const matched = model.ai_model_price_list.find(p => p.unit.endsWith(res));
        return matched?.price_per_unit || model.ai_model_price_list[0].price_per_unit || 0;
    }, []);

    const estimatedCost = useMemo(() => {
        const resolution = currentSeries.resolution || '1080p';
        const referenceImageModelId = currentSeries.ai_model_config?.referenceImageModelId;

        // Autopilot Format: 1 character, 6 scenes, 30 sec total (approx 5 sec per scene video gen, assuming i2v is priced per sec)
        const characterPrice = getPrice(t2iModels, referenceImageModelId, '720p');
        const scenePrice = getPrice(i2iModels, selectedI2iId, resolution);
        const videoPrice = getPrice(i2vModels, selectedI2vId, resolution);
        
        const characterCost = characterPrice * 1;
        const sceneCost = scenePrice * 6;
        const videoCost = videoPrice * 30;
        
        return characterCost + sceneCost + videoCost;
    }, [getPrice, t2iModels, i2iModels, i2vModels, currentSeries.ai_model_config, currentSeries.resolution, selectedI2iId, selectedI2vId]);

    // Internal Audio Logic
    const onClickPlayVoice = useCallback((voice: Voice) => {
        if (playingVoiceId === voice.id && currentAudio) {
            currentAudio.pause();
            setPlayingVoiceId(null);
            return;
        }
        if (currentAudio) currentAudio.pause();

        const audio = new Audio(voice.previewUrl);
        audio.onended = () => setPlayingVoiceId(null);
        audio.play();
        setCurrentAudio(audio);
        setPlayingVoiceId(voice.id);
    }, [currentAudio, playingVoiceId]);

    useEffect(() => {
        return () => {
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }
        };
    }, [currentAudio]);

    // Internal Helpers: Tag Classes
    const getGenderTagClass = (gender: string) => {
        switch (gender.toLowerCase()) {
            case 'male': return 'bg-sky-500/10 text-sky-400 border-sky-400/20';
            case 'female': return 'bg-rose-500/10 text-rose-400 border-rose-400/20';
            default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-400/20';
        }
    };

    const getAgeTagClass = (age: string) => {
        switch (age.toLowerCase()) {
            case 'young': return 'bg-emerald-500/10 text-emerald-400 border-emerald-400/20';
            case 'middle_aged':
            case 'adult': return 'bg-indigo-500/10 text-indigo-400 border-indigo-400/20';
            case 'old':
            case 'senior': return 'bg-orange-500/10 text-orange-400 border-orange-400/20';
            default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-400/20';
        }
    };

    const displayedVoices = isVoiceListExpanded ? voiceList : voiceList.slice(0, 4);
    const hiddenVoicesCount = Math.max(0, voiceList.length - 4);

    return (
        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
            <div className="space-y-5">
                <section className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 space-y-2.5">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <FileText size={16} className="text-zinc-500" /> Autopilot Name
                    </label>
                    <input
                        type="text"
                        value={currentSeries.name}
                        onChange={(e) => updateSeries({ name: e.target.value })}
                        placeholder="e.g., Space Explorer Daily"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                </section>

                <section className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="text-indigo-400 w-5 h-5" />
                            <h3 className="text-base font-medium text-zinc-200">Channel Niche</h3>
                        </div>
                        <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
                            <button 
                                onClick={() => updateSeries({ niche_preset_id: NICHE_DATA_LIST[0].uiMetadata.id })}
                                className={`px-3 py-1 rounded-md text-[13px] font-medium transition-all ${topicMode === 'preset' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Presets
                            </button>
                            <button 
                                onClick={() => updateSeries({ niche_preset_id: null })}
                                className={`px-3 py-1 rounded-md text-[13px] font-medium transition-all ${topicMode === 'custom' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Custom
                            </button>
                        </div>
                    </div>

                    {topicMode === 'preset' ? (
                        <div className="grid grid-cols-2 gap-2.5">
                            {NICHE_DATA_LIST.map((niche) => (
                                <button
                                    key={niche.uiMetadata.id}
                                    onClick={() => updateSeries({ niche_preset_id: niche.uiMetadata.id })}
                                    className={`p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
                                        currentSeries.niche_preset_id === niche.uiMetadata.id 
                                            ? 'bg-indigo-500/10 border-indigo-500/50 text-zinc-100' 
                                            : 'bg-black/20 border-white/5 text-zinc-400 hover:border-white/10'
                                    }`}
                                >
                                    <span className="text-xl">{niche.uiMetadata.icon}</span>
                                    <span className="text-sm font-medium">{niche.uiMetadata.label}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <textarea
                            value={currentSeries.niche_preset_id ? '' : currentSeries.niche_value}
                            onChange={(e) => updateSeries({ niche_value: e.target.value })}
                            placeholder="Describe your channel's recurring theme in English..."
                            className="w-full h-28 bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                        />
                    )}
                </section>

                <section className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-base font-medium text-zinc-200">
                        <Mic2 size={18} className="text-zinc-400" />
                        <span>Narrator Voice</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {isVoiceLoading ? (
                            <div className="col-span-full py-8 text-center text-sm text-zinc-500">Loading voices...</div>
                        ) : (
                            displayedVoices.map((voice) => {
                                const nameParts = voice.name.split(' - ');
                                const displayName = nameParts[0];
                                const detailedAttributesPart = nameParts[1] || "";
                                const detailedAttributes = detailedAttributesPart ? detailedAttributesPart.split(',').map(a => a.trim()) : [];

                                return (
                                    <div
                                        key={voice.id}
                                        onClick={() => updateSeries({ voice_id: voice.id })}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                                            currentSeries.voice_id === voice.id 
                                                ? 'bg-zinc-800/80 border-zinc-500 text-zinc-100' 
                                                : 'bg-black/20 border-white/5 text-zinc-400 hover:border-white/10'
                                        }`}
                                    >
                                        <div className="flex flex-col gap-2 min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`text-sm font-medium truncate mr-1 ${currentSeries.voice_id === voice.id ? 'text-zinc-100' : 'text-zinc-300'}`}>
                                                    {displayName}
                                                </span>
                                                <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium">
                                                    {voice.accent}
                                                </span>
                                                <span className={`text-[11px] px-1.5 py-0.5 rounded border font-medium ${getGenderTagClass(voice.gender)}`}>
                                                    {voice.gender}
                                                </span>
                                                <span className={`text-[11px] px-1.5 py-0.5 rounded border font-medium ${getAgeTagClass(voice.age)}`}>
                                                    {voice.age.replace('_', ' ')}
                                                </span>
                                            </div>
                                            {detailedAttributes.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {detailedAttributes.map((attr, idx) => (
                                                        <span key={idx} className="text-[11px] text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                                            {attr}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onClickPlayVoice(voice); }}
                                            className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${
                                                playingVoiceId === voice.id ? 'bg-zinc-200 text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                                            }`}
                                        >
                                            {playingVoiceId === voice.id ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {!isVoiceLoading && hiddenVoicesCount > 0 && (
                        <button
                            onClick={() => setIsVoiceListExpanded(!isVoiceListExpanded)}
                            className="w-full py-2 flex items-center justify-center gap-1.5 text-[13px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 mt-1"
                        >
                            {isVoiceListExpanded ? (
                                <>Show Less <ChevronUp size={14} /></>
                            ) : (
                                <>Show {hiddenVoicesCount} More Voices <ChevronDown size={14} /></>
                            )}
                        </button>
                    )}
                </section>
                
                {/* Render Setup Section */}
                <section className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-base font-medium text-zinc-200">
                        <MonitorPlay size={18} className="text-zinc-400" />
                        <span>Render Setup</span>
                    </div>

                    {/* 1층: Video Specs (Aspect Ratio & Resolution) */}
                    <VideoSpecsSelector
                        aspectRatio={currentSeries.aspect_ratio || '9:16'}
                        resolution={currentSeries.resolution || '1080p'}
                        onChangeAspectRatio={(ratio) => updateSeries({ aspect_ratio: ratio })}
                        onChangeResolution={(res) => updateSeries({ resolution: res })}
                    />

                    {/* 2층: Notice & Error Banners */}
                    <div className="space-y-2">
                        {/* Model Compatibility Info Banner */}
                        <div className="flex items-start gap-2 bg-zinc-900/60 border border-white/5 rounded-lg p-3 text-[12px] text-zinc-400 leading-relaxed">
                            <AlertCircle size={15} className="text-zinc-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="font-semibold text-zinc-300">Model Compatibility: </span>
                                The global resolution choice filters and prioritizes compatible models below. Incompatible models will be disabled or fall back to high resolution.
                            </div>
                        </div>

                        {/* API Key Missing Banner */}
                        {isFalAiKeyMissing && (
                            <div className="flex items-start justify-between gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-[12px] text-red-400">
                                <div className="flex items-start gap-2 leading-relaxed">
                                    <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-semibold">FAL.AI Key Required: </span>
                                        Please configure your API key in the Profile page to generate videos.
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => router.push('/profile#provider-authentication')} 
                                    className="text-[11px] font-bold text-red-300 hover:text-red-200 underline whitespace-nowrap"
                                >
                                    Go to Profile
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 3층: BYOK Model Selector (Character, Scene, Video) */}
                    <div className="pt-4 border-t border-white/5">
                        {isAiModelLoading ? (
                            <div className="py-4 text-center text-sm text-zinc-500">Loading models...</div>
                        ) : (
                            <BYOKModelSelector
                                aiModelList={aiModelList}
                                selectedReferenceId={selectedT2iId || null}
                                selectedI2iId={selectedI2iId || null}
                                selectedI2vId={selectedI2vId || null}
                                globalResolution={currentSeries.resolution || '1080p'}
                                onChangeReferenceId={(id) => updateSeries({
                                    ai_model_config: {
                                        ...(currentSeries.ai_model_config || {
                                            referenceImageModelId: 'ca637a97-f060-4b81-a7d4-118a6f4aac0c',
                                            sceneImageT2IModelId: '1bd90bd4-e476-40e9-8a1e-1649288786e7',
                                            sceneImageI2IModelId: '79a506ac-eced-4643-b017-c8a2bb0f028b',
                                            videoModelId: '326a9a71-26a9-4142-8371-5467f316bcd6',
                                        }),
                                        referenceImageModelId: id,
                                    }
                                })}
                                onChangeI2iId={(id) => updateSeries({
                                    ai_model_config: {
                                        ...(currentSeries.ai_model_config || {
                                            referenceImageModelId: 'ca637a97-f060-4b81-a7d4-118a6f4aac0c',
                                            sceneImageT2IModelId: '1bd90bd4-e476-40e9-8a1e-1649288786e7',
                                            sceneImageI2IModelId: '79a506ac-eced-4643-b017-c8a2bb0f028b',
                                            videoModelId: '326a9a71-26a9-4142-8371-5467f316bcd6',
                                        }),
                                        sceneImageI2IModelId: id,
                                    }
                                })}
                                onChangeI2vId={(id) => updateSeries({
                                    ai_model_config: {
                                        ...(currentSeries.ai_model_config || {
                                            referenceImageModelId: 'ca637a97-f060-4b81-a7d4-118a6f4aac0c',
                                            sceneImageT2IModelId: '1bd90bd4-e476-40e9-8a1e-1649288786e7',
                                            sceneImageI2IModelId: '79a506ac-eced-4643-b017-c8a2bb0f028b',
                                            videoModelId: '326a9a71-26a9-4142-8371-5467f316bcd6',
                                        }),
                                        videoModelId: id,
                                    }
                                })}
                            />
                        )}
                    </div>
                </section>

                <section className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-base font-medium text-zinc-200">
                        <Zap size={18} className="text-zinc-400" />
                        <span>Generation Specs</span>
                    </div>
                    
                    <div className="bg-black/20 rounded-lg border border-white/5 p-3.5 space-y-2.5">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">ShortReal Subscription</span>
                        </div>
                        <ul className="space-y-2">
                            <li className="flex justify-between items-center text-[13px]">
                                <span className="text-zinc-400">Script & Prompt Generation (LLM)</span>
                                <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                                    <CheckCircle2 size={10} /> Included
                                </span>
                            </li>
                            <li className="flex justify-between items-center text-[13px]">
                                <div className="flex items-center">
                                    <span className="text-zinc-400">Premium Voiceover (Powered by </span>
                                    <Image 
                                        src="/icons/elevenlabs-logo.svg"
                                        alt="ElevenLabs"
                                        width={77}
                                        height={10}
                                        className="w-auto h-2.5 ml-[5px] mr-0.5 mb-[3px] opacity-50 hover:opacity-85 transition-opacity"
                                    />
                                    <span className="text-zinc-400">)</span>
                                </div>
                                <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                                    <CheckCircle2 size={10} /> Included
                                </span>
                            </li>
                            <li className="flex justify-between items-center text-[13px]">
                                <span className="text-zinc-400">Background Music Generation</span>
                                <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                                    <CheckCircle2 size={10} /> Included
                                </span>
                            </li>
                            <li className="flex justify-between items-center text-[13px]">
                                <span className="text-zinc-400">Auto Captioning & Export</span>
                                <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                                    <CheckCircle2 size={10} /> Included
                                </span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-zinc-900/50 rounded-lg border border-white/5 p-4 flex flex-col items-center text-center space-y-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 cursor-help group">
                            <Info size={14} className="text-zinc-500 hover:text-zinc-300 transition-colors" />
                            <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-zinc-800 border border-white/10 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity text-left z-10 pointer-events-none">
                                <p className="text-xs text-zinc-300 leading-relaxed">
                                    This is the estimated direct cost billed to your connected provider accounts (e.g., fal.ai, Replicate) based on a standard 30-second, 6-scene video format.
                                </p>
                            </div>
                        </div>
                        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Estimated BYOK Cost</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg text-zinc-300 font-light">$</span>
                            <span className="text-3xl font-bold text-zinc-100 tracking-tight">{estimatedCost.toFixed(3)}</span>
                            <span className="text-xs text-zinc-300 font-medium ml-1">/ video</span>
                            <span className="text-lg text-zinc-300 font-light">~</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                            Billed directly to your AI providers.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default memo(AutopilotConfigPanel);
