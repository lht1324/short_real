import WorkspaceDashboardPageServer from "@/components/page/workspace/dashboard/WorkspaceDashboardPageServer";
import { Metadata } from 'next';

// [중요] 대시보드는 검색 엔진 수집 차단
export const metadata: Metadata = {
    title: 'Dashboard', // "ShortReal AI | Dashboard"가 됩니다.
    description: 'Track your video generation tasks, and export or download completed viral videos.',
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
};

export default async function WorkspaceDashboardPage() {
    // 리스트로 진행 중인 작업 단계, 상태 저장
    return (<WorkspaceDashboardPageServer/>)
}