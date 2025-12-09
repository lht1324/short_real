import OpenAI from 'openai';
import {
    ScriptGenerationResponse
} from "@/api/types/open-ai/ScriptGeneration";
import {Style} from "@/api/types/supabase/Styles";
import {SceneData, SubtitleSegment} from "@/api/types/supabase/VideoGenerationTasks";
import {MasterStyleInfo} from "@/api/types/supabase/MasterStyleInfo";
import {VIDEO_ASPECT_RATIOS, VideoAspectRatio} from "@/lib/ReplicateData";
import {StoryboardData} from "@/api/types/api/open-ai/scene/PostOpenAISceneResponse";
import {
    POST_SCRIPT_PROMPT,
    POST_SCENE_SEGMENTATION_PROMPT,
    POST_MASTER_STYLE_PROMPT,
    POST_IMAGE_GEN_PROMPT_PROMPT,
    POST_VIDEO_GEN_PROMPT_PROMPT, POST_MUSIC_GENERATION_DATA_PROMPT
} from "@/api/types/open-ai/OpenAIPrompts";
import {MusicGenerationData} from "@/api/types/suno-api/MusicGenerationData";
import {Entity, InitialEntityManifestItem, PhysicsProfile} from "@/api/types/open-ai/ImageGenPrompt";
import {PHYSICS_LIBRARY} from "@/api/types/open-ai/PhysicsPromptLibrary";

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
        ${JSON.stringify(subtitleSegments)}
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

    async postMasterStylePrompt(
        style: Style,
        scriptDataList: {
            sceneNumber: number;
            sceneNarration: string;
        }[],
        aspectRatio: VideoAspectRatio = VIDEO_ASPECT_RATIOS.PORTRAIT_9_16
    ): Promise<{
        success: boolean;
        masterStylePositivePromptInfo?: MasterStyleInfo;
        masterStyleNegativePrompt?: string;
        // [수정 2] 리턴 타입에 entityManifest 추가
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
            const developerMessage = POST_MASTER_STYLE_PROMPT;

            // [수정 3] scriptDataList를 JSON 문자열로 변환하여 컨텍스트 제공
            const userMessage = `
<input_data>
    <style_name>${style.name}</style_name>
    <style_description>${style.description}</style_description>
    <style_prompt_guideline>${style.stylePrompt}</style_prompt_guideline>
    <target_aspect_ratio>${aspectRatio}</target_aspect_ratio>

    <full_script_context>
        ${JSON.stringify(scriptDataList, null, 2)}
    </full_script_context>
</input_data>

Instruction: Analyze the input style AND the full script context to generate the MasterStyle and EntityManifest JSON output.
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
                    masterStyle: {
                        positivePromptInfo: MasterStyleInfo;
                        negativePrompt: string;
                    };
                    entityManifest: InitialEntityManifestItem[];
                } = JSON.parse(generatedResult);

                return {
                    success: true,
                    // 구조 분해 할당
                    masterStylePositivePromptInfo: parsedData.masterStyle.positivePromptInfo,
                    masterStyleNegativePrompt: parsedData.masterStyle.negativePrompt,
                    entityManifestList: parsedData.entityManifest, // 추출된 캐릭터 시트 반환
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
        videoTitle: string,
        videoDescription: string,
        entityManifestList: InitialEntityManifestItem[],
    ): Promise<{
        success: boolean;
        imageGenPrompt?: string;
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

            const developerMessage = POST_IMAGE_GEN_PROMPT_PROMPT;

            const userMessage = `
<input_data>
    <video_context>
        Title: ${videoTitle}
        Description: ${videoDescription}   
    </video_context>
    
    <master_style_guide>
        ${JSON.stringify(masterStylePromptInfo, null, 2)}
    </master_style_guide>
    
    <entity_reference_manifest>
        ${JSON.stringify(entityManifestList, null, 2)}
    </entity_reference_manifest>
    
    <current_narration>
        ${sceneNarration}   
    </current_narration>
    
    <scene_content>
        ${imageGenPromptDirective}
    </scene_content>
</input_data>

Instruction: Generate the scene instruction JSON.
**CRITICAL**: You are the Physics Architect.
1. Populate 'physics_profile' based on the 3-Layer Logic.
2. Enrich 'appearance' with visual cues that imply that physics (e.g., textures, damage).
3. Define 'state' with a physically accurate pose.
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
                max_completion_tokens: 10240,
            });

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
                    image_gen_prompt: string;
                    updated_entity_manifest: Omit<Entity, 'role' | 'type' | 'demographics'>[]
                } = JSON.parse(generatedContent);

                // [수정] 병합 로직 (Physics-Aware Merge)

                if (!instructionJSON.updated_entity_manifest || !Array.isArray(instructionJSON.updated_entity_manifest)) {
                    return {
                        success: false,
                        error: {
                            message: 'Generated entities are invalid.',
                            code: 'INVALID_CONTENT'
                        }
                    };
                }

                return {
                    success: true,
                    imageGenPrompt: instructionJSON.image_gen_prompt,
                    entityManifestList: instructionJSON.updated_entity_manifest.map(instruction => {
                        const originalEntity = entityManifestList.find((entityManifest) => {
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
                            state: instruction.state,
                            role: originalEntity.role,
                        };
                    }),
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
        imageGenPrompt: string,
        sceneNarration: string,
        sceneNumber: number,
        imageBase64: string,
        targetDuration: number,
        videoTitle: string,
        videoDescription: string,
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

            const developerMessage = POST_VIDEO_GEN_PROMPT_PROMPT;

            // [핵심] Physics Profile을 기반으로 물리 법칙 텍스트 생성 (Code Level Injection)
            // 메인 히어로 또는 씬에 등장하는 주요 엔티티들의 물리 속성을 추출하여 문자열로 변환
            const activeEntitiesPhysics = entityManifestList.filter((entity) => !!(entity.physics_profile)).map((entity) => {
                const { morphology, material, action_context } = entity.physics_profile as PhysicsProfile;

                // 라이브러리에서 텍스트 조회 (Safety check 포함)
                const morphologyData = PHYSICS_LIBRARY.morphology[morphology];
                const materialData = PHYSICS_LIBRARY.material[material];
                const actionContextData = PHYSICS_LIBRARY.action_context[action_context];

                if (!morphologyData || !materialData || !actionContextData) return null;

                return `
            [Entity: ${entity.id}]
            - **Morphology (${morphology})**: ${morphologyData.motion_rules} (Constraint: ${morphologyData.negative_prompt})
            - **Material (${material})**: Impact High -> "${materialData.impact_high}", Texture -> "${materialData.texture_desc}"
            - **Context (${action_context})**: ${actionContextData.physics_law} (Cam: ${actionContextData.camera_behavior})
            `;
            }).filter(Boolean).join('\n');

            // 4. User Message 구성 (physics_instruction_set 주입)
            const userMessage = `
<input_context>
    <video_metadata>
        <title>${videoTitle}</title>
        <description>${videoDescription}</description>
    </video_metadata>
    
    <physics_instruction_set>
        **MANDATORY PHYSICS RULES FOR THIS SCENE**:
        The following rules are derived from the entity's physical structure. You MUST enforce these constraints in the prompt.
        ${activeEntitiesPhysics}
    </physics_instruction_set>
    
    <original_intent>
        ${imageGenPrompt}
    </original_intent>
    
    <scene_narration>${sceneNarration}</scene_narration>
    
    <entity_reference_manifest>
        ${JSON.stringify(entityManifestList.map((entity) => {
            return {
                id: entity.id,
                role: entity.role,
                type: entity.type,
                demographics: entity.demographics,
                appearance: entity.appearance,
                state: entity.state,
            }
        }), null, 2)}
    </entity_reference_manifest>
    
    <target_duration>${targetDuration} seconds</target_duration>

    <image_context>
        The attached image represents the STARTING FRAME (t=0) of the video.
        **CRITICAL INSTRUCTION**:
        1. **Vision is Truth (Start Only)**: Use the image to determine the *starting* pose.
           - If Image is **Static**: Describe the transition from stillness to action using the 'Physics Context' rules.
           - If Image is **Dynamic**: Describe the continuation/reaction.
        2. **Context-Driven Tone**: 
           - Analyze <video_metadata> for genre.
           - Combine Genre (e.g., Action) with Physics Context (e.g., Rigid Impact) to select the final verbs.
        3. **Flow & Continuity**: The video MUST NOT STOP or BREAK PHYSICS.
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
                                    url: `data:image/jpeg;base64,${imageBase64}`,
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

            console.log(`[${sceneNumber}] usage: `, JSON.stringify(completion.usage))
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
                const parsedJson: {
                    video_prompt: string;
                    reasoning: string;
                } = JSON.parse(generatedContent);

                console.log(`Scene[${sceneNumber}] reasoning: ${parsedJson.reasoning}`)

                return {
                    success: true,
                    videoGenPrompt: parsedJson.video_prompt,
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
            const musicPromptRequestData = {
                videoTotalDuration: sceneDataList.map((sceneData) => {
                    return sceneData.sceneDuration;
                }).reduce((acc, duration) => {
                    return acc + duration;
                }, 0.0), // 계산된 총 시간
                videoTitle: videoTitle,
                videoDescription: videoDescription,
                fullNarrationScript: fullNarrationScript, // 감정 분석용
                // 시각 정보 중 음악과 연관된 것만 선별
                visualStyle: {
                    genre: masterStyleInfo.STYLE_PREFIX,
                    reference: masterStyleInfo.CINEMATIC_REFERENCE,
                    mood: masterStyleInfo.EMOTIONAL_TONE,
                    texture: masterStyleInfo.TEXTURE_ELEMENTS,
                    color: masterStyleInfo.COLOR_PALETTE,
                    finalMood: masterStyleInfo.FINAL_MOOD_DESCRIPTOR
                },
                // 구조 계산용 시간 리스트만 전달
                sceneStructure: sceneDataList.map((sceneData) => {
                    return {
                        sceneNumber: sceneData.sceneNumber,
                        sceneDuration: sceneData.sceneDuration,
                    }
                })
            }

            const userMessage = `
<task_data>
    ${JSON.stringify(musicPromptRequestData, null, 2)}
</task_data>
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
                const parsedData: MusicGenerationData = JSON.parse(generatedContent);

                if (!parsedData.prompt || !parsedData.style || !parsedData.title) {
                    throw new Error("Missing one or more required fields: prompt, style, title");
                }

                return {
                    success: true,
                    status: 200,
                    data: parsedData
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