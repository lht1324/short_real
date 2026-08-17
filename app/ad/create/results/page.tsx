import { Metadata } from "next";
import ResultsPageClient from "@/components/page/ad/results/ResultsPageClient";

export const metadata: Metadata = {
    title: "Results — ShortReal Ad",
    description: "Review your scored ad candidates and export them in every size.",
};

export default async function AdCreateResultsPage({
    searchParams,
}: {
    searchParams: Promise<{ taskId?: string }>;
}) {
    const { taskId } = await searchParams;
    return <ResultsPageClient taskId={taskId ?? null} />;
}
