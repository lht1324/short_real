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
import {Entity, InitialEntityManifestItem, PhysicsProfile} from "@/api/types/open-ai/Entity";
import {PHYSICS_LIBRARY} from "@/api/types/open-ai/PhysicsPromptLibrary";
import {FluxPrompt} from "@/api/types/open-ai/FluxPrompt";

enum OpenAIModel {
    GPT_4O_MINI = "gpt-4o-mini-2024-07-18",
    GPT_O4_MINI = "o4-mini-2025-04-16",
}

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
        aspectRatio: VideoAspectRatio = VIDEO_ASPECT_RATIOS.PORTRAIT_9_16
    ): Promise<{
        success: boolean;
        masterStyleInfo?: MasterStyleInfo;
        entityManifestList?: InitialEntityManifestItem[];
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
                max_completion_tokens: 8192, // [팁] Entity Manifest가 길어질 수 있으므로 토큰 한도를 넉넉히 늘렸습니다.
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

                return {
                    success: true,
                    // 구조 분해 할당
                    masterStyleInfo: parsedData.masterStyleInfo,
                    entityManifestList: parsedData.entityManifest.map((entity) => {
                        return {
                            ...entity,
                            appearance_scenes: entity.appearance_scenes.map((appearanceSceneNumber) => {
                                // 방어 로직 (실제 문자열로 들어가는 케이스 발견)
                                return typeof appearanceSceneNumber === "string"
                                    ? parseInt(appearanceSceneNumber)
                                    : appearanceSceneNumber;
                            }),
                        }
                    }), // 추출된 캐릭터 시트 반환
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
                model: OpenAIModel.GPT_O4_MINI,
                messages: [
                    { role: 'developer', content: developerMessage },
                    { role: 'user', content: userMessage }
                ],
                response_format: { type: 'json_object' },
                reasoning_effort: 'high',
                max_completion_tokens: 12288,
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
                    image_gen_prompt: FluxPrompt;
                    updated_entity_manifest?: Omit<Entity, 'role' | 'type' | 'appearance_scenes' | 'demographics'>[]
                } = JSON.parse(generatedContent);

                const imageGenPrompt = instructionJSON.image_gen_prompt;
                const updatedEntityManifestList = instructionJSON.updated_entity_manifest;

                return {
                    success: true,
                    imageGenPrompt: imageGenPrompt,
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
                            appearance_scenes: originalEntity.appearance_scenes,
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
        entityManifestList: Entity[],
    ): Promise<{
        success: boolean;
        videoGenPrompt?: string;
        videoGenPromptShort?: string;
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
            // const developerMessage = isEntityListNotEmpty
            //     ? POST_VIDEO_GEN_PROMPT_PROMPT
            //     : POST_VIDEO_GEN_PROMPT_NO_ENTITIES_PROMPT;
            const developerMessage = POST_VIDEO_GEN_PROMPT_PROMPT;

            // [핵심] Physics Profile을 기반으로 물리 법칙 텍스트 생성 (Code Level Injection)
            // 메인 히어로 또는 씬에 등장하는 주요 엔티티들의 물리 속성을 추출하여 문자열로 변환

            const activeEntityPhysicsList = isEntityListNotEmpty
                ? entityManifestList
                    .filter((entity) => !!(entity.physics_profile))
                    .map((entity) => {
                        // 1. 타입 단언 (render_mode 제거됨)
                        const {
                            material: materialList,
                            action_context: actionContextList,
                        } = entity.physics_profile as PhysicsProfile;

                        // 2. 데이터 수집용 Set 초기화
                        const effectTags = new Set<string>();
                        const visualVocabularyPool = new Set<string>(); // 여기에 모든 단어를 합칩니다
                        const cameraTechs = new Set<string>();
                        const speedTerms = new Set<string>();

                        // 3. Material 데이터 수집
                        materialList.forEach((materialKey) => {
                            const data = PHYSICS_LIBRARY.material[materialKey];
                            if (data) {
                                // 이펙트 태그 수집
                                effectTags.add(`"${data.effect_tag}"`);
                                effectTags.add(`"${data.alt_tag}"`);

                                // [Action] Material 단어장 수집 (배열의 모든 단어를 Set에 추가)
                                data.vocabulary.forEach(word => visualVocabularyPool.add(word));
                            }
                        });

                        // 4. Action Context 데이터 수집 (여기에 Vocabulary 추가 로직 포함)
                        actionContextList.forEach((contextKey) => {
                            const data = PHYSICS_LIBRARY.action_context[contextKey];
                            if (data) {
                                // 카메라 & 속도 수집
                                cameraTechs.add(data.camera_tech);
                                speedTerms.add(data.speed_term);

                                // [Action] Action Context 단어장 수집 (Material과 같은 Pool에 합침)
                                data.vocabulary.forEach(word => visualVocabularyPool.add(word));
                            }
                        });

                        // 데이터가 하나도 없으면 null 반환
                        if (effectTags.size === 0 && cameraTechs.size === 0) return null;

                        // 5. 포맷팅
                        // Visual Hints -> Visual Vocabulary Pool로 명칭 변경 (프롬프트 의도에 맞춤)
                        return `
[Entity Role: ${entity.role}]
- **Visual Effect Candidates**: ${Array.from(effectTags).join(' OR ')}
- **Visual Vocabulary Pool**: ${Array.from(visualVocabularyPool).join(', ')}
- **Camera Tech Options**: ${Array.from(cameraTechs).join(', ')}
- **Velocity Options**: ${Array.from(speedTerms).join(', ')}
`;
                    })
                    .filter(Boolean)
                    .join('\n')
                : '';

            const mappedEntityList = isEntityListNotEmpty
                ? entityManifestList.map((entity) => {
                    // 옷/재질 정보에서 너무 긴 묘사는 잘라내거나 핵심만 남기는 전처리도 좋음 (여기서는 그대로 전달하되 프롬프트로 제어)
                    return {
                        role: entity.role,
                        type: entity.type,
                        demographics: entity.demographics, // 예: "Latino, late 20s" (식별용)

                        position: entity.appearance.position_descriptor ?? "",

                        distinguishing_features: {
                            hair: entity.appearance.hair, // 예: "Short buzz cut" -> "The buzz-cut boxer"
                            clothing: entity.appearance.clothing_or_material, // 예: "Red satin shorts" -> "The boxer in red"
                        }
                    };
                })
                : []
            // 4. User Message 구성 (physics_instruction_set 주입)
//             const userMessage = `
// <input_context>
//   <video_metadata>
//     <video_title>${videoTitle}</video_title>
//     <video_description>${videoDescription}</video_description>
//     <target_duration>${targetDuration}seconds</target_duration>
//   </video_metadata>
//   ${isEntityListNotEmpty ? `<vocabulary_depot>
//     **RESOURCE POOL**: Select keywords from here to construct the Dry S-A-C prompt.
//     DO NOT use these as descriptions. Use them as tags.
//     ${activeEntityPhysicsList}
//   </vocabulary_depot>` : ""}
//   <scene_narration>${sceneNarration}</scene_narration>
//   ${!isEntityListNotEmpty && `<master_style_guide>
//     ${JSON.stringify(masterStyleInfo, null, 2)}
//   </master_style_guide>`}
//   ${isEntityListNotEmpty ? `<entity_list>
//     ${JSON.stringify(mappedEntityList, null, 2)}
//   </entity_list>` : ""}
//   <image_context>
//     **START FRAME TRUTH**:
//     The input image is the visual ground truth.
//   ${isEntityListNotEmpty ? `
//     - Do NOT describe the character's appearance (It is already there).
//     - ONLY describe the **Movement** (Action) and **Camera** (Composition).
//   ` : `
//     - Treat the **location/environment** as the subject (no characters).
//     - Do NOT introduce **people/characters/silhouettes** or any new **objects/structures** not present in the image.
//     - Do NOT restate static visual details already visible in the image (buildings, terrain, props).
//     - ONLY describe **what changes over time**:
//       1) **Environmental physics**: fog rolls/billows, rain falls/slashes, wind sways foliage, dust motes drift, water ripples, light flickers/gleams.
//       2) **Camera movement**: dolly in/out, orbit, pan, tilt, crane, tracking — with speed matched to target duration.
//     - If narration mentions human actions, convert them to **actorless effects** (e.g., “footsteps splash in puddles”) or ignore.
//     - Use **positive exclusion** phrasing when needed (e.g., “empty”, “unpopulated”, “abandoned”).
//     - Adding **atmospheric VFX** (rain, fog, wind, lighting changes) implied by the narration is allowed and encouraged.
//   `}
//   </image_context>
// </input_context>
// `;
            const userMessage = `
<input_context>
  <video_metadata>
    <video_title>${videoTitle}</video_title>
    <video_description>${videoDescription}</video_description>
    <target_duration>${targetDuration}seconds</target_duration>
  </video_metadata>
  <vocabulary_depot>
    **RESOURCE POOL**: Select keywords from here to construct the Dry S-A-C prompt.
    DO NOT use these as descriptions. Use them as tags.
    ${activeEntityPhysicsList}
  </vocabulary_depot>
  <scene_narration>${sceneNarration}</scene_narration>
  <master_style_guide>
    ${JSON.stringify(masterStyleInfo, null, 2)}
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
                model: OpenAIModel.GPT_O4_MINI,
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
                reasoning_effort: 'high',
                response_format: { type: 'json_object' },
                max_completion_tokens: 8192,
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

            // [선택 사항] 유효성 검사: JSON 파싱이 가능한지 미리 확인
            try {
                // const parsedJson: {
                //     video_gen_prompt: string;
                //     reasoning: string;
                //     logical_bridge: {
                //         identity_logic: string,
                //         action_mode: {
                //             "assessment": string,
                //             "selected_mode": "A" | "B"
                //         },
                //         action_focus: string;
                //     } | {
                //         anchor_logic: string;
                //         physics_logic: string;
                //         camera_logic: string;
                //     }
                // } = JSON.parse(generatedContent);
                //
                // console.log(`Scene #${sceneNumber} postVideoGenPrompt() Result`);
                // if (isEntityListNotEmpty) {
                //     const {
                //         identity_logic: identityLogic,
                //         action_mode: {
                //             assessment,
                //             selected_mode: selectedMode,
                //         },
                //         action_focus: actionFocus,
                //     } = parsedJson.logical_bridge as {
                //         identity_logic: string,
                //         action_mode: {
                //             "assessment": string,
                //             "selected_mode": "A" | "B"
                //         },
                //         action_focus: string;
                //     };
                //
                //     console.log("EntityList is not empty.")
                //     console.log(`[${selectedMode === 'A' ? "Impact/Result" : "Sustain/Process"}]: ${assessment}`);
                //     console.log(`Identity Logic: ${identityLogic}`);
                //     console.log(`Action Focus: ${actionFocus}`)
                // } else {
                //     const {
                //         anchor_logic: anchorLogic,
                //         physics_logic: physicsLogic,
                //         camera_logic: cameraLogic,
                //     } = parsedJson.logical_bridge as {
                //         anchor_logic: string;
                //         physics_logic: string;
                //         camera_logic: string;
                //     };
                //
                //     console.log("EntityList is empty.")
                //     console.log(`Anchor Logic: ${anchorLogic}`);
                //     console.log(`Physics Logic: ${physicsLogic}`);
                //     console.log(`Camera Logic: ${cameraLogic}`);
                // }
                const parsedJson: {
                    logical_bridge: {
                        identity_logic: string;
                        action_focus: string;
                    },
                    reasoning: string;
                    video_gen_prompt: string;
                    video_gen_prompt_short: string;
                } = JSON.parse(generatedContent);
                const {
                    identity_logic: identityLogic,
                    action_focus: actionFocus
                } = parsedJson.logical_bridge;


                console.log(`Scene #${sceneNumber} postVideoGenPrompt() Result`);
                console.log(`Identity Logic: ${identityLogic}`);
                console.log(`Action Focus: ${actionFocus}`)
                console.log(`Reasoning: ${parsedJson.reasoning}`);
                console.log(`videoGenPrompt: ${parsedJson.video_gen_prompt}`);
                console.log(`videoGenPromptShort: ${parsedJson.video_gen_prompt_short}`);

                return {
                    success: true,
                    videoGenPrompt: parsedJson.video_gen_prompt,
                    videoGenPromptShort: parsedJson.video_gen_prompt_short,
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