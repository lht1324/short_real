import WorkplaceEditorPageClient from "@/components/page/workspace/editor/WorkspaceEditorPageClient";
import {Suspense} from "react";

export default async function WorkspaceEditorPageServer() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div>Loading...</div>
            </div>
        }>
            <WorkplaceEditorPageClient/>
        </Suspense>
    )
}