import WorkplaceCreatePageClient from "@/components/page/workspace/create/WorkspaceCreatePageClient";
import {Suspense} from "react";

export default async function WorkspaceCreatePageServer() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div>Loading...</div>
            </div>
        }>
            <WorkplaceCreatePageClient/>
        </Suspense>
    )
}