import {memo} from "react";
import Image from "next/image";

function DefaultSignInButton({
    text,
    src,
    onClick,
    disabled = false,
}: {
    text?: string,
    src: string,
    onClick: () => void,
    disabled?: boolean,
}) {
    return (
        <button 
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="w-fit pl-4 pr-4 pt-3 pb-3 flex items-center bg-[#F2F2F2] rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Image
                src={src}
                alt={text ?? "Sign In"}
                width={20}
                height={20}
                className="w-5 h-5 mr-3"
            />
            <span 
                className="text-[#1F1F1F] font-[Roboto] font-medium text-sm/20"
            >
                {text}
            </span>
        </button>
    )
}

export default memo(DefaultSignInButton);