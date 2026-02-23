import {Suspense} from "react";
import WorkplaceDashboardPageClient from "@/components/page/workspace/dashboard/WorkspaceDashboardPageClient";

export default async function WorkspaceDashboardPageServer() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div>Loading...</div>
            </div>
        }>
            <WorkplaceDashboardPageClient/>
        </Suspense>
    )
}