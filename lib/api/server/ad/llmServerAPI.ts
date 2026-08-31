import { AdCopySpec, AdCreativeSpec, AdImageResult, AdRatioKey } from "@/lib/api/types/supabase/ad/AdGenerationBatch";
import { AdDesignLayout } from "@/lib/api/client/ad/adClientAPI";
import { cleanAndParseJSON } from "@/lib/utils/jsonUtils";
import { OpenRouterClient, OpenRouterModel } from "@/lib/OpenRouterClient";
import { POST_AD_CREATIVE_PROMPT } from "@/lib/llm-prompts/ad/POST_AD_CREATIVE_PROMPT";
import { POST_AD_IMAGE_ANALYSIS_PROMPT } from "@/lib/llm-prompts/ad/POST_AD_IMAGE_ANALYSIS_PROMPT";

/**
 * ad 도메인 전용 LLM 서버 API — creative 디렉터(텍스트) / Vision 분석(이미지) 분리.
 * 기존 llmServerAPI 패턴을 따른다.
 */
export const llmServerAPI = {
    /**
     * Creative 디렉터 — 코드가 배정한 5축 조합 + 유저 입력을 받아
     * 비율별 캡션 레코드(imagePromptRecord) + 판매 카피(copy)를 1회 생성한다.
     * 호출 단위 = creative마다 1회 (ad_variation_study.md §3).
     */
    async postAdCreativePrompt(params: {
        creativeIndex: number;
        creativeSpec: AdCreativeSpec;
        aspectRatios: AdRatioKey[];
        productNote: string | null;
        personNote: string | null;
        ctaEnabled: boolean;
        brandPalette: string[] | null;
        seed: number;
    }): Promise<{
        success: boolean;
        imagePromptRecord?: Partial<Record<AdRatioKey, string>>;
        copy?: AdCopySpec;
        reasoning?: string;
        ratioReasonings?: Partial<Record<AdRatioKey, string>>;
        error?: { message: string; code: string };
    }> {
        try {
            const {
                creativeIndex,
                creativeSpec,
                aspectRatios,
                productNote,
                personNote,
                ctaEnabled,
                brandPalette,
                seed,
            } = params;

            const userMessage = `
<input_data>
  <creative_spec>
    <camera>${creativeSpec.camera}</camera>
    <lighting>${creativeSpec.lighting}</lighting>
    <palette>${creativeSpec.palette}</palette>
    <framing>${creativeSpec.framing}</framing>
    <layout_tone>${creativeSpec.layout_tone}</layout_tone>
    <seed>${seed}</seed>
  </creative_spec>
  <aspect_ratios>${JSON.stringify(aspectRatios)}</aspect_ratios>
  <product_note>${productNote ?? ""}</product_note>
  <person_note>${personNote ?? ""}</person_note>
  <cta_enabled>${ctaEnabled}</cta_enabled>
  <brand_palette>${brandPalette && brandPalette.length > 0 ? JSON.stringify(brandPalette) : "null"}</brand_palette>
</input_data>

Instruction: Generate ratio-specific I2I captions and ad copy according to the system prompt.
`;

            const client = new OpenRouterClient();

            const generatedContent = await client.createCompletion(
                {
                    model: OpenRouterModel.DEEPSEEK_V_4_FLASH_0731,
                    systemMessage: POST_AD_CREATIVE_PROMPT,
                    userMessage,
                    maxCompletionTokens: 4096,
                    temperature: 0.8,
                    reasoning: true,
                },
                `ad/creative/${creativeIndex}/postAdCreativePrompt()`,
            );

            if (!generatedContent) {
                return {
                    success: false,
                    error: { message: "No content from LLM", code: "EMPTY_RESPONSE" },
                };
            }

            console.log(`[ad/creative/${creativeIndex}] raw LLM output (first 4000 chars):`, generatedContent.slice(0, 4000));

            try {
                const parsed: {
                    reasoning: string;
                    ratio_reasonings: Partial<Record<AdRatioKey, string>>;
                    image_prompt_record: Partial<Record<AdRatioKey, string>>;
                    copy: AdCopySpec;
                } = cleanAndParseJSON(generatedContent);

                // 디버깅용 reasoning은 로그로만 사용, DB에는 저장하지 않음
                if (parsed.reasoning) {
                    console.log(`[ad/creative/${creativeIndex}] reasoning: ${parsed.reasoning}`);
                }
                if (parsed.ratio_reasonings) {
                    console.log(`[ad/creative/${creativeIndex}] ratio_reasonings:`, parsed.ratio_reasonings);
                }

                return {
                    success: true,
                    imagePromptRecord: parsed.image_prompt_record,
                    copy: parsed.copy,
                    reasoning: parsed.reasoning,
                    ratioReasonings: parsed.ratio_reasonings,
                };
            } catch (parseError) {
                console.error(`[ad/creative/${creativeIndex}] raw LLM output on PARSE_ERROR:`, generatedContent.slice(0, 4000));
                return {
                    success: false,
                    error: {
                        message: parseError instanceof Error ? parseError.message : "Failed to parse JSON",
                        code: "PARSE_ERROR",
                    },
                };
            }
        } catch (error) {
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : "Unknown error",
                    code: "INTERNAL_ERROR",
                },
            };
        }
    },

    /**
     * Vision 분석 — creative에 속한 생성 이미지 묶음을 보고
     * 비율별 design(오버레이 지오메트리) + score(0.0~10.0)를 평가한다.
     * 호출 단위 = creative 묶음 완료(isLastCreative) 시 1회, 모델 = QWEN_3_8_27B.
     */
    async postAdImageAnalysis(params: {
        creativeIndex: number;
        aspectRatios: AdRatioKey[];
        creativeSpec: AdCreativeSpec;
        copy: AdCopySpec;
        brandPalette: string[] | null;
        imageInputs: Array<{ ratioKey: AdRatioKey; imageBase64: string }>;
    }): Promise<{
        success: boolean;
        imageResults?: Partial<Record<AdRatioKey, AdImageResult>>;
        error?: { message: string; code: string };
    }> {
        try {
            const { creativeIndex, aspectRatios, creativeSpec, copy, brandPalette, imageInputs } = params;

            const imageBase64List = imageInputs.map((item) => item.imageBase64);

            const ratioOrder = imageInputs.map((item) => item.ratioKey).join(", ");

            const userMessage = `
<input_data>
  <creative_index>${creativeIndex}</creative_index>
  <creative_spec>
    <camera>${creativeSpec.camera}</camera>
    <lighting>${creativeSpec.lighting}</lighting>
    <palette>${creativeSpec.palette}</palette>
    <framing>${creativeSpec.framing}</framing>
    <layout_tone>${creativeSpec.layout_tone}</layout_tone>
  </creative_spec>
  <aspect_ratios>${JSON.stringify(aspectRatios)}</aspect_ratios>
  <ratio_order>${ratioOrder}</ratio_order>
  <copy>${JSON.stringify(copy, null, 2)}</copy>
  <brand_palette>${brandPalette && brandPalette.length > 0 ? JSON.stringify(brandPalette) : "null"}</brand_palette>
</input_data>

Instruction: Analyze the attached ${imageInputs.length} image(s) in ratio order [${ratioOrder}] and return design/score per ratio.
Each image corresponds to the ratio at the same index in ratio_order.
`;

            const client = new OpenRouterClient();

            const generatedContent = await client.createCompletion(
                {
                    model: OpenRouterModel.GLM_5_3_FLASH,
                    systemMessage: POST_AD_IMAGE_ANALYSIS_PROMPT,
                    userMessage,
                    imageBase64List,
                    imageDetail: "high",
                    maxCompletionTokens: 4096,
                    reasoning: true,
                },
                `ad/creative/${creativeIndex}/postAdImageAnalysis()`,
            );

            if (!generatedContent) {
                return {
                    success: false,
                    error: { message: "No content from Vision LLM", code: "EMPTY_RESPONSE" },
                };
            }

            console.log(`[ad/creative/${creativeIndex}] raw Vision output (first 4000 chars):`, generatedContent.slice(0, 4000));

            try {
                const parsed: {
                    reasoning: string;
                    ratio_reasonings: Partial<Record<AdRatioKey, string>>;
                    image_results: Partial<Record<AdRatioKey, { design: AdDesignLayout; score: number }>>;
                } = cleanAndParseJSON(generatedContent);

                if (parsed.reasoning) {
                    console.log(`[ad/creative/${creativeIndex}] analysis reasoning: ${parsed.reasoning}`);
                }
                if (parsed.ratio_reasonings) {
                    console.log(`[ad/creative/${creativeIndex}] ratio_reasonings:`, parsed.ratio_reasonings);
                }

                const imageResults: Partial<Record<AdRatioKey, AdImageResult>> = {};

                for (const [ratioKey, value] of Object.entries(parsed.image_results)) {
                    const typedRatio = ratioKey as AdRatioKey;
                    // 기존 RPC 마커의 imageFileExtension은 DB에 이미 있으므로, Vision 결과는 design/score만 채우고 확장자는 병합 단계에서 보존한다
                    imageResults[typedRatio] = {
                        design: value.design,
                        score: value.score,
                        imageFileExtension: null,
                    };
                }

                return {
                    success: true,
                    imageResults,
                };
            } catch (parseError) {
                console.error(`[ad/creative/${creativeIndex}] raw Vision output on PARSE_ERROR:`, generatedContent.slice(0, 4000));
                return {
                    success: false,
                    error: {
                        message: parseError instanceof Error ? parseError.message : "Failed to parse JSON",
                        code: "PARSE_ERROR",
                    },
                };
            }
        } catch (error) {
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : "Unknown error",
                    code: "INTERNAL_ERROR",
                },
            };
        }
    },
};
