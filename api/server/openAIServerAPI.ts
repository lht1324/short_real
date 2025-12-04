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
import {ImageGenPrompt} from "@/api/types/open-ai/ImageGenPrompt";

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

    // async postMasterStylePrompt(style: Style): Promise<{ success: boolean; masterStylePositivePrompt?: string; masterStyleNegativePrompt?: string; error?: { message: string; code: string } }> {
    async postMasterStylePrompt(style: Style, aspectRatio: VideoAspectRatio = VIDEO_ASPECT_RATIOS.PORTRAIT_9_16): Promise<{
        success: boolean;
        masterStylePositivePromptInfo?: MasterStyleInfo;
        masterStyleNegativePrompt?: string;
        error?: {
            message: string;
            code: string
        }
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

            const developerMessage = POST_MASTER_STYLE_PROMPT;

            const userMessage = `
<input_data>
    <style_name>${style.name}</style_name>
    <style_description>${style.description}</style_description>
    <style_prompt_guideline>${style.stylePrompt}</style_prompt_guideline>
    <target_aspect_ratio>${aspectRatio}</target_aspect_ratio>
</input_data>

Instruction: Analyze the input style and generate the JSON output according to the schema.
`;

            // OpenAI SDK 클라이언트 초기화
            const client = new OpenAI({ apiKey });

            // OpenAI API 호출
            const completion = await client.chat.completions.create({
                model: OpenAIModel.GPT_O4_MINI,
                messages: [
                    { role: 'developer', content: developerMessage },
                    { role: 'user', content: userMessage }
                ],
                // [핵심] JSON 모드 활성화
                response_format: { type: "json_object" },
                // [핵심] 스타일 해석은 미묘한 작업이므로 medium 권장
                reasoning_effort: 'medium',
                max_completion_tokens: 4096,
            });

            const generatedMasterStylePromptResult = completion.choices[0]?.message?.content;

            if (!generatedMasterStylePromptResult) {
                return {
                    success: false,
                    error: {
                        message: 'No master style prompt generated from OpenAI',
                        code: 'EMPTY_RESPONSE'
                    }
                };
            }

            try {
                // [핵심] 정규식 제거. 순수 JSON 파싱.
                const parsedData: {
                    positivePromptInfo: MasterStyleInfo,
                    negativePrompt: string,
                } = JSON.parse(generatedMasterStylePromptResult);

                return {
                    success: true,
                    masterStylePositivePromptInfo: parsedData.positivePromptInfo,
                    masterStyleNegativePrompt: parsedData.negativePrompt,
                };
            } catch (parseError) {
                console.error('Failed to parse master style prompt JSON response:', parseError);
                return {
                    success: false,
                    error: {
                        message: 'Failed to parse master style prompt response',
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

    async postImageGenPrompt(
        imageGenPromptDirective: string,
        masterStylePromptInfo: MasterStyleInfo,
        sceneNarration: string,
        videoTitle: string,
        videoDescription: string,
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

Instruction: Generate the cinematic prompt based on the provided context and schema.
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
                reasoning_effort: 'medium',
                max_completion_tokens: 4096,
            });

            const generatedContent = completion.choices[0]?.message?.content;
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
                // 한 번 파싱해서 유효한지 확인하고, 공백 등을 제거한 콤팩트한 문자열로 다시 변환
                const parsedJSON: ImageGenPrompt = JSON.parse(generatedContent);

                // Imagen 4에 보낼 때는 문자열화된 JSON이 필요합니다.
                // indent 없이 문자열로 만들어 토큰을 절약합니다.
                const finalPromptString = JSON.stringify(parsedJSON);

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
        imageBase64: string,
        targetDuration: number,
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

            const userMessage = `
<input_data>
  <scene_narration>${sceneNarration}</scene_narration>
  <original_intent_context>${imageGenPrompt}</original_intent_context>
  <target_duration>${targetDuration} seconds</target_duration>
</input_data>

Instruction: Analyze the attached image and generate the concise 4-unit motion prompt following <vision_logic> and <prompt_structure>.
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
                reasoning_effort: 'high', // Vision 분석이 필요하므로 medium 권장
                max_completion_tokens: 6144,
            });

            const generatedContent = completion.choices[0]?.message?.content;

            console.log(`generatedContent: ${generatedContent}`);

            if (!generatedContent) {
                return {
                    success: false,
                    error: {
                        message: 'No video generation prompt generated from OpenAI',
                        code: 'EMPTY_RESPONSE'
                    }
                };
            }

            return {
                success: true,
                videoGenPrompt: generatedContent,
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