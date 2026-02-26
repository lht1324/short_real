'use client'

import { memo, useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Sparkles, Clapperboard, Clock, Wand2, ArrowDown, Loader2 } from "lucide-react";
import { Voice } from "@/lib/api/types/eleven-labs/Voice";
import { voiceClientAPI } from "@/lib/api/client/voiceClientAPI";
import CTAModal from "@/components/page/landing/how-it-works-section/CTAModal";
import GenerateActionPanel from "@/components/page/landing/how-it-works-section/GenerateActionPanel";
import VoiceSelectionPanel from "@/components/page/landing/how-it-works-section/VoiceSelectionPanel";
import {MotionDiv} from "@/components/public/framerMotion/Motion";
import {AnimPresence} from "@/components/public/framerMotion/AnimPresence";

// --- Types & Constants ---

interface SceneItem {
    id: number;
    text: string;
    duration: string;
    cameraAngle: string;
}

export interface VoiceProfile extends Voice {
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

    const validationErrors = useMemo(() => {
        const errors = [];
        if (scenes.length === 0) errors.push("Generate storyboard first");
        if (!selectedVoiceId) errors.push("Select a voice actor");
        return errors;
    }, [scenes, selectedVoiceId]);

    const isSystemReady = validationErrors.length === 0;


    // --- Handlers ---
    const onSelectVoiceId = useCallback((voiceId: string) => {
        setSelectedVoiceId(voiceId);
    }, []);

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
                                    <AnimPresence mode='popLayout'>
                                        {scenes.map((scene) => (
                                            <MotionDiv
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
                                            </MotionDiv>
                                        ))}
                                    </AnimPresence>
                                </div>
                                <div className="h-4" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="lg:col-span-5 flex flex-col gap-6 h-full">
                    {/* Voice Selection */}
                    <VoiceSelectionPanel
                        voiceDataList={voiceDataList}
                        selectedVoiceId={selectedVoiceId}
                        onSelectVoiceId={onSelectVoiceId}
                    />

                    {/* Generate Action */}
                    <GenerateActionPanel
                        estimatedCost={estimatedCost}
                        isSystemReady={isSystemReady}
                        isGenerating={isGenerating}
                        validationErrors={validationErrors}
                        onClickGenerate={onClickGenerate}
                    />
                </div>

                {/* CTA MODAL */}
                <CTAModal
                    isGenerating={isGenerating}
                    isSuccess={isSuccess}
                    onClickGoToPricing={onClickGoToPricing}
                    onClickClose={onClickCloseModal}
                />
            </div>
        </section>
    );
}

export default memo(HowItWorksSection);