import OpenAI from 'openai';
import {
    ScriptGenerationResponse
} from "@/api/types/open-ai/ScriptGeneration";
import {StyleGenerationParams} from "@/api/types/supabase/Styles";
import {SceneData, SubtitleSegment} from "@/api/types/supabase/VideoGenerationTasks";
import {MasterStyleInfo} from "@/api/types/supabase/MasterStyleInfo";
import {VIDEO_ASPECT_RATIOS, VideoAspectRatio} from "@/lib/ReplicateData";
import {StoryboardData} from "@/api/types/api/open-ai/scene/PostOpenAISceneResponse";
import {
    POST_SCRIPT_PROMPT,
    POST_SCENE_SEGMENTATION_PROMPT,
    POST_ENTITY_CASTING_PROMPT,
    POST_MASTER_STYLE_INFO_PROMPT,
    POST_IMAGE_GEN_PROMPT_PROMPT,
    POST_IMAGE_GEN_PROMPT_NO_ENTITIES_PROMPT,
    POST_VIDEO_GEN_PROMPT_PROMPT,
    POST_MUSIC_GENERATION_DATA_PROMPT,
} from "@/api/types/open-ai/LLMPrompts";
import {MusicGenerationData} from "@/api/types/suno-api/MusicGenerationData";
import {Entity, InitialEntityManifestItem} from "@/api/types/open-ai/Entity";
import {PHYSICS_LIBRARY} from "@/api/types/open-ai/PhysicsPromptLibrary";
import {FluxPrompt, FluxPromptSubject} from "@/api/types/open-ai/FluxPrompt";
import {
    assembleEnvironmentalAndAtmosphereSentence,
    assembleFullVideoGenPromptSentence, assembleOpticalAndTechnicalSentence,
    composeOpticalAndTechnicalOption, generateTechnicalLensString, subjectVectorsToCameraVectorString,
    surgicallyReplaceVideoGenPromptByCameraKey, TechnicalIntent
} from "@/utils/promptUtils";
import {STYLE_PROMPT_LIBRARY} from "@/api/types/open-ai/StylePromptLibrary";
import {GoogleGenAI, SchemaUnion} from "@google/genai";
import {cleanAndParseJSON} from "@/utils/jsonUtils";
import {addArticleToWord} from "@/utils/stringUtils";
import { logger } from "@trigger.dev/sdk";

enum DeepSeekModel {
    DEEPSEEK_NON_THINKING = "deepseek-chat",
    DEEPSEEK_THINKING = "deepseek-reasoner",
}

enum GeminiModel {
    GEMINI_2_5_FLASH_PREVIEW = "gemini-2.5-flash-preview-09-2025"
}

const videoGenResponseFormat: SchemaUnion = {
    type: "OBJECT",
    properties: {
        logical_bridge: {
            type: "OBJECT",
            properties: {
                scene_fundamental_data: {
                    type: "OBJECT",
                    properties: {
                        scene_summary: { type: "STRING" },
                        scene_summary_reason: { type: "STRING" },
                        primary_movement: { type: "STRING" },
                        primary_movement_reason: { type: "STRING" },
                        narrative_vibe: { type: "STRING", enum: ["NORMAL", "CHAOTIC", "COMBAT", "ANXIOUS", "CATASTROPHIC", "VERTIGO", "SHOCK", "DREAMY", "SURREAL", "EMOTIONAL", "FOCUS"] },
                        narrative_vibe_reason: { type: "STRING" },
                        intensity_tier: { type: "STRING", enum: ["VERY_LOW", "LOW", "HIGH", "VERY_HIGH"] },
                        intensity_tier_selected_reason: { type: "STRING" },
                    },
                    required: ["scene_summary", "scene_summary_reason", "primary_movement", "primary_movement_reason", "narrative_vibe", "narrative_vibe_reason", "intensity_tier", "intensity_tier_selected_reason"],
                },
                identity_logic: { type: "STRING" },
                action_focus: { type: "STRING" },
                primary_narrative_block: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            entity_id: { type: "STRING" },
                            raw_sentence: { type: "STRING" },
                            action_type: { type: "STRING" },
                            action_type_reason: { type: "STRING" },
                            verb_reason: { type: "STRING" },
                            adverb_reason: { type: "STRING" },
                        },
                        required: ["entity_id", "raw_sentence", "action_type", "action_type_reason", "verb_reason", "adverb_reason"],
                    }
                },
                atmospheric_lighting_delta: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            selected_atmospheric_or_lighting_layer: { type: "STRING" },
                            selected_reason: { type: "STRING" },
                        },
                        required: ["selected_atmospheric_or_lighting_layer", "selected_reason"],
                    }
                },
                cinematic_camera_vectors: {
                    type: "OBJECT",
                    properties: {
                        // Subject & Camera Axis Ref: [X: Screen Left <-> Screen Right], [Y: Screen Bottom <-> Screen Top], [Z: Deep Background <-> Screen Surface]
                        subject_vectors: {
                            type: "OBJECT",
                            properties: {
                                sx: { type: "STRING", enum: ["$-X$", "$0X$", "$+X$"] },
                                sy: { type: "STRING", enum: ["$-Y$", "$0Y$", "$+Y$"] },
                                sz: { type: "STRING", enum: ["$-Z$", "$0Z$", "$+Z$"] },
                            },
                            required: ["sx", "sy", "sz"],
                        },
                        subject_vectors_reasoning: { type: "STRING" },
                    },
                    required: ["subject_vectors", "subject_vectors_reasoning"],
                },
                style: {
                    type: "OBJECT",
                    properties: {
                        slot_1: { type: "STRING" },
                        slot_2: { type: "STRING" },
                        slot_1_reason: { type: "STRING" },
                        slot_2_reason: { type: "STRING" },
                    },
                    required: ["slot_1", "slot_2", "slot_1_reason", "slot_2_reason"],
                }
            },
            required: ["scene_fundamental_data", "identity_logic", "action_focus", "primary_narrative_block", "atmospheric_lighting_delta", "cinematic_camera_vectors", "style"],
        },
        reasoning: { type: "STRING" },
        final_output_structure: {
            type: "OBJECT",
            properties: {
                primary_narrative_block: { type: "STRING" },
                atmospheric_lighting_delta: { type: "STRING" },
                cinematic_camera_vector: { type: "STRING" },
                style: { type: "STRING" },
            },
            required: ["primary_narrative_block", "atmospheric_lighting_delta", "cinematic_camera_vector", "style"],
        },
        video_gen_prompt: { type: "STRING" },
    },
    required: [
        "logical_bridge",
        "reasoning",
        "final_output_structure",
        "video_gen_prompt",
    ],
};

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

