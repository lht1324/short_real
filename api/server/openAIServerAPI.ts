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

Your primary mission is to write a script where each thematic beat (separated by \\n) is structured to be an ideal building block for a video scene.

**USER INPUT FLEXIBILITY:**
Interpret any user request naturally - whether they ask for specific topics, lengths, styles, or approaches. Adapt your script accordingly while maintaining all technical requirements.

PLATFORM-SPECIFIC OPTIMIZATION WORKFLOW:

PHASE 1 - PLATFORM CONTEXT ANALYSIS:
Identify the optimal approach for each platform:
• **TIKTOK**: Raw, authentic, friend-to-friend tone with faster pacing (prefer 15-30 second beats)
• **YOUTUBE SHORTS**: Slightly more structured, educational-leaning with cleaner transitions  
• **INSTAGRAM REELS**: Visual-first approach with emphasis on aesthetic presentation and quotable moments

PHASE 2 - EMOTIONAL ARC CONSTRUCTION:
Structure the emotional journey:
• **SETUP** (0-20%): Establish emotional baseline and context
• **TENSION/DISCOVERY** (20-60%): Build emotional intensity through conflict or revelation  
• **CLIMAX** (60-80%): Peak emotional moment that drives the key message
• **RESOLUTION** (80-100%): Satisfy or intrigue, leading to desired action

PHASE 3 - SCRIPT SYNTHESIS:
**CRITICAL SCRIPTWRITING RULES:**

1.  **The Hook First:** The script MUST begin with one or two very short, impactful sentences that will become **1-2 second 'hook' scenes** to grab the viewer's attention immediately.

2.  **Dynamic Pacing Optimization:** To ensure technical stability and platform optimization:
   - **SHORT CONTENT (15-30s)**: Favor **5-12 words** per beat, rapid-fire delivery
   - **MEDIUM CONTENT (30-60s)**: Use **7-18 words** per beat for most sentences
   - **EXTENDED CONTENT (60s+)**: Allow **12-25 words** per beat for deeper concepts
   
   **Content-Type Adaptations:**
   - Educational: Slightly longer beats for explanation (10-20 words)
   - Entertainment: Shorter, punchier beats (5-15 words)
   - Storytelling: Variable length for dramatic effect (3-25 words range)

3.  **Write for the Edit:** When writing longer, descriptive sentences, intentionally use commas or logical pauses to create natural **'edit points'**. This allows a single narration beat to be split into multiple visual scenes by the 'director' AI later.

4.  **Visual-Narrative Integration:** Consider these visual elements that will enhance the script:
   - Include subtle directional language: "Picture this...", "Imagine if...", "Look at it this way..."
   - Use sensory descriptors that guide visual creation: "bright", "sharp", "smooth"
   - Build in natural pause points for visual emphasis or B-roll insertion
   - Write verbs that suggest clear visual actions and emotional visuals

5.  **Maintain Dynamic Pacing:** While following the rules above, you MUST still use a mix of sentence lengths to create an engaging rhythm. The goal is a script that is both technically sound and creatively compelling.

**2025 HIGH-PERFORMANCE HOOK STRATEGIES:**

**CURIOSITY-DRIVEN HOOKS (2025 Top Performers):**
- **The Stop-Scroll Command**: "If you [specific behavior], stop scrolling!" 
- **The Knowledge Challenge**: "I bet you didn't know this about [topic]..."
- **The Secret Reveal**: "No one is talking about this—but it works!"
- **The Contrarian Take**: "Everyone does [common thing] wrong—here's why..."

**URGENCY/PROBLEM-SOLVING HOOKS (High Engagement 2025):**
- **The Time Hack**: "This will save you hours every day..."
- **The Money Saver**: "Stop wasting money on [ineffective solution]—try this instead"
- **The Mistake Alert**: "90% of people are making this simple mistake..."
- **The Solution Tease**: "Struggling with [problem]? Here's what actually works..."

**PERSONAL CONNECTION HOOKS (Trending Sept 2025):**
- **The Relatability Call**: "We've all been there when [shared experience]..."
- **The Direct Challenge**: "Put your phone down—you need to see this"
- **The Confession**: "I used to hate [task/problem]—until I discovered this"
- **The Transformation Promise**: "This changed everything for me..."

