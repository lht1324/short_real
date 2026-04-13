'use client'

import {memo} from "react";
import Image from "next/image";
import {CheckCircle2, Wrench} from "lucide-react";

interface PlatformCheckboxProps {
    logoSrc: string;
    activeColor: string; // 활성화 시 배경/테두리 스타일 (Tailwind 클래스)
    iconColor: string;   // 활성화 시 체크 아이콘 색상 (Tailwind 클래스)
    label: string;       // 플랫폼 이름
    isChecked: boolean;  // 체크 여부
    isDisabled?: boolean; // 점검 중 여부
    onClick: () => void; // 클릭 핸들러
}

/**
 * 오토파일럿 플랫폼 선택용 체크박스 컴포넌트
 * 이미 연동된 플랫폼의 업로드 활성/비활성 상태를 관리합니다.
 */
function PlatformCheckbox({
    logoSrc,
    activeColor,
    iconColor,
    label,
    isChecked,
    isDisabled = false,
    onClick,
}: PlatformCheckboxProps) {
    return (
        <div
            onClick={() => !isDisabled && onClick()}
            className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                isDisabled
                    ? 'bg-black/20 border-white/5 opacity-40 cursor-not-allowed'
                    : isChecked 
                        ? `${activeColor} cursor-pointer` 
                        : 'bg-black/20 border-white/5 opacity-60 hover:opacity-100 cursor-pointer'
            }`}
        >
            <div className="flex items-center gap-3.5">
                <div className="w-7 h-7 relative">
                    <Image 
                        src={logoSrc} 
                        alt={label} 
                        fill 
                        className="object-contain" 
                    />
                </div>
                <span className={`text-sm font-bold transition-colors ${isChecked && !isDisabled ? 'text-white' : 'text-gray-500'}`}>
                    {label}
                </span>
            </div>

            {/* 체크된 상태라면 체크 아이콘 표시 */}
            {isChecked && !isDisabled && (
                <CheckCircle2 size={18} className={iconColor} />
            )}

            {/* 점검 중인 경우 렌치 아이콘 표시 */}
            {isDisabled && (
                <Wrench size={18} className="text-yellow-500/50" />
            )}
        </div>
    );
}

export default memo(PlatformCheckbox);
