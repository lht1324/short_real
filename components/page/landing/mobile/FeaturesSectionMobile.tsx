'use client'

import { memo } from "react";
import { FEATURES_DATA } from "@/components/page/landing/data/featuresData";

function FeaturesSectionMobile() {
    return (
        <section id="features" className="relative py-6 px-4 overflow-hidden">
            {/* Header */}
            <div className="mb-6 text-center max-w-sm mx-auto">
                <h2 className="text-2xl xs:text-3xl font-black text-white tracking-tight mb-1 leading-tight">
                    Not Just a Wrapper.<br />
                    <span className="text-zinc-500">This is an Engine.</span>
                </h2>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                    Four core video diffusion capabilities.
                </p>
            </div>

            {/* Precision Viewport Snap Feed (Locks 1st Card Perfectly On Screen) */}
            <div className="space-y-12 max-w-xs mx-auto">
                {FEATURES_DATA.map((feature) => {
                    const Icon = feature.icon;

                    return (
                        <div
                            key={feature.id}
                            className="snap-start snap-always scroll-mt-20 relative w-full max-w-[260px] mx-auto aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-[#0b0b15] group"
                        >
                            {/* 100% Full Unclipped 9:16 Video */}
                            <video
                                src={feature.videoSrc}
                                className="w-full h-full object-cover"
                                autoPlay
                                loop
                                muted
                                playsInline
                            />

                            {/* Top Tag */}
                            <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-1.5">
                                <Icon size={13} className="text-white" />
                                <span className="text-[11px] font-black tracking-wider text-white uppercase">
                                    {feature.title}
                                </span>
                            </div>

                            {/* Bottom Content Overlay */}
                            <div className="absolute inset-x-0 bottom-0 z-10 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-2">
                                <h3 className="text-xs font-bold text-white leading-snug whitespace-pre-line">
                                    {feature.description}
                                </h3>
                                <div className="p-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-[10px] font-mono text-zinc-300 leading-relaxed">
                                    <span className="text-zinc-400 font-bold block mb-0.5">PROMPT:</span>
                                    {feature.prompt}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export default memo(FeaturesSectionMobile);
