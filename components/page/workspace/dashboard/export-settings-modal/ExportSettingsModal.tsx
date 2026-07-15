import { memo, useMemo, ReactNode, useState, useEffect, useRef } from "react";
import { ExportPrivacySetting } from "@/components/page/workspace/dashboard/export-settings-modal/ExportPrivacySetting";
import { Globe, Lock, Link as LinkIcon, User, ChevronDown, Loader2 } from "lucide-react";
import { getFetch } from "@/lib/api/client/baseFetch";
import { ExportPlatform } from "@/lib/api/types/supabase/VideoGenerationTasks";
import { motion, AnimatePresence } from "framer-motion";

const PRIVACY_OPTIONS: {
    value: ExportPrivacySetting;
    label: string;
    icon: ReactNode;
    description: string;
}[] = [
    {
        value: ExportPrivacySetting.PUBLIC,
        label: "Public",
        icon: <Globe size={16} strokeWidth={1.5} />,
        description: "Anyone can watch your video.",
    },
    {
        value: ExportPrivacySetting.UNLISTED,
        label: "Unlisted",
        icon: <LinkIcon size={16} strokeWidth={1.5} />,
        description: "Only people with the link can watch your video.",
    },
    {
        value: ExportPrivacySetting.PRIVATE,
        label: "Private",
        icon: <Lock size={16} strokeWidth={1.5} />,
        description: "Only you can watch your video.",
    },
];

interface SocialChannel {
    id: string;
    seriesId: string | null;
    displayName: string;
    handleName: string;
    avatarUrl: string | null;
    platform: "youtube" | "tiktok";
}

interface ExportSettingsModalProps {
    userId: string;
    platform?: ExportPlatform;
    privacySetting: ExportPrivacySetting;
    onChangePrivacySetting: (privacySetting: ExportPrivacySetting) => void;
    selectedTokenId: string | null;
    onChangeSelectedTokenId: (tokenId: string | null) => void;
    onClickConfirm: () => Promise<void>;
    onClickCancel: () => void;
    aspectRatio?: '16:9' | '9:16';
    confirmButtonText?: string;
}

