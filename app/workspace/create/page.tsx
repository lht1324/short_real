import WorkspaceCreatePageServer from "@/components/page/workspace/create/WorkspaceCreatePageServer";
import { Metadata } from 'next';

// [중요] 도구 페이지는 검색 엔진 수집 차단
export const metadata: Metadata = {
    title: 'Create Video', // "Create New Video | ShortReal AI"
    description: 'AI Video Creation Studio. Write script, select voice, and generate viral shortforms instantly.',
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
};

export default async function WorkspaceCreatePage() {
    return (
        <WorkspaceCreatePageServer/>
    )
}