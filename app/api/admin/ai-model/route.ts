import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import {AIModelData, PriceByResolution} from "@/lib/api/types/supabase/AIModelData";
import {getIsValidRequestS2S} from "@/lib/utils/getIsValidRequest";
import {llmServerAPI} from "@/lib/api/server/llmServerAPI";

interface RawFalAIModel {
    endpoint_id: string;
    metadata?: FalAIMetadata;
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

        const processedAIModelList: Omit<AIModelData, 'price_per_sec'| 'is_valuable'>[] = [];
        const targetCategories = ["image-to-video", "image-to-image"];

        // 1. fal.ai API에서 활성화된 모델 목록 카테고리별/페이지네이션으로 수집
        for (const category of targetCategories) {
            let hasMore = true;
            let cursor: string | null = null;

            while (hasMore) {
                const url = new URL("https://api.fal.ai/v1/models");
                url.searchParams.append("category", category);
                url.searchParams.append("status", "active");
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
        const { data: existingAIModelList, error: fetchError } = await supabase
            .from("ai_model_data")
            .select("endpoint_id");

        if (fetchError) {
            throw new Error(`Failed to fetch existing models: ${fetchError.message}`);
        }

        const existingEndpointIds = new Set(existingAIModelList?.map(m => m.endpoint_id) || []);
        const processedEndpointIds = new Set(processedAIModelList.map(m => m.endpoint_id));

        // 2. Deprecated 모델 DB에서 완전히 삭제 (Hard Delete)
        // (fal.ai에서 더 이상 내려주지 않거나 상업용 라이선스가 풀린 모델 등)
        const modelsToDelete = [...existingEndpointIds].filter(id => !processedEndpointIds.has(id));
        
        if (modelsToDelete.length > 0) {
            const { error: deleteError } = await supabase
                .from("ai_model_data")
                .delete()
                .in("endpoint_id", modelsToDelete);

            if (deleteError) {
                console.error("Error deleting deprecated models:", deleteError);
            }
        }

        // 여기부터 extraction 참고해 html 긁어 와서 추출한 뒤 LLM에 넣어줄 데이터 만드는 작업으로 수정하기

        // 3. 신규 추가된 모델의 endpoint_id 추출
        const newAIModelToFetchList = processedAIModelList.filter(m => !existingEndpointIds.has(m.endpoint_id));

        // 4. 신규 모델들의 웹 페이지 HTML fetch 및 순수 텍스트(Pure Text) 추출
        const newAIModelTextDataList: { endpoint_id: string; pure_text: string }[] = [];

        // HTML 태그 전부 제거하고 순수 텍스트만 남기는 함수 (토큰 최적화)
        const extractPureText = (html: string) => {
            const cleaned = html
                .replace(/<head\b[^>]*>([\s\S]*?)<\/head>/gi, '')
                .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, '')
                .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, '')
                .replace(/<svg\b[^>]*>([\s\S]*?)<\/svg>/gi, '')
                .replace(/<!--([\s\S]*?)-->/g, ''); // 주석 제거
                
            // 남은 모든 HTML 태그 껍데기 제거 후 다중 공백 압축
            return cleaned.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        };

        let count = 0;
        for (const model of newAIModelToFetchList) {
            try {
                if (count === 5) break;

                const res = await fetch(`https://fal.ai/models/${model.endpoint_id}`);
                if (!res.ok) {
                    console.warn(`Failed to fetch HTML for ${model.endpoint_id}: ${res.status}`);
                    continue;
                }
                const htmlText = await res.text();
                const pureText = extractPureText(htmlText);
                
                newAIModelTextDataList.push({
                    endpoint_id: model.endpoint_id,
                    pure_text: pureText,
                });

                count++;
            } catch (err) {
                console.error(`Error fetching HTML for ${model.endpoint_id}:`, err);
            }
        }

