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
    POST_MASTER_STYLE_INFO_PROMPT,
    POST_IMAGE_GEN_PROMPT_PROMPT,
    POST_IMAGE_GEN_PROMPT_NO_ENTITIES_PROMPT,
    POST_VIDEO_GEN_PROMPT_PROMPT,
    POST_MUSIC_GENERATION_DATA_PROMPT,
} from "@/api/types/open-ai/OpenAIPrompts";
import {MusicGenerationData} from "@/api/types/suno-api/MusicGenerationData";
import {Entity, InitialEntityManifestItem} from "@/api/types/open-ai/Entity";
import {PHYSICS_LIBRARY} from "@/api/types/open-ai/PhysicsPromptLibrary";
import {FluxPrompt, FluxPromptSubject} from "@/api/types/open-ai/FluxPrompt";

enum OpenAIModel {
    GPT_4O_MINI = "gpt-4o-mini-2024-07-18",
    GPT_O4_MINI = "o4-mini-2025-04-16",
}

const imageGenResponseFormat: OpenAI.ResponseFormatJSONSchema = {
    type: "json_schema",
    json_schema: {
        name: "image_gen_response",
        strict: true,
        schema: {
            type: "object",
            properties: {
                // 1. image_gen_prompt (FluxPrompt 인터페이스 완벽 매핑)
                image_gen_prompt: {
                    type: "object",
                    properties: {
                        scene: { type: "string" },
                        subjects: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    type: { type: "string" },
                                    description: { type: "string" },
                                    clothes: { type: "string" },
                                    accessories: {
                                        type: "array",
                                        items: { type: "string" },
                                    },
                                    pose: { type: "string" },
                                    position: {
                                        type: "string",
                                        enum: ["foreground", "midground", "background"]
                                    }
                                },
                                required: ["id", "type", "description", "clothes", "accessories", "pose", "position"],
                                additionalProperties: false
                            }
                        },
                        style: { type: "string" },
                        color_palette: { type: "array", items: { type: "string" } },
                        lighting: { type: "string" },
                        mood: { type: "string" },
                        background: { type: "string" },
                        composition: { type: "string" },
                        camera: {
                            type: "object",
                            properties: {
                                angle: { type: "string" },
                                distance: { type: "string" },
                                focus: { type: "string" },
                                lens: { type: "string" },
                                fNumber: { type: "string" },
                                ISO: { type: "number" }
                            },
                            required: ["angle", "distance", "focus", "lens", "fNumber", "ISO"],
                            additionalProperties: false
                        },
                        effects: { type: "array", items: { type: "string" } }
                    },
                    // FluxPrompt의 모든 필드를 필수(required)로 지정
                    required: [
                        "scene", "subjects", "style", "color_palette", "lighting", "mood",
                        "background", "composition", "camera", "effects"
                    ],
                    additionalProperties: false
                },

                // 2. image_gen_prompt_sentence
                image_gen_prompt_sentence: { type: "string" },

                // 3. updated_entity_manifest (Entity 인터페이스 매핑)
                // Omit<Entity, 'role' | 'type' | 'appearance_scenes' | 'demographics'>[]
                updated_entity_manifest: {
                    type: ["array", "null"], // Optional이므로 null 허용
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            // physics_profile (optional in TS -> nullable in schema)
                            physics_profile: {
                                type: ["object", "null"],
                                properties: {
                                    material: {
                                        type: "array",
                                        items: {
                                            type: "string",
                                            enum: ["rigid", "viscoelastic", "brittle", "cloth", "fluid", "elastoplastic", "granular"]
                                        }
                                    },
                                    action_context: {
                                        type: "array",
                                        items: {
                                            type: "string",
                                            enum: ["locomotion", "combat", "interaction", "aerodynamics", "passive", "velocity_max"]
                                        }
                                    }
                                },
                                required: ["material", "action_context"],
                                additionalProperties: false
                            },
                            // appearance object
                            appearance: {
                                type: "object",
                                properties: {
                                    clothing_or_material: { type: "string" },
                                    // Entity.ts에서 hair, accessories, bodyfeatures는 optional임 -> null 허용
                                    hair: { type: ["string", "null"] },
                                    accessories: { type: ["string", "null"] },
                                    body_features: { type: ["string", "null"] },
                                    position_descriptor: { type: ["string", "null"] }
                                },
                                // strict 모드에서는 optional 필드도 required 목록에 넣고 타입에 null을 허용해야 함
                                required: ["clothing_or_material", "hair", "accessories", "body_features", "position_descriptor"],
                                additionalProperties: false
                            },
                            // state object (optional in TS -> nullable in schema)
                            state: {
                                type: ["object", "null"],
                                properties: {
                                    pose: { type: "string" },
                                    expression: { type: ["string", "null"] }
                                },
                                required: ["pose", "expression"],
                                additionalProperties: false
                            }
                        },
                        // Entity의 필수 키들 (Omit 된 것 제외하고 남은 것들)
                        required: ["id", "physics_profile", "appearance", "state"],
                        additionalProperties: false
                    }
                }
            },
            // 최상위 required
            required: ["image_gen_prompt", "image_gen_prompt_sentence", "updated_entity_manifest"],
            additionalProperties: false
        }
    }
};

