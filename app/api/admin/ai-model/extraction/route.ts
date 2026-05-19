import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { PriceByResolution } from "@/lib/api/types/supabase/AIModelData";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { llmServerAPI } from "@/lib/api/server/llmServerAPI";
import { extractFalAIModelMetadataFromHtmlText } from "@/lib/utils/htmlUtils";
import { PostgrestError } from "@supabase/supabase-js";

interface OpenAPIObject {
    components?: {
        schemas?: Record<string, OpenAPISchema>;
    }
}

interface RawFalAIModel {
    endpoint_id: string;
    metadata?: FalAIMetadata;
    openapi?: OpenAPIObject;
}

interface FalAIMetadata {
    display_name?: string;
    description?: string;
    category?: string;
    status?: string;
    thumbnail_url?: string;
    model_url?: string;
    license_type?: string;
    [key: string]: unknown; // 추가적인 메타데이터 허용
}

interface FlattenedFalAIModel extends FalAIMetadata {
    endpoint_id: string;
    openapi?: OpenAPIObject;
}

interface OpenAPISchema {
    properties?: Record<string, OpenAPIProperty | unknown>;
    'x-fal-order-properties'?: string[];
    [key: string]: unknown;
}

interface OpenAPIProperty {
    enum?: string[];
    description?: string;
    title?: string;
    type?: string;
    anyOf?: unknown[];
    [key: string]: unknown;
}