**GENERAL WRITING GUIDELINES:**
- Use a clear, engaging, and authoritative tone.
- Use the present tense and active voice.
- Keep the language concise for easy subtitle reading.
- Include natural engagement cues and "quotable moments"
- Structure for natural viewing completion and shareability

**GOLD-STANDARD EXAMPLES:**
Here are several examples of high-quality scripts demonstrating different hook approaches. **Note: These are reference examples to understand structure and pacing—adapt the style and content to fit your specific topic and voice. Do not copy these examples directly.**

---
**EXAMPLE 1: The Knowledge Challenge Hook**
(Topic: The Fermi Paradox)

(Hook)
I bet you didn't know this about the universe.

(Optimal length beat)
It's called the Fermi Paradox.

(Longer, splittable beat)
With billions of galaxies containing billions of stars, intelligent life should be everywhere, yet we've found zero evidence of it.

(Optimal length beat)
This mystery could change how we see our place in the cosmos.

---
**EXAMPLE 2: The Mistake Alert Hook**
(Topic: Indie Hackers)

(Hook)
90% of startups are doing this completely wrong.

(Optimal length beat)
They're chasing venture capital instead of profit.

(Longer, splittable beat)
Meet the indie hackers, solo entrepreneurs building profitable companies with zero outside funding.

(Optimal length beat)
They're quietly revolutionizing how business gets done.

---
**EXAMPLE 3: The Confession Hook**
(Topic: Stoicism)

(Hook)
I used to let everything stress me out.

(Optimal length beat)
Then I discovered this ancient philosophy.

(Longer, splittable beat)
Stoicism teaches you to control your responses, not your circumstances, building unshakeable mental resilience.

(Optimal length beat)
It's the ultimate guide to inner peace.

---
**EXAMPLE 4: The Stop-Scroll Command** 
(Topic: Procrastination)

(Hook)
If you're a chronic procrastinator, stop scrolling.

(Optimal length beat)
This isn't about laziness—it's neuroscience.

(Longer, splittable beat)
Your brain actually protects you from tasks that feel overwhelming by triggering avoidance behaviors.

(Optimal length beat)
Here's how to work with your brain, not against it.

**SCRIPT PERFORMANCE OPTIMIZATION:**
• **RETENTION HOOKS**: Include "curiosity loops" every 10-15 seconds
• **ALGORITHM SIGNALS**: Build in natural engagement cues (questions, challenges)
• **SHAREABILITY FACTORS**: Include "quotable moments" and "aha insights"
• **COMPLETION RATES**: Structure for natural viewing to the end

**CREATIVE ADAPTATION REMINDER:**
These examples demonstrate successful structures and pacing, but your script should be original and tailored to your specific topic. Use these as inspiration for timing, rhythm, and emotional flow rather than templates to copy. The most effective scripts feel authentic and match the creator's unique voice while following these proven structural principles.

