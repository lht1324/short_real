'use client'

import { memo, useMemo, useState, useCallback, ChangeEvent } from "react";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";
import { Calculator, Users, Image as ImageIcon, Video, Key, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { getMatchedModelPrice } from "@/lib/utils/costCalculator";

interface CostStructureSectionProps {
    aiModelDataList: AIModelData[];
}




function CostStructureSection({ aiModelDataList }: CostStructureSectionProps) {
    const t2iModels = useMemo(() => aiModelDataList.filter(m => m.category === 'text-to-image'), [aiModelDataList]);
    const i2iModels = useMemo(() => aiModelDataList.filter(m => m.category === 'image-to-image'), [aiModelDataList]);
    const i2vModels = useMemo(() => aiModelDataList.filter(m => m.category === 'image-to-video'), [aiModelDataList]);

    const [selectedT2iId, setSelectedT2iId] = useState<string>('d59b7307-ab54-4efd-82f5-62649c2976cc');
    const [selectedI2iId, setSelectedI2iId] = useState<string>('918afd0a-cc7d-41dc-ad42-914c224ef04b');
    const [selectedI2vId, setSelectedI2vId] = useState<string>('b5382c55-f9bb-45e9-bfcf-7b98224ae81c');

    const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');

    const [characterCount, setCharacterCount] = useState<number>(3);
    const [sceneCount, setSceneCount] = useState<number>(6);
    const [videoDuration, setVideoDuration] = useState<number>(30);

    const t2iModel = useMemo(
        () => t2iModels.find(m => (m.id || m.endpoint_id) === selectedT2iId),
        [t2iModels, selectedT2iId]
    );
    const i2iModel = useMemo(
        () => i2iModels.find(m => (m.id || m.endpoint_id) === selectedI2iId),
        [i2iModels, selectedI2iId]
    );
    const i2vModel = useMemo(
        () => i2vModels.find(m => (m.id || m.endpoint_id) === selectedI2vId),
        [i2vModels, selectedI2vId]
    );

    const t2iPriceResult = useMemo(
        () => getMatchedModelPrice(t2iModel, resolution, 'text-to-image'),
        [t2iModel, resolution]
    );
    const i2iPriceResult = useMemo(
        () => getMatchedModelPrice(i2iModel, resolution, 'image-to-image'),
        [i2iModel, resolution]
    );
    const i2vPriceResult = useMemo(
        () => getMatchedModelPrice(i2vModel, resolution, 'image-to-video'),
        [i2vModel, resolution]
    );

    const t2iCost = useMemo(() => t2iPriceResult.price * characterCount, [t2iPriceResult.price, characterCount]);
    const i2iCost = useMemo(() => i2iPriceResult.price * sceneCount, [i2iPriceResult.price, sceneCount]);
    const i2vCost = useMemo(() => i2vPriceResult.price * videoDuration, [i2vPriceResult.price, videoDuration]);
    const totalCost = useMemo(() => t2iCost + i2iCost + i2vCost, [t2iCost, i2iCost, i2vCost]);

    const onClickResolution = useCallback((res: '720p' | '1080p') => {
        setResolution(res);
    }, []);

    const onChangeSelectedT2iId = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
        setSelectedT2iId(e.target.value);
    }, []);

    const onChangeSelectedI2iId = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
        setSelectedI2iId(e.target.value);
    }, []);

    const onChangeSelectedI2vId = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
        setSelectedI2vId(e.target.value);
    }, []);

    const onChangeCharacterCount = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setCharacterCount(Number(e.target.value));
    }, []);

    const onChangeSceneCount = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setSceneCount(Number(e.target.value));
    }, []);

    const onChangeVideoDuration = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        setVideoDuration(Number(e.target.value));
    }, []);

    return (
        <section
            id="coststructure"
            className="relative py-24 md:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden z-10"
        >
            <div className="max-w-[1400px] mx-auto relative z-10">
                {/* Header */}
                <div className="mb-16 md:mb-24 max-w-3xl relative z-10">
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight leading-[1.1]">
                        Transparent, usage-based cost structure.
                    </h2>
                    <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
                        See exactly how your budget translates into high-quality video generation. Adjust the parameters below to estimate your costs based on your actual production needs.
                    </p>
                </div>

                {/* Grid Layout: Calculator (Left) / BYOK (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                    {/* Left: Calculator */}
                    <div className="lg:col-span-7">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-white/5 border border-white/10 rounded-lg">
                                    <Calculator className="w-5 h-5 text-zinc-300" />
                                </div>
                                <h3 className="text-xl font-semibold text-white">Cost Calculator</h3>
                            </div>

                            <div className="space-y-8">
                                {/* Model Selection */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Model Selection</h4>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm text-gray-300 flex items-center gap-2">
                                                <Users className="w-4 h-4 text-gray-500" />
                                                Character
                                            </label>
                                            <select
                                                value={selectedT2iId}
                                                onChange={onChangeSelectedT2iId}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer"
                                            >
                                                {t2iModels.map(m => (
                                                    <option key={m.id || m.endpoint_id} value={m.id || m.endpoint_id} className="bg-zinc-900">
                                                        {m.display_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm text-gray-300 flex items-center gap-2">
                                                <ImageIcon className="w-4 h-4 text-gray-500" />
                                                Scene
                                            </label>
                                            <select
                                                value={selectedI2iId}
                                                onChange={onChangeSelectedI2iId}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer"
                                            >
                                                {i2iModels.map(m => (
                                                    <option key={m.id || m.endpoint_id} value={m.id || m.endpoint_id} className="bg-zinc-900">
                                                        {m.display_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm text-gray-300 flex items-center gap-2">
                                                <Video className="w-4 h-4 text-gray-500" />
                                                Video
                                            </label>
                                            <select
                                                value={selectedI2vId}
                                                onChange={onChangeSelectedI2vId}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer"
                                            >
                                                {i2vModels.map(m => (
                                                    <option key={m.id || m.endpoint_id} value={m.id || m.endpoint_id} className="bg-zinc-900">
                                                        {m.display_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Resolution Toggle */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Resolution</h4>
                                    <div className="flex gap-2">
                                        {(['720p', '1080p'] as const).map((res) => (
                                            <button
                                                key={res}
                                                type="button"
                                                onClick={() => onClickResolution(res)}
                                                className={`px-5 py-2 rounded-lg text-sm font-mono font-semibold border transition-all ${
                                                    resolution === res
                                                        ? 'bg-white/10 border-white/20 text-white'
                                                        : 'bg-transparent border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20'
                                                }`}
                                            >
                                                {res}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-px w-full bg-white/5" />

                                {/* Parameters */}
                                <div className="space-y-5">
                                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Production Scope</h4>

                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm text-gray-300">Character Count</label>
                                            <span className="text-sm font-mono text-white bg-white/10 px-2 py-0.5 rounded">{characterCount}</span>
                                        </div>
                                        <input
                                            type="range" min="1" max="10" step="1"
                                            value={characterCount} onChange={onChangeCharacterCount}
                                            className="w-full accent-white"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm text-gray-300">Scene Count</label>
                                            <span className="text-sm font-mono text-white bg-white/10 px-2 py-0.5 rounded">{sceneCount}</span>
                                        </div>
                                        <input
                                            type="range" min="1" max="30" step="1"
                                            value={sceneCount} onChange={onChangeSceneCount}
                                            className="w-full accent-white"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm text-gray-300">Total Video Duration</label>
                                            <span className="text-sm font-mono text-white bg-white/10 px-2 py-0.5 rounded">{videoDuration}s</span>
                                        </div>
                                        <input
                                            type="range" min="5" max="60" step="1"
                                            value={videoDuration} onChange={onChangeVideoDuration}
                                            className="w-full accent-white"
                                        />
                                    </div>
                                </div>

                                {/* Cost Breakdown */}
                                <div className="border-t border-white/5 pt-6 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-zinc-300 font-medium">Character</p>
                                            <p className="text-xs font-mono text-zinc-400 mt-0.5">
                                                ${t2iPriceResult.price.toFixed(3)}/person × {characterCount}
                                            </p>
                                        </div>
                                        <span className="text-sm font-mono text-zinc-200">${t2iCost.toFixed(3)}</span>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-zinc-300 font-medium">Scene</p>
                                            <p className="text-xs font-mono text-zinc-400 mt-0.5">
                                                ${i2iPriceResult.price.toFixed(3)}/scene × {sceneCount}
                                            </p>
                                        </div>
                                        <span className="text-sm font-mono text-zinc-200">${i2iCost.toFixed(3)}</span>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-zinc-300 font-medium">Video</p>
                                            <p className="text-xs font-mono text-zinc-400 mt-0.5">
                                                ${i2vPriceResult.price.toFixed(5)}/sec × {videoDuration}s
                                            </p>
                                        </div>
                                        <span className="text-sm font-mono text-zinc-200">${i2vCost.toFixed(3)}</span>
                                    </div>
                                </div>

                                {/* Total Cost */}
                                <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-400">Estimated Total Cost</p>
                                        <p className="text-sm text-gray-400">Direct API costs, billed to your provider (USD).</p>
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
                    <div className="lg:col-span-5">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-white/5 border border-white/10 rounded-lg">
                                    <Key className="w-5 h-5 text-zinc-300" />
                                </div>
                                <h3 className="text-xl font-semibold text-white">Bring Your Own Key</h3>
                            </div>

                            <p className="text-gray-300 leading-relaxed mb-8">
                                Connect your own provider API keys and generate content at zero platform markup. You pay only the direct cost charged by the AI providers. Complete transparency, full control.
                            </p>

                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">Supported Providers</h4>

                                {/* fal.ai - 현재 유일하게 지원하는 BYOK 제공사 */}
                                <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-xl p-3">
                                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                                        <Image src="/icons/icon-fal.svg" alt="fal.ai logo" width={40} height={40} className="opacity-90 rounded-md" />
                                    </div>
                                    <span className="text-white font-medium">fal.ai</span>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto opacity-70" />
                                </div>

                                <div className="flex items-center gap-4 border border-dashed border-white/10 rounded-xl p-3">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                        <span className="text-zinc-500 text-lg">+</span>
                                    </div>
                                    <span className="text-zinc-300 text-sm">More providers coming soon</span>
                                </div>
                            </div>

                            {/* How to Connect */}
                            <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                                <h4 className="text-sm font-medium text-gray-400 uppercase tracking-widest">How to Connect</h4>

                                <div className="space-y-3">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-sm font-bold text-zinc-300">1</span>
                                        </div>
                                        <div>
                                            <p className="text-base font-medium text-zinc-200">Get your API key</p>
                                            <p className="text-sm text-zinc-400 mt-0.5">Sign up at fal.ai and copy your API key from the dashboard.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-sm font-bold text-zinc-300">2</span>
                                        </div>
                                        <div>
                                            <p className="text-base font-medium text-zinc-200">Paste it in Settings</p>
                                            <p className="text-sm text-zinc-400 mt-0.5">Add your key in the API Keys section of your Short Real account.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-sm font-bold text-zinc-300">3</span>
                                        </div>
                                        <div>
                                            <p className="text-base font-medium text-zinc-200">Start generating</p>
                                            <p className="text-sm text-zinc-400 mt-0.5">Costs go directly to fal.ai. We never touch your billing.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default memo(CostStructureSection);
