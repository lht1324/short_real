'use client'

import {memo} from "react";
import {ArrowRight, Sparkles} from "lucide-react";

function FinalCTASection() {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
            {/* Background Effects */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-4xl mx-auto relative">
                <div className="relative p-12 rounded-3xl border border-purple-500/30 bg-gray-900/50 backdrop-blur-sm overflow-hidden">
                    {/* Decorative gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-600/10 to-transparent pointer-events-none"></div>

                    {/* Content */}
                    <div className="relative text-center space-y-8">
                        {/* Badge */}
                        <div className="inline-flex items-center px-4 py-2 bg-purple-500/20 border border-purple-400/30 rounded-full text-sm backdrop-blur-sm">
                            <Sparkles className="w-4 h-4 text-purple-400 mr-2" />
                            <span className="text-purple-300 font-medium">Start Creating Today</span>
                        </div>

                        {/* Heading */}
                        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                            Ready to Create
                            <br />
                            <span className="bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                                Real Shortform?
                            </span>
                        </h2>

                        {/* Description */}
                        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                            Stop settling for slideshows. Start creating true videos.
                        </p>

                        {/* CTA Button */}
                        <div className="pt-4">
                            <button className="group bg-gradient-to-r from-pink-500 to-purple-600 text-white px-10 py-5 rounded-xl text-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-3 shadow-2xl shadow-purple-500/50 mx-auto">
                                <span>Get Started</span>
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* Trust indicators */}
                        <div className="flex items-center justify-center space-x-8 text-sm text-gray-400 pt-4">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span>Premium output</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span>True motion videos</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span>Easy to use</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default memo(FinalCTASection);