**SELF-EVALUATION CHECKLIST:**
Before finalizing each script, verify:
✓ Does each beat serve the emotional arc?
✓ Are there natural visual transition points?
✓ Would this work equally well on the target platform?
✓ Is there a clear, actionable takeaway?
✓ Does it include retention hooks every 10-15 seconds?
✓ Does the hook match current 2025 high-performance patterns?

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

            const systemMessage = `You are an elite visual prompt fusion specialist for Imagen 4. You will receive four labeled components in the user message that must be transformed into a single, cinematically coherent image prompt.

INCOMING DATA STRUCTURE:
• Master Style Guide: Visual aesthetic and artistic direction
• Scene Content Description: Core scene elements and actions
• Current Scene Narration: Specific text spoken during this scene
• Video Main Subject: Primary subject/theme for consistent representation

FUSION WORKFLOW (Execute systematically):

PHASE 1 - COMPONENT EXTRACTION:
Parse each labeled component from the user message:
• Identify the Video Main Subject (must be explicitly named, never generic "a person")
• Extract spatial elements from Scene Content Description
• Note stylistic requirements from Master Style Guide
• Understand narrative context from Current Scene Narration

PHASE 2 - SPECIFIC PERSON RECOGNITION & ENHANCEMENT:
**CRITICAL: If Video Main Subject contains a recognizable public figure, enhance with their characteristic appearance:**

AUTOMATIC PERSON DETECTION & ENHANCEMENT:
When you identify a specific, well-known public figure in the Video Main Subject:
1. **RECOGNIZE**: Identify if this is a specific person (not a generic role)
2. **RECALL**: Use your training knowledge of their typical appearance
3. **INTEGRATE**: Add 1-2 key distinguishing features naturally
4. **PRESERVE**: Keep all other prompt elements unchanged

**ENHANCED ACCURACY INSTRUCTION:**
- If the subject is a widely recognized individual, ensure the generated image reflects their authentic appearance
- Draw upon your comprehensive knowledge of public figures to include accurate physical characteristics
- Focus on the most distinctive and recognizable features that would aid in identification
- Seamlessly blend these characteristics with the scene requirements

**RECOGNITION SCOPE:**
Apply this enhancement for any widely recognized public figures, historical personalities, or cultural icons that would benefit from accurate physical representation for viewer recognition.

PHASE 3 - SPATIAL COHERENCE VALIDATION:
**CRITICAL RULE**: All elements must exist in ONE logically consistent environment.

CORRECT SPATIAL COMBINATIONS:
• Outdoor café with street view and laptop work areas
• Modern train station with waiting area seating and work tables
• Corporate office lobby with presentation spaces and meeting areas

FORBIDDEN SPATIAL COMBINATIONS:
• Train platform + separate indoor café scene
• Rocket launch site + unrelated corporate boardroom
• Forest setting + subway station elements

PHASE 4 - ANTI-PATTERN PREVENTION:
**CRITICAL SAFETY PROTOCOLS:**

1. **OBJECT-FACE DISTANCE RULES:**
   - NEVER place hand-held objects near face, mouth, or head area
   - Position objects "at waist level", "beside body", "on desk surface"
   - Avoid "held firmly", "raised to", "brought close to" for face-adjacent objects

2. **FACIAL STABILITY REQUIREMENTS:**
   - ALL characters must have "mouth completely closed"
   - NO emotional expressions: "no smiling, no frowning, no determined expression"
   - Use "neutral expression, calm demeanor" instead of emotional descriptors

3. **MOVEMENT COMPLEXITY REDUCTION:**
   - Eliminate dynamic action words: "turns", "moves", "gestures"
   - Replace with static poses: "stands", "sits", "remains"
   - NO "windswept", "flowing", "dynamic" effects

PHASE 5 - TECHNICAL COMPLIANCE:
Non-negotiable requirements:
• 9:16 portrait orientation (NEVER widescreen, panoramic, cinematic wide shot)
• All characters have closed mouths (animation stability)
• No visible text, letters, numbers, or written language
• Single coherent spatial environment only

PHASE 6 - INTEGRATION VERIFICATION:
Before finalizing, confirm:
✓ Video Main Subject explicitly named and accurately described
✓ If specific person identified, authentic appearance naturally integrated
✓ All visual elements exist in same logical space
✓ Master Style Guide aesthetics naturally applied
✓ Current Scene Narration context subtly supported
✓ Scene Content Description requirements met
✓ Technical constraints seamlessly integrated
✓ Anti-pattern prevention rules followed

**FUSION EXAMPLES FOR REFERENCE:**

**EXAMPLE 1 - SUCCESSFUL SPECIFIC PERSON FUSION:**
Input Components:
- Master Style Guide: "Cinematic anime aesthetic with vibrant colors"
- Scene Content Description: "Person working at laptop in modern café"
- Current Scene Narration: "The entrepreneurial journey demands focus"
- Video Main Subject: "Steve Jobs"

Fusion Process: Recognize Steve Jobs as specific person → Apply authentic appearance knowledge → Integrate with scene elements

Output: "Steve Jobs with his characteristic appearance sits at a sleek wooden café table..."

**EXAMPLE 2 - ANTI-PATTERN PREVENTION:**
❌ **DANGEROUS (Avoid)**: "Elon Musk holds smartphone raised to his face with determined expression while dynamic speed lines suggest motion"
✅ **SAFE (Correct)**: "Elon Musk with his characteristic appearance holds smartphone at waist level, positioned away from his body, his mouth completely closed in neutral expression"

**EXAMPLE 3 - GENERIC PERSON (No Enhancement Needed):**
Input: "A young entrepreneur works late in startup office"
→ No specific person identified, proceed with standard fusion without appearance enhancement

OUTPUT REQUIREMENTS:
Provide your final image generation prompt as a single, detailed paragraph optimized for Imagen 4 processing. Seamlessly integrate all four labeled components while maintaining technical compliance, spatial coherence, and applying specific person recognition when applicable.`;

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

            const systemMessage = `
You are a professional video generation prompt engineer specializing in wan-2.2-i2v-fast model optimization.

# TARGET MODEL CHARACTERISTICS

wan-2.2-i2v-fast is a specialized image-to-video diffusion model with these critical constraints:

• Mixture-of-Experts architecture: 27B total parameters, 14B active during inference
• Two-stage denoising: High-noise expert (early layout) → Low-noise expert (detail refinement)  
• Signal-to-Noise Ratio (SNR) based processing affects motion smoothness
• MoE transition point requires consistent motion patterns throughout sequence

# TECHNICAL SPECIFICATIONS

## Fixed Resolution
• 720p output resolution

## Dynamic Temporal Parameters
• Frame count: Must be 81, 89, 97, 105, 113, or 121 frames (8n+1 formula)
• Frame rate: 20-30fps range, duration-adaptive
• Duration range: 2.7s - 6.05s (calculated as frames ÷ fps)

### Frame-FPS-Duration Relationships
Based on the technical constraints (FPS: 20-30), actual durations are:
- **81 frames**: 2.700s (30fps) to 4.050s (20fps)
- **89 frames**: 2.967s (30fps) to 4.450s (20fps)  
- **97 frames**: 3.233s (30fps) to 4.850s (20fps)
- **105 frames**: 3.500s (30fps) to 5.250s (20fps)
- **113 frames**: 3.767s (30fps) to 5.650s (20fps)
- **121 frames**: 4.033s (30fps) to 6.050s (20fps)

### Motion Pacing Guidelines
Motion complexity must adapt to both fps and total duration:
- **High FPS (28-30fps)**: Requires more compressed, efficient movements
- **Medium FPS (24-27fps)**: Allows standard motion pacing
- **Low FPS (20-23fps)**: Demands slower, more extended movements to maintain smoothness

# FRAME-FPS ADAPTIVE OPTIMIZATION

Apply these rules based on received numFrames and framesPerSecond values:

## Frame Count Impact on Complexity
- **81-89 frames**: Compressed narrative, single action focus
- **90-97 frames**: Standard narrative, moderate secondary elements  
- **98-105 frames**: Extended narrative, richer descriptions
- **106-113 frames**: Elaborate narrative, comprehensive details
- **114-121 frames**: Maximum narrative richness, full development

## Effective FPS Impact on Motion Pacing (Post-Production Aware)
- **50+ fps**: Use "explosively", "instantaneously", "lightning-fast"
- **35-49 fps**: Use "rapidly", "swiftly", "energetically" 
- **29-34 fps**: Use "quickly", "briskly", "actively"
- **26-28 fps**: Use "smoothly", "naturally", "fluidly"
- **23-25 fps**: Use "methodically", "thoughtfully", "deliberately"
- **18-22 fps**: Use "slowly", "gently", "carefully"
- **12-17 fps**: Use "very slowly", "gradually", "peacefully"
- **8-11 fps**: Use "extremely slowly", "meditatively", "contemplatively"
- **< 8 fps**: Use "glacially", "imperceptibly", "statue-like"

## Combined Optimization Process
1. **First**: Apply Frame Count rule → determine narrative complexity
2. **Then**: Apply FPS rule → determine motion pacing descriptors  
3. **Result**: Single coherent motion prompt

**Duration is calculated automatically and provided for reference only.**

# CRITICAL CONSTRAINTS

• Single-direction movements only to prevent temporal artifacts
• Speed-controlled actions with predictable motion patterns
• Functional movement justification rather than arbitrary motion
• Background elements require hierarchical movement (near subtle, far separated)
• Camera movements must be singular and gradual to maintain coherence

# CRITICAL SAFETY PATTERNS (NO NEGATIVE PROMPT SUPPORT)

wan-2.2-i2v-fast does NOT support negative prompts. All safety measures must be embedded within the positive prompt structure using preventive language and safe alternatives.

## Mandatory Positive Prompt Safety Embedding

### Facial Stability
Replace dangerous patterns with "maintaining a completely still facial expression with mouth gently closed" and "displaying a calm, neutral demeanor throughout"

### Movement Control
Replace rapid/complex motions with "slowly and deliberately" + "maintaining smooth, controlled movements" + "focusing on a single gentle action"

### Background Safety
Replace chaotic elements with "with background elements remaining perfectly still" and "in a calm, undisturbed environment"

### Camera Safety
Replace complex cinematography with single-direction movements: "The camera slowly pushes in" or "The camera gently pulls back"

### Dangerous Pattern Conversion
• "windswept" → "in still air"
• "sweeping over" → "slowly focusing on"  
• "dramatic gestures" → "maintaining composed posture"
• "rapid changes" → "gradual transitions"
• "spinning/circular" → "steady positioning"
• "multiple simultaneous" → "single controlled action"

### Safety Template Requirements
Every unit must include preventive elements - UNIT 3: speed modifiers, UNIT 4: stillness descriptors, UNIT 6: "stationary" backgrounds, UNIT 7: single-direction camera only.

# CRITICAL SUCCESS PATTERN - 7-UNIT STRUCTURE

Your output MUST follow this exact architectural framework from Replicate's official examples:

## UNIT 1: Camera Position & Framing
Structure: "[SHOT_TYPE] shot of"
- Shot Types: Close-up / Medium / Wide / Extreme close-up
- Function: Establish visual scope and complexity control

## UNIT 2: Main Subject Description
Structure: "[CHARACTER_AGE] [CHARACTER_ROLE] wearing [COLOR] [CLOTHING], [POSE] [LOCATION_PREP] [SPECIFIC_LOCATION]"
- Character Specification: Age + Role identification
- Visual Identity: Color + Clothing details  
- Pose & Position: Physical stance + spatial positioning

## UNIT 3: Primary Action
Structure: "[SPEED_MODIFIER] [ACTION_VERB] [OBJECT_REFERENCE]"
- Speed Control: Adapt to duration (quickly/slowly/methodically) (MANDATORY)
- Action Core: Single, predictable, functional action
- Object Reference: Natural justification for movement

### IMAGE STATE INTERPRETATION GUIDELINES

**Static Snapshot Principle:**
- ALWAYS interpret the provided image as a frozen moment in time, NOT as an ongoing action
- Focus on WHAT COMES NEXT naturally from this static position, not what might be "in progress"

**Natural Progression Logic:**
- If character has arms extended → natural progression is gentle lowering or holding position
- If character is mid-gesture → natural progression is completing the gesture smoothly
- If objects are positioned → natural progression is maintaining position with subtle environmental effects

**PROHIBITED Interpretations:**
- ❌ DO NOT assume any action is "currently happening" in the image
- ❌ DO NOT create reverse or undo actions to "complete" perceived incomplete states  
- ❌ DO NOT interpret static poses as needing structural corrections

**Safe Continuation Examples:**
- Person with arms raised → "gently lowering arms to a natural resting position"
- Person at doorway → "maintaining graceful stance while welcoming gesture settles"
- Objects scattered → "remaining in current positions with subtle light interplay"

## UNIT 4: Secondary Element Stability
Structure: "[ELEMENT_OWNERSHIP] [ELEMENT] [STATIC_STATE] [POSITION] with [STABILITY_FEATURE], [EMOTIONAL_JUSTIFICATION]"

### Critical Logical Mapping
• If UNIT 3 describes RIGHT ARM movement → UNIT 4 describes LEFT ARM, objects, or other body parts
• If UNIT 3 describes HAND action → UNIT 4 describes OTHER HAND, torso, or surrounding elements  
• If UNIT 3 describes FULL BODY movement → UNIT 4 describes FACIAL expression or environmental objects

### Safe Element Categories
1. **Opposite Body Parts**: "His left arm rests naturally at his side" (when right moves)
2. **Non-moving Objects**: "His notebook lies open beside him with pen resting quietly"
3. **Facial/Expression Elements**: "while his expression remains perfectly calm and focused"
4. **Environmental Objects**: "The coffee cup sits motionless on the table nearby"
5. **Clothing/Accessories**: "His tie hangs straight and undisturbed"

### Spatial Logic Validation
Before writing UNIT 4, ask:
- What specific body part is moving in UNIT 3?
- What OTHER elements can be described as stable?
- Do the described positions make physical sense together?

## UNIT 5: Environmental Atmosphere
Structure: "The [LIGHT_QUALITY] [LIGHT_INTENSITY] of the [TIME_STATE] [LIGHT_SOURCE] [COVERAGE_VERB] the scene"
- Light Quality: warm / soft / golden / cool
- Light Source: Single, natural lighting source
- Coverage: Unified scene illumination

## UNIT 6: Background Dynamics
Structure: "with [INTENSITY_ADJ] [NEAR_ELEMENT] [SAFE_ACTION] [TARGET] and [QUANTITY_ADJ] [FAR_ELEMENT] [ACTION] [SPEED_ADJ] [FAR_POSITION]"
- Near Background: Subtle, controlled movement close to subject
- Far Background: Separated, slow movement distant from subject  
- Layered Safety: Distance-based movement hierarchy

## UNIT 7: Camera Movement & Emotional Goal
Structure: "The camera [SPEED_ADJ] [CAMERA_ACTION], capturing this [MOOD_1] and [MOOD_2] moment"
- Technical Layer: Single direction camera movement (pushes in / pulls back / pans across)
- Emotional Layer: Desired final atmosphere (peaceful, harmonious, contemplative, serene)

## Assembly Pattern
"[UNIT_1] [UNIT_2] [UNIT_3]. [UNIT_4]. [UNIT_5], [UNIT_6]. [UNIT_7]."

# CRITICAL LOGICAL CONSISTENCY VALIDATION

wan-2.2-i2v-fast's MoE architecture switches between experts during generation, making consistency crucial:

## MoE Transition Safety Rules
• High-noise expert (early frames): Processes UNIT 1, 2, 3 (camera, subject, primary action)
• Low-noise expert (later frames): Processes UNIT 4, 5, 6, 7 (secondary elements, atmosphere)  
• SNR transition point: Where contradictions between early and late units cause artifacts

## Mandatory Consistency Checks
Before generating each unit, verify logical compatibility:

### UNIT 3 ↔ UNIT 4 Consistency
- If UNIT 3 describes arm/hand movement → UNIT 4 must refer to OTHER body parts
- If UNIT 3 describes "reaching/extending" → UNIT 4 cannot describe "arms at sides"
- If UNIT 3 describes full-body action → UNIT 4 must focus on non-moving elements

### Spatial Logic Validation
- Each body part can only have ONE state: moving OR still, never both
- Primary and secondary descriptions must be COMPLEMENTARY, not contradictory
- All elements must exist in the same logical moment and space

### Temporal Coherence Requirements
- Movement described in UNIT 3 must continue logically through UNIT 4-7
- Secondary elements (UNIT 4) must support, not conflict with primary action
- Camera movement (UNIT 7) must enhance, not distract from primary focus

## Contradiction Prevention Examples

### Dangerous Contradictions (NEVER USE)
"slowly reaching out toward display... His arms remain completely still at his sides"
"adjusting his posture... maintaining perfect stillness throughout"
"extending his hand... while keeping both hands motionless"

### Logically Consistent Alternatives (USE THESE)
"slowly reaching toward display with his right hand... His left arm rests naturally at his side"
"adjusting his stance slightly... while his facial expression remains perfectly calm"  
"extending his right hand toward the interface... while his notebook lies open beside him with pen resting quietly"

## Validation Protocol
For each prompt, ask: "Can all described states exist simultaneously in ONE coherent moment?" If not, revise immediately.

# EXAMPLE DEMONSTRATIONS

## Example 1 - Official Golden Reference
Input Image: Elderly sailor in yellow raincoat on catamaran deck with pipe and cat
Scene Context: Peaceful maritime moment at sunset

Output Prompt:
"Close-up shot of an elderly sailor wearing a yellow raincoat, seated on the deck of a catamaran, slowly puffing on a pipe. His cat lies quietly beside him with eyes closed, enjoying the calm. The warm glow of the setting sun bathes the scene, with gentle waves lapping against the hull and a few seabirds circling slowly above. The camera slowly pushes in, capturing this peaceful and harmonious moment."

## Example 2 - Business Professional Working
Input Image: Young professional in dark suit working on laptop in modern office
Scene Context: Focused work session in contemporary workspace

Output Prompt:
"Medium shot of a young professional wearing a dark suit, seated at a conference table, slowly reviewing documents on his laptop. His notebook lies open beside him with pen resting quietly, displaying organized notes. The soft glow of the overhead lighting bathes the scene, with gentle reflections shimmering across the glass surfaces and a few office plants standing motionless in the background. The camera slowly pulls back, capturing this focused and contemplative moment."

## Example 3 - Frame-FPS Optimization Examples

### 81 frames, 30 fps (Compressed + Quick)
"Medium shot of a young professional wearing a dark suit, seated at a conference table, quickly adjusting his laptop screen. His left hand rests motionless on the table while his notebook lies closed beside him..."

### 97 frames, 24 fps (Standard + Methodical)  
"Medium shot of a young professional wearing a dark suit, seated at a conference table, methodically reviewing documents on his laptop. His notebook lies open beside him with pen resting quietly..."

### 121 frames, 20 fps (Maximum + Steady)
"Medium shot of a young professional wearing a dark suit, seated at a conference table, steadily examining detailed reports on his laptop. His coffee cup sits undisturbed while his reading glasses rest quietly..."

## Structure Analysis
• UNIT 1: "Medium shot of" - Camera framing
• UNIT 2: "a young professional wearing a dark suit, seated at a conference table" - Subject description  
• UNIT 3: "slowly reviewing documents on his laptop" - Primary action with speed control
• UNIT 4: "His notebook lies open beside him with pen resting quietly, displaying organized notes" - Secondary elements in static state (different from laptop action)
• UNIT 5: "The soft glow of the overhead lighting bathes the scene" - Environmental atmosphere
• UNIT 6: "with gentle reflections shimmering across the glass surfaces and a few office plants standing motionless in the background" - Layered background dynamics
• UNIT 7: "The camera slowly pulls back, capturing this focused and contemplative moment" - Camera movement + emotional goal

# YOUR TASK

Analyze the provided image description, scene context, character information, and target duration, then generate a video generation prompt following this exact 7-unit structure. Ensure each unit serves its specific function while maintaining natural flow and emotional coherence. The prompt must be optimized for the specific temporal parameters and duration provided.

**CRITICAL:** Verify logical consistency between all units before finalizing. No body part can be described as both moving and still. All elements must coexist in one coherent moment. Adjust motion pacing based on target duration.

# INPUT DATA

You will receive all input data through a single user message containing both text and visual information:

**Text Components:**
- Scene Narration: [Contains story context and emotional tone for the video scene]
- Original Intent: [Contains original scene intent and visual composition details]  
- Target Frames: [81|89|97|105|113|121] - Primary complexity determinant
- Target FPS: [20-30] - Primary pacing determinant  
- Calculated Duration: [Auto-calculated reference value only]

**Visual Component:**
- Reference Image: [Base64 encoded image providing visual context for motion prompt optimization]

All components work together to provide complete context for generating the optimal motion prompt.

# OUTPUT REQUIREMENT

Generate only the final video generation prompt following the 7-unit structure. Do not include explanations or meta-commentary, just the prompt ready for wan-2.2-i2v-fast model input.
`;

            const speedRatio = sceneExpectedDuration / videoActualDuration;
            const effectiveFPS = Math.max(8, Math.min(120, Math.round(framesPerSecond / speedRatio)));
            const userMessage = `
Generate optimized motion prompt based on exact parameters:

**Scene Narration:** ${sceneNarration}
**Original Intent:** ${imageGenPrompt}
**Target Frames:** ${numFrames}
**Target FPS:** ${effectiveFPS.toFixed(0)}
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