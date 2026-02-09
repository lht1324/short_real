import Image from "next/image";
import {
    Clapperboard, // 영상 개수용
    Mic,          // Voiceover
    Music,        // Background Music
    Type,         // Caption
    Sparkles,     // No Watermark (또는 Sparkles)
    Share2,       // Social Upload
    Download      // Download
} from "lucide-react";

// 공통 아이콘 스타일 (필요시 size, className 조정)
const ICON_SIZE = 18;
const ICON_CLASS = "text-primary-500"; // 테마 색상에 맞춰 조정

export const PRICING_BENEFIT_LIST = [
    // 1. 영상 개수 (Clapperboard 아이콘 추천)
    {
        description: <span className="text-gray-300">30 videos per month</span>,
        includedPlanList: ['plan-1'],
        icon: <Clapperboard size={ICON_SIZE} className={ICON_CLASS} />,
    },
    {
        description: <span className="text-gray-300">60 videos per month</span>,
        includedPlanList: ['plan-2'],
        icon: <Clapperboard size={ICON_SIZE} className={ICON_CLASS} />,
    },
    {
        description: <span className="text-gray-300">90 videos per month</span>,
        includedPlanList: ['plan-3'],
        icon: <Clapperboard size={ICON_SIZE} className={ICON_CLASS} />,
    },
    {
        description: <span className="text-gray-300">120 videos per month</span>,
        includedPlanList: ['plan-4'],
        icon: <Clapperboard size={ICON_SIZE} className={ICON_CLASS} />,
    },

    // 2. 기능 리스트 (각 특성에 맞는 아이콘)
    {
        description: <div className="flex flex-row text-gray-300">Voiceovers (Powered by <Image
            src="/icons/elevenlabs-logo.svg"
            alt="ElevenLabs"
            width={77}
            height={10}
            className="pl-1 cursor-pointer"
            onClick={() => { window.open("https://elevenlabs.io/", "_blank") }}
        />)</div>,
        includedPlanList: ['plan-1', 'plan-2', 'plan-3', 'plan-4'],
        icon: <Mic size={ICON_SIZE} className={ICON_CLASS} />,
    },
    {
        description: <span className="text-gray-300">AI Generated Background Music</span>,
        includedPlanList: ['plan-1', 'plan-2', 'plan-3', 'plan-4'],
        icon: <Music size={ICON_SIZE} className={ICON_CLASS} />,
    },
    {
        description: <span className="text-gray-300">Auto Caption Generation</span>,
        includedPlanList: ['plan-1', 'plan-2', 'plan-3', 'plan-4'],
        icon: <Type size={ICON_SIZE} className={ICON_CLASS} />,
        // 자막은 보통 'Captions', 'Subtitles' 또는 'Type' 아이콘 사용
    },
    {
        description: <span className="text-gray-300">No Watermark</span>,
        includedPlanList: ['plan-1', 'plan-2', 'plan-3', 'plan-4'],
        icon: <Sparkles size={ICON_SIZE} className={ICON_CLASS} />,
        // 깔끔함을 강조하는 Sparkles나 빠른 처리의 Zap, 혹은 금지 표시(Ban)보다는 긍정적 아이콘 추천
    },
    {
        description: <span className="text-gray-300">Direct Social Upload</span>,
        includedPlanList: ['plan-1', 'plan-2', 'plan-3', 'plan-4'],
        icon: <Share2 size={ICON_SIZE} className={ICON_CLASS} />,
    },
    {
        description: <span className="text-gray-300">Unlimited Download</span>,
        includedPlanList: ['plan-1', 'plan-2', 'plan-3', 'plan-4'],
        icon: <Download size={ICON_SIZE} className={ICON_CLASS} />,
    },
];
