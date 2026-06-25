import { memo } from "react";
import { ChevronDown } from "lucide-react";

interface VideoSpecsSelectorProps {
    aspectRatio: '16:9' | '9:16';
    resolution: '720p' | '1080p' | '2160p';
    supportedResolutions?: string[];
    isResolutionMismatched?: boolean;
    onChangeAspectRatio: (ratio: '16:9' | '9:16') => void;
    onChangeResolution: (res: '720p' | '1080p' | '2160p') => void;
}

function VideoSpecsSelector({
    aspectRatio,
    resolution,
    supportedResolutions,
    isResolutionMismatched = false,
    onChangeAspectRatio,
    onChangeResolution,
}: VideoSpecsSelectorProps) {
    return (
        <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-0.5">Aspect Ratio</label>
                <div className="relative">
                    <select 
                        value={aspectRatio} 
                        onChange={(e) => onChangeAspectRatio(e.target.value as '16:9' | '9:16')}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-base font-semibold text-zinc-200 focus:outline-none focus:border-zinc-500 appearance-none cursor-pointer pr-10 hover:bg-black/60 transition-colors"
                    >
                        <option value="9:16" className="bg-zinc-900">Vertical (9:16)</option>
                        <option value="16:9" className="bg-zinc-900">Horizontal (16:9)</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
            </div>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-0.5">Resolution</label>
                    {isResolutionMismatched && (
                        <div className="relative group">
                            <span className="text-[9px] text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-0.5 cursor-help">
                                ⚠️ Mismatch
                            </span>
                            {/* Custom Tooltip Card */}
                            <div className="absolute bottom-full right-0 mb-2 w-60 p-3.5 bg-zinc-950 border border-white/10 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 text-left z-50 pointer-events-none">
                                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Resolution Mismatch</div>
                                <p className="text-[11px] text-zinc-400 leading-relaxed font-normal">
                                    Selected models do not share a common resolution. Video model's specification is used as fallback, which may cause scaling artifacts and quality loss.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="relative">
                    <select 
                        value={resolution} 
                        onChange={(e) => onChangeResolution(e.target.value as '720p' | '1080p' | '2160p')}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-base font-semibold text-zinc-200 focus:outline-none focus:border-zinc-500 appearance-none cursor-pointer pr-10 hover:bg-black/60 transition-colors"
                    >
                        <option 
                            value="720p" 
                            disabled={supportedResolutions ? !supportedResolutions.includes('720p') : false} 
                            className={supportedResolutions && !supportedResolutions.includes('720p') ? "bg-zinc-900 text-zinc-600" : "bg-zinc-900"}
                        >
                            720p {supportedResolutions && !supportedResolutions.includes('720p') && "(Not supported)"}
                        </option>
                        <option 
                            value="1080p" 
                            disabled={supportedResolutions ? !supportedResolutions.includes('1080p') : false} 
                            className={supportedResolutions && !supportedResolutions.includes('1080p') ? "bg-zinc-900 text-zinc-600" : "bg-zinc-900"}
                        >
                            1080p {supportedResolutions && !supportedResolutions.includes('1080p') && "(Not supported)"}
                        </option>
                        <option 
                            value="2160p" 
                            disabled={supportedResolutions ? !supportedResolutions.includes('2160p') : false} 
                            className={supportedResolutions && !supportedResolutions.includes('2160p') ? "bg-zinc-900 text-zinc-600" : "bg-zinc-900"}
                        >
                            4K (2160p) {supportedResolutions && !supportedResolutions.includes('2160p') && "(Not supported)"}
                        </option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
            </div>
        </div>
    );
}

export default memo(VideoSpecsSelector);
