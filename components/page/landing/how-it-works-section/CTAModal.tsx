'use client'

import {memo} from "react";
import {ArrowRight, CheckCircle2, Loader2} from "lucide-react";
import {MotionDiv} from "@/components/public/framerMotion/Motion";
import {AnimPresence} from "@/components/public/framerMotion/AnimPresence";

interface CTAModalProps {
    isGenerating: boolean;
    isSuccess: boolean;
    onClickGoToPricing: () => void;
    onClickClose: () => void;
}

function CTAModal({
    isGenerating,
    isSuccess,
    onClickGoToPricing,
    onClickClose,
}: CTAModalProps) {
    return (
        <AnimPresence>
            {(isGenerating || isSuccess) && (
                <MotionDiv
                    initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                    exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 z-50 rounded-3xl overflow-hidden border border-white/10 flex flex-col items-center justify-center bg-black/80"
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] animate-pulse" />

                    <div className="relative z-10 flex flex-col items-center text-center p-8">
                        {isGenerating ? (
                            <MotionDiv
                                key="sending"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 1.1, opacity: 0 }}
                                className="flex flex-col items-center"
                            >
                                <div className="relative mb-8">
                                    <MotionDiv
                                        animate={{ y: [-10, -30], opacity: [0, 1, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                                        className="absolute left-1/2 -translate-x-1/2 -top-10"
                                    >
                                        <div className="w-1 h-8 bg-gradient-to-t from-white to-transparent rounded-full" />
                                    </MotionDiv>
                                    <div className="w-20 h-20 rounded-full border-2 border-white/20 flex items-center justify-center bg-white/5">
                                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Sending Request...</h3>
                                <p className="text-gray-400 text-sm">Initializing render pipeline.</p>
                            </MotionDiv>
                        ) : (
                            <MotionDiv
                                key="cta"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex flex-col items-center max-w-md mx-auto"
                            >
                                <MotionDiv
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                    className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_40px_-10px_rgba(255,255,255,0.05)]"
                                >
                                    <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2} />
                                </MotionDiv>
                                <h3 className="text-3xl font-bold text-white mb-3">Ready to Create Real Magic?</h3>
                                <p className="text-gray-300 text-base mb-1 leading-relaxed">This was a simulation of our engine.</p>
                                <p className="text-gray-400 text-sm mb-8">To generate <b>actual Full HD videos</b>, connect your API keys and start creating.</p>
                                <div className="flex items-center gap-4 w-full justify-center">
                                    <button onClick={onClickClose} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-colors hover:bg-white/5">Stay Here</button>
                                    <button onClick={onClickGoToPricing} className="px-8 py-3 bg-white hover:bg-zinc-200 text-black text-sm font-bold rounded-xl shadow-lg shadow-white/5 transition-all transform hover:scale-105 flex items-center gap-2">Start Creating <ArrowRight size={16} /></button>
                                </div>
                            </MotionDiv>
                        )}
                    </div>
                </MotionDiv>
            )}
        </AnimPresence>
    )
}

export default memo(CTAModal);