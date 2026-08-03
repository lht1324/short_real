'use client'

import { memo, useCallback } from "react";
import { Zap, ArrowRight } from "lucide-react";

function MobileDockingCTA() {
    const onClickGetStarted = useCallback(() => {
        const pricingEl = document.getElementById('pricing');
        if (pricingEl) {
            pricingEl.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);

    return (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden">
            <div className="p-2 rounded-2xl bg-[#0b0b15]/90 border border-white/20 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center justify-between gap-3">
                <div className="pl-3 flex flex-col">
                    <span className="text-xs font-bold text-white tracking-wide">True Motion AI</span>
                    <span className="text-[10px] text-zinc-400 font-medium">No more slideshows</span>
                </div>
                
                <button
                    onClick={onClickGetStarted}
                    className="h-11 px-5 rounded-xl bg-white text-black font-extrabold text-sm flex items-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                    <Zap size={15} className="fill-black" />
                    <span>Create Video</span>
                    <ArrowRight size={15} />
                </button>
            </div>
        </div>
    );
}

export default memo(MobileDockingCTA);
