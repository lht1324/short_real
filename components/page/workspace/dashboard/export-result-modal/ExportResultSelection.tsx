import Image from "next/image";
import {memo} from "react";
import {ExportResult} from "@/components/page/workspace/dashboard/export-result-modal/ExportResult";
import {ExportPlatform} from "@/lib/api/types/supabase/VideoGenerationTasks";

const PLATFORM_META: Record<ExportPlatform, { label: string; src: string; width: number; height: number }> = {
    [ExportPlatform.YOUTUBE]:   { label: 'YouTube Shorts', src: '/icons/youtube-logo.png',   width: 36, height: 32 },
    [ExportPlatform.TIKTOK]:    { label: 'TikTok',         src: '/icons/tiktok-logo.svg',    width: 32, height: 32 },
    [ExportPlatform.INSTAGRAM]: { label: 'Instagram Reels',src: '/icons/instagram-logo.png', width: 28, height: 28 },
};

interface ExportResultSectionProps {
    platform: ExportPlatform;
    results: ExportResult[];
}

function ExportResultSection({ platform, results }: ExportResultSectionProps) {
    const { label, src, width, height } = PLATFORM_META[platform];

    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <Image
                    src={src}
                    alt={label}
                    width={width}
                    height={height}
                    className="object-contain"
                />
                <span className="text-purple-300 text-sm font-medium">{label}</span>
            </div>
            <div className="space-y-2">
                {results.map((result) => (
                    <div
                        key={result.taskId}
                        className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3"
                    >
                        <span className="text-white text-sm truncate mr-3">
                            {result.title ?? 'Untitled'}
                        </span>
                        <span>{result.status === 'SUCCESS' ? '✅' : '❌'}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default memo(ExportResultSection);