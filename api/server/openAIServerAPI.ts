import OpenAI from 'openai';
import {
    ScriptGenerationResponse
} from "@/api/types/open-ai/ScriptGeneration";
import {Style} from "@/api/types/supabase/Styles";
import {SceneData, SubtitleSegment} from "@/api/types/supabase/VideoGenerationTasks";
import {PostGenerateRequest} from "@/api/types/suno-api/SunoAPIRequests";
import {MasterStyleInfo} from "@/api/types/supabase/MasterStyleInfo";
import {VIDEO_ASPECT_RATIOS, VideoAspectRatio} from "@/lib/ReplicateData";
import {StoryboardData} from "@/api/types/api/open-ai/scene/PostOpenAISceneResponse";
import {
    POST_SCRIPT_PROMPT,
    POST_MASTER_STYLE_PROMPT,
    POST_IMAGE_GEN_PROMPT_PROMPT,
    POST_VIDEO_GEN_PROMPT_PROMPT, POST_SCENE_SEGMENTATION_PROMPT
} from "@/api/server/OpenAIPrompts";

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
                max_completion_tokens: 4096,
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

            const systemMessage = POST_MASTER_STYLE_PROMPT;

            const userMessage = `
Based on the following style, generate the master style prompt.

- Style Name: ${style.name}
- Style Description: ${style.description}
- Style Prompt Guideline: ${style.stylePrompt}
- Aspect Ratio: ${aspectRatio}
`;

            // OpenAI SDK 클라이언트 초기화
            const client = new OpenAI({ apiKey });

            // OpenAI API 호출
            const completion = await client.chat.completions.create({
                model: OpenAIModel.GPT_O4_MINI,
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: userMessage }
                ],
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
                // JSON 파싱 시도
                // ---- 추가된 부분 시작 ----
                // Markdown 코드 블록(```json ... ```)이 포함된 경우 순수 JSON만 추출
                const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
                const match = generatedMasterStylePromptResult.match(jsonRegex);

                // match가 있으면 추출된 JSON을 사용하고, 없으면 원본을 그대로 사용
                const jsonString = match ? match[1] : generatedMasterStylePromptResult;

                const parsedData: {
                    positivePromptInfo: MasterStyleInfo,
                    negativePrompt: string,
                } = JSON.parse(jsonString);

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

            const systemMessage = POST_SCENE_SEGMENTATION_PROMPT;

            const currentDate = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }); // e.g., "Tuesday, November 25, 2025"

            const userMessage = `
**Current Date:** ${currentDate}
**narrationScript:** "${narrationScript}"
**subtitleSegments:** ${JSON.stringify(subtitleSegments, null, 2)}

Provide JSON output with videoTitle and videoDescription and sceneDataList.`;

            // OpenAI SDK 클라이언트 초기화
            const client = new OpenAI({ apiKey });

            // OpenAI API 호출
            const completion = await client.chat.completions.create({
                model: OpenAIModel.GPT_O4_MINI,
                messages: [
                    { role: 'system', content: systemMessage },
                    {
                        role: 'user',
                        content: userMessage,
                    }
                ],
                max_completion_tokens: 8192,
            });

            const generatedContent = completion.choices[0]?.message?.content;
            console.log("Scene segmentation result:", generatedContent);

            if (!generatedContent) {
                return null;
            }

            try {
                // JSON 파싱 시도
                const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
                const match = generatedContent.match(jsonRegex);
                const jsonString = match ? match[1] : generatedContent;

                const parsedData: {
                    sceneDataList: SceneData[];
                    videoTitle: string;
                    videoDescription: string;
                } = JSON.parse(jsonString);

                const sceneDataList: SceneData[] = parsedData.sceneDataList;
                const videoTitle: string = parsedData.videoTitle;
                const videoDescription: string = parsedData.videoDescription;

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
        // masterStylePrompt: string,
        masterStylePromptInfo: MasterStyleInfo,
        sceneNarration: string,
        videoTitle: string,
        videoDescription: string,
    ): Promise<{ success: boolean; imageGenPrompt?: string; error?: { message: string; code: string } }> {
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

            const systemMessage = POST_IMAGE_GEN_PROMPT_PROMPT;

            const userMessage = `Create an image prompt that combines these elements:

**Master Style Guide:**
${JSON.stringify(masterStylePromptInfo, null, 2)}

**Scene Content Description:**
"${imageGenPromptDirective}"

**Current Scene Narration:**
"${sceneNarration}"

**Video Title**
"${videoTitle}"

**Video Description**
"${videoDescription}"

Generate a prompt that visually represents this specific scene while ensuring the main subject is consistently and accurately depicted, following the style guide and content structure.`;

            const client = new OpenAI({ apiKey });
            const completion = await client.chat.completions.create({
                model: OpenAIModel.GPT_O4_MINI,
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: userMessage }
                ],
                max_completion_tokens: 4096,
            });

            const generatedPrompt = completion.choices[0]?.message?.content;
            if (!generatedPrompt) {
                return {
                    success: false,
                    error: {
                        message: 'No content in OpenAI response',
                        code: 'NO_CONTENT'
                    }
                };
            }

            return {
                success: true,
                imageGenPrompt: generatedPrompt.trim()
            };
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

            const systemMessage = POST_VIDEO_GEN_PROMPT_PROMPT;

            const userMessage = `
Generate optimized motion prompt based on exact parameters:

**Scene Narration:** ${sceneNarration}
**Original Intent:** ${imageGenPrompt}
**Target Duration:** ${targetDuration} seconds

Create a concise 4-unit motion prompt (Establishing -> Action -> Atmosphere -> Polish).
Focus on describing the visible subject in the image performing the action described in the narration.
`;

            // OpenAI SDK 클라이언트 초기화 및 API 호출
            const client = new OpenAI({ apiKey });
            const completion = await client.chat.completions.create({
                model: OpenAIModel.GPT_O4_MINI,
                messages: [
                    { role: 'system', content: systemMessage },
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
                                    detail: "auto",
                                }
                            }
                        ]
                    }
                ],
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
        masterStylePositivePrompt: MasterStyleInfo,
        sceneDataList: SceneData[]
    ): Promise<{
        success: boolean;
        status: number;
        data?: Partial<PostGenerateRequest>;
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

            const systemMessage = `You are a Music Reasoning Specialist powered by advanced reasoning capabilities.

# SUNO API CHARACTERISTICS

Suno API provides access to Suno v4.5 (latest as of Sept 2025) with these capabilities:
• Professional-grade AI music generation with v4.5 enhanced audio quality
• Advanced text-to-music conversion with detailed prompt interpretation
• Instrumental-only mode with explicit vocal suppression
• Duration flexibility from 15 seconds to 4+ minutes
• Support for negativeTags parameter for element exclusion
• Watermark-free output for commercial use (with proper licensing)
• Generation time scales proportionally with requested duration (typically 1-2x realtime)

## Critical Suno API Constraints
• Descriptive, tag-rich prompts work better than technical musical notation
• negativeTags parameter is available for excluding unwanted elements
• Instrumental specification should be explicit in both prompt content and negativeTags
• Style tags significantly influence overall generation approach
• Generated music includes inaudible watermarking for content tracking
• Commercial use requires appropriate Suno licensing compliance
• Longer durations require more complex musical structure planning

# REASONING FRAMEWORK

Execute these three phases **internally** and silently before producing the final JSON. Do NOT output your reasoning steps.

## PHASE 1: TEMPORAL STRUCTURE ANALYSIS
• Use **videoTotalDuration** (seconds) to plan musical structure
• For 15–30s: Immediate hook, simple structure, loop-friendly
• For 30–60s: Clear A–B or A–B–A progression with no long intro
• For 60s+: Multi-section structure with evolving dynamics
• Map sceneDuration patterns (sceneDataList) to energy changes (build-ups, drops, transitions)

## PHASE 2: VISUAL-TO-AUDIO TRANSFORMATION
• Use **videoTitle** and **videoDescription** to infer the core theme and emotional arc
• Extract emotional indicators from fullNarrationScript
• Translate masterStylePositivePrompt (visual style) into musical descriptors (genre, mood, texture)
• Map visual intensity (from each scene’s imageGenPrompt and narration) to musical dynamics (calm vs intense, sparse vs dense)
• Ensure genre and mood are consistent with the overall video concept

## PHASE 3: SUNO API OPTIMIZATION
• Synthesize all analysis into:
  – a short, catchy **title**
  – a concise **style** string (comma-separated genre/mood/instrument tags)
  – a detailed but compact **prompt** for the track’s feel and progression
  – a strict **negativeTags** string for exclusions
• Enforce instrumental-only behavior via both style/prompt wording and negativeTags
• Validate that duration, energy curve, and genre all make sense together

# CRITICAL REASONING GUIDELINES

1. **SYSTEMATIC ANALYSIS** – Process each phase mentally before answering
2. **LOGICAL DEDUCTION** – Base every parameter decision on provided data
3. **TEMPORAL AWARENESS** – Make the music evolve appropriately over the total duration
4. **COHERENCE VALIDATION** – Ensure title, style, prompt, and negativeTags all point to the same musical idea
5. **SUNO OPTIMIZATION** – Prefer clear genre/mood/instrument tags over vague language

# INPUT DATA STRUCTURE

You will receive a JSON object containing:
• **videoTotalDuration**: Total video length in seconds for musical structure planning
• **videoTitle**: Short, hooky title text representing the core topic of the video
• **videoDescription**: Brief description of what the video is about and why it matters
• **fullNarrationScript**: Complete narration for emotional progression analysis
• **masterStylePositivePrompt**: Visual style guide to translate into musical aesthetics
• **sceneDataList**: Array of core scene data for temporal and intensity analysis

## SceneData Structure (Essential Fields Only)
Each scene object contains only the music-relevant data:
{
  "sceneNumber": number,        // Sequential scene identifier
  "narration": string,          // Scene-specific emotional content
  "sceneDuration": number,      // Individual scene timing in seconds
  "imageGenPrompt": string      // Visual intensity/style cue for musical mapping
}

# OUTPUT REQUIREMENTS

Generate a valid JSON object with these exact fields:

## Required JSON Structure
{
  "title": "string - Short, catchy track title (can be similar to videoTitle but music-oriented)",
  "style": "string - Comma-separated genre/mood/instrument tags, e.g. 'instrumental, upbeat electronic, cinematic, modern, no vocals'", 
  "prompt": "string - 1–3 sentences describing the instrumental track: mood, instrumentation, energy curve, and how it should support the video",
  "negativeTags": "string - Comma-separated elements to avoid (must include: vocals, singing, vocal, lyrics, voice, choir)"
}

## Critical Output Instructions
- Follow the three-phase reasoning framework INTERNALLY
- Your final response must contain ONLY the valid JSON object
- Do not include explanations, reasoning process, or meta-commentary
- Ensure the JSON is properly formatted and parseable

# TASK EXECUTION

Analyze the provided video data through systematic reasoning and generate optimal Suno API parameters for **instrumental background music** that fits the video’s theme, pacing, and emotional journey.

**Think through each phase systematically before providing your final JSON output.**`;


            // AI에 전달할 데이터를 명확한 구조로 재구성
            const musicPromptRequestData = {
                videoTotalDuration: sceneDataList.map((sceneData) => {
                    return sceneData.sceneDuration;
                }).reduce((acc, duration) => {
                    return acc + duration;
                }, 0.0),
                videoTitle: videoTitle,
                videoDescription: videoDescription,
                fullNarrationScript: fullNarrationScript,
                masterStylePositivePrompt: masterStylePositivePrompt,
                sceneDataList: sceneDataList.map((sceneData) => {
                    return {
                        sceneNumber: sceneData.sceneNumber,
                        narration: sceneData.narration,
                        sceneDuration: sceneData.sceneDuration,
                        imageGenPrompt: sceneData.imageGenPrompt,
                    }
                })
            };

            const userMessage = `
Based on the following video data, please generate the Suno API parameters in the required JSON format.

**TASK DATA:**
${JSON.stringify(musicPromptRequestData, null, 2)}

Now, provide the final JSON output.
`;

            const client = new OpenAI({ apiKey });

            const completion = await client.chat.completions.create({
                model: OpenAIModel.GPT_O4_MINI,
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: userMessage }
                ],
                max_completion_tokens: 3072,
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
                const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
                const match = generatedContent.match(jsonRegex);
                const jsonString = match ? match[1] : generatedContent;

                const parsedData: Partial<PostGenerateRequest> = JSON.parse(jsonString);

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