'use client'

import { memo } from "react";
import { Check, X, AlertCircle, Sparkles } from "lucide-react";

function ComparisonSection() {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 relative bg-black overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                        Why <span className="bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">ShortReal</span>?
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Don't settle for generic stock footage. See the difference between traditional tools and true generative AI.
                    </p>
                </div>

                {/* Comparison Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">

                    {/* Competitors Card (Left) */}
                    <div className="relative p-8 rounded-2xl border border-gray-800 bg-gray-900/30 backdrop-blur-sm grayscale opacity-90 hover:opacity-100 transition-opacity">
                        <div className="absolute -top-4 left-8 px-4 py-1 bg-gray-700 text-gray-300 text-sm font-semibold rounded-full border border-gray-600">
                            Traditional AI Editors
                        </div>

                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-gray-300 mb-2">Others</h3>
                            <p className="text-gray-500">Stock footage wrappers</p>
                        </div>

                        <ul className="space-y-6">
                            <li className="flex items-start gap-4">
                                <div className="mt-1 w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                    <X size={14} className="text-red-500" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-300">Generic Stock Clips</h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Uses the same free stock videos everyone else uses. Zero originality.
                                    </p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="mt-1 w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                    <X size={14} className="text-red-500" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-300">Slideshow Effect</h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Static images with "Ken Burns" zoom effects. Not a real video.
                                    </p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="mt-1 w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle size={14} className="text-red-500" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-300">Disconnected Context</h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Visuals rarely match the script perfectly because they are pre-made.
                                    </p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* ShortReal Card (Right) */}
                    <div className="relative p-8 rounded-2xl border border-purple-500/40 bg-gray-900/60 backdrop-blur-md shadow-2xl shadow-purple-500/10 transform md:scale-105 z-10">
                        {/* Glowing Border Effect */}
                        <div className="absolute inset-0 rounded-2xl border border-purple-400/20 animate-pulse" />

                        <div className="absolute -top-4 left-8 px-4 py-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold rounded-full shadow-lg">
                            ShortReal Engine
                        </div>

                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                ShortReal <Sparkles size={20} className="text-yellow-400 fill-yellow-400" />
                            </h3>
                            <p className="text-purple-300">True Generative Video</p>
                        </div>

                        <ul className="space-y-6">
                            <li className="flex items-start gap-4">
                                <div className="mt-1 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 border border-green-500/30">
                                    <Check size={14} className="text-green-400" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white">100% Unique Generation</h4>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Every scene is generated from scratch using advanced AI models.
                                    </p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="mt-1 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 border border-green-500/30">
                                    <Check size={14} className="text-green-400" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white">True Motion (Fluid)</h4>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Real character movement and physics, not just moving pictures.
                                    </p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4">
                                <div className="mt-1 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 border border-green-500/30">
                                    <Check size={14} className="text-green-400" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white">Context-Aware Visuals</h4>
                                    <p className="text-sm text-gray-400 mt-1">
                                        AI understands your script and creates the exact scene described.
                                    </p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default memo(ComparisonSection);