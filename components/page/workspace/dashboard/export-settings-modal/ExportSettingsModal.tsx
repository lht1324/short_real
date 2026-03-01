import { memo, useMemo, ReactNode } from "react";
import { ExportPrivacySetting } from "@/components/page/workspace/dashboard/export-settings-modal/ExportPrivacySetting";
import { Globe, Lock, Link } from "lucide-react";

const PRIVACY_OPTIONS: {
    value: ExportPrivacySetting;
    label: string;
    icon: ReactNode;
    description: string;
}[] = [
    {
        value: ExportPrivacySetting.PUBLIC,
        label: "Public",
        icon: <Globe size={16} />,
        description: "Anyone can watch your video.",
    },
    {
        value: ExportPrivacySetting.UNLISTED,
        label: "Unlisted",
        icon: <Link size={16} />,
        description: "Only people with the link can watch your video.",
    },
    {
        value: ExportPrivacySetting.PRIVATE,
        label: "Private",
        icon: <Lock size={16} />,
        description: "Only you can watch your video.",
    },
];

interface ExportSettingsModalProps {
    privacySetting: ExportPrivacySetting;
    onChangePrivacySetting: (privacySetting: ExportPrivacySetting) => void;
    onClickConfirm: () => Promise<void>;
    onClickCancel: () => void;
}

function ExportSettingsModal({
    privacySetting,
    onChangePrivacySetting,
    onClickConfirm,
    onClickCancel,
}: ExportSettingsModalProps) {
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

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-gray-900 border border-purple-500/30 rounded-2xl p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-bold text-white mb-1">Export to YouTube Shorts</h2>
                <p className="text-gray-400 text-xl mb-6">
                    Choose who can see your video after upload.
                </p>

                <div className="space-y-2 mb-2">
                    {PRIVACY_OPTIONS.map((option) => {
                        const isSelected = privacySetting === option.value;
                        return (
                            <button
                                key={option.value}
                                onClick={() => onChangePrivacySetting(option.value)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                                    isSelected
                                        ? "border-purple-500 bg-purple-500/10 text-white"
                                        : "border-white/10 bg-gray-800/50 text-gray-300 hover:border-purple-500/50 hover:bg-gray-800"
                                }`}
                            >
                                <span className={isSelected ? "text-purple-400" : "text-gray-500"}>
                                    {option.icon}
                                </span>
                                <span className="text-base font-medium">{option.label}</span>
                            </button>
                        );
                    })}
                </div>

                <p className="text-sm text-gray-500 mb-6 px-1">{privacySettingDescription}</p>

                <div className="flex gap-3">
                    <button
                        onClick={onClickCancel}
                        className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 text-base font-semibold hover:bg-gray-800 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onClickConfirm}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-base font-semibold hover:from-pink-600 hover:to-purple-700 transition-all"
                    >
                        Authorize & Continue
                    </button>
                </div>
            </div>
        </div>
    );
}

export default memo(ExportSettingsModal);