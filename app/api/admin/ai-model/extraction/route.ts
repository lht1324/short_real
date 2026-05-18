import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import {AIModelData, PriceByResolution} from "@/lib/api/types/supabase/AIModelData";
import {getIsValidRequestS2S} from "@/lib/utils/getIsValidRequest";
import {llmServerAPI} from "@/lib/api/server/llmServerAPI";
import * as cheerio from 'cheerio';

interface RawFalAIModel {
    endpoint_id: string;
    metadata?: FalAIMetadata;
    openapi?: {
        components?: {
            schemas?: Record<string, OpenAPISchema>;
        }
    }
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
    openapi?: RawFalAIModel['openapi'];
}

interface OpenAPISchema {
    properties?: Record<string, OpenAPIProperty | unknown>;
    [key: string]: unknown;
}

interface OpenAPIProperty {
    enum?: string[];
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

        const url = 'https://fal.ai/models/fal-ai/kling-video/o3/4k/image-to-video';
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Failed to fetch HTML: ${res.status}`);
        }
        const htmlText = await res.text();
        const $ = cheerio.load(htmlText);

        // 불필요한 태그 제거 (다이어트)
        $('head, style, script, svg').remove();

        // 1단계: Playground의 Input 섹션과 Result 섹션 컨테이너 통째로 잡기
        const inputH3 = $('h3').filter((_, el) => $(el).text().trim() === 'Input').first();
        const resultH3 = $('h3').filter((_, el) => $(el).text().trim().startsWith('Result')).first();

        let resultText = "";

        if (inputH3.length > 0) {
            const inputContainer = inputH3.closest('.border-stroke-strong');
            if (inputContainer.length > 0) {
                resultText += "[ INPUTS ]\n";
                
                // 2단계 (Input): .form-control 내부의 라벨과 요소 텍스트 솎아내기
                inputContainer.find('.form-control').each((_, el) => {
                    // 라벨 텍스트 추출
                    const label = $(el).find('label').text().replace(/\s+/g, ' ').trim();
                    
                    // 라벨을 제외한 나머지 텍스트(선택된 옵션이나 버튼 텍스트 등) 추출
                    const clone = $(el).clone();
                    clone.find('label').remove();
                    const restText = clone.text().replace(/\s+/g, ' ').trim();

                    if (label) {
                        resultText += `- ${label}`;
                        if (restText) {
                            // 너무 긴 텍스트 방지 (최대 100자)
                            resultText += ` (Hint: ${restText.substring(0, 100)})`;
                        }
                        resultText += "\n";
                    }
                });
                resultText += "\n";
            }
        }

        if (resultH3.length > 0) {
            const resultContainer = resultH3.closest('.border-stroke-strong');
            if (resultContainer.length > 0) {
                resultText += "[ RESULT & PRICING ]\n";
                
                // 2단계 (Result): 쓸데없는 버튼이나 상태값 무시하고 <p> 태그의 문장만 추출
                resultContainer.find('p').each((_, el) => {
                    const pText = $(el).text().replace(/\s+/g, ' ').trim();
                    if (pText) {
                        resultText += pText + "\n";
                    }
                });
                resultText += "\n";
            }
        }

        const outputPath = path.join(process.cwd(), 'processed_html.txt');
        fs.writeFileSync(outputPath, resultText.trim(), { encoding: 'utf-8', mode: 0o666 });
        console.log(`✅ Saved extracted text to ${outputPath}`);

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Test finished.",
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