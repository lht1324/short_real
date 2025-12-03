import {memo} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {ArrowRight, CheckCircle2, Loader2} from "lucide-react";

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
                                    <button onClick={onClickClose} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-colors hover:bg-white/5">Stay Here</button>
                                    <button onClick={onClickGoToPricing} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-900/40 transition-all transform hover:scale-105 flex items-center gap-2">Start Creating <ArrowRight size={16} /></button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default memo(CTAModal);