const videoGenResponseFormat: OpenAI.ResponseFormatJSONSchema = {
    type: "json_schema",
    json_schema: {
        name: "video_gen_response",
        strict: true,
        schema: {
            type: "object",
            properties: {
                logical_bridge: {
                    type: "object",
                    properties: {
                        intensity_tier: { type: "string" },
                        intensity_tier_selected_reason: { type: "string" },
                        identity_logic: { type: "string" },
                        action_focus: { type: "string" },
                        primary_narrative_block: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    entity_id: { type: "string" },
                                    raw_sentence: { type: "string" },
                                    action_type: { type: "string" },
                                    action_type_reason: { type: "string" },
                                    verb_reason: { type: "string" },
                                    adverb_reason: { type: "string" },
                                },
                                required: ["entity_id", "raw_sentence", "action_type", "action_type_reason", "verb_reason", "adverb_reason"],
                                additionalProperties: false
                            }
                        },
                        atmospheric_lighting_delta: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    selected_atmospheric_or_lighting_layer: { type: "string" },
                                    selected_reason: { type: "string" },
                                },
                                required: ["selected_atmospheric_or_lighting_layer", "selected_reason"],
                                additionalProperties: false,
                            }
                        },
                        cinematic_camera_vectors: {
                            type: "object",
                            properties: {
                                // Subject & Camera Axis Ref: [X: Screen Left <-> Screen Right], [Y: Screen Bottom <-> Screen Top], [Z: Deep Background <-> Screen Surface]
                                selected_camera_actions: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            camera_action: { type: "string" },
                                            camera_action_reason: { type: "string" },
                                        },
                                        required: ["camera_action", "camera_action_reason"],
                                        additionalProperties: false,
                                    },
                                },
                                subject_delta: {
                                    type: "object",
                                    properties: {
                                        x: { type: "string" },
                                        y: { type: "string" },
                                        z: { type: "string" },
                                    },
                                    required: ["x", "y", "z"],
                                    additionalProperties: false,
                                },
                                camera_delta: {
                                    type: "object",
                                    properties: {
                                        x: { type: "string" },
                                        y: { type: "string" },
                                        z: { type: "string" },
                                    },
                                    required: ["x", "y", "z"],
                                    additionalProperties: false,
                                },
                                vector_reasoning: { type: "string" },
                            },
                            required: ["subject_delta", "camera_delta", "vector_reasoning"],
                            additionalProperties: false,
                        },
                        style: {
                            type: "object",
                            properties: {
                                slot_1: { type: "string" },
                                slot_2: { type: "string" },
                                slot_1_reason: { type: "string" },
                                slot_2_reason: { type: "string" },
                            },
                            required: ["slot_1", "slot_2", "slot_1_reason", "slot_2_reason"],
                            additionalProperties: false,
                        }
                    },
                    required: ["intensity_tier", "intensity_tier_selected_reason", "identity_logic", "action_focus", "primary_narrative_block", "atmospheric_lighting_delta", "cinematic_camera_vectors", "style"],
                    additionalProperties: false
                },
                reasoning: { type: "string" },
                video_gen_prompt: { type: "string" },
            },
            required: [
                "logical_bridge",
                "reasoning",
                "video_gen_prompt",
            ],
            additionalProperties: false
        }
    }
};


