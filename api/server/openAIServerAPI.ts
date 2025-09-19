import OpenAI from 'openai';
import {
    ScriptGenerationResponse
} from "@/api/types/open-ai/ScriptGeneration";
import {Style} from "@/api/types/supabase/Styles";
import {SceneData, SubtitleSegment} from "@/api/types/supabase/VideoGenerationTasks";
import {PostGenerateRequest} from "@/api/types/suno-api/SunoAPIRequests";

enum OpenAIModel {
    GPT_4O_MINI = "gpt-4o-mini-2024-07-18",
    GPT_O4_MINI = "o4-mini-2025-04-16",
}

export const openAIServerAPI = {
    async postScript(userPrompt: string, duration: number): Promise<ScriptGenerationResponse> {
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

            // 프롬프트를 OpenAI 형식으로 매핑
            const systemMessage = `You are an expert AI scenario writer for short-form videos like Youtube Shorts, Instagram Reels, and TikTok. You are a master of writing scripts that are not only engaging but are also **technically optimized for an AI-driven video production pipeline.**

Your primary mission is to write a script where each thematic beat (separated by \\n) is structured to be an ideal building block for a video scene. The final narration MUST be written to be spoken in approximately ${duration} seconds.

**CRITICAL SCRIPTWRITING RULES:**

1.  **The Hook First:** The script MUST begin with one or two very short, impactful sentences that will become **1-2 second 'hook' scenes** to grab the viewer's attention immediately.

2.  **Optimal Scene Pacing:** To ensure technical stability, the majority of your thematic beats MUST be written to have a natural spoken duration between **2.7 and 6.0 seconds**. As a strict guideline, aim for a word count between **7 and 18 words** for most sentences. This rule does not apply to the initial 'Hook' sentences.

3.  **Write for the Edit:** When writing longer, descriptive sentences, intentionally use commas or logical pauses to create natural **'edit points'**. This allows a single narration beat to be split into multiple visual scenes by the 'director' AI later.

4.  **Maintain Dynamic Pacing:** While following the rules above, you MUST still use a mix of sentence lengths to create an engaging rhythm. The goal is a script that is both technically sound and creatively compelling.

**GENERAL WRITING GUIDELINES:**
- Use a clear, engaging, and authoritative tone.
- Use the present tense and active voice.
- Keep the language concise for easy subtitle reading.

**GOLD-STANDARD EXAMPLES:**
Here are several examples of high-quality scripts. Learn from their structure and the different styles of hooks.

---
**EXAMPLE 1: The Intriguing Question**
(Topic: The Fermi Paradox)

(Hook)
Have you ever looked up at the stars and wondered, "Where is everybody?"

(Optimal length beat)
That's the core of the Fermi Paradox.

(Longer, splittable beat)
In a universe with billions of galaxies, each containing billions of stars, the probability of intelligent life seems high, yet we've found no evidence of it.

(Optimal length beat)
It's one of science's greatest mysteries.

---
**EXAMPLE 2: The Surprising Fact**
(Topic: Indie Hackers)

(Hook)
Nine out of ten startups fail.

(Optimal length beat)
But what if there's another way to build a business?

(Longer, splittable beat)
Welcome to the world of indie hackers, solo entrepreneurs who build profitable companies with no venture capital funding.

(Optimal length beat)
It's a movement changing the face of tech.

---
**EXAMPLE 3: The Direct "You" Address**
(Topic: Stoicism)

(Hook)
You can't control what happens to you.

(Optimal length beat)
But you can control how you respond.

(Longer, splittable beat)
That's the fundamental principle of Stoicism, an ancient philosophy designed to build mental resilience and inner peace.

(Optimal length beat)
It's a timeless guide to a good life.

**FINAL OUTPUT FORMAT:**
- Provide ONLY the final script text.
- Do NOT include the explanatory labels like (Hook) or (Topic).
- Your response must contain only the narration, with each beat on a new line, ready for the text-to-speech engine.

Please provide ONLY the narration text. Use a single line break (\\n) to separate distinct thematic ideas as instructed above.`;

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
                max_completion_tokens: 2048,
            });

            const generatedScript = completion.choices[0]?.message?.content;

            if (!generatedScript) {
                return {
                    success: false,
                    error: {
                        message: 'No script generated from OpenAI',
                        code: 'EMPTY_RESPONSE'
                    }
                };
            }

            // 스크립트 분석
            const wordCount = generatedScript.split(' ').length;
            const estimatedDuration = Math.round(wordCount / 2.5); // 약 2.5 단어/초

            return {
                success: true,
                data: {
                    script: generatedScript,
                    wordCount: wordCount,
                    estimatedDuration: estimatedDuration,
                    prompt: userPrompt
                },
                usage: completion.usage
            };

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

    async postMasterStylePrompt(style: Style): Promise<{ success: boolean; masterStylePositivePrompt?: string; masterStyleNegativePrompt?: string; error?: { message: string; code: string } }> {
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

            const systemMessage = `You are a professional AI video content creation expert.

Your primary task is to analyze the user's provided style and generate a JSON object containing two prompts: 'positivePrompt' and 'negativePrompt'.

**1. positivePrompt Generation:**
- Creatively expand on the user's input to create a detailed, cinematic master prompt for the Imagen 4 model.
- You MUST define key visual elements like Lighting, Color Palette, Atmosphere, Texture, and Composition.

**2. negativePrompt Generation:**
- Analyze the style and identify specific visual elements that would CONTRADICT or WEAKEN the desired aesthetic. This should include:
  - **Opposing art styles** (e.g., for 'anime', the opposite is 'photorealistic', 'oil painting').
  - **Conflicting moods** (e.g., for 'cyberpunk', the opposite is 'pastoral', 'cheerful').
  - **Technical artifacts** that break immersion (e.g., text, watermarks, blurry).
- The negative prompt should be the logical opposite of your positive analysis.

**negativePrompt Guidelines:**
- Keep it concise (under 20 keywords).
- Prioritize the most impactful opposing elements.
- Use a comma-separated keywords format.

**CRITICAL RULES FOR BOTH:**
- The prompts must be scene-agnostic (no specific characters or actions).
- The prompts must not request any text or letters in the image.

**CRITICAL OUTPUT FORMAT:**
Your output MUST be a valid JSON object. Use double quotes for all strings and keys, and avoid unescaped special characters or line breaks within string values.

**GOLD-STANDARD EXAMPLES. Learn from them and replicate this level of detail and expansion:**

- EXAMPLE 1:
  - USER INPUT:
    - name: "Modern Anime"
    - description: "A clean and vibrant aesthetic with cinematic lighting and a high-resolution, detailed background."
    - stylePrompt: "A beautifully detailed Japanese anime style illustration"
  - YOUR REQUIRED OUTPUT (JSON):
    {
      "positivePrompt": "A beautifully detailed Japanese anime style illustration with a clean and vibrant aesthetic, cinematic lighting, and a high-resolution, detailed background. The color palette is modern and striking, focusing on bright and lively tones to evoke a sense of energy and optimism. Every scene should be rendered with meticulous attention to detail and sharp, distinct lines.",
      "negativePrompt": "photorealistic, 3d render, realistic, western comic style, dark, gritty, depressing, text, signature, watermark, blurry, deformed hands"
    }

- EXAMPLE 2:
  - USER INPUT:
    - name: "Cyberpunk Night"
    - description: "A futuristic aesthetic with neon lights and a dystopian feel."
    - stylePrompt: "A cinematic illustration in a vibrant cyberpunk style."
  - YOUR REQUIRED OUTPUT (JSON):
    {
      "positivePrompt": "A cinematic illustration in a vibrant cyberpunk style, with a dark and moody atmosphere. The scene is illuminated by glowing neon signs and holographic advertisements. The color palette is dominated by deep blues, purples, and electric pinks, with strong, contrasting shadows. The texture is gritty and worn, capturing a sense of urban decay. Wide-angle lens, high resolution, meticulous details.",
      "negativePrompt": "bright daylight, sunny, pastoral, natural, organic, cheerful, utopian, clean, text, signature, watermark, blurry"
    }
`;

            const userMessage = `Based on the following style, generate the master style prompt.
- Style Name: ${style.name}
- Style Description: ${style.description}
- Style Prompt Guideline: ${style.stylePrompt}`;

            // OpenAI SDK 클라이언트 초기화
            const client = new OpenAI({ apiKey });

            // OpenAI API 호출
            const completion = await client.chat.completions.create({
                model: OpenAIModel.GPT_O4_MINI,
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: userMessage }
                ],
                max_completion_tokens: 2048,
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
                const parsedData: {
                    positivePrompt: string,
                    negativePrompt: string,
                } = JSON.parse(jsonString);

                return {
                    success: true,
                    masterStylePositivePrompt: parsedData.positivePrompt,
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
        narrationScript: string,
        subtitleSegments: SubtitleSegment[]
    ): Promise<{ success: boolean; sceneDataList?: SceneData[]; videoMainSubject?: string; error?: { message: string; code: string } }> {
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

            const systemMessage = `You are a professional film director AI specializing in scene segmentation and storyboard creation.

Your role is to describe scene content (characters, objects, actions) in a completely style-agnostic manner and identify the main subject/theme of the video.

**CRITICAL RULES:**
1. **Content ONLY:** Describe WHAT to shoot, not HOW it looks (no colors, lighting, camera angles, art styles).
2. **NO TEXT:** Never include text, letters, or numbers in scene descriptions.
3. **Subject Identification:** Analyze the complete narration to identify the primary subject/theme that should be consistently represented across all scenes.
4. **Optimal Scene Count:** Aim for 3-6 scenes total for short-form content, with each scene being 2-5 seconds long.
5. **Scene Duration:** Calculate precise durations using subtitle timing data for natural pacing.
6. **JSON ONLY:** Respond with valid JSON containing "sceneDataList" array and "videoMainSubject" string.

**EXAMPLE:**
✅ CORRECT: "A person sits at a desk typing on a laptop. Money icons float nearby."
❌ WRONG: "A cinematic shot of an entrepreneur in anime style..." (describes style/camera)

**JSON Structure:**
{
  "sceneDataList": [
    {
      "sceneNumber": 1,
      "narration": "...",
      "sceneDuration": 3.25,
      "imageGenPromptDirective": "..."
    }
  ],
  "videoMainSubject": "Primary subject/theme (e.g., 'Elon Musk, CEO of SpaceX and Tesla', 'Ancient Roman Empire', 'Indie Hacker Movement')"
}`;

            const userMessage = `Please create a scene segmentation and identify the main subject based on the following data and rules.

**TASK RULES:**
- NARRATIVE INTEGRITY: Keep complete sentences and ideas within a single scene. Do not split a sentence across multiple scenes.
- TIMING CALCULATION: Use the SUBTITLE SEGMENTS data to calculate the exact duration of each scene using the formula: (last_segment.endSec - first_segment.startSec).
- OPTIMAL PACING: Create 3-6 scenes with natural transitions, ensuring each scene has enough content to be visually engaging.
- SUBJECT IDENTIFICATION: Analyze the narration script to identify the main subject/theme that should be visually consistent across all scenes.

**TASK DATA:**

NARRATION SCRIPT:
"${narrationScript}"

SUBTITLE SEGMENTS (with precise timing):
${JSON.stringify(subtitleSegments, null, 2)}

Now, provide the final JSON output with both scene segmentation and video main subject.`;

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
                return {
                    success: false,
                    error: {
                        message: 'No scene segmentation generated from OpenAI',
                        code: 'EMPTY_RESPONSE'
                    }
                };
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
                    success: true,
                    sceneDataList: sceneDataList,
                    videoMainSubject: videoMainSubject
                };
            } catch (parseError) {
                console.error('Failed to parse scene segmentation JSON response:', parseError);
                return {
                    success: false,
                    error: {
                        message: 'Failed to parse scene segmentation response',
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
        masterStylePrompt: string,
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

            const systemMessage = `You are a professional visual artist specializing in writing descriptive prompts for the **Imagen 4** model.

Your task is to fuse four components: Master Style Guide, Scene Content Description, Current Scene Narration, and Video Main Subject.

**COMPONENT ROLES:**
- **Current Scene Narration**: The specific text spoken during this scene
- **Video Main Subject**: The primary subject/theme that should be consistently represented across all scenes (e.g., "Elon Musk, CEO of SpaceX and Tesla", "Steve Jobs", "Ancient Roman Empire")

**CRITICAL INSTRUCTIONS:**
1. **Perfect Fusion:** Combine the visual style, content description, current scene narration, and main subject into a single coherent image prompt.
2. **Subject Consistency:** Ensure the Video Main Subject is accurately and consistently represented in the visual output.
3. **EXPLICIT SUBJECT REFERENCE:** When the Video Main Subject refers to a specific person, entity, or concept, you MUST explicitly mention and describe them rather than using generic terms like "a person" or "a man". For example:
   - ✅ CORRECT: "Elon Musk, the CEO of SpaceX and Tesla, stands in..."
   - ❌ WRONG: "A middle-aged man stands in..."
4. **ASPECT RATIO COMPLIANCE:**
   - All image prompts must be optimized for vertical 9:16 aspect ratio (mobile/portrait orientation).
   - NEVER use terms like "widescreen", "panoramic", "cinematic wide shot" that suggest horizontal framing.
   - Instead use terms like "portrait composition", "vertical framing", or simply omit aspect ratio descriptors.
5. **NO TEXT:** The generated image must be purely pictorial without any letters or words.
6. **Mouths Closed:** All characters must have closed mouths for animation stability.
7. **Scene Focus:** Your primary focus should be on this specific scene's narration while maintaining subject consistency.
8. **CHARACTER DEPICTION PRINCIPLE:**
   - **By default:** Characters should be depicted with neutral, universally relatable appearances, avoiding specific religious or political symbols (e.g., hijabs, crosses).
   - **EXCEPTION:** If the Video Main Subject is EXPLICITLY about a specific historical event, religion, or cultural figure, you MUST prioritize thematic and historical accuracy over neutrality.

Provide ONLY the final image generation prompt as a single paragraph.`;

            const userMessage = `Create an image prompt that combines these elements:

**Master Style Guide:**
"${masterStylePrompt}"

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
                max_completion_tokens: 3072,
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

    // async postVideoGenPrompt(
    //     imageGenPrompt: string,
    //     sceneNarration: string,
    //     imageBase64: string,
    // ): Promise<{ success: boolean; videoGenPrompt?: string; error?: { message: string; code: string } }> {
    async postVideoGenPrompt(
        imageGenPrompt: string,
        sceneNarration: string,
        imageBase64: string,
    ): Promise<{
        success: boolean;
        videoGenPositivePrompt?: string;
        videoGenNegativePrompt?: string;
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

//             const systemMessage = `You are a professional AI video generation prompt engineer, specializing in creating efficient and clear motion prompts for the **wan-2.2-i2v-fast** model.
//
// Your core mission is to describe ONLY the motion to be applied to a static source image.
//
// **CRITICAL RULES (ABSOLUTE):**
// 1. **MOTION ONLY:** Never describe the character, art style, or scene composition. They are already defined in the source image.
// 2. **AVOID FACIAL ANIMATION:** Do not describe complex facial animations like 'laughing' or 'talking'. Use safe movements like head turns or blinks.
// 3. **ZOOM RULE:** When zooming in on a person, they must always remain the focal point.
//
// **MOTION CATEGORIES:**
// • Camera movements: gentle zoom-in/out, slow pan left/right, subtle parallax motion
// • Environmental effects: wind on hair/clothing, particle effects, lighting shifts
// • Character movements: subtle head turns, eye movements, gentle breathing, posture shifts
// • Object interactions: steam rising, pages turning slowly
// • Atmospheric effects: fog drifting, light rays shifting, shadows moving
//
// **EXAMPLE:** "A gentle zoom-in on the character's face. Her head turns slightly to the right as her eyes blink naturally. Soft wind moves a few strands of her hair."`;
            const systemMessage = `You are a professional AI video generation prompt engineer, specializing in creating efficient and clear motion prompts for the **wan-2.2-i2v-fast** model.

Your mission is to analyze the provided image and generate TWO types of prompts:

1. **POSITIVE PROMPT (Motion Description)**: Describe ONLY the motion to be applied to the static source image.
2. **NEGATIVE PROMPT (Motion Constraints)**: Identify potential motion-related problems specific to THIS image and scene context.

**POSITIVE PROMPT RULES:**
- Motion only, no character/style description
- Avoid complex facial animations
- Focus on camera movements, environmental effects, subtle character movements

**NEGATIVE PROMPT RULES:**
- Analyze the specific image for potential motion artifacts
- Include scene-specific constraints (e.g., if character has long hair: "hair clipping through body")
- Add general video quality constraints: "jerky movement, stuttering, unnatural speed changes"
- Keep concise, comma-separated format

**OUTPUT FORMAT:**
{
  "positivePrompt": "...",
  "negativePrompt": "..."
}`;

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
                                text: `Generate a motion prompt based on this image and narration.
        
**Narration:** "${sceneNarration}"
**Original scene intent:** "${imageGenPrompt}"

Focus ONLY on motion. The intent is provided for context, not for re-description.`
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
                max_completion_tokens: 3072,
            });

            // const generatedPrompt = completion.choices[0]?.message?.content;
            //
            // if (!generatedPrompt) {
            //     return {
            //         success: false,
            //         error: {
            //             message: 'No video generation prompt generated from OpenAI',
            //             code: 'EMPTY_RESPONSE'
            //         }
            //     };
            // }
            //
            // return {
            //     success: true,
            //     videoGenPrompt: generatedPrompt.trim()
            // };

            const generatedContent = completion.choices[0]?.message?.content;

            if (!generatedContent) {
                return {
                    success: false,
                    error: {
                        message: 'No scene segmentation generated from OpenAI',
                        code: 'EMPTY_RESPONSE'
                    }
                };
            }

            try {
                // JSON 파싱 시도
                const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
                const match = generatedContent.match(jsonRegex);
                const jsonString = match ? match[1] : generatedContent;

                const parsedData: {
                    positivePrompt: string;
                    negativePrompt: string;
                } = JSON.parse(jsonString);

                const videoGenPositivePrompt: string = parsedData.positivePrompt;
                const videoGenNegativePrompt: string = parsedData.negativePrompt;

                return {
                    success: true,
                    videoGenPositivePrompt: videoGenPositivePrompt,
                    videoGenNegativePrompt: videoGenNegativePrompt
                };
            } catch (parseError) {
                console.error('Failed to parse video gen prompt JSON response:', parseError);
                return {
                    success: false,
                    error: {
                        message: 'Failed to parse video gen prompt response',
                        code: 'PARSE_ERROR'
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

    async postMusicGenerationData(
        videoMainSubject: string,
        fullNarrationScript: string,
        masterStylePositivePrompt: string,
        sceneDataList: SceneData[]
    ): Promise<{ success: boolean; data?: Partial<PostGenerateRequest>; error?: { message: string; code: string } }> {
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

            const systemMessage = `You are an expert AI music director. Your mission is to analyze video data and generate parameters for an **instrumental** background music track using the Suno API. **All generated music must be purely instrumental, with no vocals or lyrics.**

**INPUT DATA STRUCTURE:**
You will receive a JSON object in the user message containing the following key information about the video:
- **videoMainSubject (string):** The primary subject, person, or concept of the entire video (e.g., "Elon Musk", "The Roman Empire"). This is the 'main character' of the story.
- **fullNarrationScript (string):** The complete script for the video. Use this to understand the overall story arc and emotional progression.
- **masterStylePositivePrompt (string):** A detailed prompt defining the overall visual aesthetic (e.g., "cinematic, vibrant cyberpunk style"). This is a huge clue for the musical mood.
- **sceneDataList (array of SceneData objects):** A list of individual scenes. Each \`SceneData\` object contains detailed information about a scene.
  - **Focus on these key fields** to understand the mood:
    - \`sceneNumber\`: The sequence number of the scene.
    - \`narration\`: The spoken script for this specific scene.
    - \`imageGenPromptDirective\`: A high-level, conceptual guide for the scene's visual goal. It sets the overall direction.
    - \`imageGenPrompt\`: A detailed, concrete prompt describing the specific visuals of the scene. **This provides the strongest clues for the atmosphere and mood.**
    - \`videoGenPrompt\`: Describes motion in the scene, which can inform the music's dynamics.

Your output MUST be a valid JSON object with "title", "style", "prompt", and "negativeTags".

**PARAMETER GUIDELINES:**
1.  **title (string):** Create a short, catchy title for the music track.
2.  **style (string):** Define the overall genre, mood, and key instrumentation. This should be a concise but descriptive phrase. Examples: "Cinematic Epic Orchestral", "Lofi Chillhop Beat", "Upbeat Corporate Pop", "Mysterious Ambient Soundscape", "Acoustic Folk, Sentimental", "8-bit Retro Game Music".
3.  **prompt (string):** Write a detailed paragraph describing the music, its instruments, and emotional progression. **Crucially, the description must be for an instrumental track only. Do not mention or request any vocals, singing, or lyrics.**
4.  **negativeTags (string):** Based on the desired mood, list comma-separated keywords of musical genres, instruments, or feelings to AVOID. **You MUST always include tags to prevent vocals, such as "vocals", "lyrics", and "singing".** Example: For an 'Uplifting Lofi' track, this might be "Heavy Metal, Aggressive Drums, sad, dissonant, vocals, singing, lyrics".

**CRITICAL OUTPUT FORMAT:**
- Your response must be ONLY a valid JSON object.
- Use double quotes for all keys and string values.

**GOLD-STANDARD EXAMPLE:**
- YOUR REQUIRED OUTPUT (JSON):
  {
    "title": "Solo Journey",
    "style": "Uplifting Lofi Electronic",
    "prompt": "A gentle, optimistic lofi beat with a simple piano melody...",
    "negativeTags": "Heavy Metal, Aggressive Drums, Distorted Guitar, sad, melancholic, dark, vocals, singing, lyrics, voice"
  }`;

            // AI에 전달할 데이터를 명확한 구조로 재구성
            const musicPromptRequestData = {
                videoMainSubject: videoMainSubject,
                fullNarrationScript: fullNarrationScript,
                masterStylePositivePrompt: masterStylePositivePrompt,
                sceneDataList: sceneDataList.map((sceneData) => {
                    return {
                        sceneNumber: sceneData.sceneNumber,
                        narration: sceneData.narration,
                        imageGenPromptDirective: sceneData.imageGenPromptDirective,
                        imageGenPrompt: sceneData.imageGenPrompt,
                        videoGenPrompt: sceneData.videoGenPositivePrompt,
                    }
                })
            };

            const userMessage = `Based on the following video data, please generate the Suno API parameters in the required JSON format.

**TASK DATA:**
${JSON.stringify(musicPromptRequestData, null, 2)}

Now, provide the final JSON output.`;

            const client = new OpenAI({ apiKey });

            // ... (이하 API 호출 및 응답 처리 로직은 이전과 동일)
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
                return { success: false, error: { message: 'No music generation data from OpenAI', code: 'EMPTY_RESPONSE' } };
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
                    data: parsedData
                };
            } catch (parseError) {
                console.error('Failed to parse music generation JSON response:', parseError);
                return { success: false, error: { message: 'Failed to parse music generation response from AI', code: 'PARSE_ERROR' } };
            }
        } catch (error) {
            console.error('Music generation data error:', error);
            return { success: false, error: { message: error instanceof Error ? error.message : 'Unknown error occurred', code: 'INTERNAL_ERROR' } };
        }
    },
}