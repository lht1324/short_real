import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";

export async function POST(req: NextRequest) {
    try {
        const falApiKey = process.env.FAL_KEY;
        if (!falApiKey) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                message: "Server configuration error: FAL_KEY missing",
            });
        }

        const allModels = [];
        let hasMore = true;
        let cursor: string | null = null;

        // 1. fal.ai API에서 활성화된 비디오 모델 목록 페이지네이션으로 수집
        while (hasMore) {
            const url = new URL("https://api.fal.ai/v1/models");
            url.searchParams.append("category", "image-to-video");
            url.searchParams.append("status", "active");
            url.searchParams.append("expand", "openapi-3.0");
            if (cursor) {
                url.searchParams.append("cursor", cursor);
            }

            const res = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    Authorization: `Key ${falApiKey}`,
                },
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Fal API Error: ${res.status} ${text}`);
            }

            const data = await res.json();
            if (data.models && Array.isArray(data.models)) {
                allModels.push(...data.models);
            }
            
            hasMore = data.has_more === true;
            cursor = data.next_cursor;
        }

        const processedModels: AIModelData[] = [];

        // 2. 수집된 모델들의 OpenAPI 스키마를 파싱하여 전처리
        for (const model of allModels) {
            const openapi = model.openapi;
            let supportedDurations: number[] | undefined = undefined;

            if (openapi?.components?.schemas) {
                const schemas = openapi.components.schemas;
                // 'input'이라는 단어가 포함된 스키마 객체 찾기 (예: KlingVideoV3ProImageToVideoInput)
                const inputSchemaKey = Object.keys(schemas).find(key => key.toLowerCase().includes('input'));
                
                if (inputSchemaKey) {
                    const properties = schemas[inputSchemaKey].properties;
                    // duration 옵션에서 enum 값들을 추출하여 number 배열로 변환
                    if (properties?.duration?.enum) {
                        supportedDurations = properties.duration.enum.map((v: string | number) => Number(v));
                    }
                }
            }

            processedModels.push({
                endpoint_id: model.endpoint_id,
                provider: "fal-ai",
                display_name: model.metadata?.display_name || model.endpoint_id,
                description: model.metadata?.description || "",
                category: model.metadata?.category || "image-to-video",
                status: model.metadata?.status || "active",
                thumbnail_url: model.metadata?.thumbnail_url || "",
                model_url: model.metadata?.model_url || `https://fal.run/${model.endpoint_id}`,
                supported_durations: supportedDurations,
            });
        }

        if (processedModels.length === 0) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "No active models found to sync.",
            });
        }

        // 3. 정제된 데이터를 Supabase에 일괄 Upsert
        const supabase = createSupabaseServiceRoleClient();
        const { error } = await supabase
            .from("ai_models")
            .upsert(processedModels, { onConflict: "endpoint_id" });

        if (error) {
            console.error("Error upserting AI models:", error);
            return getNextBaseResponse({
                success: false,
                status: 500,
                message: "Failed to upsert AI models",
                error: error.message
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Successfully synchronized AI models",
            data: { count: processedModels.length }
        });

    } catch (error) {
        console.error("AI Model Sync Error:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            message: "Internal server error during sync",
            error: error instanceof Error ? error.message : "Internal server error during sync"
        });
    }
}