export const llmServerAPI = {
    async postScript(userPrompt: string): Promise<ScriptGenerationResponse> {
        try {
            // OpenAI API 키 확인
            const apiKey = process.env.DEEPSEEK_API_KEY;
            if (!apiKey) {
                return {
                    success: false,
                    status: 400,
                    error: 'DeepSeek API Key is not configured',
                };
            }

            // 프롬프트를 OpenAI 형식으로 매핑
            const systemMessage = POST_SCRIPT_PROMPT;

            // OpenAI SDK 클라이언트 초기화
            const client = new OpenAI({
                baseURL: DEEPSEEK_BASE_URL,
                apiKey: apiKey,
            });

            // OpenAI API 호출
            const completion = await client.chat.completions.create({
                model: DeepSeekModel.DEEPSEEK_NON_THINKING,
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: userPrompt }
                ],
                // [핵심 1] 창의적 글쓰기: 0.7 ~ 0.9 권장 (리포트 4.1)
                temperature: 0.8,
                // [핵심 2] 반복 억제: 0.0 ~ 0.5 (리포트 4.3)
                presence_penalty: 0.2,
                frequency_penalty: 0.2,
                max_completion_tokens: 3072,
            });

            const generatedScript = completion.choices[0]?.message?.content;

            if (!generatedScript) {
                return {
                    success: false,
                    status: 500,
                    error: 'No script generated from OpenAI'
                };
            }

            // 스크립트 분석
            const wordCount = generatedScript.split(' ').length;
            const estimatedDuration = Math.round(wordCount / 2.5); // 약 2.5 단어/초

            return {
                success: true,
                status: 200,
                data: {
                    script: generatedScript,
                    wordCount: wordCount,
                    estimatedDuration: estimatedDuration,
                    prompt: userPrompt
                }
            };

        } catch (error) {
            console.error("Error occurred in postScript(): ", error)
            return {
                success: false,
                status: 500,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    },

    // o4-mini-2025-04-16, entire narration based
    async postSceneSegmentation(
        taskId: string,
        narrationScript: string,
        subtitleSegments: SubtitleSegment[]
    ): Promise<StoryboardData | null> {
        try {
            // OpenAI API 키 확인
            const apiKey = process.env.DEEPSEEK_API_KEY;
            if (!apiKey) {
                return null;
            }

            const developerMessage = POST_SCENE_SEGMENTATION_PROMPT;

            const currentDate = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }); // e.g., "Tuesday, November 25, 2025"

            const userMessage = `
<input_data>
  <current_date>${currentDate}</current_date>
  <narration_script>${narrationScript}</narration_script>
  <subtitle_segments>
    ${JSON.stringify(subtitleSegments, null, 2)}
  </subtitle_segments>
</input_data>

Instruction: Process the input data and return the JSON output according to the schema.
`;

            // OpenAI SDK 클라이언트 초기화
            const client = new OpenAI({
                baseURL: DEEPSEEK_BASE_URL,
                apiKey: apiKey,
            });

            // OpenAI API 호출
            const completion = await client.chat.completions.create({
                model: DeepSeekModel.DEEPSEEK_THINKING,
                messages: [
                    { role: 'system', content: developerMessage },
                    {
                        role: 'user',
                        content: userMessage,
                    }
                ],
                // [핵심 1] JSON 모드 활성화 (o-series 지원)
                response_format: { type: "json_object" },
                // [핵심 2] 복합 추론(타이밍 계산 + 창작)이므로 medium 유지
                max_completion_tokens: 8192,
            });

            const generatedContent = completion.choices[0]?.message?.content;
            console.log("Scene segmentation result:", generatedContent);

            if (!generatedContent) {
                return null;
            }

            try {
                // [핵심 3] 정규식 불필요. JSON 모드는 순수 JSON만 반환함.
                const {
                    sceneDataList,
                    videoTitle,
                    videoDescription,
                } = JSON.parse(generatedContent);

                return {
                    taskId: taskId,
                    sceneDataList: sceneDataList,
                    videoTitle: videoTitle,
                    videoDescription: videoDescription,
                };
            } catch (parseError) {
                console.error('Failed to parse scene segmentation JSON response:', parseError);
                return null;
            }

        } catch (error) {
            return null;
        }
    },

    async postEntityCasting(
        scriptDataList: {
            sceneNumber: number;
            sceneNarration: string;
        }[],
        videoTitle: string,
        videoDescription: string,
        videoDuration: number,
        aspectRatio: VideoAspectRatio = VIDEO_ASPECT_RATIOS.PORTRAIT_9_16
    ): Promise<{
        success: boolean;
        entityManifestList?: InitialEntityManifestItem[];
        sceneCastingDataList?: {
            sceneNumber: number;
            castIdList: string[];
            sceneVisualDescription: string;
        }[];
        error?: {
            message: string;
            code: string
        }
    }> {
        try {
            const apiKey = process.env.DEEPSEEK_API_KEY;
            if (!apiKey) {
                return {
                    success: false,
                    error: {
                        message: 'DeepSeek API Key is not configured',
                        code: 'MISSING_API_KEY'
                    }
                };
            }

            // 수정한 프롬프트 (Pre-Production 역할)
            const developerMessage = POST_ENTITY_CASTING_PROMPT;

            // [수정 3] scriptDataList를 JSON 문자열로 변환하여 컨텍스트 제공
            const userMessage = `
<input_data>
  <video_metadata>
    <video_title>${videoTitle}</video_title>
    <video_description>${videoDescription}</video_description>
    <video_duration>${videoDuration} secs</video_duration>
    <target_aspect_ratio>${aspectRatio}</target_aspect_ratio>
  </video_metadata>
  <full_script_context>
    ${JSON.stringify(scriptDataList, null, 2)}
  </full_script_context>
</input_data>

Instruction: Analyze <video_metadata>, <target_aspect_ratio>, <style_guidelines> and <full_script_context> to generate the \`scene_casting_list\` and \`entity_manifest_list\` JSON output.
`;
            console.log(`postEntityCasting()`);
            const client = new OpenAI({
                baseURL: DEEPSEEK_BASE_URL,
                apiKey: apiKey,
                timeout: 600 * 1000,
                maxRetries: 3,
            });

            const completion = await client.chat.completions.create({
                model: DeepSeekModel.DEEPSEEK_THINKING,
                messages: [
                    { role: 'system', content: developerMessage },
                    { role: 'user', content: userMessage }
                ],
                response_format: { type: "json_object" },
                max_completion_tokens: 20480, // [팁] Entity Manifest가 길어질 수 있으므로 토큰 한도를 넉넉히 늘렸습니다.
            });

            console.log(`postEntityCasting() usage: `, JSON.stringify(completion.usage))

            const generatedResult = completion.choices[0]?.message?.content;

            if (!generatedResult) {
                return {
                    success: false,
                    error: {
                        message: 'No response generated from OpenAI',
                        code: 'EMPTY_RESPONSE'
                    }
                };
            }

            try {
                // [수정 4] 변경된 JSON 구조에 맞춰 파싱 (masterStyle + entityManifest)
                // 프롬프트의 output_schema와 일치해야 함
                const parsedData: {
                    entity_manifest_list: InitialEntityManifestItem[];
                    scene_casting_list: {
                        scene_number: number;
                        scene_visual_description: string;
                        included_cast_data_list: {
                            id: string;
                            reasoning: string;
                        }[],
                        excluded_cast_data_list: {
                            id: string;
                            reasoning: string;
                        }[],
                        casting_logic: string;
                        scene_empty_reasoning: string;
                    }[],
                    scene_casting_list_empty_reason: string;
                } = cleanAndParseJSON(generatedResult);

                console.log(`postEntityCasting() raw content: ${generatedResult}`);

                const {
                    entity_manifest_list: entityManifestList,
                    scene_casting_list: sceneCastingList,
                    scene_casting_list_empty_reason: sceneCastingListEmptyReason,
                } = parsedData;

                if (sceneCastingList.length !== 0) {
                    for (const sceneCastingData of parsedData.scene_casting_list.sort((a, b) => a.scene_number - b.scene_number)) {
                        const {
                            scene_number: sceneNumber,
                            scene_visual_description: sceneVisualDescription,
                            included_cast_data_list: includedCastDataList,
                            excluded_cast_data_list: excludedCastDataList,
                            casting_logic: castingLogic,
                            scene_empty_reasoning: sceneEmptyReasoning,
                        } = sceneCastingData;

                        logger.info('Scene #${sceneNumber} Analysis', {
                            visualDescription: sceneVisualDescription,
                            castingLogic: castingLogic,
                        })

                        if (includedCastDataList.length !== 0 || excludedCastDataList.length !== 0) {
                            if (includedCastDataList.length !== 0) {
                                logger.info(`Scene #${sceneNumber} Included Cast`, {
                                    castIds: includedCastDataList.map(c => c.id), // ID 목록 한눈에 보기
                                    details: includedCastDataList.map(c => ({     // 상세 추론 이유
                                        id: c.id,
                                        reasoning: c.reasoning
                                    }))
                                });
                            }

                            if (excludedCastDataList.length !== 0) {
                                logger.info(`Scene #${sceneNumber} Excluded Cast`, {
                                    castIds: excludedCastDataList.map(c => c.id),
                                    details: excludedCastDataList.map(c => ({
                                        id: c.id,
                                        reasoning: c.reasoning
                                    }))
                                });
                            }
                        } else {
                            logger.info(`Scene #${sceneNumber} has no cast info`, {
                                reason: sceneEmptyReasoning
                            });
                        }
                    }
                } else {
                    logger.warn(`Scene Casting List is Empty`, {
                        reason: sceneCastingListEmptyReason
                    });
                }
                logger.info(`Final Entity Manifest`, {
                    entityIds: entityManifestList.map((entity) => entity.id),
                    totalCount: entityManifestList.length
                });

                return {
                    success: true,
                    // 구조 분해 할당
                    entityManifestList: entityManifestList, // 추출된 캐릭터 시트 반환
                    sceneCastingDataList: sceneCastingList.map((sceneCasting) => {
                        const {
                            scene_number: sceneNumber,
                            included_cast_data_list: castDataList,
                            scene_visual_description: sceneVisualDescription,
                        } = sceneCasting;

                        return {
                            sceneNumber: sceneNumber,
                            castIdList: castDataList.map((castData) => castData.id),
                            sceneVisualDescription: sceneVisualDescription,
                        }
                    })
                };
            } catch (parseError) {
                console.error('Failed to parse pre-production JSON response:', parseError);
                return {
                    success: false,
                    error: {
                        message: 'Failed to parse JSON response',
                        code: 'PARSE_ERROR'
                    }
                };
            }
        } catch (error) {
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error occurred',
                    code: 'INTERNAL_ERROR'
                }
            };
        }
    },

    async postMasterStyleInfo(
        style: StyleGenerationParams,
        scriptDataList: {
            sceneNumber: number;
            sceneNarration: string;
        }[],
        videoTitle: string,
        videoDescription: string,
        videoDuration: number,
        entityManifestList: InitialEntityManifestItem[],
        aspectRatio: VideoAspectRatio = VIDEO_ASPECT_RATIOS.PORTRAIT_9_16
    ): Promise<{
        success: boolean;
        masterStyleInfo?: MasterStyleInfo;
        error?: {
            message: string;
            code: string
        }
    }> {
        try {
            const apiKey = process.env.DEEPSEEK_API_KEY;
            if (!apiKey) {
                return {
                    success: false,
                    error: {
                        message: 'DeepSeek API Key is not configured',
                        code: 'MISSING_API_KEY'
                    }
                };
            }

            // 수정한 프롬프트 (Pre-Production 역할)
            const developerMessage = POST_MASTER_STYLE_INFO_PROMPT;

            // [수정 3] scriptDataList를 JSON 문자열로 변환하여 컨텍스트 제공
            const userMessage = `
<input_data>
  <video_metadata>
    <video_title>${videoTitle}</video_title>
    <video_description>${videoDescription}</video_description>
    <video_duration>${videoDuration} secs</video_duration>
  </video_metadata>
  <target_aspect_ratio>${aspectRatio}</target_aspect_ratio>
  <style_guidelines>
    <core_concept>${style.coreConcept}</core_concept>
    <visual_keywords>${style.visualKeywords.join(',')}</visual_keywords>
    <negative_guidance>${style.negativeGuidance}</negative_guidance>
    <preferred_framing_logic>${style.preferredFramingLogic}</preferred_framing_logic>
  </style_guidelines>
  <full_script_context>
    ${JSON.stringify(scriptDataList, null, 2)}
  </full_script_context>
  <entity_manifest_list>
    ${JSON.stringify(entityManifestList, null, 2)}
  </entity_manifest_list>
</input_data>

Instruction: Analyze <video_metadata>, <target_aspect_ratio>, <style_guidelines>, <full_script_context> and <entity_manifest_list> to generate the \`master_style_info\` JSON output.
`;

            console.log(`postMasterStyleInfo()`);
            const client = new OpenAI({
                baseURL: DEEPSEEK_BASE_URL,
                apiKey: apiKey,
                timeout: 600 * 1000,
                maxRetries: 3,
            });

            const completion = await client.chat.completions.create({
                model: DeepSeekModel.DEEPSEEK_THINKING,
                messages: [
                    { role: 'system', content: developerMessage },
                    { role: 'user', content: userMessage }
                ],
                response_format: { type: "json_object" },
                max_completion_tokens: 10240, // [팁] Entity Manifest가 길어질 수 있으므로 토큰 한도를 넉넉히 늘렸습니다.
            });

            console.log(`postMasterStyleInfo() raw completion: ${JSON.stringify(completion)}`);
            console.log(`postMasterStylePrompt() usage: `, JSON.stringify(completion.usage))

            const generatedResult = completion.choices[0]?.message?.content;

            if (!generatedResult) {
                return {
                    success: false,
                    error: {
                        message: 'No response generated from OpenAI',
                        code: 'EMPTY_RESPONSE'
                    }
                };
            }

            try {
                // [수정 4] 변경된 JSON 구조에 맞춰 파싱 (masterStyle + entityManifest)
                // 프롬프트의 output_schema와 일치해야 함
                const parsedData: {
                    master_style_info: MasterStyleInfo;
                } = cleanAndParseJSON(generatedResult);

                console.log(`postMasterStyleInfo() raw content: ${generatedResult}`);

                const {
                    master_style_info: masterStyleInfo,
                } = parsedData;

                console.log(`MasterStyleInfo: ${JSON.stringify(masterStyleInfo)}`);

                return {
                    success: true,
                    // 구조 분해 할당
                    masterStyleInfo: masterStyleInfo,
                };
            } catch (parseError) {
                console.error('Failed to parse pre-production JSON response:', parseError);
                return {
                    success: false,
                    error: {
                        message: 'Failed to parse JSON response',
                        code: 'PARSE_ERROR'
                    }
                };
            }
        } catch (error) {
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error occurred',
                    code: 'INTERNAL_ERROR'
                }
            };
        }
    },

    async postImageGenPrompt(
        imageGenPromptDirective: string,
        masterStylePromptInfo: MasterStyleInfo,
        sceneNarration: string,
        sceneNumber: number,
        videoTitle: string,
        videoDescription: string,
        sceneEntityManifestList: InitialEntityManifestItem[],
        sceneVisualDescription: string,
        styleId: string,
        aspectRatio: VideoAspectRatio = VIDEO_ASPECT_RATIOS.PORTRAIT_9_16
    ): Promise<{
        success: boolean;
        imageGenPrompt?: FluxPrompt;
        imageGenPromptSentence?: string;
        sceneEntityManifestList?: Entity[],
        error?: {
            message: string;
            code: string
        }
    }> {
        try {
            const apiKey = process.env.DEEPSEEK_API_KEY;
            if (!apiKey) {
                return {
                    success: false,
                    error: {
                        message: 'DeepSeek API Key is not configured',
                        code: 'MISSING_API_KEY'
                    }
                };
            }

            const isEntityListNotEmpty = sceneEntityManifestList.length !== 0;
            const developerMessage = isEntityListNotEmpty
                ? POST_IMAGE_GEN_PROMPT_PROMPT
                : POST_IMAGE_GEN_PROMPT_NO_ENTITIES_PROMPT;

            const userMessage = `
<input_data>
  <video_context>
    <video_title>${videoTitle}</video_title>
    <video_description>${videoDescription}</video_description>
    <aspect_ratio>${aspectRatio}</aspect_ratio>
  </video_context>
  <master_style_guide>
    <optics>${JSON.stringify(masterStylePromptInfo.optics, null, 2)}</optics>
    <color_and_light>${JSON.stringify(masterStylePromptInfo.colorAndLight, null, 2)}</color_and_light>
    <fidelity>${JSON.stringify(masterStylePromptInfo.fidelity, null, 2)}</fidelity>
    <global_environment>${JSON.stringify(masterStylePromptInfo.globalEnvironment, null, 2)}</global_environment>
    <composition>${JSON.stringify(masterStylePromptInfo.composition, null, 2)}</composition>
  </master_style_guide>
  ${isEntityListNotEmpty ? `<entity_list>${JSON.stringify(sceneEntityManifestList, null, 2)}</entity_list>` : ""}
  <current_narration>
    ${sceneNarration}
  </current_narration>
  <scene_content>
    ${imageGenPromptDirective}
  </scene_content>
  <scene_visual_description>${sceneVisualDescription}</scene_visual_description>
</input_data>

${isEntityListNotEmpty ? `
Instruction: Generate the scene instruction JSON.
**CRITICAL**: You are the Physics Architect.
1. Populate 'physics_profile' based on the 3-Layer Logic.
2. Enrich 'appearance' with visual cues that imply that physics (e.g., textures, damage).
3. Define 'state' with a physically accurate pose.\`
` : `
Instruction: Generate the scene instruction JSON.
**CRITICAL**: You are the Atmospheric Architect.
1. Analyze the <scene_content> to identify the Dominant Anchor.
2. Focus strictly on Environmental Textures, Lighting, and Scale.
3. Output the single 'image_gen_prompt' string. Do NOT invent characters.
`}
`;

            const client = new OpenAI({
                baseURL: DEEPSEEK_BASE_URL,
                apiKey: apiKey,
                timeout: 600 * 1000,
                maxRetries: 3,
            });
            const completion = await client.chat.completions.create({
                model: DeepSeekModel.DEEPSEEK_THINKING,
                messages: [
                    { role: 'system', content: developerMessage },
                    { role: 'user', content: userMessage }
                ],
                response_format: { type: "json_object" },
                max_completion_tokens: 20480,
                temperature: 0.7,
            });

            console.log(`Scene #${sceneNumber} postImageGenPrompt() usage: `, JSON.stringify(completion.usage))

            const generatedContent = completion.choices[0]?.message?.content;
            if (!generatedContent) {
                console.log("Failed completion: ", JSON.stringify(completion));
                return {
                    success: false,
                    error: {
                        message: 'No content in OpenAI response',
                        code: 'NO_CONTENT'
                    }
                };
            }

            // JSON 유효성 검증
            try {
                const instructionJSON: {
                    image_gen_prompt: Omit<FluxPrompt, 'style' | 'camera' | 'composition' | 'effects'>;
                    image_gen_prompt_sentence: string;
                    technical_intent: TechnicalIntent;
                    updated_entity_manifest_list?: Omit<Entity, 'role' | 'type' | 'demographics'>[] | null
                } = cleanAndParseJSON(generatedContent);

                const {
                    image_gen_prompt: imageGenPrompt,
                    image_gen_prompt_sentence: imageGenPromptSentence,
                    technical_intent: technicalIntent,
                    updated_entity_manifest_list: updatedEntityManifestList,
                } = instructionJSON;

                console.log(`Scene #${sceneNumber} imageGenPrompt: ${JSON.stringify(imageGenPrompt, null, 2)}`);

                const newEntityManifestList = updatedEntityManifestList ? updatedEntityManifestList.map(instruction => {
                    const originalEntity = sceneEntityManifestList.find((entityManifest) => {
                        return entityManifest.id === instruction.id;
                    });

                    if (!originalEntity) {
                        console.warn(`Warning: LLM generated unknown ID '${instruction.id}'`);
                        throw Error("LLM generated unknown ID '${instruction.id}'.")
                    }

                    return {
                        // LLM이 생성한 핵심 물리/시각 데이터로 덮어쓰기
                        id: instruction.id,
                        physics_profile: instruction.physics_profile,
                        type: originalEntity.type,
                        demographics: originalEntity.demographics,
                        appearance: {
                            ...originalEntity.appearance,
                            ...instruction.appearance,
                        },
                        role: originalEntity.role,
                    };
                }) : []

                const opticalAndTechnicalOption = composeOpticalAndTechnicalOption(
                    technicalIntent,
                    masterStylePromptInfo,
                    newEntityManifestList,
                    styleId as (keyof typeof STYLE_PROMPT_LIBRARY),
                );

                console.log(`Scene #${sceneNumber} OpticalAndTechnicalOption: ${JSON.stringify(opticalAndTechnicalOption)}`);

                const fullImageGenPrompt: FluxPrompt = {
                    ...imageGenPrompt,
                    ...opticalAndTechnicalOption,
                }

                const cameraPhrases = `${addArticleToWord(fullImageGenPrompt.camera.angle, true)} ${fullImageGenPrompt.camera.distance} ${fullImageGenPrompt.subjects.length !== 0 ? "captures" : "focuses entirely on"}`;

                const environmentalAndAtmosphereSentence = assembleEnvironmentalAndAtmosphereSentence({
                    scene: fullImageGenPrompt.scene,
                    subjects: fullImageGenPrompt.subjects,
                    color_palette: fullImageGenPrompt.color_palette,
                    lighting: fullImageGenPrompt.lighting,
                    mood: fullImageGenPrompt.mood,
                    background: fullImageGenPrompt.background,
                    composition: fullImageGenPrompt.composition,
                });

                const opticalAndTechnicalSentence = assembleOpticalAndTechnicalSentence({
                    camera: fullImageGenPrompt.camera,
                    style: fullImageGenPrompt.style,
                    effects: fullImageGenPrompt.effects,
                });

                const lowerCaseFirst = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);
                const assembledImageGenPromptSentence = `${cameraPhrases} ${lowerCaseFirst(imageGenPromptSentence)}. ${environmentalAndAtmosphereSentence}. ${opticalAndTechnicalSentence}.`
                    .replaceAll("..", ".");

                console.log(`Scene #${sceneNumber} ImageGenPromptSentence: ${imageGenPromptSentence}`);
                console.log(`Scene #${sceneNumber} AssembledImageGenPromptSentence: ${assembledImageGenPromptSentence}`);

                return {
                    success: true,
                    imageGenPrompt: fullImageGenPrompt,
                    imageGenPromptSentence: assembledImageGenPromptSentence,
                    sceneEntityManifestList: newEntityManifestList,
                };
            } catch (jsonError) {
                console.error('Failed to parse generated JSON:', jsonError);

                console.log(`Scene #${sceneNumber} raw generated content: ${generatedContent.replace(/[\r\n]+/g, "")}`)
                return {
                    success: false,
                    error: {
                        message: 'Generated content is not valid JSON',
                        code: 'INVALID_JSON_OUTPUT'
                    }
                };
            }
        } catch (error) {
            console.error('OpenAI image generation prompt error:', error);
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error occurred',
                    code: 'INTERNAL_ERROR'
                }
            };
        }
    },

    async postVideoGenPrompt(
        sceneNarration: string,
        sceneNumber: number,
        imageBase64: string,
        targetDuration: number,
        masterStyleInfo: MasterStyleInfo,
        videoTitle: string,
        videoDescription: string,
        imageGenPrompt: FluxPrompt,
        entityManifestList: Entity[],
    ): Promise<{
        success: boolean;
        videoGenPrompt?: string;
        error?: { message: string; code: string }
    }> {
        try {
            // OpenAI API 키 확인
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                return {
                    success: false,
                    error: {
                        message: 'Gemini API Key is not configured',
                        code: 'MISSING_API_KEY'
                    }
                };
            }

            const isEntityListNotEmpty = entityManifestList.length !== 0;
            const developerMessage = POST_VIDEO_GEN_PROMPT_PROMPT;

            // [핵심] Physics Profile을 기반으로 물리 법칙 텍스트 생성 (Code Level Injection)
            // 메인 히어로 또는 씬에 등장하는 주요 엔티티들의 물리 속성을 추출하여 문자열로 변환

            const uniqueMaterialKeys = new Set<'rigid' | 'viscoelastic' | 'brittle' | 'cloth' | 'fluid' | 'elastoplastic' | 'granular'>();
            const uniqueActionContextKeys = new Set<'locomotion' | 'combat' | 'interaction' | 'aerodynamics' | 'passive' | 'velocity_max'>();

            entityManifestList.forEach(entity => {
                entity.physics_profile?.material.forEach(m => uniqueMaterialKeys.add(m));
                entity.physics_profile?.action_context.forEach(a => uniqueActionContextKeys.add(a));
            });

            const uniqueMaterialVocabularyList = Array.from(uniqueMaterialKeys).map((key) => {
                const {
                    very_low_intensity,
                    low_intensity,
                    high_intensity,
                    very_high_intensity,
                } = PHYSICS_LIBRARY.material[key]

                return `
[physics_profile Field: material]
[physics_profile Value: ${key}]
**INTENSITY_TIER: VERY_LOW (Micro-Stasis / Latent Flux / Absolute Stillness)**
- **Visual Effect Candidates**: ${very_low_intensity.effect_tag} OR ${very_low_intensity.alt_tag}
- **Main Verbs**: ${very_low_intensity.vocabulary.verbs.join(', ')}
- **Adjectives**: ${very_low_intensity.vocabulary.adjectives.join(', ')}
- **Nouns**: ${very_low_intensity.vocabulary.nouns.join(', ')}

**INTENSITY_TIER: LOW (Fluid Motion / Rhythmic Drift / Subtle Flow)**
- **Visual Effect Candidates**: ${low_intensity.effect_tag} OR ${low_intensity.alt_tag}
- **Main Verbs**: ${low_intensity.vocabulary.verbs.join(', ')}
- **Adjectives**: ${low_intensity.vocabulary.adjectives.join(', ')}
- **Nouns**: ${low_intensity.vocabulary.nouns.join(', ')}

**INTENSITY_TIER: HIGH (Decisive Kinetic / Structural Strain / High Momentum)**
- **Visual Effect Candidates**: ${high_intensity.effect_tag} OR ${high_intensity.alt_tag}
- **Main Verbs**: ${high_intensity.vocabulary.verbs.join(', ')}
- **Adjectives**: ${high_intensity.vocabulary.adjectives.join(', ')}
- **Nouns**: ${high_intensity.vocabulary.nouns.join(', ')}

**INTENSITY_TIER: VERY_HIGH (Explosive Chaos / Hyper-Velocity / Kinetic Failure)**
- **Visual Effect Candidates**: ${very_high_intensity.effect_tag} OR ${very_high_intensity.alt_tag}
- **Main Verbs**: ${very_high_intensity.vocabulary.verbs.join(', ')}
- **Adjectives**: ${very_high_intensity.vocabulary.adjectives.join(', ')}
- **Nouns**: ${very_high_intensity.vocabulary.nouns.join(', ')}
`
            });

            const uniqueActionContextVocabularyList = Array.from(uniqueActionContextKeys).map((key) => {
                const {
                    very_low_intensity,
                    low_intensity,
                    high_intensity,
                    very_high_intensity,
                } = PHYSICS_LIBRARY.action_context[key]

                return `
[physics_profile Field: action_context]
[physics_profile Value: ${key}]
**INTENSITY_TIER: VERY_LOW (Micro-Stasis / Latent Flux / Absolute Stillness)**
- **Velocity Options**: ${very_low_intensity.speed_term}
- **Main Verbs**: ${very_low_intensity.vocabulary.verbs.join(', ')}
- **Adjectives**: ${very_low_intensity.vocabulary.adjectives.join(', ')}
- **Nouns**: ${very_low_intensity.vocabulary.nouns.join(', ')}

**INTENSITY_TIER: LOW (Fluid Motion / Rhythmic Drift / Subtle Flow)**
- **Velocity Options**: ${low_intensity.speed_term}
- **Main Verbs**: ${low_intensity.vocabulary.verbs.join(', ')}
- **Adjectives**: ${low_intensity.vocabulary.adjectives.join(', ')}
- **Nouns**: ${low_intensity.vocabulary.nouns.join(', ')}

**INTENSITY_TIER: HIGH (Decisive Kinetic / Structural Strain / High Momentum)**
- **Velocity Options**: ${high_intensity.speed_term}
- **Main Verbs**: ${high_intensity.vocabulary.verbs.join(', ')}
- **Adjectives**: ${high_intensity.vocabulary.adjectives.join(', ')}
- **Nouns**: ${high_intensity.vocabulary.nouns.join(', ')}

**INTENSITY_TIER: VERY_HIGH (Explosive Chaos / Hyper-Velocity / Kinetic Failure)**
- **Velocity Options**: ${very_high_intensity.speed_term}
- **Main Verbs**: ${very_high_intensity.vocabulary.verbs.join(', ')}
- **Adjectives**: ${very_high_intensity.vocabulary.adjectives.join(', ')}
- **Nouns**: ${very_high_intensity.vocabulary.nouns.join(', ')}
`
            });

            // 2. 고유 키에 대해서만 라이브러리 데이터 추출 (id 대신 타입 표기)
            const globalVocabularyDepot = [
                ...uniqueMaterialVocabularyList,
                ...uniqueActionContextVocabularyList
            ].join('\n');

            const imageGenPromptSubjectList: FluxPromptSubject[] = imageGenPrompt.subjects ?? [];
            const mappedEntityList = isEntityListNotEmpty
                ? entityManifestList.map((entity) => {
                    // 1. Flux 2 베이스 이미지 생성 시 사용된 상세 시각 데이터 매칭 (id 기준)
                    const visualAnchor = imageGenPromptSubjectList.find(subject => subject.id === entity.id);

                    return {
                        role: entity.role,
                        type: entity.type,
                        demographics: entity.demographics,

                        // 2. 공간적 고정점 (Composition Anchor)
                        position_descriptor: entity.appearance.position_descriptor ?? "",

                        // 3. 물리적 고정점 (Visual Ground Truth)
                        // 베이스 이미지의 포즈를 주입하여 Toward/Away 벡터 오판단 방지
                        visual_anchor_initial_pose: visualAnchor?.pose ?? "",
                        physics_profile: entity.physics_profile,

                        description: visualAnchor?.description ?? "",

                        // 4. 보조 식별 정보
                        hair: entity.appearance.hair,
                        clothing: entity.appearance.clothing_or_material,
                    };
                })
                : [];

            const mappedMasterStyleInfo = {
                ...masterStyleInfo,
                optics: {
                    ...masterStyleInfo.optics,
                    defaultISO: imageGenPrompt.camera.ISO,
                }
            }
            // 4. User Message 구성 (physics_instruction_set 주입)
            const userMessage = `
<input_context>
  <video_metadata>
    <video_title>${videoTitle}</video_title>
    <video_description>${videoDescription}</video_description>
    <target_duration>${targetDuration}seconds</target_duration>
  </video_metadata>
  <vocabulary_depot>
    **GLOBAL PHYSICS RESOURCE POOL**: 
    This pool contains technical vocabulary mapped to physics_profile keys.
    Refer to <entity_list>.[n].\`physics_profile\` and match the 'Field' and 'Value' to select descriptors from the locked INTENSITY_TIER.
    
    ${globalVocabularyDepot}
  </vocabulary_depot>
  <scene_narration>${sceneNarration}</scene_narration>
  <master_style_guide>
    ${JSON.stringify(mappedMasterStyleInfo, null, 2)}
  </master_style_guide>
  <entity_list>
    ${JSON.stringify(mappedEntityList, null, 2)}
  </entity_list>
  <image_context>
    **START FRAME TRUTH**:
    The input image is the absolute visual ground truth (t=0).
    **INSTRUCTIONS**:
    - **Zero Redundancy**: Do NOT restate static visual details already visible (clothing, hair, structures, props).
    - **Delta-Only Focus**: ONLY describe the **Delta (change)** across four dimensions:
      1) **Primary Action**: Physical movement, inertia, and micro-expressions of subjects.
      2) **Cinematic Camera**: Dynamic 3D movement and optical shifts (focus, zoom).
      3) **Atmospheric Delta**: Fluid changes in lighting, weather, and air particles.
    - **Entity Interaction**: Describe how subjects interact with their environment based on the RESOURCE POOL.
  </image_context>
</input_context>
`;

            const client = new GoogleGenAI({ apiKey });
            const response = await client.models.generateContent({
                model: GeminiModel.GEMINI_2_5_FLASH_PREVIEW,
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: `
${developerMessage}

${userMessage}
`
                            },
                            {
                                inlineData: {
                                    mimeType: 'image/jpeg',
                                    data: imageBase64,
                                }
                            }
                        ]
                    }
                ],
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: videoGenResponseFormat,
                    temperature: 0.7,
                }
            })

            console.log(`Scene #${sceneNumber} postVideoGenPrompt() usage: `, JSON.stringify(response))
            const generatedContent = response.text;

            if (!generatedContent) {
                return {
                    success: false,
                    error: {
                        message: 'No video generation prompt generated from OpenAI',
                        code: 'EMPTY_RESPONSE'
                    }
                };
            }

            try {
                const parsedJson: {
                    logical_bridge: {
                        scene_fundamental_data: {
                            scene_summary: string;
                            scene_summary_reason: string;
                            primary_movement: string;
                            primary_movement_reason: string;
                            narrative_vibe: "NORMAL" | "CHAOTIC" | "COMBAT" | "ANXIOUS" | "CATASTROPHIC" | "VERTIGO" | "SHOCK" | "DREAMY" | "SURREAL" | "EMOTIONAL" | "FOCUS";
                            narrative_vibe_reason: string;
                            intensity_tier: "VERY_LOW" | "LOW" | "HIGH" | "VERY_HIGH";
                            intensity_tier_selected_reason: string;
                        };
                        identity_logic: string;
                        action_focus: string;
                        primary_narrative_block: {
                            entity_id: string;
                            raw_sentence: string;
                            action_type: string;
                            action_type_reason: string;
                            verb_reason: string;
                            adverb_reason: string;
                        }[];
                        atmospheric_lighting_delta: {
                            selected_atmospheric_or_lighting_layer: string;
                            selected_reason: string;
                        }[];
                        cinematic_camera_vectors: {
                            subject_vectors: {
                                sx: "$-X$"| "$0X$" | "$+X$";
                                sy: "$-Y$"| "$0Y$" | "$+Y$";
                                sz: "$-Z$"| "$0Z$" | "$+Z$";
                            };
                            subject_vectors_reasoning: string;
                        };
                        style: {
                            slot_1: string;
                            slot_2: string;
                            slot_1_reason: string;
                            slot_2_reason: string;
                        }
                    },
                    reasoning: string;
                    final_output_structure: {
                        primary_narrative_block: string;
                        atmospheric_lighting_delta: string;
                        cinematic_camera_vector: string;
                        style: string;
                    };
                    video_gen_prompt: string;
                } = JSON.parse(generatedContent);
                const {
                    scene_fundamental_data: {
                        scene_summary: sceneSummary,
                        scene_summary_reason: sceneSummaryReason,
                        primary_movement: primaryMovement,
                        primary_movement_reason: primaryMovementReason,
                        narrative_vibe: narrativeVibe,
                        narrative_vibe_reason: narrativeVibeReason,
                        intensity_tier: intensityTier,
                        intensity_tier_selected_reason: intensityTierSelectedReason,
                    },
                    identity_logic: identityLogic,
                    action_focus: actionFocus,
                    primary_narrative_block: primaryNarrativeBlock,
                    atmospheric_lighting_delta: atmosphericLightingDelta,
                    cinematic_camera_vectors: {
                        subject_vectors: subjectVectors,
                        subject_vectors_reasoning: subjectVectorsReasoning,
                    },
                    style: {
                        slot_1: slot1,
                        slot_2: slot2,
                        slot_1_reason: slot1Reason,
                        slot_2_reason: slot2Reason,
                    }
                } = parsedJson.logical_bridge;

                const {
                    primary_narrative_block: outputPrimaryNarrativeBlock,
                    atmospheric_lighting_delta: outputAtmosphericLightingDelta,
                    cinematic_camera_vector: outputCinematicCameraVector,
                    style: outputStyle,
                } = parsedJson.final_output_structure;

                const basePrompt = parsedJson.video_gen_prompt;
                const cameraVectorString = subjectVectorsToCameraVectorString(subjectVectors.sx, subjectVectors.sy, subjectVectors.sz, intensityTier, narrativeVibe);

                // 1. AI가 필드에 미리 발라놓은 'captured with' `등을 먼저 싹 닦아냅니다.
                const bridgePhrasesRegex = /\b(captured with|filmed with|captured with a|filmed using)\s+CINEMATIC_CAMERA_VECTORS/gi;
                // 필드 자체를 미리 세척 (이게 핵심입니다)
                const cleanedCameraField = outputCinematicCameraVector.replace(bridgePhrasesRegex, "CINEMATIC_CAMERA_VECTORS");
                const technicalLensString = generateTechnicalLensString(masterStyleInfo);
                const finalCinematicCameraVectorsBlock = `${technicalLensString}, ${cleanedCameraField}`;

                // 조립 함수 및 메인 로직 내 적용 예시
                const finalResultPrompt = outputCinematicCameraVector.includes("CINEMATIC_CAMERA_VECTORS")
                    ? isEntityListNotEmpty
                        ? assembleFullVideoGenPromptSentence(
                            outputPrimaryNarrativeBlock,
                            outputAtmosphericLightingDelta,
                            finalCinematicCameraVectorsBlock,
                            cameraVectorString,
                            outputStyle
                        )
                        : surgicallyReplaceVideoGenPromptByCameraKey(
                            basePrompt,
                            outputCinematicCameraVector,
                            cameraVectorString,
                            outputStyle,
                        )
                    : basePrompt.includes("CINEMATIC_CAMERA_VECTORS")
                        ? basePrompt.replace("CINEMATIC_CAMERA_VECTORS", `${cameraVectorString} ${outputCinematicCameraVector}`)
                        : basePrompt;


                console.log(`Scene #${sceneNumber} postVideoGenPrompt() Result`);
                console.log(`Scene Summary: ${sceneSummary}`);
                console.log(`Scene Summary Reason: ${sceneSummaryReason}`);
                console.log(`Primary Movement: ${primaryMovement}`);
                console.log(`Primary Movement Reason: ${primaryMovementReason}`);
                console.log(`Narrative Vibe: ${narrativeVibe}`);
                console.log(`Narrative Vibe Reason: ${narrativeVibeReason}`);
                console.log(`Selected INTENSITY_TIER: ${intensityTier}`);
                console.log(`INTENSITY_TIER Selected Reason: ${intensityTierSelectedReason}`);
                console.log(`Identity Logic: ${identityLogic}`);
                console.log(`Action Focus: ${actionFocus}`);

                if (primaryNarrativeBlock.length !== 0) {
                    console.log("- - - Primary Narrative Block - - -");
                    primaryNarrativeBlock.forEach((primaryNarrativeData) => {
                        const {
                            entity_id: entityId,
                            raw_sentence: rawSentence,
                            action_type: actionType,
                            action_type_reason: actionTypeReason,
                            verb_reason: verbReason,
                            adverb_reason: adverbReason,
                        } = primaryNarrativeData;

                        console.log(`Entity[${entityId}]`);
                        console.log(`Raw Sentence: ${rawSentence}`);
                        console.log(`Action Type: ${actionType}`);
                        console.log(`Action Type Reason: ${actionTypeReason}`);
                        console.log(`Verb Reason: ${verbReason}`);
                        console.log(`Adverb Reason: ${adverbReason}`);
                    })
                }

                if (atmosphericLightingDelta.length !== 0) {
                    console.log("- - - Atmospheric Lighting Delta - - -");
                    atmosphericLightingDelta.forEach((lightingDelta) => {
                        const {
                            selected_atmospheric_or_lighting_layer: selectedAtmosphericOrLightingLayer,
                            selected_reason: selectedReason,
                        } = lightingDelta;

                        console.log(`Delta: ${selectedAtmosphericOrLightingLayer}`);
                        console.log(`Delta Reason: ${selectedReason}`);
                    })
                }

                console.log("- - - Cinematic Camera Vectors - - -");

                console.log(`Camera Action: ${cameraVectorString}`);
                console.log(`Subject Vectors: [${subjectVectors.sx}, ${subjectVectors.sy}, ${subjectVectors.sz}]`);
                console.log(`Subject Vectors Reasoning: ${subjectVectorsReasoning}`);

                console.log("- - - Style - - -");
                console.log(`Style Slot 1: ${slot1}`);
                console.log(`Style Slot 2: ${slot2}`);
                console.log(`Style Slot 1 Reason: ${slot1Reason}`);
                console.log(`Style Slot 2 Reason: ${slot2Reason}`);

                console.log(`Reasoning: ${parsedJson.reasoning}`);
                console.log("- - - Final Output Structure - - -");
                console.log(`Primary Narrative Block: ${outputPrimaryNarrativeBlock}`);
                console.log(`Atmospheric/Lighting Delta: ${outputAtmosphericLightingDelta}`);
                console.log(`Cinematic Camera Vector: ${outputCinematicCameraVector}`);
                console.log(`Style: ${outputStyle}`);
                console.log(`videoGenPrompt: ${parsedJson.video_gen_prompt}`);
                console.log(`assembledVideoGenPrompt: ${finalResultPrompt}`);

                return {
                    success: true,
                    videoGenPrompt: finalResultPrompt.replaceAll("**", ""),
                }
            } catch (parseError) {
                console.error('JSON Parse Failed:', parseError);
                return {
                    success: false,
                    error: {
                        message: 'Invalid JSON format received from LLM',
                        code: 'INVALID_JSON_FORMAT'
                    }
                };
            }
        } catch (error) {
            console.error('Video generation prompt error:', error);
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error occurred',
                    code: 'INTERNAL_ERROR'
                }
            };
        }
    },

    // masterStylePositivePrompt 변경된 구조 맞춰 프롬프트 수정
    async postMusicGenerationData(
        videoTitle: string,
        videoDescription: string,
        fullNarrationScript: string,
        masterStyleInfo: MasterStyleInfo,
        sceneDataList: SceneData[]
    ): Promise<{
        success: boolean;
        status: number;
        data?: MusicGenerationData;
        error?: string
    }> {
        try {
            const apiKey = process.env.DEEPSEEK_API_KEY;
            if (!apiKey) {
                return {
                    success: false,
                    status: 400,
                    error: 'DeepSeek API Key is not configured',
                };
            }

            const developerMessage = POST_MUSIC_GENERATION_DATA_PROMPT;


            // AI에 전달할 데이터를 명확한 구조로 재구성
            const videoTotalDuration = sceneDataList.map((sceneData) => {
                return sceneData.sceneDuration;
            }).reduce((acc, duration) => {
                return acc + duration;
            }, 0.0);
            const videoSceneContextList = sceneDataList.map((sceneData) => {
                const sceneSubtitleSegmentList = sceneData.sceneSubtitleSegments;

                return {
                    sceneNumber: sceneData.sceneNumber,
                    sceneDuration: sceneSubtitleSegmentList && sceneSubtitleSegmentList.length !== 0
                        ? sceneSubtitleSegmentList[sceneSubtitleSegmentList.length - 1].endSec - sceneSubtitleSegmentList[0].startSec
                        : sceneData.sceneDuration,
                }
            });
            const masterStyleGuideData = {
                // 1. 시대 및 공간 (장르와 악기 구성의 결정적 근거)
                environment: {
                    era: masterStyleInfo.globalEnvironment.era,
                    location: masterStyleInfo.globalEnvironment.locationArchetype
                },
                // 2. 분위기 및 조명 (조성(Key)과 화성적 색채의 근거)
                atmosphere: {
                    tonality: masterStyleInfo.colorAndLight.tonality,
                    lighting: masterStyleInfo.colorAndLight.lightingSetup,
                    exposure: masterStyleInfo.optics.exposureVibe
                },
                // 3. 노이즈 및 질감 (오디오 FX 및 음질 스타일의 근거)
                fidelity: {
                    grainLevel: masterStyleInfo.fidelity.grainLevel // "Gritty" -> Vinyl Crackle/Lo-fi 등
                },
            }

            const userMessage = `
<input_data>
  <video_metadata>
    <video_duration>${videoTotalDuration} secs</video_duration>
    <video_title>${videoTitle}</video_title>
    <video_description>${videoDescription}</video_description>
  </video_metadata>
  <full_narration>${fullNarrationScript}</full_narration>
  <scene_context_list>${JSON.stringify(videoSceneContextList, null, 2)}</scene_context_list>
  <master_style_guide>${JSON.stringify(masterStyleGuideData, null, 2)}</master_style_guide>
</input_data>
`;

            const client = new OpenAI({
                baseURL: DEEPSEEK_BASE_URL,
                apiKey: apiKey,
            });

            const completion = await client.chat.completions.create({
                model: DeepSeekModel.DEEPSEEK_THINKING,
                messages: [
                    { role: 'system', content: developerMessage },
                    { role: 'user', content: userMessage }
                ],
                response_format: { type: 'json_object' },
                max_completion_tokens: 4096,
            });

            const generatedContent = completion.choices[0]?.message?.content;

            if (!generatedContent) {
                return {
                    success: false,
                    status: 500,
                    error: 'No music generation data from OpenAI',
                };
            }

            try {
                const parsedData: Omit<MusicGenerationData, 'audioWeight'> = JSON.parse(generatedContent);

                if (!parsedData.prompt || !parsedData.style || !parsedData.title) {
                    throw new Error("Missing one or more required fields: prompt, style, title");
                }

                return {
                    success: true,
                    status: 200,
                    data: {
                        ...parsedData,
                        audioWeight: 0.65,
                    }
                };
            } catch (parseError) {
                console.error('Failed to parse music generation JSON response:', parseError);
                return {
                    success: false,
                    status: 500,
                    error: 'Failed to parse music generation response from AI',
                };
            }
        } catch (error) {
            console.error('Music generation data error:', error);
            return {
                success: false,
                status: 500,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    },
}