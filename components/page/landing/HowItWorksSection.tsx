'use client'

import { memo, useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Sparkles, Mic, Play, Clapperboard, Clock, User, Wand2, ArrowDown, Loader2, ArrowRight, CheckCircle2, AlertCircle, XCircle, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Voice } from "@/api/types/eleven-labs/Voice";
import { voiceClientAPI } from "@/api/client/voiceClientAPI";

// --- Types & Constants ---

interface SceneItem {
    id: number;
    text: string;
    duration: string;
    cameraAngle: string;
}

interface VoiceProfile extends Voice {
    uiColor: string;
    uiTags: string[];
    uiDescriptive: string;
}

const CAMERA_ANGLES = [
    "Wide Cinematic Shot", "Extreme Close-up", "Low Angle Dynamic", "Drone FPV Shot", "Over the Shoulder"
];

const getVoiceStyle = (index: number) => {
    const styles = [
        { color: 'from-orange-400 to-red-500', tags: ['Deep', 'Narration'] },
        { color: 'from-pink-400 to-purple-500', tags: ['Soft', 'Story'] },
        { color: 'from-cyan-400 to-blue-500', tags: ['British', 'Docu'] },
        { color: 'from-green-400 to-emerald-500', tags: ['Energetic', 'Promo'] },
        { color: 'from-yellow-400 to-orange-500', tags: ['Warm', 'Character'] },
    ];
    return styles[index % styles.length];
};


