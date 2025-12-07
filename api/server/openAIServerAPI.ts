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
} from "@/api/server/OpenAIPrompts";
import {MusicGenerationData} from "@/api/types/suno-api/MusicGenerationData";
import {EntityManifestItem, ImageGenPrompt} from "@/api/types/open-ai/ImageGenPrompt";
import {VideoGenPrompt} from "@/api/types/open-ai/VideoGenPrompt";

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
        entityManifestList?: EntityManifestItem[];
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
                    entityManifest: EntityManifestItem[];
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
        entityManifestList: EntityManifestItem[],
    ): Promise<{
        success: boolean;
        imageGenPrompt?: string;
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
    <master_style_guide>
        ${JSON.stringify(masterStylePromptInfo, null, 2)}
    </master_style_guide>
    
    <entity_reference_manifest>
        ${JSON.stringify(entityManifestList, null, 2)}
    </entity_reference_manifest>
    
    <scene_content>
        ${imageGenPromptDirective}
    </scene_content>
    
    <current_narration>
        ${sceneNarration}   
    </current_narration>
    
    <video_context>
        Title: ${videoTitle}
        Description: ${videoDescription}   
    </video_context>
</input_data>

Instruction: Generate the scene instruction JSON.
**CRITICAL**: Translate any poetic/metaphorical narration into **Physically Accurate Static Poses**.
- If narration says "Roll", output a "Crouched/Low" pose (not mid-roll).
- If narration says "Grind", output a "Vault/Jump" pose (avoid awkward contact).
- Strictly follow ID matching and Biotype logic.
`;

            const client = new OpenAI({ apiKey });
            const completion = await client.chat.completions.create({
                model: OpenAIModel.GPT_O4_MINI,
                messages: [
                    { role: 'developer', content: developerMessage },
                    { role: 'user', content: userMessage }
                ],
                response_format: { type: 'json_object' },
                // o-series 전용 파라미터.
                // creative writing에는 'medium'이 적합하며, 비용 절감이 우선이면 'low' 테스트 필요.
                reasoning_effort: 'high',
                max_completion_tokens: 6144,
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
                // 1. LLM이 생성한 '지시사항(Instruction)' 파싱 (ID + State 만 있음)
                // 타입 단언을 사용하여 임시 구조체로 받음
                const instructionJSON = JSON.parse(generatedContent) as ImageGenPrompt;

                // [수정 3] ★ 핵심 로직: 병합 (Merging)
                // LLM이 보낸 뼈대(ID, State)에 원본의 살점(Appearance, Type)을 붙여넣기
                if (instructionJSON.entity_manifest && Array.isArray(instructionJSON.entity_manifest)) {
                    instructionJSON.entity_manifest = instructionJSON.entity_manifest.map(instruction => {
                        // ID로 원본 데이터 찾기
                        const originalEntity = entityManifestList.find(e => e.id === instruction.id);

                        if (!originalEntity) {
                            // LLM이 없는 ID를 만들어냈을 경우에 대한 방어 로직 (로그 남기고 스킵하거나 에러 처리)
                            console.warn(`Warning: LLM generated unknown ID '${instruction.id}'. Keeping as is.`);
                            return instruction;
                        }

                        // 병합: 원본(Appearance, Type) + 지시사항(State)
                        return {
                            ...originalEntity,      // 외형, 타입, Biotype 복사
                            state: instruction.state, // 이번 씬의 행동 덮어쓰기
                            text_render: instruction.text_render // 텍스트 렌더링 정보가 있다면 유지
                        };
                    });
                }

                // 이제 instructionJSON은 완전한 Entity 정보를 가진 최종 Prompt가 됨
                const finalPromptString = JSON.stringify(instructionJSON);

                return {
                    success: true,
                    imageGenPrompt: finalPromptString
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
        entityManifest: EntityManifestItem[],
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

            const imageGenPromptJSON: ImageGenPrompt = JSON.parse(imageGenPrompt);
            const mappedImageGenPrompt = {
                visual_style: {
                    style: imageGenPromptJSON.technical_specifications.art_style,
                    camera_angle: imageGenPromptJSON.technical_specifications.camera_settings.angle,
                    lighting: imageGenPromptJSON.environmental_context.lighting_setup.global_light
                },
                physics_state: {
                    phase: imageGenPromptJSON.motion_vector.time_phase,
                    vector: imageGenPromptJSON.motion_vector.force_direction,
                    visual_cues: imageGenPromptJSON.motion_vector.visual_evidence
                },
                entities: imageGenPromptJSON.entity_manifest.map((entity) => {
                    return {
                        id: entity.id,
                        pose: entity.state.pose
                    }
                }),
                location: imageGenPromptJSON.environmental_context.location
            }
            const userMessage = `
<input_context>
    <video_metadata>
        <title>${videoTitle}</title>
        <description>${videoDescription}</description>
    </video_metadata>
    <entity_reference_manifest>
        ${JSON.stringify(entityManifest, null, 2)}
    </entity_reference_manifest>
    <scene_narration>${sceneNarration}</scene_narration>
    <original_intent>${JSON.stringify(mappedImageGenPrompt, null, 2)}</original_intent>
    <target_duration>${targetDuration} seconds</target_duration>
    <image_context>
        The attached image represents the STARTING FRAME (t=0) of the video.
        **CRITICAL INSTRUCTION**:
        1. **Vision is Truth (Start Only)**: Use the image to determine the *starting* pose.
           - If Image is **Static**: You MUST describe the transition from stillness to action.
           - If Image is **Dynamic**: You MUST describe the continuation of the motion.
        2. **Context-Driven Physics & Tone**: 
           - **Analyze <video_metadata>** first. Infer the genre, mood, and world-rules from the Title and Description.
           - If metadata implies **Action/SF**, prioritize speed, impact, and exaggerated physics.
           - If metadata implies **Drama/Romance**, prioritize emotional subtlety, soft lighting, and micro-movements.
           - If metadata implies **Dance/Music**, prioritize rhythm and full-body flow.
        3. **Flow & Continuity**: The video MUST NOT STOP or BREAK PHYSICS. Every action must flow logically into the next.
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
                max_completion_tokens: 6144,
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