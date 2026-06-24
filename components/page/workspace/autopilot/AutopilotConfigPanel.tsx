'use client'

import {memo, useCallback, useEffect, useMemo, useState} from "react";
import {Sparkles, FileText, Mic2, Zap, Info, Square, Play, CheckCircle2, Bot, ChevronDown, ChevronUp, MonitorPlay, Lock} from 'lucide-react';
import {useRouter} from "next/navigation";
import {Voice} from "@/lib/api/types/eleven-labs/Voice";
import {NICHE_DATA_LIST} from "@/lib/niches";
import {AutopilotData} from "@/lib/api/types/supabase/AutopilotData";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";


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

    // Supported Resolutions for selected video model
    const supportedResolutions = useMemo(() => {
        const model = aiModelList.find(m => m.id === selectedI2vId);
        if (!model || !model.ai_model_price_list) return ['1080p']; // fallback default
        
        return model.ai_model_price_list.map(p => {
            if (p.unit.includes('720p')) return '720p';
            if (p.unit.includes('1080p')) return '1080p';
            if (p.unit.includes('2160p')) return '2160p';
            return null;
        }).filter(Boolean) as string[];
    }, [aiModelList, selectedI2vId]);

    // Price Calculation
    const getPrice = useCallback((models: AIModelData[], id?: string) => {
        if (!id) return 0;
        const model = models.find(m => m.id === id);
        if (!model || !model.ai_model_price_list || model.ai_model_price_list.length === 0) return 0;
        const price1080 = model.ai_model_price_list.find(p => p.unit.includes('1080p'));
        return price1080?.price_per_unit || model.ai_model_price_list[0].price_per_unit || 0;
    }, []);

    const estimatedCost = useMemo(() => {
        const t2iPrice = getPrice(t2iModels, selectedT2iId);
        const i2iPrice = getPrice(i2iModels, selectedI2iId);
        const i2vPrice = getPrice(i2vModels, selectedI2vId);
        
        // Autopilot Format: 1 character, 6 scenes, 30 sec total (approx 5 sec per scene video gen, assuming i2v is priced per sec)
        const t2iCost = t2iPrice * 1;
        const i2iCost = i2iPrice * 6;
        const i2vCost = i2vPrice * 30;
        
        return t2iCost + i2iCost + i2vCost;
    }, [getPrice, t2iModels, selectedT2iId, i2iModels, selectedI2iId, i2vModels, selectedI2vId]);

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
                
                <section className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-base font-medium text-zinc-200">
                            <Bot size={18} className="text-zinc-400" />
                            <span>Visual AI Models (BYOK)</span>
                        </div>
                        {isFalAiKeyMissing && (
                            <div className="flex items-center space-x-2 text-[13px] text-amber-500/90 font-medium bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/10">
                                <Lock className="w-3.5 h-3.5" />
                                <span>API key required to generate</span>
                                <button
                                    onClick={() => router.push('/profile#provider-authentication')}
                                    className="text-zinc-300 hover:text-white underline underline-offset-4 ml-1 transition-colors"
                                >
                                    Connect Key
                                </button>
                            </div>
                        )}
                    </div>
                    {isAiModelLoading ? (
                        <div className="py-4 text-center text-sm text-zinc-500">Loading models...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider ml-0.5">Character (T2I)</label>
                                <select 
                                    value={selectedT2iId || ''} 
                                    onChange={(e) => updateSeries({ ai_model_config: { ...currentSeries.ai_model_config!, sceneImageT2IModelId: e.target.value } })}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500 appearance-none"
                                >
                                    {t2iModels.map(m => (
                                        <option key={m.id} value={m.id} className="bg-zinc-900">{m.display_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider ml-0.5">Scene (I2I)</label>
                                <select 
                                    value={selectedI2iId || ''} 
                                    onChange={(e) => updateSeries({ ai_model_config: { ...currentSeries.ai_model_config!, sceneImageI2IModelId: e.target.value } })}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500 appearance-none"
                                >
                                    {i2iModels.map(m => (
                                        <option key={m.id} value={m.id} className="bg-zinc-900">{m.display_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider ml-0.5">Video (I2V)</label>
                                <select 
                                    value={selectedI2vId || ''} 
                                    onChange={(e) => updateSeries({ ai_model_config: { ...currentSeries.ai_model_config!, videoModelId: e.target.value } })}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500 appearance-none"
                                >
                                    {i2vModels.map(m => (
                                        <option key={m.id} value={m.id} className="bg-zinc-900">{m.display_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </section>

                <section className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-base font-medium text-zinc-200">
                        <MonitorPlay size={18} className="text-zinc-400" />
                        <span>Video Specs</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider ml-0.5">Aspect Ratio</label>
                            <select 
                                value={currentSeries.aspect_ratio || '9:16'} 
                                onChange={(e) => updateSeries({ aspect_ratio: e.target.value as any })}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500 appearance-none"
                            >
                                <option value="9:16" className="bg-zinc-900">Vertical (9:16)</option>
                                <option value="16:9" className="bg-zinc-900">Horizontal (16:9)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider ml-0.5">Resolution</label>
                            <select 
                                value={currentSeries.resolution || '1080p'} 
                                onChange={(e) => updateSeries({ resolution: e.target.value as any })}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500 appearance-none"
                            >
                                <option value="720p" disabled={!supportedResolutions.includes('720p')} className={!supportedResolutions.includes('720p') ? "bg-zinc-900 text-zinc-600" : "bg-zinc-900"}>
                                    720p {!supportedResolutions.includes('720p') && "(Not supported)"}
                                </option>
                                <option value="1080p" disabled={!supportedResolutions.includes('1080p')} className={!supportedResolutions.includes('1080p') ? "bg-zinc-900 text-zinc-600" : "bg-zinc-900"}>
                                    1080p {!supportedResolutions.includes('1080p') && "(Not supported)"}
                                </option>
                                <option value="2160p" disabled={!supportedResolutions.includes('2160p')} className={!supportedResolutions.includes('2160p') ? "bg-zinc-900 text-zinc-600" : "bg-zinc-900"}>
                                    4K (2160p) {!supportedResolutions.includes('2160p') && "(Not supported)"}
                                </option>
                            </select>
                        </div>
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
                            {[
                                'Script & Prompt Generation (LLM)',
                                'Premium Voiceover (ElevenLabs)',
                                'Background Music Generation',
                                'Auto Captioning & Export'
                            ].map((item, i) => (
                                <li key={i} className="flex justify-between items-center text-[13px]">
                                    <span className="text-zinc-400">{item}</span>
                                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                                        <CheckCircle2 size={10} /> Included
                                    </span>
                                </li>
                            ))}
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
