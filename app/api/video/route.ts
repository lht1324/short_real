import { NextRequest, NextResponse } from "next/server";
import { PostVideoRequest } from "@/api/types/api/video/PostVideoRequest";

export async function POST(request: NextRequest) {
    try {
        const processRequest: PostVideoRequest = await request.json();

        // fire and forget
        fetch(`${process.env.BASE_URL}/api/video/process`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(processRequest),
        }).catch((error) => {
            console.error("Failed to trigger video process:", error);
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Error in POST /api/video:", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}