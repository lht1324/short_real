'use client'

import {memo} from "react";
import Image from "next/image";
import {Wrench} from "lucide-react";

interface PlatformConnectButtonProps {
    logoSrc: string;
    text: string;
    onClick: () => void;
    disabled?: boolean;
    isProgressing: boolean; // 추가: 개발 중인 플랫폼 표시 여부
}

/**
 * 오토파일럿 사이드바 전용 플랫폼 연동 버튼
 * isProgressing이 true일 경우 우측에 렌치 아이콘을 띄우고 비활성화됨.
 */
function PlatformConnectButton({
    logoSrc,
    text,
    onClick,
    disabled = false,
    isProgressing = false,
}: PlatformConnectButtonProps) {
    return (
        <button 
            type="button"
            onClick={onClick}
            // isProgressing인 경우에도 클릭되지 않도록 비활성화 처리
            disabled={disabled || isProgressing}
            className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 text-white rounded-xl h-[56px] px-4 transition-all border border-purple-500/30 hover:border-purple-400 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed group"
        >
            <div className="flex items-center">
                {/* 
                    아이콘 영역: 
                    mr-8로 텍스트 시작점(X축)을 강제 고정하여 정렬 완성.
                */}
                <div className="relative w-6 h-6 mr-8 flex-shrink-0 transition-transform group-hover:scale-110">
                    <Image
                        src={logoSrc}
                        alt={text}
                        fill
                        className="object-contain"
                    />
                </div>
                
                {/* 텍스트 영역 */}
                <span className="font-bold text-sm text-gray-100 group-hover:text-white tracking-tight transition-colors">
                    {text}
                </span>
            </div>

            {/* 
                상태 아이콘:
                isProgressing일 때만 노란색 렌치 아이콘을 보여줌.
            */}
            {isProgressing && (
                <Wrench size={18} className="text-yellow-500/50" />
            )}
        </button>
    )
}

export default memo(PlatformConnectButton);