export const openAIServerAPI = {
    async postScript(userPrompt: string): Promise<ScriptGenerationResponse> {
        try {
            // OpenAI API 키 확인
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                return {
                    success: false,
                    status: 400,
                    error: 'OpenAI API key is not configured',
                };
            }

            // 프롬프트를 OpenAI 형식으로 매핑
            const systemMessage = POST_SCRIPT_PROMPT;

            // OpenAI SDK 클라이언트 초기화
            const client = new OpenAI({ apiKey });

            // OpenAI API 호출
            const completion = await client.chat.completions.create({
                model: OpenAIModel.GPT_4O_MINI,
                // model: OpenAIModel.GPT_O4_MINI,
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
            const apiKey = process.env.OPENAI_API_KEY;
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
            const client = new OpenAI({ apiKey });

            // OpenAI API 호출
            const completion = await client.chat.completions.create({
                model: OpenAIModel.GPT_O4_MINI,
                messages: [
                    { role: 'developer', content: developerMessage },
                    {
                        role: 'user',
                        content: userMessage,
                    }
                ],
                // [핵심 1] JSON 모드 활성화 (o-series 지원)
                response_format: { type: "json_object" },
                // [핵심 2] 복합 추론(타이밍 계산 + 창작)이므로 medium 유지
                reasoning_effort: 'medium',
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

    async postMasterStyleInfo(
        style: StyleGenerationParams,
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
        masterStyleInfo?: MasterStyleInfo;
        entityManifestList?: InitialEntityManifestItem[];
        sceneCastingDataList?: {
            sceneNumber: number;
            castIdList: string[];
        }[];
        error?: {
            message: string;
            code: string
        }
    }> {
        try {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                return {
                    success: false,
                    error: {
                        message: 'OpenAI API key is not configured',
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
</input_data>

Instruction: Analyze the input <target_aspect_ratio>, <style_guidelines>, <full_script_context> to generate the \`masterStyle\` and \`entityManifest\` JSON output.
`;

            const client = new OpenAI({ apiKey });

            const completion = await client.chat.completions.create({
                model: OpenAIModel.GPT_O4_MINI, // 복잡한 분석이므로 o4-mini 적합
                messages: [
                    { role: 'developer', content: developerMessage },
                    { role: 'user', content: userMessage }
                ],
                response_format: { type: "json_object" },
                reasoning_effort: 'medium',
                max_completion_tokens: 12288, // [팁] Entity Manifest가 길어질 수 있으므로 토큰 한도를 넉넉히 늘렸습니다.
            });

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
                    masterStyleInfo: MasterStyleInfo;
                    entityManifest: InitialEntityManifestItem[];
                    entityReasoningList: {
                        scene_number: number,
                        entity_reasoning_list: {
                            id: string;
                            reasoning: string;
                        }[],
                        scene_empty_reasoning: string
                    }[];
                    sceneCastingList: {
                        scene_number: number;
                        castIdList: string[];
                        casting_logic: string;
                    }[],
                } = JSON.parse(generatedResult);

                for (const entityReasoningData of parsedData.entityReasoningList) {
                    const {
                        scene_number: sceneNumber,
                        entity_reasoning_list: sceneEntityReasoningList,
                        scene_empty_reasoning: sceneEmptyReasoning,
                    } = entityReasoningData;

                    console.log(`Scene #${sceneNumber} Reasoning`);

                    if (sceneEntityReasoningList.length !== 0) {
                        for (const sceneEntityReasoningData of sceneEntityReasoningList) {
                            console.log(`Entity[${sceneEntityReasoningData.id}] Reason: ${sceneEntityReasoningData.reasoning}`)
                        }
                    } else {
                        console.log(`Empty: ${sceneEmptyReasoning}`);
                    }
                }

                for (const sceneCastingData of parsedData.sceneCastingList.sort((a, b) => a.scene_number - b.scene_number)) {
                    const {
                        scene_number: sceneNumber,
                        castIdList,
                        casting_logic: castingLogic,
                    } = sceneCastingData;

                    console.log(`Scene #${sceneNumber} Cast: ${castIdList.join(', ')}`);
                    console.log(`Scene #${sceneNumber} Casting Logic: ${castingLogic}`);
                }

                return {
                    success: true,
                    // 구조 분해 할당
                    masterStyleInfo: parsedData.masterStyleInfo,
                    entityManifestList: parsedData.entityManifest, // 추출된 캐릭터 시트 반환
                    sceneCastingDataList: parsedData.sceneCastingList.map((sceneCasting) => {
                        return {
                            sceneNumber: sceneCasting.scene_number,
                            castIdList: sceneCasting.castIdList,
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

    async postImageGenPrompt(
        imageGenPromptDirective: string,
        masterStylePromptInfo: MasterStyleInfo,
        sceneNarration: string,
        sceneNumber: number,
        videoTitle: string,
        videoDescription: string,
        sceneEntityManifestList: InitialEntityManifestItem[],
        aspectRatio: VideoAspectRatio = VIDEO_ASPECT_RATIOS.PORTRAIT_9_16
    ): Promise<{
        success: boolean;
        imageGenPrompt?: FluxPrompt;
        imageGenPromptSentence?: string;
        entityManifestList?: Entity[],
        error?: {
            message: string;
            code: string
        }
    }> {
        try {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                return {
                    success: false,
                    error: {
                        message: 'OpenAI API key is not configured',
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

            const client = new OpenAI({ apiKey });
            const completion = await client.chat.completions.create({
                // model: OpenAIModel.GPT_O4_MINI,
                model: OpenAIModel.GPT_4O_MINI,
                messages: [
                    { role: 'developer', content: developerMessage },
                    { role: 'user', content: userMessage }
                ],
                response_format: imageGenResponseFormat,
                // response_format: { type: 'json_object' },
                // reasoning_effort: 'medium',
                // max_completion_tokens: 40960,
                max_completion_tokens: 16384,
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
                console.log(`Scene #${sceneNumber} raw generated content: ${generatedContent}`)
                const instructionJSON: {
                    image_gen_prompt: FluxPrompt;
                    image_gen_prompt_sentence: string;
                    updated_entity_manifest?: Omit<Entity, 'role' | 'type' | 'demographics'>[]
                } = JSON.parse(generatedContent);

                const imageGenPrompt = instructionJSON.image_gen_prompt;
                const imageGenPromptSentence = instructionJSON.image_gen_prompt_sentence;
                const updatedEntityManifestList = instructionJSON.updated_entity_manifest;

                return {
                    success: true,
                    // imageGenPrompt: imageGenPrompt,
                    imageGenPrompt: {
                        ...imageGenPrompt,
                        subjects: imageGenPrompt.subjects.map((subject) => {
                            const matchedEntity = sceneEntityManifestList.find((entity) => entity.id === subject.id);

                            if (!matchedEntity) throw Error("Generated imageGenPrompt data is invalid.")

                            return {
                                ...subject,
                                role: matchedEntity.role as 'main_hero' | 'sub_character' | 'prop',
                            }
                        })
                    },
                    imageGenPromptSentence: imageGenPromptSentence,
                    entityManifestList: updatedEntityManifestList ? updatedEntityManifestList.map(instruction => {
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
                    }) : [],
                };
            } catch (jsonError) {
                console.error('Failed to parse generated JSON:', jsonError);
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
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                return {
                    success: false,
                    error: {
                        message: 'OpenAI API key is not configured',
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

            // OpenAI SDK 클라이언트 초기화 및 API 호출
            const client = new OpenAI({ apiKey });
            const completion = await client.chat.completions.create({
                // model: OpenAIModel.GPT_O4_MINI,
                model: OpenAIModel.GPT_4O_MINI,
                messages: [
                    { role: 'developer', content: developerMessage },
                    {
                        role: 'user',
                        content: [
                            {
                                type: "text",
                                text: userMessage,
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/png;base64,${imageBase64}`,
                                    detail: "high",
                                }
                            }
                        ]
                    }
                ],
                // reasoning_effort: 'medium',
                // response_format: { type: 'json_object' },
                response_format: videoGenResponseFormat,
                // max_completion_tokens: 20480,
                max_completion_tokens: 16384,
            });

            console.log(`Scene #${sceneNumber} postVideoGenPrompt() usage: `, JSON.stringify(completion.usage))
            const generatedContent = completion.choices[0]?.message?.content;

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
                        intensity_tier: string;
                        intensity_tier_selected_reason: string;
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
                            selected_camera_actions: {
                                camera_action: string;
                                camera_action_reason: string;
                            }[];
                            subject_delta: {
                                x: string;
                                y: string;
                                z: string;
                            };
                            camera_delta: {
                                x: string;
                                y: string;
                                z: string;
                            };
                            vector_reasoning: string,
                        };
                        style: {
                            slot_1: string;
                            slot_2: string;
                            slot_1_reason: string;
                            slot_2_reason: string;
                        }
                    },
                    reasoning: string;
                    video_gen_prompt: string;
                } = JSON.parse(generatedContent);
                const {
                    intensity_tier: intensityTier,
                    intensity_tier_selected_reason: intensityTierSelectedReason,
                    identity_logic: identityLogic,
                    action_focus: actionFocus,
                    primary_narrative_block: primaryNarrativeBlock,
                    atmospheric_lighting_delta: atmosphericLightingDelta,
                    cinematic_camera_vectors: {
                        selected_camera_actions: selectedCameraActions,
                        subject_delta: subjectDelta,
                        camera_delta: cameraDelta,
                        vector_reasoning: vectorReasoning,
                    },
                    style: {
                        slot_1: slot1,
                        slot_2: slot2,
                        slot_1_reason: slot1Reason,
                        slot_2_reason: slot2Reason,
                    }
                } = parsedJson.logical_bridge;


                console.log(`Scene #${sceneNumber} postVideoGenPrompt() Result`);
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
                if (selectedCameraActions.length !== 0) {
                    selectedCameraActions.forEach((cameraActionData, index) => {
                        const {
                            camera_action: cameraAction,
                            camera_action_reason: cameraActionReason,
                        } = cameraActionData;

                        console.log(`Camera Action ${index + 1}: ${cameraAction}`);
                        console.log(`Camera Action ${index + 1} Reason: ${cameraActionReason}`);
                    })
                }
                console.log(`Subject Delta: ${subjectDelta.x}, ${subjectDelta.y}, ${subjectDelta.z}`);
                console.log(`Camera Delta: ${cameraDelta.x}, ${cameraDelta.y}, ${cameraDelta.z}`);
                console.log(`Camera Vectors Reasoning: ${vectorReasoning}`);

                console.log("- - - Style - - -");
                console.log(`Style Slot 1: ${slot1}`);
                console.log(`Style Slot 2: ${slot2}`);
                console.log(`Style Slot 1 Reason: ${slot1Reason}`);
                console.log(`Style Slot 2 Reason: ${slot2Reason}`);

                console.log(`Reasoning: ${parsedJson.reasoning}`);
                console.log(`videoGenPrompt: ${parsedJson.video_gen_prompt}`);

                return {
                    success: true,
                    videoGenPrompt: parsedJson.video_gen_prompt,
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
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                return {
                    success: false,
                    status: 400,
                    error: 'OpenAI API key is not configured',
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

            const client = new OpenAI({ apiKey });

            const completion = await client.chat.completions.create({
                model: OpenAIModel.GPT_O4_MINI,
                messages: [
                    { role: 'developer', content: developerMessage },
                    { role: 'user', content: userMessage }
                ],
                reasoning_effort: 'medium',
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