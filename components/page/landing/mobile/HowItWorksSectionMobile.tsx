'use client'

import { memo } from "react";
import { Sparkles, ArrowRight, Wand2, Mic } from "lucide-react";

function HowItWorksSectionMobile() {
    return (
        <section id="how-it-works" className="relative py-12 px-4 overflow-hidden">
            <div className="relative z-10 max-w-sm mx-auto">
                {/* Header */}
                <div className="mb-6 text-center">
                    <h2 className="text-3xl font-bold text-white tracking-tight mb-2 leading-tight">
                        Don&#39;t Prompt.<br />
                        <span className="text-zinc-500">Just Write.</span>
                    </h2>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                        Watch how ShortReal AI turns simple stories into storyboards instantly.
                    </p>
                </div>

                {/* Mobile Pre-populated Storyboard Showcase Card */}
                <div className="p-5 rounded-3xl bg-[#0e0e17] border border-white/10 shadow-2xl space-y-4">
                    
                    {/* Script Editor Prompt Box */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                            <span className="flex items-center gap-1.5">
                                <Wand2 size={14} className="text-white" />
                                Script Input
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">READY</span>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono text-white leading-relaxed">
                            <span className="text-zinc-400">Ex: </span>
                            A cyberpunk samurai stands on the rain-soaked neon rooftop. He draws his katana as the neon lights reflect off liquid asphalt.
                        </div>
                    </div>

                    {/* Auto Generated Storyboard Showcase (3 Scenes) */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                            <span>Generated Storyboard</span>
                            <span className="text-[10px] font-mono text-emerald-400">3 SCENES / 8.8s</span>
                        </div>

                        <div className="space-y-2">
                            {/* Scene 1 */}
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-mono text-zinc-400 uppercase">Scene 1 · Medium Shot</span>
                                    <span className="text-zinc-500">3.2s</span>
                                </div>
                                <p className="text-xs text-zinc-200 font-medium">
                                    The cybernetic samurai stands on the neon rooftop.
                                </p>
                            </div>

                            {/* Scene 2 */}
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-mono text-zinc-400 uppercase">Scene 2 · Extreme Close-up</span>
                                    <span className="text-zinc-500">2.8s</span>
                                </div>
                                <p className="text-xs text-zinc-200 font-medium">
                                    Rain falls like liquid light around his visor.
                                </p>
                            </div>

                            {/* Scene 3 */}
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-mono text-zinc-400 uppercase">Scene 3 · Low Angle Dynamic</span>
                                    <span className="text-zinc-500">2.8s</span>
                                </div>
                                <p className="text-xs text-zinc-200 font-medium">
                                    He draws his katana, sensing the approaching enemy.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Voice Selection Teaser */}
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Mic size={16} className="text-zinc-400" />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">Voiceovers by ElevenLabs</span>
                                <span className="text-[10px] text-zinc-400">Laura - Enthusiast, Quirky</span>
                            </div>
                        </div>
                        <Sparkles size={14} className="text-white" />
                    </div>
                </div>

            </div>
        </section>
    );
}

export default memo(HowItWorksSectionMobile);
