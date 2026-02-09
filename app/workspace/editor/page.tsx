import WorkspaceEditorPageServer from "@/components/page/workspace/editor/WorkspaceEditorPageServer";
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Video Editor', // "Video Editor | ShortReal AI"
    description: 'Fine-tune your AI-generated video. Customize captions, music, and volume.',
    robots: {
        index: false,
        follow: false,
        googleBot: {
            index: false,
            follow: false,
        },
    },
};

export default async function WorkplaceEditorPage() {
    return (<WorkspaceEditorPageServer/>)
}