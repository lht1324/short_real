'use client'

import {memo, useCallback, useEffect, useState} from "react";
import {Sparkles, FileText, Mic2, Zap, Info, Square, Play} from 'lucide-react';
import {Voice} from "@/lib/api/types/eleven-labs/Voice";

const PRESET_NICHES = [
    { id: 'space', label: 'Space Facts', icon: '🚀' },
    { id: 'history', label: 'History Mystery', icon: '🏛️' },
    { id: 'horror', label: 'Scary Stories', icon: '👻' },
    { id: 'motivation', label: 'Motivation', icon: '💪' },
    { id: 'wealth', label: 'Wealth & Money', icon: '💰' },
    { id: 'philosophy', label: 'Philosophy', icon: '🧠' },
    { id: 'nature', label: 'Nature/Wild', icon: '🌿' },
    { id: 'science', label: 'Cool Science', icon: '🧪' },
];

interface AutopilotConfigPanelProps {
    autopilotName: string;
    setAutopilotName: (name: string) => void;
    topicMode: 'preset' | 'custom';
    setTopicMode: (mode: 'preset' | 'custom') => void;
    selectedNiche: string;
    setSelectedNiche: (nicheId: string) => void;
    customNiche: string;
    setCustomNiche: (niche: string) => void;
    voiceList: Voice[];
    isVoiceLoading: boolean;
    selectedVoiceId: string;
    setSelectedVoiceId: (id: string) => void;
}

function AutopilotConfigPanel({
    autopilotName,
    setAutopilotName,
    topicMode,
    setTopicMode,
    selectedNiche,
    setSelectedNiche,
    customNiche,
    setCustomNiche,
    voiceList,
    isVoiceLoading,
    selectedVoiceId,
    setSelectedVoiceId,
}: AutopilotConfigPanelProps) {
    // Internal UI State: Audio
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

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
            case 'male': return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
            case 'female': return 'bg-red-500/20 text-red-300 border-red-400/30';
            default: return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
        }
    };

    const getAgeTagClass = (age: string) => {
        switch (age.toLowerCase()) {
            case 'young': return 'bg-green-500/20 text-green-300 border-green-400/30';
            case 'middle_aged':
            case 'adult': return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
            case 'old':
            case 'senior': return 'bg-orange-500/20 text-orange-300 border-orange-400/30';
            default: return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
        }
    };

    return (
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">
                <section className="bg-gray-900/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur-sm space-y-3">
                    <label className="text-lg font-semibold text-purple-100 flex items-center gap-2">
                        <FileText size={20} className="text-purple-400" /> Autopilot Name
                    </label>
                    <input
                        type="text"
                        value={autopilotName}
                        onChange={(e) => setAutopilotName(e.target.value)}
                        placeholder="e.g., Space Explorer Daily"
                        className="w-full bg-black/40 border border-purple-500/30 rounded-xl p-4 text-lg text-white focus:outline-none focus:border-purple-500/60 transition-all shadow-inner"
                    />
                </section>

                <section className="bg-gray-900/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur-sm space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Sparkles className="text-purple-400 w-6 h-6" />
                            <h3 className="text-xl font-semibold text-purple-100">Channel Niche</h3>
                        </div>
                        <div className="flex bg-black/40 p-1.5 rounded-xl border border-purple-500/20">
                            <button 
                                onClick={() => setTopicMode('preset')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${topicMode === 'preset' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                Presets
                            </button>
                            <button 
                                onClick={() => setTopicMode('custom')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${topicMode === 'custom' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                Custom
                            </button>
                        </div>
                    </div>

                    {topicMode === 'preset' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {PRESET_NICHES.map((niche) => (
                                <button
                                    key={niche.id}
                                    onClick={() => setSelectedNiche(niche.id)}
                                    className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                                        selectedNiche === niche.id 
                                            ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg' 
                                            : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/20'
                                    }`}
                                >
                                    <span className="text-2xl">{niche.icon}</span>
                                    <span className="text-base font-semibold">{niche.label}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <textarea
                            value={customNiche}
                            onChange={(e) => setCustomNiche(e.target.value)}
                            placeholder="Describe your channel's recurring theme in English..."
                            className="w-full h-32 bg-black/40 border border-purple-500/30 rounded-xl p-4 text-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 transition-all resize-none shadow-inner"
                        />
                    )}
                </section>

                <section className="bg-gray-900/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur-sm space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-purple-100">
                        <Mic2 size={20} className="text-indigo-400" />
                        <span>Narrator Voice</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {isVoiceLoading ? (
                            <div className="col-span-full py-10 text-center text-gray-500">Loading voices...</div>
                        ) : (
                            voiceList.map((voice) => {
                                const nameParts = voice.name.split(' - ');
                                const displayName = nameParts[0];
                                const detailedAttributesPart = nameParts[1] || "";
                                const detailedAttributes = detailedAttributesPart ? detailedAttributesPart.split(',').map(a => a.trim()) : [];

                                return (
                                    <div
                                        key={voice.id}
                                        onClick={() => setSelectedVoiceId(voice.id)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
                                            selectedVoiceId === voice.id 
                                                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg ring-1 ring-indigo-500/50' 
                                                : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/10'
                                        }`}
                                    >
                                        <div className="flex flex-col gap-2.5 min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`text-base font-bold truncate mr-1 ${selectedVoiceId === voice.id ? 'text-indigo-300' : 'text-white'}`}>
                                                    {displayName}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold uppercase tracking-tighter">
                                                    {voice.accent}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-tighter ${getGenderTagClass(voice.gender)}`}>
                                                    {voice.gender}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-tighter ${getAgeTagClass(voice.age)}`}>
                                                    {voice.age.replace('_', ' ')}
                                                </span>
                                            </div>
                                            {detailedAttributes.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {detailedAttributes.map((attr, idx) => (
                                                        <span key={idx} className="text-[10px] text-gray-200 bg-white/15 px-2 py-0.5 rounded border border-white/10 uppercase font-semibold tracking-wide">
                                                            {attr}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onClickPlayVoice(voice); }}
                                            className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                                                playingVoiceId === voice.id ? 'bg-indigo-500 text-white' : 'bg-gray-800 hover:bg-gray-700'
                                            }`}
                                        >
                                            {playingVoiceId === voice.id ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                <section className="bg-gray-900/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-lg font-semibold text-purple-100">
                            <Zap size={20} className="text-yellow-400" />
                            <span>Autopilot Standard Format</span>
                        </div>
                        <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-md border border-yellow-500/20 font-bold uppercase tracking-wider">Fixed Specification</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex flex-col items-center text-center gap-1">
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Duration</span>
                            <span className="text-xl font-bold text-white">~30 Seconds</span>
                        </div>
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex flex-col items-center text-center gap-1">
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Scenes</span>
                            <span className="text-xl font-bold text-white">6 Scenes</span>
                        </div>
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex flex-col items-center text-center gap-1">
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Cost</span>
                            <span className="text-xl font-bold text-white">100 Credits</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-500 px-1 bg-white/5 p-3 rounded-lg border border-white/5 mt-2">
                        <Info size={16} className="mt-0.5 shrink-0 text-blue-400" />
                        <p>To ensure consistent costs and quality, Autopilot videos use our optimized 30-second viral format. Pacing is automatically adjusted to fit the narrative perfectly.</p>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default memo(AutopilotConfigPanel);
