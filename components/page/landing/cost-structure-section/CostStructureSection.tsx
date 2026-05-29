'use client'

import { memo, useMemo, useState, useEffect } from "react";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";
import { Calculator, Users, Image as ImageIcon, Video, Key, CheckCircle2 } from "lucide-react";
import Image from "next/image";

interface CostStructureSectionProps {
    aiModelDataList: AIModelData[];
}

function CostStructureSection({ aiModelDataList }: CostStructureSectionProps) {
    const t2iModels = useMemo(() => aiModelDataList.filter(m => m.category === 'text-to-image'), [aiModelDataList]);
    const i2iModels = useMemo(() => aiModelDataList.filter(m => m.category === 'image-to-image'), [aiModelDataList]);
    const i2vModels = useMemo(() => aiModelDataList.filter(m => m.category === 'image-to-video'), [aiModelDataList]);

    const [selectedT2iId, setSelectedT2iId] = useState<string>('');
    const [selectedI2iId, setSelectedI2iId] = useState<string>('');
    const [selectedI2vId, setSelectedI2vId] = useState<string>('');

    // Default selections
    useEffect(() => {
        if (!selectedT2iId && t2iModels.length > 0) setSelectedT2iId(t2iModels[0].id || t2iModels[0].endpoint_id);
        if (!selectedI2iId && i2iModels.length > 0) setSelectedI2iId(i2iModels[0].id || i2iModels[0].endpoint_id);
        if (!selectedI2vId && i2vModels.length > 0) setSelectedI2vId(i2vModels[0].id || i2vModels[0].endpoint_id);
    }, [t2iModels, i2iModels, i2vModels, selectedT2iId, selectedI2iId, selectedI2vId]);

    const [characterCount, setCharacterCount] = useState<number>(3);
    const [sceneCount, setSceneCount] = useState<number>(6);
    const [videoDuration, setVideoDuration] = useState<number>(30);

    const getPrice = (models: AIModelData[], id: string) => {
        const model = models.find(m => (m.id || m.endpoint_id) === id);
        if (!model || !model.ai_model_price_list || model.ai_model_price_list.length === 0) return 0;
        const price1080 = model.ai_model_price_list.find(p => p.unit.includes('1080p'));
        return price1080?.price_per_unit || model.ai_model_price_list[0].price_per_unit || 0;
    };

    const t2iPrice = getPrice(t2iModels, selectedT2iId);
    const i2iPrice = getPrice(i2iModels, selectedI2iId);
    const i2vPrice = getPrice(i2vModels, selectedI2vId);

    const t2iCost = t2iPrice * characterCount;
    const i2iCost = i2iPrice * sceneCount;
    const i2vCost = i2vPrice * videoDuration;
    const totalCost = t2iCost + i2iCost + i2vCost;

    return (
        <section className="relative w-full py-24 md:py-32 overflow-hidden z-10">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8">
                {/* Header */}
                <div className="max-w-2xl mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
                        Transparent, usage-based cost structure.
                    </h2>
                    <p className="text-lg text-gray-400 leading-relaxed max-w-[65ch]">
                        See exactly how your budget translates into high-quality video generation. Adjust the parameters below to estimate your costs based on your actual production needs.
                    </p>
                </div>

                {/* Grid Layout: Calculator (Left) / BYOK (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    
                    {/* Left: Calculator */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-pink-500/20 rounded-lg">
                                    <Calculator className="w-5 h-5 text-pink-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-white">Cost Calculator</h3>
                            </div>

                            <div className="space-y-8">
                                {/* Model Selection */}
                                <div className="space-y-5">
                                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Model Selection</h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm text-gray-300 flex items-center gap-2">
                                                <Users className="w-4 h-4 text-gray-500" />
                                                Character Generator Model
                                            </label>
                                            <select 
                                                value={selectedT2iId} 
                                                onChange={(e) => setSelectedT2iId(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 appearance-none"
                                            >
                                                {t2iModels.map(m => (
                                                    <option key={m.id || m.endpoint_id} value={m.id || m.endpoint_id} className="bg-zinc-900">{m.display_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm text-gray-300 flex items-center gap-2">
                                                <ImageIcon className="w-4 h-4 text-gray-500" />
                                                Scene Generator Model
                                            </label>
                                            <select 
                                                value={selectedI2iId} 
                                                onChange={(e) => setSelectedI2iId(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 appearance-none"
                                            >
                                                {i2iModels.map(m => (
                                                    <option key={m.id || m.endpoint_id} value={m.id || m.endpoint_id} className="bg-zinc-900">{m.display_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm text-gray-300 flex items-center gap-2">
                                                <Video className="w-4 h-4 text-gray-500" />
                                                Video Generator Model
                                            </label>
                                            <select 
                                                value={selectedI2vId} 
                                                onChange={(e) => setSelectedI2vId(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 appearance-none"
                                            >
                                                {i2vModels.map(m => (
                                                    <option key={m.id || m.endpoint_id} value={m.id || m.endpoint_id} className="bg-zinc-900">{m.display_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px w-full bg-white/5" />

                                {/* Parameters */}
                                <div className="space-y-6">
                                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Production Scope</h4>
                                    
                                    <div className="space-y-5">
                                        <div className="flex flex-col gap-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm text-gray-300">Character Count</label>
                                                <span className="text-sm font-mono text-white bg-white/10 px-2 py-0.5 rounded">{characterCount}</span>
                                            </div>
                                            <input 
                                                type="range" min="1" max="10" step="1" 
                                                value={characterCount} onChange={(e) => setCharacterCount(Number(e.target.value))}
                                                className="w-full accent-pink-500"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm text-gray-300">Scene Count</label>
                                                <span className="text-sm font-mono text-white bg-white/10 px-2 py-0.5 rounded">{sceneCount}</span>
                                            </div>
                                            <input 
                                                type="range" min="1" max="30" step="1" 
                                                value={sceneCount} onChange={(e) => setSceneCount(Number(e.target.value))}
                                                className="w-full accent-pink-500"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm text-gray-300">Total Video Duration (sec)</label>
                                                <span className="text-sm font-mono text-white bg-white/10 px-2 py-0.5 rounded">{videoDuration}s</span>
                                            </div>
                                            <input 
                                                type="range" min="5" max="60" step="1" 
                                                value={videoDuration} onChange={(e) => setVideoDuration(Number(e.target.value))}
                                                className="w-full accent-pink-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Total Cost Display */}
                                <div className="pt-6 mt-6 border-t border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-400">Estimated Total Cost</p>
                                        <p className="text-xs text-gray-500">Based on direct API costs (USD).</p>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl text-gray-400 font-light">$</span>
                                        <span className="text-5xl font-mono text-white tracking-tight">{totalCost.toFixed(3)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: BYOK Info */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-gradient-to-b from-purple-900/20 to-transparent border border-purple-500/20 rounded-2xl p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                    <Key className="w-5 h-5 text-purple-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-white">Bring Your Own Key (BYOK)</h3>
                            </div>
                            
                            <p className="text-gray-300 leading-relaxed mb-8">
                                Connect your own provider API keys and generate content at zero platform markup. You pay only the direct cost charged by the AI providers. Enjoy complete transparency and control over your budget.
                            </p>

                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">Supported Providers</h4>
                                
                                {['fal.ai', 'Replicate', 'OpenRouter', 'ElevenLabs'].map((provider) => (
                                    <div key={provider} className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-xl p-3">
                                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                            <Image src="/icons/google-g-light.svg" alt={`${provider} logo`} width={20} height={20} className="opacity-70" />
                                        </div>
                                        <span className="text-white font-medium">{provider}</span>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto opacity-70" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default memo(CostStructureSection);