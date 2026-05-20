import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import {AIModelData, PriceByResolution} from "@/lib/api/types/supabase/AIModelData";
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
    date?: string;
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
                    }).filter((model: RawFalAIModel) => {
                        if (!model.metadata?.date) return false;

                        const cutoffDateString = category === 'image-to-video'
                            ? '2025-05-01'
                            : '2024-10-01'
                        const cutoffDate = new Date(cutoffDateString);
                        const modelReleaseDate = new Date(model.metadata.date);

                        return modelReleaseDate.getTime() > cutoffDate.getTime()
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
        const prevAIModelEndpointIdSet = new Set(prevAIModelEndpointIdList);

        const newAIModelList = processedAIModelList.filter((newAIModel) => {
            return !prevAIModelEndpointIdSet.has(newAIModel.endpoint_id);
        });

        const processedAIModelEndpointIdSet = new Set(processedAIModelList.map(aiModel => aiModel.endpoint_id));

        const endpointIdListToDelete = prevAIModelEndpointIdList.filter((endpointId) => {
            return !processedAIModelEndpointIdSet.has(endpointId);
        });

        const newAIModelMetadataList: {
            endpointId: string;
            displayName: string;
            description: string;
            matchedSchemaName: string;
            inputDataList: {
                name: string;
                type: string;
                description: string;
            }[];
            pricingText: string;
        }[] = [];

        // 2. 각 모델 페이지의 HTML을 가져와 필요한 텍스트만 추출 및 OpenAPI 매칭
        for (const aiModel of newAIModelList) {
            const url = `https://fal.ai/models/${aiModel.endpoint_id}`;

            let matchedSchemaName: string = '';
            const inputDataList: {
                name: string;
                type: string;
                description: string;
            }[] = [];

            try {
                const res = await fetch(url);

                if (res.ok) {
                    const htmlText = await res.text();
                    const { inputLabelList, pricingText } = extractFalAIModelMetadataFromHtmlText(htmlText);

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
                                matchedSchemaName = schemaName;
                                const props = schemaObj.properties || {};
                                
                                inputLabelList.forEach((originalLabel, index) => {
                                    const cleaned = cleanedLabels[index];
                                    const propDef = props[cleaned] as OpenAPIProperty | undefined;
                                    
                                    if (propDef) {
                                        const description = propDef.description || propDef.title || "";
                                        const type = propDef.type || (propDef.anyOf ? "anyOf" : "unknown");

                                        inputDataList.push({
                                            name: originalLabel,
                                            type: type,
                                            description: description.replace(/\n/g, ' '),
                                        });
                                    }
                                });
                                break; // 매칭되는 스키마 하나를 찾으면 종료
                            }
                        }
                    }

                    newAIModelMetadataList.push({
                        endpointId: aiModel.endpoint_id as string,
                        displayName: aiModel.display_name as string,
                        description: aiModel.description as string,
                        matchedSchemaName: matchedSchemaName,
                        inputDataList: schemaMatched ? inputDataList : [],
                        pricingText: pricingText,
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

        const finalInferredDataList: {
            endpointId: string;
            priceByResolutionList: PriceByResolution[];
            isValuable: boolean;
            supportedDurationRange: number[];
        }[] = [];
        const chunkSize = 5;

        const filteredAIModelMetadataList = newAIModelMetadataList.filter((metadata) => {
            return metadata.matchedSchemaName !== '';
        });

        // 3. 5개씩 끊어서 LLM에 요청
        for (let i = 0; i < filteredAIModelMetadataList.length; i += chunkSize) {
            const chunk = filteredAIModelMetadataList.slice(i, i + chunkSize);
            console.log(`[Processing LLM Chunk] ${Math.floor(i / chunkSize) + 1} / ${Math.ceil(filteredAIModelMetadataList.length / chunkSize)}`);

            const llmRes = await llmServerAPI.postPricePerSecScrapping(chunk);
            if (llmRes.success && llmRes.data) {
                finalInferredDataList.push(...llmRes.data.modelPricePerSecondList);
            } else {
                console.error(`[LLM Error] Failed to process chunk ${Math.floor(i / chunkSize) + 1}:`, llmRes.error);
            }
        }

        // DB 업로드 할 배열 만들 때 사용 (find)
        const invalidAIModelEndpointIdList = newAIModelMetadataList.filter((metadata) => {
            return metadata.matchedSchemaName === '';
        }).map((metadata) => {
            return metadata.endpointId;
        });

        const finalAIModelDataListToUpsert: AIModelData[] = newAIModelList.map((aiModel) => {
            const provider = (aiModel.provider as string) || "fal.ai";
            const basicAIModelData = {
                endpoint_id: aiModel.endpoint_id,
                provider: provider,
                display_name: aiModel.display_name || aiModel.endpoint_id,
                description: aiModel.description || "",
                category: aiModel.category || "",
                status: aiModel.status || "active",
                thumbnail_url: aiModel.thumbnail_url || "",
                model_url: aiModel.model_url || "",
            };

            const priceData = finalInferredDataList.find((data) => {
                return data.endpointId === aiModel.endpoint_id;
            });

            if (!priceData) {
                return {
                    ...basicAIModelData,
                    price_per_sec: [],
                    is_valuable: false,
                    supported_durations: [],
                };
            }

            const {
                supportedDurationRange,
                priceByResolutionList,
                isValuable,
            } = priceData;

            return {
                ...basicAIModelData,
                price_per_sec: priceByResolutionList,
                is_valuable: isValuable,
                supported_durations: supportedDurationRange,
            };
        });

        // 테스트, 끝나면 제거.
        const debugOutputPath = path.join(process.cwd(), 'entire_model_data.json');
        fs.writeFileSync(debugOutputPath, JSON.stringify(finalAIModelDataListToUpsert, null, 2), { encoding: 'utf-8', mode: 0o666 });
        console.log(`✅ Saved extracted data to ${debugOutputPath}`);

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Test finished.",
            data: {
                insertedCount: finalAIModelDataListToUpsert.length,
                extractedData: finalInferredDataList
            }
        });

        // 4. DB 삭제 (fal.ai에서 사라졌거나 OpenAPI 매칭에 실패한 모델 일괄 제거)
        const allEndpointIdsToDelete = [
            ...endpointIdListToDelete,
            ...invalidAIModelEndpointIdList
        ];

        if (allEndpointIdsToDelete.length > 0) {
            const { error: deleteError } = await supabase
                .from("ai_model_data")
                .delete()
                .in("endpoint_id", allEndpointIdsToDelete);

            if (deleteError) {
                console.error("Error deleting old/invalid models from DB:", deleteError);
                throw new Error(`Failed to delete old/invalid models from DB: ${deleteError.message}`);
            }
            console.log(`🗑️ Successfully deleted ${allEndpointIdsToDelete.length} obsolete/invalid models from DB.`);
        }

        if (finalAIModelDataListToUpsert.length > 0) {
            const { error: upsertError } = await supabase
                .from("ai_model_data")
                .upsert(finalAIModelDataListToUpsert, { onConflict: "endpoint_id" });

            if (upsertError) {
                console.error("Error upserting new models into DB:", upsertError);
                throw new Error(`Failed to upsert new models into DB: ${upsertError.message}`);
            }
            console.log(`✅ Successfully synced (upserted) ${finalAIModelDataListToUpsert.length} models to DB.`);
        }

        console.log("✅ Extracted Final Price List count:", finalInferredDataList.length);

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Extraction and DB sync finished successfully.",
            data: {
                insertedCount: finalAIModelDataListToUpsert.length,
                extractedData: finalInferredDataList
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