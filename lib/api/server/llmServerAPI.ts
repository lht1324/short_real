import {
    POST_SCRIPT_PROMPT,
    POST_SCENE_SEGMENTATION_PROMPT,
    POST_SCENE_CASTING_DATA_LIST_PROMPT,
    POST_ENTITY_MANIFEST_LIST,
    POST_MASTER_STYLE_INFO_PROMPT,
    POST_IMAGE_GEN_PROMPT_PROMPT,
    POST_VIDEO_GEN_PROMPT_PROMPT,
    POST_MUSIC_GENERATION_DATA_PROMPT,
} from "@/lib/api/types/open-ai/LLMPrompts";
import { VIDEO_ASPECT_RATIOS, VideoAspectRatio } from "@/lib/ReplicateData";
import { ScriptGenerationResponse } from "@/lib/api/types/open-ai/ScriptGeneration";
import { StyleGenerationParams } from "@/lib/api/types/supabase/Styles";
import { SceneData, SubtitleSegment } from "@/lib/api/types/supabase/VideoGenerationTasks";
import { StoryboardData } from "@/lib/api/types/api/open-ai/scene/PostOpenAISceneResponse";
import { Entity, InitialEntityManifestItem } from "@/lib/api/types/open-ai/Entity";
import { MasterStyleInfo } from "@/lib/api/types/supabase/MasterStyleInfo";
import { FluxPrompt } from "@/lib/api/types/open-ai/FluxPrompt";
import { MusicGenerationData } from "@/lib/api/types/suno-api/MusicGenerationData";
import { cleanAndParseJSON } from "@/utils/jsonUtils";
import { logger } from "@trigger.dev/sdk";
import { OpenRouterClient, OpenRouterModel } from "@/lib/OpenRouterClient";
import {STYLE_DATA_LIST} from "@/lib/styles";

