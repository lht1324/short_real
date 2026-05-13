import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";
import {getIsValidRequestS2S} from "@/lib/utils/getIsValidRequest";

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

        const processedModels: Omit<AIModelData, 'price_per_sec'>[] = [];
        const targetCategories = ["image-to-video", "image-to-image"];

        // 1. fal.ai API에서 활성화된 모델 목록 카테고리별/페이지네이션으로 수집
        for (const category of targetCategories) {
            const allModels = [];
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
                    allModels.push(...data.models);
                }
                
                hasMore = data.has_more === true;
                cursor = data.next_cursor;
            }

            // 2. 수집된 모델들의 OpenAPI 스키마를 파싱하여 전처리
            processedModels.push(
                ...allModels.reduce((acc: Omit<AIModelData, 'price_per_sec'>[], modelData) => {
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

        if (processedModels.length === 0) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "No active models found to sync.",
            });
        }

        // processedModels의 endpoint_id만 뽑은 리스트를 만들고, 50개씩 자른 뒤 join(',')으로 붙여 ','로 붙은 문자열로 만들어야 한다 (API 최대 50개)
        const endpointIdList = processedModels.map((modelData) => {
            return modelData.endpoint_id;
        });

        // 50개 단위로 청크를 나누어 Pricing API 호출 후 하나로 합치기
        const allPricingDataList: {
            endpoint_id: string;
            unit_price: number;
            unit: string;
            currency: string;
        }[] = [];
        const chunkSize = 50;

        for (let i = 0; i < endpointIdList.length; i += chunkSize) {
            const chunk = endpointIdList.slice(i, i + chunkSize);
            const joinedIds = chunk.join(',');

            const pricingUrl = new URL("https://api.fal.ai/v1/models/pricing");
            pricingUrl.searchParams.append("endpoint_id", joinedIds); // 문서에 명시된 쿼리 파라미터명에 따라 (id, ids 등) 수정될 수 있음

            const pricingRes = await fetch(pricingUrl.toString(), {
                method: "GET",
                headers: {
                    Authorization: `Key ${falApiKey}`,
                },
            });

            if (!pricingRes.ok) {
                const text = await pricingRes.text();
                throw new Error(`Fal Pricing API Error: ${pricingRes.status} ${text}`);
            }

            const pricingData = await pricingRes.json();

            // 반환 결과가 배열이거나 특정 필드(예: data) 안에 있을 경우를 모두 고려하여 하나로 합침
            if (Array.isArray(pricingData)) {
                allPricingDataList.push(...pricingData);
            } else if (pricingData && typeof pricingData === 'object') {
                // 응답이 객체로 오고 내부에 배열이 있는 형태인 경우 (예: { data: [...] })
                const arrayData = Object.values(pricingData).find(Array.isArray);
                if (arrayData) {
                    allPricingDataList.push(...arrayData);
                }
            }
        }

        allPricingDataList.filter((pricingData) => {
            return pricingData.unit === 'seconds' || '5 seconds' || 'megapixels';
        }).map((pricingData) => {
            let pricePerSec = 0.0;

            if (pricingData.unit === 'seconds') {
                pricePerSec = pricingData.unit_price;
            } else if (pricingData.unit === '5 seconds') {
                pricePerSec = pricingData.unit_price / 5.0;
            } else {
                // megapixel 계산 공식 추가 (720p 기준으로 계산해야 함)
                // 보통 1초에 24FPS * 가로 * 세로 형식으로 뽑는 거 같은데 잘은 모르겠음

                /**
                 * 예시
                 * Your request will cost $0.001605 per megapixel of generated video data (width × height × frames), rounded up. For example, if you generate a video that is 121 frames long at 1280 × 720, your total generated video is ≈112 MP, and your request will cost $0.179.
                 */
            }
            return {
                endpoint_id: pricingData.endpoint_id,
                price_per_second: pricePerSec,
            }
        });

        // TODO: 여기서 allPricingData를 processedModels의 데이터와 매핑하여 AIModelData에 가격 정보 추가 가능

        // 3. 정제된 데이터를 Supabase에 일괄 Upsert
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
