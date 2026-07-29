'use client'

import {memo} from "react";
import Image from "next/image";
import {Settings, Wrench, X, CheckCircle2} from "lucide-react";

interface PlatformAccountCardProps {
    platform: 'youtube' | 'tiktok' | 'instagram';
    logoSrc: string;
    activeColor: string;
    iconColor: string;
    label: string;
    isConnected: boolean;
    isChecked: boolean;
    handleName?: string | null;
    displayName?: string | null;
    isDisabled?: boolean;
    onClickToggle: () => void;
    onClickConnect: () => void;
    onClickSettings: () => void;
    onClickDisconnect: () => void;
}

function PlatformAccountCard({
    platform,
    logoSrc,
    activeColor,
    iconColor,
    label,
    isConnected,
    isChecked,
    handleName,
    displayName,
    isDisabled = false,
    onClickToggle,
    onClickConnect,
    onClickSettings,
    onClickDisconnect,
}: PlatformAccountCardProps) {
    if (!isConnected) {
        return (
            <button
                type="button"
                onClick={onClickConnect}
                disabled={isDisabled}
                className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 text-white rounded-xl h-[56px] px-4 transition-all border border-purple-500/30 hover:border-purple-400 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed group"
            >
                <div className="flex items-center">
                    <div className="relative w-6 h-6 mr-8 flex-shrink-0 transition-transform group-hover:scale-110">
                        <Image
                            src={logoSrc}
                            alt={label}
                            fill
                            className="object-contain"
                        />
                    </div>
                    <span className="font-bold text-sm text-gray-100 group-hover:text-white tracking-tight transition-colors">
                        Connect {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </span>
                </div>
                {isDisabled && (
                    <Wrench size={18} className="text-yellow-500/50" />
                )}
            </button>
        );
    }

    return (
        <div
            className={`flex flex-col p-4 rounded-xl border transition-all ${
                isDisabled
                    ? 'bg-black/20 border-white/5 opacity-40 cursor-not-allowed'
                    : isChecked
                        ? `${activeColor} border-opacity-40`
                        : 'bg-black/20 border-white/5'
            }`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 relative">
                        <Image
                            src={logoSrc}
                            alt={label}
                            fill
                            className="object-contain"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-white truncate max-w-[120px]">
                            {handleName ? (handleName.startsWith('@') ? handleName : `@${handleName}`) : (displayName || 'Connected')}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                            {label}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Toggle Switch */}
                    <button
                        onClick={onClickToggle}
                        disabled={isDisabled}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                            isChecked ? 'bg-purple-600' : 'bg-gray-700'
                        }`}
                    >
                        <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                isChecked ? 'translate-x-5' : 'translate-x-1'
                            }`}
                        />
                    </button>

                    {/* Settings Gear */}
                    <button
                        onClick={onClickSettings}
                        className="p-1 hover:bg-white/10 rounded-md transition-colors text-gray-400 hover:text-white"
                        title="Settings"
                    >
                        <Settings size={16} />
                    </button>

                    {/* Disconnect X */}
                    <button
                        onClick={onClickDisconnect}
                        className="p-1 hover:bg-red-500/20 rounded-md transition-colors text-gray-400 hover:text-red-400"
                        title="Disconnect"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default memo(PlatformAccountCard);