export const llmServerAPI = {
    async postScript(userPrompt: string): Promise<ScriptGenerationResponse | null> {
        try {
            const client = new OpenRouterClient();

            const generatedContent = await client.createCompletion({
                model: OpenRouterModel.DEEPSEEK_V_3_2,
                systemMessage: POST_SCRIPT_PROMPT,
                userMessage: userPrompt,

                // [핵심 1] 창의적 글쓰기: 0.7 ~ 0.9 권장 (리포트 4.1)
                temperature: 0.8,
                // [핵심 2] 반복 억제: 0.0 ~ 0.5 (리포트 4.3)
                presencePenalty: 0.2,
                frequencyPenalty: 0.2,
                maxCompletionTokens: 3072,
            }, "postScript()");

            if (!generatedContent) {
                return {
                    success: false,
                    status: 500,
                    error: 'No script generated from OpenRouter'
                };
            }

            try {
                const parsedData: {
                    scene_number: number;
                    narration: string;
                }[] = cleanAndParseJSON(generatedContent);

                // 1. 순서 보장 (AI가 가끔 순서를 섞어 줄 때를 대비해 오름차순 정렬)
                const sortedScenes = parsedData.sort((a, b) => a.scene_number - b.scene_number);

                // 2. 하나의 문자열로 결합 (double new line으로 구분)
                const generatedScript = sortedScenes.map(item => item.narration).join('\n\n');

                // 3. 스크립트 분석 (단어 수 및 예상 시간 계산)
                // 정규식으로 공백(스페이스, 탭, 개행)을 기준으로 split 하여 정확도 향상
                const wordCount = generatedScript.trim().split(/\s+/).length;
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
                console.error(`Parsing generated contents failed: `, error);

                return {
                    success: false,
                    status: 500,
                    error: error instanceof Error ? error.message : 'Unknown error occurred'
                };
            }
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
            const systemMessage = POST_SCENE_SEGMENTATION_PROMPT;

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

            const client = new OpenRouterClient();

            const generatedContent = await client.createCompletion({
                model: OpenRouterModel.DEEPSEEK_V_3_2,
                systemMessage: systemMessage,
                userMessage: userMessage,
                reasoning: true,
                maxCompletionTokens: 8192,
            }, "postSceneSegmentation()");
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
                } = cleanAndParseJSON(generatedContent);

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

    async postSceneCastingDataList(
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
            // 수정한 프롬프트 (Pre-Production 역할)
            const systemMessage = POST_SCENE_CASTING_DATA_LIST_PROMPT;

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

            const client = new OpenRouterClient();

            const generatedContent = await client.createCompletion({
                model: OpenRouterModel.DEEPSEEK_V_3_2,
                systemMessage: systemMessage,
                userMessage: userMessage,
                reasoning: true,
                maxCompletionTokens: 20480,
            }, "postSceneCastingDataList()");

            if (!generatedContent) {
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
                } = cleanAndParseJSON(generatedContent);

                logger.info(`postEntityCasting() raw content`, {
                    rawContent: generatedContent
                });

                const {
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

                        logger.info(`Scene #${sceneNumber} Analysis`, {
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

                return {
                    success: true,
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

    async postEntityManifestList(
        scriptDataList: {
            sceneNumber: number;
            sceneNarration: string;
        }[],
        videoTitle: string,
        videoDescription: string,
        videoDuration: number,
        sceneCastingDataList: {
            sceneNumber: number;
            castIdList: string[];
            sceneVisualDescription: string;
        }[],
        aspectRatio: VideoAspectRatio = VIDEO_ASPECT_RATIOS.PORTRAIT_9_16
    ): Promise<{
        success: boolean;
        entityManifestList?: InitialEntityManifestItem[];
        error?: {
            message: string;
            code: string
        }
    }> {
        try {
            // 수정한 프롬프트 (Pre-Production 역할)
            const systemMessage = POST_ENTITY_MANIFEST_LIST;

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
  <scene_casting_list>
    ${JSON.stringify(sceneCastingDataList, null, 2)}
  </scene_casting_list>
</input_data>

Instruction: Analyze <video_metadata>, <target_aspect_ratio>, <style_guidelines> and <full_script_context> to generate the \`scene_casting_list\` and \`entity_manifest_list\` JSON output.
`;

            const client = new OpenRouterClient();

            const generatedContent = await client.createCompletion({
                model: OpenRouterModel.DEEPSEEK_V_3_2,
                systemMessage: systemMessage,
                userMessage: userMessage,
                reasoning: true,
                maxCompletionTokens: 20480,
            }, "postEntityManifestList()");

            if (!generatedContent) {
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
                } = cleanAndParseJSON(generatedContent);

                logger.info(`postEntityCasting() raw content`, {
                    rawContent: generatedContent
                });

                const {
                    entity_manifest_list: entityManifestList,
                } = parsedData;

                logger.info(`Final Entity Manifest List`, {
                    entityIds: entityManifestList.map((entity) => entity.id),
                    totalCount: entityManifestList.length
                });

                return {
                    success: true,
                    // 구조 분해 할당
                    entityManifestList: entityManifestList, // 추출된 캐릭터 시트 반환
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
            // 수정한 프롬프트 (Pre-Production 역할)
            const systemMessage = POST_MASTER_STYLE_INFO_PROMPT;

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

            logger.info(`postMasterStyleInfo()`);

            const client = new OpenRouterClient();

            const generatedContent = await client.createCompletion({
                model: OpenRouterModel.DEEPSEEK_V_3_2,
                systemMessage: systemMessage,
                userMessage: userMessage,
                reasoning: true,
                maxCompletionTokens: 10240,
            }, "postMasterStyleInfo()");

            if (!generatedContent) {
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
                } = cleanAndParseJSON(generatedContent);

                logger.info(`postMasterStyleInfo() raw content`, {
                    rawContent: generatedContent
                });

                const {
                    master_style_info: masterStyleInfo,
                } = parsedData;


                logger.info(`MasterStyleInfo`, {
                    masterStyleInfo: masterStyleInfo,
                });

                return {
                    success: true,
                    // 구조 분해 할당
                    masterStyleInfo: masterStyleInfo,
                };
            } catch (parseError) {
                logger.error('Failed to parse pre-production JSON response:', {
                    parseError: parseError,
                });
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
            const styleData = STYLE_DATA_LIST.find((style) => {
                return style.uiMetadata.id === styleId;
            });

            if (!styleData) {
                throw Error("StyleId is invalid.");
            }

            const systemMessage = POST_IMAGE_GEN_PROMPT_PROMPT;

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
  <entity_list>${JSON.stringify(sceneEntityManifestList, null, 2)}</entity_list>
  <current_narration>
    ${sceneNarration}
  </current_narration>
  <scene_content>
    ${imageGenPromptDirective}
  </scene_content>
  <scene_visual_description>${sceneVisualDescription}</scene_visual_description>
  <style_data>${JSON.stringify(styleData, null, 2)}</style_data>
</input_data>

Instruction: Generate the scene instruction JSON.
**CRITICAL**: You are the Physics Architect.
1. Populate 'physics_profile' based on the 3-Layer Logic.
2. Enrich 'appearance' with visual cues that imply that physics (e.g., textures, damage).
3. Define 'state' with a physically accurate pose.
`;

            const client = new OpenRouterClient();

            const generatedContent = await client.createCompletion({
                model: OpenRouterModel.DEEPSEEK_V_3_2,
                systemMessage: systemMessage,
                userMessage: userMessage,
                reasoning: true,
                maxCompletionTokens: 20480,
                temperature: 0.7,
            }, `Scene #${sceneNumber} postImageGenPrompt()`);

            if (!generatedContent) {
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
                    image_gen_prompt: FluxPrompt;
                    image_gen_prompt_sentence: string;
                    updated_entity_manifest_list?: Omit<Entity, 'role' | 'type' | 'demographics'>[] | null
                } = cleanAndParseJSON(generatedContent);

                const {
                    image_gen_prompt: imageGenPrompt,
                    image_gen_prompt_sentence: imageGenPromptSentence,
                    updated_entity_manifest_list: updatedEntityManifestList,
                } = instructionJSON;

                logger.info(`Scene #${sceneNumber} imageGenPrompt`, {
                    imageGenPrompt: imageGenPrompt,
                })

                const newEntityManifestList = updatedEntityManifestList ? updatedEntityManifestList.map(instruction => {
                    const originalEntity = sceneEntityManifestList.find((entityManifest) => {
                        return entityManifest.id === instruction.id;
                    });

                    if (!originalEntity) {
                        logger.warn(`Warning: LLM generated unknown ID '${instruction.id}'`);
                        throw Error("LLM generated unknown ID '${instruction.id}'.")
                    }

                    return {
                        // LLM이 생성한 핵심 물리/시각 데이터로 덮어쓰기
                        id: instruction.id,
                        type: originalEntity.type,
                        demographics: originalEntity.demographics,
                        appearance: {
                            ...originalEntity.appearance,
                            ...instruction.appearance,
                        },
                        role: originalEntity.role,
                    };
                }) : [];

                logger.info(`Scene #${sceneNumber} ImageGenPromptSentence`, {
                    imageGenPromptSentence: imageGenPromptSentence,
                });

                return {
                    success: true,
                    imageGenPrompt: imageGenPrompt,
                    imageGenPromptSentence: imageGenPromptSentence,
                    sceneEntityManifestList: newEntityManifestList,
                };
            } catch (jsonError) {
                logger.error('Failed to parse generated JSON:', {
                    jsonError: jsonError,
                });

                logger.info(`Scene #${sceneNumber} raw generated content`, {
                    rawContent: generatedContent.replace(/[\r\n]+/g, ""),
                });
                return {
                    success: false,
                    error: {
                        message: 'Generated content is not valid JSON',
                        code: 'INVALID_JSON_OUTPUT'
                    }
                };
            }
        } catch (error) {
            logger.error('OpenAI image generation prompt error:', {
                error: error
            });
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
        sceneNumber: number,
        imageBase64: string,
    ): Promise<{
        success: boolean;
        videoGenPrompt?: string;
        error?: { message: string; code: string }
    }> {
        try {
            const systemMessage = POST_VIDEO_GEN_PROMPT_PROMPT;

            // 4. User Message 구성 (physics_instruction_set 주입)
            const userMessage = `
The attached image is the base frame for I2V video generation.
Analyze its visual context and latent kinetic energy to architect a professional cinematic prompt.
Focus strictly on the motion delta and kinematic progression as defined in the system logic.
Proceed with the prompt generation.
            `;

            const client = new OpenRouterClient();

            const generatedContent = await client.createCompletion({
                model: OpenRouterModel.GEMINI_3_0_FLASH_PREVIEW,
                systemMessage: systemMessage,
                userMessage: userMessage,
                imageBase64List: [imageBase64],
                imageDetail: "high",
                maxCompletionTokens: 16384,
            }, `Scene #${sceneNumber} postVideoGenPrompt()`);

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
                    video_gen_prompt: string;
                } = cleanAndParseJSON(generatedContent);

                console.log(`videoGenPrompt: ${parsedJson.video_gen_prompt}`);

                return {
                    success: true,
                    videoGenPrompt: parsedJson.video_gen_prompt,
                }
            } catch (parseError) {
                console.error('JSON Parse Failed:', parseError);
                console.log(`Scene #${sceneNumber} raw content: ${generatedContent}`);
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
            const systemMessage = POST_MUSIC_GENERATION_DATA_PROMPT;


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

            const client = new OpenRouterClient();

            const generatedContent = await client.createCompletion({
                model: OpenRouterModel.DEEPSEEK_V_3_2,
                systemMessage: systemMessage,
                userMessage: userMessage,
                maxCompletionTokens: 8192,
            }, `postMusicGenerationData()`);

            if (!generatedContent) {
                return {
                    success: false,
                    status: 500,
                    error: 'No music generation data from OpenAI',
                };
            }

            try {
                const parsedData: Omit<MusicGenerationData, 'audioWeight'> = cleanAndParseJSON(generatedContent);

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