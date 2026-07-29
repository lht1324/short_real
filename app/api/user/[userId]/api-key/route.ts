import { NextRequest } from "next/server";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { User } from "@/lib/api/types/supabase/Users";
import { cryptoUtils } from "@/lib/utils/cryptoUtils";

async function validateFalKey(apiKey: string): Promise<boolean> {
    try {
        const response = await fetch("https://api.fal.ai/v1/models?limit=1", {
            method: "GET",
            headers: {
                "Authorization": `Key ${apiKey}`
            }
        });
        return response.status === 200;
    } catch (error) {
        console.error("Fal API Key validation error:", error);
        return false;
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;

        // Request body 파싱
        const {
            fal_ai_api_key: falAiApiKey,
        }: Partial<User> = await request.json();

        if (!userId || !falAiApiKey) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Missing valid input data."
            });
        }

        // Validate API Key using fal.ai API
        const isValid = await validateFalKey(falAiApiKey);
        if (!isValid) {
            return getNextBaseResponse({
                success: false,
                status: 401,
                error: "Invalid fal.ai API key. Please check your key and try again."
            });
        }

        const encryptedFalAiApiKey = cryptoUtils.encrypt(falAiApiKey, userId);

        // 사용자 업데이트
        const updatedUser = await usersServerAPI.patchUserByUserId(userId, {
            fal_ai_api_key: encryptedFalAiApiKey,
        });

        if (!updatedUser) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "User not found or update failed"
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "API Key updated successfully."
        });
    } catch (error) {
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to update API key."
        });
    }
}