        // 5. LLM을 호출하여 가격 정보 추출 (5개씩 청크 단위로 병렬 처리)
        // 주의: Rate Limit 및 Vercel Timeout 방어를 위해 청크 단위로는 순차적(Sequential)으로 실행
        const chunkSize = 5;
        const scrappedPriceDataList: { endpointId: string; priceByResolutionList: PriceByResolution[] }[] = [];

        // for (let i = 0; i < newAIModelTextDataList.length; i += chunkSize) {
        //     const chunk = newAIModelTextDataList.slice(i, i + chunkSize);
        //
        //     // llmServerAPI 파라미터 규격에 맞게 변환
        //     const payload = chunk.map(data => ({
        //         endpointId: data.endpoint_id,
        //         pricePureText: data.pure_text
        //     }));
        //
        //     try {
        //         const chunkResult = await llmServerAPI.postPricePerSecScrapping(payload);
        //         if (chunkResult.success && chunkResult.data?.modelPricePerSecondList) {
        //             scrappedPriceDataList.push(...chunkResult.data.modelPricePerSecondList);
        //         }
        //     } catch (err) {
        //         console.error(`Error during LLM scrapping for chunk ${i / chunkSize}:`, err);
        //         // 하나의 청크가 실패하더라도 나머지는 계속 진행하도록 처리
        //     }
        // }


        const chunk = newAIModelTextDataList.slice(0, chunkSize);

        // llmServerAPI 파라미터 규격에 맞게 변환
        const payload = chunk.map(data => ({
            endpointId: data.endpoint_id,
            pricePureText: data.pure_text
        }));

        try {
            const chunkResult = await llmServerAPI.postPricePerSecScrapping(payload);
            if (chunkResult.success && chunkResult.data?.modelPricePerSecondList) {
                scrappedPriceDataList.push(...chunkResult.data.modelPricePerSecondList);

                newAIModelToFetchList.forEach((aiModel) => {
                    const analysisResult = chunkResult.data?.modelPricePerSecondList.find((result) => {
                        return result.endpointId === aiModel.endpoint_id;
                    });

                    if (analysisResult) {
                        console.log(`[${aiModel.display_name}]: `, JSON.stringify(analysisResult.priceByResolutionList));
                    }
                })
            }
        } catch (err) {
            console.error(`Error during LLM scrapping for chunk:`, err);
            // 하나의 청크가 실패하더라도 나머지는 계속 진행하도록 처리
        }

        console.log("processedModelList: ", processedAIModelList.map(model => model.display_name));

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Test finished.",
            data: {
                deletedCount: modelsToDelete.length,
                newModelsCount: newAIModelTextDataList.length,
                scrappedDataCount: scrappedPriceDataList.length
            }
        });

        // 6. scrappedPriceDataList와 processedAIModelList를 병합하여 DB에 insert (신규 모델만)
        const finalModelDataToInsert: AIModelData[] = [];

        for (const model of processedAIModelList) {
            // 새로 추가되는 모델인 경우에만 insert 대상으로 선정
            if (newAIModelToFetchList.some(m => m.endpoint_id === model.endpoint_id)) {
                const scrappedData = scrappedPriceDataList.find(s => s.endpointId === model.endpoint_id);
                
                finalModelDataToInsert.push({
                    ...model,
                    price_per_sec: scrappedData ? scrappedData.priceByResolutionList : [],
                    is_valuable: !!scrappedData && scrappedData.priceByResolutionList.length == 2 // 가격 정보가 추출되었으면 true, 계산 불가 등으로 누락되었으면 false
                });
            }
        }

        if (finalModelDataToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from("ai_model_data")
                .insert(finalModelDataToInsert);

            if (insertError) {
                console.error("Error inserting new models:", insertError);
            }
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Successfully parsed new models html and scrapped price data",
            data: { 
                deletedCount: modelsToDelete.length,
                newModelsCount: newAIModelTextDataList.length,
                scrappedDataCount: scrappedPriceDataList.length
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
