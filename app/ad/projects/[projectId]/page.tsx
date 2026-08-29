import { Metadata } from "next";
import ProjectDetailClient from "@/components/page/ad/projects/[projectId]/ProjectDetailClient";

export const metadata: Metadata = {
    title: "Project — ShortReal Ad",
    description: "Live progress and results for your ad generation project.",
};

export default async function AdProjectDetailPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const { projectId } = await params;
    return <ProjectDetailClient projectId={projectId} />;
}
