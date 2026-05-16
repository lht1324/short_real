import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import {AIModelData, PriceByResolution} from "@/lib/api/types/supabase/AIModelData";
import {getIsValidRequestS2S} from "@/lib/utils/getIsValidRequest";
import {llmServerAPI} from "@/lib/api/server/llmServerAPI";

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
            const allModelList = [];
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
                    allModelList.push(...data.models);
                }
                
                hasMore = data.has_more === true;
                cursor = data.next_cursor;
            }

            // 2. 수집된 모델들의 OpenAPI 스키마를 파싱하여 전처리
            processedAIModelList.push(
                ...allModelList.reduce((acc: Omit<AIModelData, 'price_per_sec' | 'is_valuable'>[], modelData) => {
                    const openapi = modelData.openapi;

                    // 1) 스키마가 없으면 건너뜀 (filter 역할)
                    if (!openapi?.components?.schemas) {
                        return acc;
                    }

                    const schemas = openapi.components.schemas;

                    // 2) 우리 워크플로우에 맞는 타겟 스키마 키워드 (소문자로 작성)

                    const inputSchemaKey = Object.keys(schemas).find(key => {
                        return key.toLowerCase().includes(`${category.replaceAll('-', '')}input`);
                    });

                    // 3) 맞는 메인 스키마가 없으면 건너뜀
                    if (!inputSchemaKey) {
                        return acc;
                    }

                    if (modelData.license_type !== 'commercial') {
                        return acc;
                    }

                    // 4) 동적 프로퍼티 분석 (Shape-based Parsing)
                    let supportedDurations: number[] | undefined = undefined;
                    let hasRequiredResolution = false;
                    let hasRequiredAspectRatio = false;
                    
                    const properties = schemas[inputSchemaKey].properties;

                    if (properties && typeof properties === 'object') {
                        // eslint 경고 방지를 위해 Object.values 사용 및 unknown 타입 캐스팅 활용
                        for (const field of Object.values(properties)) {
                            const fieldObj = field as Record<string, unknown>;
                            const enums = fieldObj.enum;
                            
                            if (!enums || !Array.isArray(enums)) continue;

                            // 각각의 enum이 무엇을 다루는지(해상도, 종횡비, 길이) 데이터를 보고 동적으로 판별

                            // 가. 해상도(Resolution) 필드인지 확인 후 조건 검사
                            // (480p 등 다른 게 섞여 있어도 720p와 1080p가 '모두' 있으면 통과)
                            if (enums.includes('720p') && enums.includes('1080p')) {
                                hasRequiredResolution = true;
                            }

                            // 나. 종횡비(Aspect Ratio) 필드인지 확인 후 조건 검사
                            // (1:1 등 다른 게 섞여 있어도 16:9와 9:16이 '모두' 있으면 통과)
                            if (enums.includes('16:9') && enums.includes('9:16')) {
                                hasRequiredAspectRatio = true;
                            }

                            // 다. 영상 길이(Duration) 필드인지 확인 후 파싱
                            // 숫자로 변환 가능한 값들만 추출하여 오름차순 정렬
                            const numbers = enums.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);

                            // 숫자가 2개 이상인 경우, 1초 간격(연속된 숫자)이 얼마나 있는지 확인
                            if (numbers.length >= 2) {
                                let stepOfOneCount = 0;
                                for (let i = 1; i < numbers.length; i++) {
                                    if (numbers[i] - numbers[i - 1] === 1) stepOfOneCount++;
                                }

                                // 1초 간격이 2번 이상 등장하면 이를 duration 필드로 확정
                                if (stepOfOneCount >= 2) {
                                    supportedDurations = numbers;
                                }
                            }
                        }
                    }

                    // 1초 단위 세밀 조절, 720p/1080p 지원, 16:9/9:16 지원을 "모두" 만족하는 타겟 모델만 통과
                    if (!supportedDurations || !hasRequiredResolution || !hasRequiredAspectRatio) {
                        return acc;
                    }

                    // 5) 정제된 데이터 배열에 추가
                    acc.push({
                        endpoint_id: modelData.endpoint_id,
                        provider: "fal-ai",
                        display_name: modelData.metadata?.display_name || modelData.endpoint_id,
                        description: modelData.metadata?.description || "",
                        category: modelData.metadata?.category || "image-to-video",
                        status: modelData.metadata?.status || "active",
                        thumbnail_url: modelData.metadata?.thumbnail_url || "",
                        model_url: modelData.metadata?.model_url || `https://fal.run/${modelData.endpoint_id}`,
                        supported_durations: supportedDurations,
                    });

                    return acc;
                }, [])
            )
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

        for (const model of newAIModelToFetchList) {
            try {
                const res = await fetch(model.model_url);
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
            } catch (err) {
                console.error(`Error fetching HTML for ${model.endpoint_id}:`, err);
            }
        }

        // 5. LLM을 호출하여 가격 정보 추출 (5개씩 청크 단위로 병렬 처리)
        // 주의: Rate Limit 및 Vercel Timeout 방어를 위해 청크 단위로는 순차적(Sequential)으로 실행
        const chunkSize = 5;
        const scrappedPriceDataList: { endpointId: string; priceByResolutionList: PriceByResolution[] }[] = [];

        for (let i = 0; i < newAIModelTextDataList.length; i += chunkSize) {
            const chunk = newAIModelTextDataList.slice(i, i + chunkSize);
            
            // llmServerAPI 파라미터 규격에 맞게 변환
            const payload = chunk.map(data => ({
                endpointId: data.endpoint_id,
                pricePureText: data.pure_text
            }));

            try {
                const chunkResult = await llmServerAPI.postPricePerSecScrapping(payload);
                if (chunkResult.success && chunkResult.data?.modelPricePerSecondList) {
                    scrappedPriceDataList.push(...chunkResult.data.modelPricePerSecondList);
                }
            } catch (err) {
                console.error(`Error during LLM scrapping for chunk ${i / chunkSize}:`, err);
                // 하나의 청크가 실패하더라도 나머지는 계속 진행하도록 처리
            }
        }

        // 6. scrappedPriceDataList와 processedAIModelList를 병합하여 DB에 insert (신규 모델만)
        const finalModelDataToInsert: AIModelData[] = [];

        for (const model of processedAIModelList) {
            // 새로 추가되는 모델인 경우에만 insert 대상으로 선정
            if (newAIModelToFetchList.some(m => m.endpoint_id === model.endpoint_id)) {
                const scrappedData = scrappedPriceDataList.find(s => s.endpointId === model.endpoint_id);
                
                finalModelDataToInsert.push({
                    ...model,
                    price_per_sec: scrappedData ? scrappedData.priceByResolutionList : [],
                    is_valuable: !!scrappedData // 가격 정보가 추출되었으면 true, 계산 불가 등으로 누락되었으면 false
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
