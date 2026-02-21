'use client'

import { memo, useMemo } from "react";
import { ExportPlatform, ExportResult } from "@/components/page/workspace/dashboard/WorkspaceDashboardPageClient";
import ExportResultSection from "@/components/page/workspace/dashboard/export-result-modal/ExportResultSelection";

interface ExportResultModalProps {
    exportResultList: ExportResult[];
    onClose: () => void;
}

function ExportResultModal({ exportResultList, onClose }: ExportResultModalProps) {
    const exportResultYoutubeList = useMemo(() => {
        return exportResultList.filter((r) => r.platform === ExportPlatform.YOUTUBE);
    }, [exportResultList]);

    const exportResultTikTokList = useMemo(() => {
        return exportResultList.filter((r) => r.platform === ExportPlatform.TIKTOK);
    }, [exportResultList]);

    const exportResultInstagramList = useMemo(() => {
        return exportResultList.filter((r) => r.platform === ExportPlatform.INSTAGRAM);
    }, [exportResultList]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-gray-900 border border-purple-500/30 rounded-2xl p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-bold text-white mb-4">Export Results</h2>

                <div className="space-y-4">
                    {exportResultYoutubeList.length > 0 && (
                        <ExportResultSection
                            platform={ExportPlatform.YOUTUBE}
                            results={exportResultYoutubeList}
                        />
                    )}
                    {exportResultTikTokList.length > 0 && (
                        <ExportResultSection
                            platform={ExportPlatform.TIKTOK}
                            results={exportResultTikTokList}
                        />
                    )}
                    {exportResultInstagramList.length > 0 && (
                        <ExportResultSection
                            platform={ExportPlatform.INSTAGRAM}
                            results={exportResultInstagramList}
                        />
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="mt-6 w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all"
                >
                    OK
                </button>
            </div>
        </div>
    );
}

export default memo(ExportResultModal);