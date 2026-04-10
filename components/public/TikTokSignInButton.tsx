'use client'

import {memo} from "react";
import Image from "next/image";

interface TikTokSignInButtonProps {
    text?: string,
    onClick: () => void,
    disabled?: boolean,
    className?: string,
    textClassName?: string,
    iconClassName?: string,
}

function TikTokSignInButton({
    text = 'Sign in with TikTok',
    onClick,
    disabled = false,
    className = "",
    textClassName = "",
    iconClassName = "",
}: TikTokSignInButtonProps) {
    return (
        <button 
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`w-fit pl-4 pr-4 pt-3 pb-3 flex items-center bg-white hover:bg-gray-100 transition-colors rounded-full shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group ${className}`}
        >
            <div className={`w-5 h-5 mr-3 relative ${iconClassName}`}>
                <Image
                    src="/icons/tiktok-logo-black.svg"
                    alt="TikTok"
                    fill
                    className="object-contain"
                />
            </div>
            <span 
                className={`text-black font-medium text-sm/20 ${textClassName}`}
            >
                {text}
            </span>
        </button>
    )
}

export default memo(TikTokSignInButton);