function ExportSettingsModal({
    userId,
    platform = ExportPlatform.YOUTUBE,
    privacySetting,
    onChangePrivacySetting,
    selectedTokenId,
    onChangeSelectedTokenId,
    onClickConfirm,
    onClickCancel,
    aspectRatio,
    confirmButtonText = "Export Video",
}: ExportSettingsModalProps) {
    const [channels, setChannels] = useState<SocialChannel[]>([]);
    const [isLoadingChannels, setIsLoadingChannels] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // ref를 활용해 의존성 제거 및 무한 루프 방지
    const onChangeSelectedTokenIdRef = useRef(onChangeSelectedTokenId);
    const selectedTokenIdRef = useRef(selectedTokenId);

    useEffect(() => {
        onChangeSelectedTokenIdRef.current = onChangeSelectedTokenId;
    }, [onChangeSelectedTokenId]);

    useEffect(() => {
        selectedTokenIdRef.current = selectedTokenId;
    }, [selectedTokenId]);

    // 연동 채널 정보 조회
    useEffect(() => {
        if (!userId) return;

        const fetchChannels = async () => {
            setIsLoadingChannels(true);
            try {
                const platformQuery = platform === ExportPlatform.YOUTUBE ? "youtube" : "tiktok";
                const response = await getFetch(`/api/user/${userId}/social-channels?platform=${platformQuery}`);
                const resData = await response.json();
                
                if (resData.success && resData.data?.channels) {
                    const fetchedChannels: SocialChannel[] = resData.data.channels;
                    setChannels(fetchedChannels);
                    
                    // 현재 선택된 토큰이 이미 채널 목록 내에 유효하게 존재하는지 체크
                    const currentSelected = selectedTokenIdRef.current;
                    const isValidSelection = fetchedChannels.some(c => c.id === currentSelected);

                    if (!isValidSelection) {
                        // 유효한 선택 값이 없을 때만 기본값(첫 번째 채널 또는 null) 설정
                        if (fetchedChannels.length > 0) {
                            onChangeSelectedTokenIdRef.current(fetchedChannels[0].id);
                        } else {
                            onChangeSelectedTokenIdRef.current(null);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to load social channels:", error);
            } finally {
                setIsLoadingChannels(false);
            }
        };

        fetchChannels();
    }, [userId, platform]);

    const filteredOptions = useMemo(() => {
        if (platform === ExportPlatform.TIKTOK) {
            return PRIVACY_OPTIONS.filter(opt => opt.value !== ExportPrivacySetting.UNLISTED);
        }
        return PRIVACY_OPTIONS;
    }, [platform]);

    const privacySettingDescription = useMemo(() => {
        switch (privacySetting) {
            case ExportPrivacySetting.PUBLIC:
                return "Anyone can watch your video.";
            case ExportPrivacySetting.UNLISTED:
                return "Only people with the link can watch your video.";
            case ExportPrivacySetting.PRIVATE:
                return "Only you can watch your video.";
        }
    }, [privacySetting]);

    const modalTitle = useMemo(() => {
        const isShorts = aspectRatio !== '16:9';
        const platformLabel = platform === ExportPlatform.YOUTUBE 
            ? (isShorts ? "YouTube Shorts" : "YouTube Video") 
            : "TikTok";
        return `${platformLabel} Settings`;
    }, [platform, aspectRatio]);

    // 현재 선택된 채널 객체 찾기
    const selectedChannel = useMemo(() => {
        return channels.find(c => c.id === selectedTokenId);
    }, [channels, selectedTokenId]);

    const handleSelectChannel = (tokenId: string | null) => {
        onChangeSelectedTokenId(tokenId);
        setIsDropdownOpen(false);
    };

    return (
        <div 
            onClick={onClickCancel}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div 
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                className="bg-zinc-950 border border-white/10 rounded-2xl p-6 w-full max-w-md mx-auto shadow-2xl shadow-black/80 flex flex-col relative"
            >
                <h2 className="text-xl font-bold text-white mb-1 tracking-tight">{modalTitle}</h2>
                <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                    Choose account and privacy settings before exporting.
                </p>

                {/* --- 1. 소셜 계정 선택 드롭다운 UI --- */}
                <div className="mb-6 relative">
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Upload Channel
                    </label>

                    {isLoadingChannels ? (
                        <div className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/5 bg-white/5 text-zinc-400">
                            <Loader2 size={16} className="animate-spin text-indigo-400" />
                            <span className="text-sm font-medium">Loading channels...</span>
                        </div>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-left transition-all focus:outline-none focus:border-white/30 group"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {selectedChannel ? (
                                        <>
                                            {selectedChannel.avatarUrl ? (
                                                <img
                                                    src={selectedChannel.avatarUrl}
                                                    alt={selectedChannel.displayName}
                                                    className="w-7 h-7 rounded-full object-cover border border-white/10 group-hover:border-white/20 transition-colors"
                                                />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                                    <User size={14} className="text-zinc-400" strokeWidth={1.5} />
                                                </div>
                                            )}
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-semibold text-zinc-100 truncate leading-snug">
                                                    {selectedChannel.displayName}
                                                </span>
                                                {selectedChannel.handleName && (
                                                    <span className="text-xs text-zinc-500 truncate leading-none mt-0.5">
                                                        {selectedChannel.handleName}
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                                                <User size={14} className="text-zinc-500" strokeWidth={1.5} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-indigo-400 leading-snug">
                                                    + New Account
                                                </span>
                                                <span className="text-xs text-zinc-500 leading-none mt-0.5">
                                                    Connect a new social account
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-200 group-hover:text-zinc-300 ${isDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {/* Dropdown Options */}
                            <AnimatePresence>
                                {isDropdownOpen && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden py-1 max-h-48 overflow-y-auto"
                                    >
                                        {channels.map((channel) => (
                                            <button
                                                key={channel.id}
                                                type="button"
                                                onClick={() => handleSelectChannel(channel.id)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 hover:text-white transition-all text-left group"
                                            >
                                                {channel.avatarUrl ? (
                                                    <img
                                                        src={channel.avatarUrl}
                                                        alt={channel.displayName}
                                                        className="w-7 h-7 rounded-full object-cover border border-transparent group-hover:border-white/10"
                                                    />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                                                        <User size={14} className="text-zinc-400" strokeWidth={1.5} />
                                                    </div>
                                                )}
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">
                                                        {channel.displayName}
                                                    </span>
                                                    {channel.handleName && (
                                                        <span className="text-xs text-zinc-500 group-hover:text-zinc-400 truncate">
                                                            {channel.handleName}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={() => handleSelectChannel(null)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 hover:text-white transition-all text-left border-t border-zinc-850 group"
                                        >
                                            <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-white/10">
                                                <User size={14} className="text-zinc-400 group-hover:text-indigo-400" strokeWidth={1.5} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-indigo-400 group-hover:text-indigo-300">
                                                    + Connect New Account
                                                </span>
                                            </div>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </div>

                {/* --- 2. 프라이버시 설정 선택 (유튜브 혹은 틱톡) --- */}
                <div className="mb-4">
                    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Privacy Level
                    </label>
                    <div className="space-y-2">
                        {filteredOptions.map((option) => {
                            const isSelected = privacySetting === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => onChangePrivacySetting(option.value)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left focus:outline-none ${
                                        isSelected
                                            ? "border-white/30 bg-white/5 text-white"
                                            : "border-white/5 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:bg-white/5"
                                    }`}
                                >
                                    <span className={isSelected ? "text-indigo-400" : "text-zinc-500"}>
                                        {option.icon}
                                    </span>
                                    <span className="text-sm font-semibold">{option.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <p className="text-xs text-zinc-500 mb-6 px-1 leading-relaxed">{privacySettingDescription}</p>

                {/* --- 3. 플랫폼별 업로드 안내문 렌더링 --- */}
                <div className="mb-6 p-4 rounded-xl border border-white/5 bg-white/[0.01] text-xs text-zinc-400 space-y-1.5 leading-relaxed">
                    <p className="font-semibold text-zinc-300">
                        {platform === ExportPlatform.YOUTUBE 
                            ? (aspectRatio !== '16:9' ? "YouTube Shorts Notice" : "YouTube Video Notice") 
                            : "TikTok Consent Notice"}
                    </p>
                    <p className="text-[11px] text-zinc-500 mb-1 leading-relaxed">
                        By continuing, you authorize ShortReal AI to upload this video to the selected account on your behalf.
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-zinc-500">
                        <li>Only this video will be uploaded — no other actions will be taken.</li>
                        {platform === ExportPlatform.YOUTUBE ? (
                            <li>This upload will be set to the privacy setting selected above.</li>
                        ) : (
                            <li>Processing may take a few minutes on TikTok after upload.</li>
                        )}
                        <li>You can revoke access at any time from your social account settings.</li>
                    </ul>
                </div>

                {/* --- Action Buttons --- */}
                <div className="flex gap-3 mt-auto">
                    <button
                        type="button"
                        onClick={onClickCancel}
                        className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-sm font-semibold hover:bg-white/10 hover:text-white transition-all active:scale-[0.98] focus:outline-none"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onClickConfirm}
                        className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-all active:scale-[0.98] focus:outline-none shadow-lg shadow-black/30"
                    >
                        {confirmButtonText}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default memo(ExportSettingsModal);