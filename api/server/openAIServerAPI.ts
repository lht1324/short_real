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
    POST_VIDEO_GEN_PROMPT_PROMPT
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
                // ---- 추가된 부분 끝 ----

                // JSON 파싱 시도 (정리된 문자열 사용)
                // const parsedData: {
                //     positivePrompt: string,
                //     negativePrompt: string,
                // } = JSON.parse(jsonString);
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

            const systemMessage = `You are an elite scene director.

# PHASE 1 - INPUT ANALYSIS
Parse narrationScript and subtitleSegments to identify natural scene boundaries
Establish optimal scene count (3-6 scenes) with 2-5 second duration per scene
Extract narrative flow markers and validate timing data continuity

# PHASE 2 - SCENE CREATION
Determine videoMainSubject through systematic analysis of complete narration
Create scenes that preserve complete sentences and maintain narrative integrity
Calculate precise scene duration using: lastSegment.endSec - firstSegment.startSec
Generate style-agnostic visual descriptions for each scene

# PHASE 3 - OUTPUT GENERATION
Apply consistency checks across all scenes for subject coherence
Optimize scene descriptions for AI video generation pipeline compatibility
Generate validated JSON structure with proper timing and content alignment

# CORE REQUIREMENTS

1. **NARRATIVE INTEGRITY**: Keep complete sentences within single scenes
2. **SUBJECT CONSISTENCY**: Ensure videoMainSubject appears consistently across scenes
3. **TIMING PRECISION**: Use exact subtitle timing data for duration calculations
4. **STYLE AGNOSTIC**: Describe WHAT to show, not HOW it looks (no colors, lighting, styles)
5. **NO TEXT**: Never include visible text, letters, or numbers in scene descriptions

# INPUT SPECIFICATION
- narrationScript: Complete narrative text
- subtitleSegments: Array of {text, startSec, endSec} timing data

# OUTPUT SPECIFICATION
- sceneDataList: Array of SceneData objects
- videoMainSubject: Primary subject identifier string

**SceneData Structure:**
{
  sceneNumber: number,        // Sequential identifier (1, 2, 3...)
  narration: string,          // Complete scene narration content
  sceneDuration: number,      // Precise duration in seconds
  imageGenPromptDirective: string  // Style-agnostic visual description
}

# TASK
Segment the provided narration into 3-6 scenes with natural boundaries, calculate precise timing using subtitle data, identify the main video subject, and generate style-agnostic visual descriptions. Output valid JSON only.
`;

            const userMessage = `
**narrationScript:** "${narrationScript}"
**subtitleSegments:** ${JSON.stringify(subtitleSegments, null, 2)}

Provide JSON output with sceneDataList and videoMainSubject.`;

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
                    videoMainSubject: string;
                } = JSON.parse(jsonString);

                const sceneDataList: SceneData[] = parsedData.sceneDataList;
                const videoMainSubject: string = parsedData.videoMainSubject;

                return {
                    taskId: taskId,
                    sceneDataList: sceneDataList,
                    videoMainSubject: videoMainSubject,
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
        videoMainSubject: string,
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

**Video Main Subject:**
"${videoMainSubject}"

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
        numFrames: number,
        framesPerSecond: number,
        videoActualDuration: number,
        sceneExpectedDuration: number,
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

            const speedRatio = videoActualDuration / sceneExpectedDuration;
            const userMessage = `
Generate optimized motion prompt based on exact parameters:

**Scene Narration:** ${sceneNarration}
**Original Intent:** ${imageGenPrompt}
**Target Frames:** ${numFrames}
**Original FPS**: ${framesPerSecond}fps
**Speed Ratio**: ${speedRatio}x playback)
**Expected Duration:** ${sceneExpectedDuration.toFixed(3)}s
**Calculated Duration:** ${videoActualDuration.toFixed(3)}s

Apply the frame-fps optimization rules to create a motion prompt that precisely matches these technical specifications.
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
                                    url: `data:image/jpeg;base64,${imageBase64}`
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
        videoMainSubject: string,
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
• Descriptive prompts work better than technical musical notation
• negativeTags parameter available for excluding unwanted elements
• Instrumental specification should be explicit in both prompt and negativeTags
• Style tags significantly influence overall generation approach
• Generated music includes inaudible watermarking for content tracking
• Commercial use requires appropriate Suno licensing compliance
• Longer durations require more complex musical structure planning

# REASONING FRAMEWORK

Execute these three phases sequentially, showing your analytical process at each step.

## PHASE 1: TEMPORAL STRUCTURE ANALYSIS
• Calculate total video duration from scene timing data
• Determine generation complexity based on duration (15-30s: simple structure, 30-60s: A-B-A, 60s+: multi-section)
• Map scene duration patterns to dynamic progression
• Plan musical architecture proportional to total length
• Consider that generation time will scale with video duration

## PHASE 2: VISUAL-TO-AUDIO TRANSFORMATION
• Extract emotional indicators from narration script
• Convert visual style keywords to musical mood descriptors
• Analyze scene visual intensity for dynamic mapping
• Establish genre consistency with video subject matter

## PHASE 3: SUNO API OPTIMIZATION
• Synthesize reasoning results into coherent parameters
• Ensure instrumental-only specification (no vocals/lyrics)
• Validate parameter consistency and musical logic
• Generate final JSON output optimized for Suno API processing

# CRITICAL REASONING GUIDELINES

1. **SYSTEMATIC ANALYSIS** - Process each phase completely before proceeding
2. **LOGICAL DEDUCTION** - Base every parameter decision on analyzed evidence
3. **TEMPORAL AWARENESS** - Consider how music must evolve over video duration
4. **COHERENCE VALIDATION** - Ensure all parameters work together harmoniously
5. **SUNO OPTIMIZATION** - Embed all constraints positively in prompt descriptions

# REASONING EXAMPLES

## Example 1: Technology/Business Theme
"Let me analyze this systematically:

PHASE 1 - TEMPORAL ANALYSIS:
Total duration is 47 seconds, suggesting a simple A-B-A structure...
Scene durations show accelerating pace in middle section...

PHASE 2 - VISUAL-TO-AUDIO MAPPING:
Subject 'startup entrepreneur' suggests modern, optimistic tone...
Style prompt mentions 'vibrant, clean aesthetic' → bright, uplifting musical elements...

PHASE 3 - PARAMETER SYNTHESIS:
Based on analysis, optimal approach is uplifting electronic with orchestral elements...
47-second duration requires continuous energy without vocal breaks..."

## Example 2: Nature/Documentary Theme
"Let me analyze this systematically:

PHASE 1 - TEMPORAL ANALYSIS:
Total duration is 52 seconds, allowing for contemplative build...
Scene timing shows gradual reveal pattern...

PHASE 2 - VISUAL-TO-AUDIO MAPPING:
Subject 'mountain wildlife' suggests organic, peaceful atmosphere...
Visual cues indicate 'natural textures, earth tones' → acoustic instruments, ambient layers...

PHASE 3 - PARAMETER SYNTHESIS:
Ambient acoustic soundscape with subtle orchestral swells...
Nature documentary requires non-intrusive, atmospheric support..."

## Example 3: Lifestyle/Wellness Theme
"Let me analyze this systematically:

PHASE 1 - TEMPORAL ANALYSIS:
Total duration is 38 seconds, needs warm, inviting progression...
Consistent pacing suggests steady, calming rhythm...

PHASE 2 - VISUAL-TO-AUDIO MAPPING:
Subject 'morning yoga routine' suggests serene, centering mood...
'Soft lighting, minimal aesthetic' → gentle acoustic, light percussion...

PHASE 3 - PARAMETER SYNTHESIS:
Meditative acoustic with subtle electronic elements...
Wellness content requires soothing, non-distracting background..."

# INPUT DATA STRUCTURE

You will receive a JSON object containing:
• **totalDuration**: Total video length in seconds for musical structure planning
• **videoMainSubject**: Primary subject/theme for genre and mood consistency
• **fullNarrationScript**: Complete narration for emotional progression analysis
• **masterStylePositivePrompt**: Visual style guide for mood translation
• **sceneDataList**: Array of core scene data for temporal analysis

## SceneData Structure (Essential Fields Only)
Each scene object contains only the music-relevant data:
{
  "sceneNumber": number,        // Sequential scene identifier
  "narration": string,          // Scene-specific emotional content
  "sceneDuration": number,      // Individual scene timing
  "imageGenPrompt": string      // Visual intensity for musical mapping
}

# OUTPUT REQUIREMENTS

Generate a valid JSON object with these exact fields:

## Required JSON Structure
{
  "title": "string - Short, catchy track title",
  "style": "string - Genre and instrumentation description", 
  "prompt": "string - Detailed instrumental music description paragraph",
  "negativeTags": "string - Comma-separated elements to avoid (must include vocals, singing, lyrics, voice)"
}

## Critical Output Instructions
- Follow the three-phase reasoning framework INTERNALLY
- Your final response must contain ONLY the valid JSON object
- Do not include explanations, reasoning process, or meta-commentary
- Ensure the JSON is properly formatted and parseable

# TASK EXECUTION

Analyze the provided video data through systematic reasoning chains and generate optimal Suno API parameters for instrumental background music. 

**Think through each phase systematically before providing your final JSON output.**`;


            // AI에 전달할 데이터를 명확한 구조로 재구성
            const musicPromptRequestData = {
                videoTotalDuration: sceneDataList.map((sceneData) => {
                    return sceneData.sceneDuration;
                }).reduce((acc, duration) => {
                    return acc + duration;
                }, 0.0),
                videoMainSubject: videoMainSubject,
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