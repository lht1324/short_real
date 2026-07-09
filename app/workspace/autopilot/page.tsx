import { Metadata } from 'next';
import WorkspaceAutopilotSettingPageClient from "@/components/page/workspace/autopilot/WorkspaceAutopilotPageClient";

// [중요] 도구 페이지는 검색 엔진 수집 차단
export const metadata: Metadata = {
    title: 'Autopilot Setting', // "ShortReal AI | Autopilot Setting"가 됩니다.
    description: 'Configure your autopilot schedule to automatically generate and publish AI videos to YouTube, TikTok or Instagram.',
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
};

export default async function WorkspaceAutopilotSettingPage() {
    return (
        <WorkspaceAutopilotSettingPageClient/>
    )
}