function HowItWorksSection() {
    // --- State: Drafting ---
    const [script, setScript] = useState(
        "The cybernetic samurai stands on the neon rooftop.\nRain falls like liquid light around him.\nHe draws his katana, sensing the enemy."
    );
    const [scenes, setScenes] = useState<SceneItem[]>([]);
    const [isSplitting, setIsSplitting] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);

    const [voiceDataList, setVoiceDataList] = useState<VoiceProfile[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // --- Logic: Cost & Duration ---
    const totalDuration = useMemo(() => {
        return scenes.reduce((acc, sceneData) => {
            return acc + parseFloat(sceneData.duration);
        }, 0.0);
    }, [scenes]);

    const estimatedCost = useMemo(() => {
        const sceneCountOverage = scenes.length > 6 ? (scenes.length - 6) * 20 : 0;
        const durationOverage = totalDuration > 30 ? (totalDuration - 30) * 20 : 0;
        return 100 + sceneCountOverage + durationOverage;
    }, [scenes, totalDuration]);

    // --- State: Voice & Generate ---
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Audio State
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Tooltip
    const [showErrorTooltip, setShowErrorTooltip] = useState(false);

    const validationErrors = useMemo(() => {
        const errors = [];
        if (scenes.length === 0) errors.push("Generate storyboard first");
        if (!selectedVoiceId) errors.push("Select a voice actor");
        return errors;
    }, [scenes, selectedVoiceId]);

    const isSystemReady = validationErrors.length === 0;


    // --- Handlers ---
    const onClickGenerate = useCallback(async () => {
        if (!isSystemReady) return;

        setIsGenerating(true);
        setIsSuccess(false);

        setTimeout(() => {
            setIsGenerating(false);
            setIsSuccess(true);
        }, 1500);
    }, [isSystemReady]);

    const onClickGoToPricing = useCallback(() => {
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
        setIsSuccess(false);
    }, []);

    const onClickCloseModal = useCallback(() => {
        setIsSuccess(false);
    }, []);

    const handleGenerateStoryboard = useCallback(() => {
        if (!script.trim()) return;

        setIsSplitting(true);
        setHasGenerated(false);
        setScenes([]);

        setTimeout(() => {
            const lines = script.split('\n');
            const newScenes = lines
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .map((line, idx) => {
                    const wordCount = line.split(/\s+/).length;
                    const duration = Math.max(2, (wordCount / 2.5)).toFixed(1);
                    return {
                        id: idx,
                        text: line,
                        duration: duration,
                        cameraAngle: CAMERA_ANGLES[idx % CAMERA_ANGLES.length]
                    };
                });

            setScenes(newScenes);
            setIsSplitting(false);
            setHasGenerated(true);
        }, 800);
    }, [script]);

    const handlePlayPreview = useCallback((e: React.MouseEvent, voice: VoiceProfile) => {
        e.stopPropagation();

        if (!voice.previewUrl) return;

        if (playingVoiceId === voice.id) {
            audioRef.current?.pause();
            setPlayingVoiceId(null);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
        }

        const audio = new Audio(voice.previewUrl);
        audioRef.current = audio;
        setPlayingVoiceId(voice.id);

        audio.play().catch(err => console.error("Audio play failed", err));

        audio.onended = () => {
            setPlayingVoiceId(null);
        };
    }, [playingVoiceId]);


    // --- Load Voices (Random 5) ---
    useEffect(() => {
        const loadVoiceDataList = async () => {
            try {
                const voices = await voiceClientAPI.getVoices();
                if (voices && voices.length > 0) {
                    // [수정] 배열을 랜덤으로 섞은 후 앞에서 5개 선택
                    const shuffledVoices = [...voices].sort(() => 0.5 - Math.random());
                    const selectedRandomVoices = shuffledVoices.slice(0, 5);

                    const formattedVoices: VoiceProfile[] = selectedRandomVoices.map((voice, idx) => {
                        const style = getVoiceStyle(idx);
                        const formatTag = (tag?: string) => {
                            if (!tag) return "";
                            return tag
                                .split('_')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(' ');
                        };

                        const descriptive = formatTag(voice.descriptive);
                        const tagList = [
                            formatTag(voice.age),
                            formatTag(voice.accent),
                        ];

                        return {
                            ...voice,
                            uiColor: style.color,
                            uiTags: tagList.filter((tag) => tag.length !== 0),
                            uiDescriptive: descriptive
                        };
                    });

                    setVoiceDataList(formattedVoices);
                }
            } catch (error) {
                console.error("Failed to load voices", error);
            }
        }
        loadVoiceDataList().then();
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);


    if (scrollRef.current && scenes.length > 0) {
        scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }

    return (
        <section
            id="howitworks"
            className="relative py-8 px-4 max-w-7xl mx-auto overflow-hidden"
        >
            <div className="mb-8 text-center relative z-10">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                    Don&apos;t Prompt.<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Just Write.</span>
                </h2>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    Experience the engine right here. Type your story, and watch how we structure it instantly.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[700px] relative z-10">

                {/* LEFT PANEL */}
                <div className="lg:col-span-7 bg-[#0f0f16] border border-white/10 rounded-3xl p-1 flex flex-col relative overflow-hidden group ring-1 ring-white/5 hover:ring-purple-500/30 transition-all duration-500">
                    <div className="flex flex-col h-full rounded-[20px] bg-[#13131d] overflow-hidden">
                        <div className="p-6 border-b border-white/5 bg-[#181825] relative z-20 flex flex-col h-[45%]">
                            <div className="flex justify-between items-center mb-4 shrink-0">
                                <div className="flex items-center gap-2 text-purple-400">
                                    <div className="p-1.5 bg-purple-500/10 rounded-md">
                                        <Wand2 size={16} />
                                    </div>
                                    <span className="text-sm font-bold tracking-wide">STEP 1: SCRIPTING</span>
                                </div>
                                <span className="text-xs text-gray-500 bg-black/30 px-2 py-1 rounded border border-white/5 hidden sm:inline-block">
                                   Type your story below 👇
                                </span>
                            </div>

                            <textarea
                                value={script}
                                onChange={(e) => setScript(e.target.value)}
                                placeholder="Ex: A cyberpunk city in rain..."
                                className="w-full flex-1 bg-transparent text-gray-200 text-lg leading-relaxed resize-none focus:outline-none placeholder:text-gray-600 font-medium custom-scrollbar mb-2"
                                spellCheck={false}
                            />

                            <div className="flex justify-end shrink-0">
                                <button
                                    onClick={handleGenerateStoryboard}
                                    disabled={isSplitting || !script.trim()}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-purple-900/20"
                                >
                                    {isSplitting ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={14} />
                                            Generate Storyboard
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                            <div className={`rounded-full p-1 border shadow-lg transition-colors duration-500 bg-[#13131d] ${hasGenerated ? 'border-purple-500 text-purple-400' : 'border-white/10 text-gray-400'}`}>
                                <ArrowDown size={14} />
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col bg-[#13131d] overflow-hidden relative h-[55%]">
                            <div className="px-6 pt-2 pb-2 flex items-center justify-between border-b border-white/5 bg-[#13131d] z-10">
                                <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">
                                    Auto-Generated Storyboard
                                </span>
                                {hasGenerated && (
                                    <span className="text-[10px] text-gray-600 font-mono">
                                        {scenes.length} SCENES / {totalDuration.toFixed(1)}s
                                    </span>
                                )}
                            </div>

                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar scroll-smooth relative">
                                {!hasGenerated && !isSplitting && scenes.length === 0 && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-2 opacity-50 pointer-events-none">
                                        <Clapperboard size={32} strokeWidth={1.5} />
                                        <p className="text-sm">Write a script and click generate</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <AnimatePresence mode='popLayout'>
                                        {scenes.map((scene) => (
                                            <motion.div
                                                key={scene.id}
                                                layout
                                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ duration: 0.3, delay: scene.id * 0.05 }}
                                                className="relative p-4 rounded-xl border border-white/10 bg-[#1a1a24] hover:border-purple-500/30 transition-colors group/card flex flex-col justify-between h-full"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                                                            SCENE {scene.id + 1}
                                                        </span>
                                                        <span className="text-[10px] text-cyan-400/70 border border-cyan-500/20 px-2 py-0.5 rounded-full bg-cyan-500/5 truncate">
                                                            {scene.cameraAngle}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono bg-black/20 px-1.5 py-0.5 rounded shrink-0">
                                                        <Clock size={10} />
                                                        {scene.duration}s
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-300 leading-snug font-light break-words line-clamp-3">
                                                    {scene.text}
                                                </p>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                                <div className="h-4" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="lg:col-span-5 flex flex-col gap-6 h-full">

                    {/* Voice Selection */}
                    <div className="flex-1 bg-[#0f0f16] border border-white/10 rounded-3xl p-6 relative flex flex-col overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 text-pink-400 shrink-0">
                            <div className="p-1.5 bg-pink-500/10 rounded-md">
                                <Mic size={16} />
                            </div>
                            <span className="text-sm font-bold tracking-wide">STEP 2: CASTING</span>
                        </div>

                        {/* [수정] max-h-[320px] 추가로 높이 제한 및 스크롤 활성화 */}
                        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[320px]">
                            {voiceDataList.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                                    <Loader2 className="animate-spin mb-2" />
                                    <span className="text-xs">Loading voices...</span>
                                </div>
                            ) : (
                                voiceDataList.map((voice) => {
                                    const isSelected = selectedVoiceId === voice.id;
                                    const isPlaying = playingVoiceId === voice.id;

                                    return (
                                        <div
                                            key={voice.id}
                                            onClick={() => setSelectedVoiceId(voice.id)}
                                            className={`
                                                 relative cursor-pointer p-4 rounded-xl border transition-all duration-300
                                                 ${isSelected
                                                ? 'bg-[#1a1a24] border-pink-500/50 shadow-[0_0_15px_-5px_rgba(236,72,153,0.15)]'
                                                : 'bg-transparent border-white/5 hover:bg-white/5 hover:border-white/10'}
                                              `}
                                        >
                                            <div className="flex items-center justify-between relative z-10">
                                                <div className="flex flex-col gap-1 w-full">
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-base font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                                                {voice.name}
                                                            </span>
                                                            {voice.uiDescriptive && (
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                                                    isSelected
                                                                        ? 'bg-pink-500/10 border-pink-500/30 text-pink-300'
                                                                        : 'bg-white/5 border-white/10 text-gray-500'
                                                                }`}>
                                                                    {voice.uiDescriptive}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <button
                                                            onClick={(e) => handlePlayPreview(e, voice)}
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 hover:scale-110 active:scale-95 z-20 ${
                                                                isPlaying
                                                                    ? 'bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.5)]'
                                                                    : isSelected
                                                                        ? 'bg-pink-500 text-white hover:bg-pink-400'
                                                                        : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                                                            }`}
                                                        >
                                                            {isPlaying ? (
                                                                <Square size={12} fill="currentColor" />
                                                            ) : (
                                                                <Play size={12} fill="currentColor" className="ml-0.5" />
                                                            )}
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-1">
                                                        {voice.uiTags.map(tag => (
                                                            <span key={tag} className="bg-white/5 px-1.5 py-0.5 rounded">{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <motion.div
                                                    layoutId="active-voice"
                                                    className="absolute inset-0 rounded-xl border border-pink-500/30 pointer-events-none"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Generate Action */}
                    <div className="h-[240px] bg-gradient-to-br from-[#12121a] to-[#0f0f16] border border-white/10 rounded-3xl p-6 relative overflow-visible flex flex-col justify-between group">
                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none overflow-hidden rounded-3xl" />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2 text-cyan-400">
                                    <div className="p-1.5 bg-cyan-500/10 rounded-md">
                                        <Clapperboard size={16} />
                                    </div>
                                    <span className="text-sm font-bold tracking-wide">STEP 3: ACTION</span>
                                </div>

                                <div
                                    className="relative"
                                    onMouseEnter={() => !isSystemReady && setShowErrorTooltip(true)}
                                    onMouseLeave={() => setShowErrorTooltip(false)}
                                >
                                    <div className={`
                                        px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border shadow-lg transition-all
                                        ${isSystemReady
                                        ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-[0_0_10px_-3px_rgba(74,222,128,0.3)] cursor-default'
                                        : 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_10px_-3px_rgba(239,68,68,0.3)] cursor-help'}
                                    `}>
                                        {isSystemReady ? "System Ready" : "Setup Required"}
                                    </div>

                                    <AnimatePresence>
                                        {showErrorTooltip && !isSystemReady && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                                transition={{ duration: 0.2 }}
                                                className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a24] border border-red-500/30 rounded-xl p-3 z-50 shadow-2xl shadow-black/50 backdrop-blur-sm"
                                            >
                                                <div className="text-[10px] text-red-400 font-bold mb-2 flex items-center gap-1.5">
                                                    <AlertCircle size={12} />
                                                    MISSING REQUIREMENTS
                                                </div>
                                                <div className="space-y-1.5">
                                                    {validationErrors.map((err, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                                                            <XCircle size={12} className="text-red-500/50 shrink-0" />
                                                            {err}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="absolute -top-1.5 right-4 w-3 h-3 bg-[#1a1a24] border-t border-l border-red-500/30 rotate-45" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="mt-6">
                                <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 font-semibold">Estimated Cost</p>
                                <div className="text-3xl font-bold text-white flex items-baseline gap-2">
                                    {Math.floor(estimatedCost)} <span className="text-sm text-yellow-500 font-normal">Credits</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClickGenerate}
                            disabled={!isSystemReady || isGenerating}
                            className={`
                                relative w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 border flex items-center justify-center gap-2 overflow-hidden
                                ${isSystemReady
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:scale-[1.02] hover:brightness-110 active:scale-95 border-white/10 cursor-pointer'
                                : 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed grayscale opacity-50'}
                            `}
                        >
                            {isSystemReady && !isGenerating && (
                                <div className="absolute inset-0 -translate-x-full hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none" />
                            )}

                            <div className="relative z-10 flex items-center justify-center gap-2">
                                {isGenerating ? (
                                    <>
                                        <motion.span
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                        >
                                            <Sparkles size={18} />
                                        </motion.span>
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className={isSystemReady ? "text-white/70" : ""} />
                                        <span>Generate Video</span>
                                    </>
                                )}
                            </div>
                        </button>

                    </div>
                </div>

                {/* CTA MODAL */}
                <AnimatePresence>
                    {(isGenerating || isSuccess) && (
                        <motion.div
                            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 z-50 rounded-3xl overflow-hidden border border-white/10 flex flex-col items-center justify-center bg-black/80"
                        >
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />

                            <div className="relative z-10 flex flex-col items-center text-center p-8">
                                {isGenerating ? (
                                    <motion.div
                                        key="sending"
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 1.1, opacity: 0 }}
                                        className="flex flex-col items-center"
                                    >
                                        <div className="relative mb-8">
                                            <motion.div
                                                animate={{ y: [-10, -30], opacity: [0, 1, 0] }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                                                className="absolute left-1/2 -translate-x-1/2 -top-10"
                                            >
                                                <div className="w-1 h-8 bg-gradient-to-t from-purple-500 to-transparent rounded-full" />
                                            </motion.div>
                                            <div className="w-20 h-20 rounded-full border-2 border-purple-500/30 flex items-center justify-center bg-purple-500/10">
                                                <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Sending Request...</h3>
                                        <p className="text-gray-400 text-sm">Initializing render pipeline.</p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="cta"
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="flex flex-col items-center max-w-md mx-auto"
                                    >
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                            className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-6 border border-purple-500/30 shadow-[0_0_40px_-10px_rgba(168,85,247,0.4)]"
                                        >
                                            <CheckCircle2 className="w-10 h-10 text-purple-400" strokeWidth={2} />
                                        </motion.div>
                                        <h3 className="text-3xl font-bold text-white mb-3">Ready to Create Real Magic?</h3>
                                        <p className="text-gray-300 text-base mb-1 leading-relaxed">This was a simulation of our engine.</p>
                                        <p className="text-gray-400 text-sm mb-8">To generate <b>actual 4K videos</b> without limits, start your journey now.</p>
                                        <div className="flex items-center gap-4 w-full justify-center">
                                            <button onClick={onClickCloseModal} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-colors hover:bg-white/5">Stay Here</button>
                                            <button onClick={onClickGoToPricing} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-900/40 transition-all transform hover:scale-105 flex items-center gap-2">Start Creating <ArrowRight size={16} /></button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}

export default memo(HowItWorksSection);