export async function POST(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const supabase = createSupabaseServiceRoleClient();

    try {
        const falApiKey = process.env.FAL_AI_API_KEY;
        if (!falApiKey) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                message: "Server configuration error: FAL_KEY missing",
            });
        }

        const processedAIModelList: FlattenedFalAIModel[] = [];
        const targetCategories = ["image-to-video", "image-to-image"];

        // 1. fal.ai API에서 활성화된 모델 목록 카테고리별/페이지네이션으로 수집
        for (const category of targetCategories) {
            let hasMore = true;
            let cursor: string | null = null;

            while (hasMore) {
                const url = new URL("https://api.fal.ai/v1/models");
                url.searchParams.append("category", category);
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
                    throw new Error(`Fal API Error: ${res.status} ${text} (Category: ${category})`);
                }
                const data = await res.json();
                if (data.models && Array.isArray(data.models)) {
                    processedAIModelList.push(...data.models.filter((model: RawFalAIModel) => {
                        return model.metadata?.license_type === 'commercial';
                    }).map((model: RawFalAIModel) => {
                        return {
                            endpoint_id: model.endpoint_id,
                            openapi: model.openapi,
                            ...model.metadata,
                        }
                    }));
                }

                hasMore = data.has_more === true;
                cursor = data.next_cursor;
            }

            console.log(`[${category}] processedAIModelList.length === ${processedAIModelList.length}`);
        }

        if (processedAIModelList.length === 0) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "No active models found to sync.",
            });
        }

        // 1. 기존 DB 모델 목록 조회 (비교용)
        const { data: existingAIModelEndpointIdList, error: fetchError }: {
            data: { endpoint_id: string }[] | null,
            error: PostgrestError | null;
        } = await supabase
            .from("ai_model_data")
            .select("endpoint_id");

        if (!existingAIModelEndpointIdList && fetchError) {
            throw new Error(`Failed to fetch existing models: ${fetchError.message}`);
        }

        const prevAIModelEndpointIdList = (existingAIModelEndpointIdList as { endpoint_id: string }[]).map((partialAIModel: { endpoint_id: string }) => {
            return partialAIModel.endpoint_id as string;
        });

        const newAIModelList = processedAIModelList.filter((newAIModel) => {
            return prevAIModelEndpointIdList.find(prevEndpointId => prevEndpointId === newAIModel.endpoint_id) === undefined;
        });

        const aiModelPricePureTextList: { endpointId: string; pricePureText: string }[] = [];

        // 2. 각 모델 페이지의 HTML을 가져와 필요한 텍스트만 추출 및 OpenAPI 매칭
        for (const aiModel of newAIModelList) {
            const url = `https://fal.ai/models/${aiModel.endpoint_id}`;

            try {
                const res = await fetch(url);

                if (res.ok) {
                    const htmlText = await res.text();
                    const { inputLabelList, pricingText } = extractFalAIModelMetadataFromHtmlText(htmlText);
                    
                    let combinedText = "[ INPUTS ]\n";
                    let schemaMatched = false;

                    // 라벨 정규화
                    const cleanedLabels = inputLabelList.map(l => l.replace(/\*/g, '').trim().replace(/ /g, '_').toLowerCase());

                    // OpenAPI 스키마 매칭
                    if (aiModel.openapi?.components?.schemas) {
                        for (const [schemaName, rawSchemaObj] of Object.entries(aiModel.openapi.components.schemas)) {
                            const schemaObj = rawSchemaObj as OpenAPISchema;
                            if (!schemaName.endsWith("Input")) continue;

                            const orderProps = schemaObj['x-fal-order-properties'];
                            if (!orderProps || !Array.isArray(orderProps)) continue;

                            const isMatch = cleanedLabels.every(label => orderProps.includes(label));

                            if (isMatch) {
                                schemaMatched = true;
                                const props = schemaObj.properties || {};
                                
                                inputLabelList.forEach((originalLabel, index) => {
                                    const cleaned = cleanedLabels[index];
                                    const propDef = props[cleaned] as OpenAPIProperty | undefined;
                                    
                                    if (propDef) {
                                        const desc = propDef.description || propDef.title || "";
                                        const type = propDef.type || (propDef.anyOf ? "anyOf" : "unknown");
                                        combinedText += `- ${originalLabel} [${type}]: ${desc.replace(/\n/g, ' ')}\n`;
                                    } else {
                                        combinedText += `- ${originalLabel}\n`;
                                    }
                                });
                                break; // 매칭되는 스키마 하나를 찾으면 종료
                            }
                        }
                    }

                    if (!schemaMatched) {
                        // 스키마 매칭 실패 시 기본 텍스트 추가
                        inputLabelList.forEach(label => {
                            combinedText += `- ${label}\n`;
                        });
                    }

                    combinedText += "\n[ RESULT & PRICING ]\n" + pricingText;

                    aiModelPricePureTextList.push({
                        endpointId: aiModel.endpoint_id as string,
                        pricePureText: combinedText.trim(),
                    });
                } else {
                    console.warn(`[Warn] Failed to fetch ${url} - Status: ${res.status}`);
                }
            } catch (e) {
                console.error(`[Error] Failed to fetch or parse ${url}:`, e);
            }

            // 429 Too Many Requests 방지를 위한 500ms 딜레이
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const debugOutputPath = path.join(process.cwd(), 'entire_model_data.json');
        fs.writeFileSync(debugOutputPath, JSON.stringify(aiModelPricePureTextList, null, 2), { encoding: 'utf-8', mode: 0o666 });
        console.log(`✅ Saved extracted data to ${debugOutputPath}`);

        const finalPriceList: { endpointId: string; priceByResolutionList: PriceByResolution[] }[] = [];
        const chunkSize = 5;

        // 3. 5개씩 끊어서 LLM에 요청
        for (let i = 0; i < aiModelPricePureTextList.length; i += chunkSize) {
            const chunk = aiModelPricePureTextList.slice(i, i + chunkSize);
            console.log(`[Processing LLM Chunk] ${Math.floor(i / chunkSize) + 1} / ${Math.ceil(aiModelPricePureTextList.length / chunkSize)}`);
            
            const llmRes = await llmServerAPI.postPricePerSecScrapping(chunk);
            if (llmRes.success && llmRes.data) {
                finalPriceList.push(...llmRes.data.modelPricePerSecondList);
            } else {
                console.error(`[LLM Error] Failed to process chunk ${Math.floor(i / chunkSize) + 1}:`, llmRes.error);
            }
        }

        console.log("✅ Extracted Final Price List count:", finalPriceList.length);

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Extraction finished.",
            data: {
                extractedData: finalPriceList
            }
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