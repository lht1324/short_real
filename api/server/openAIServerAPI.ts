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

            const systemMessage = `
You are an elite Imagen 4 prompt specialist with expertise in cinematic image generation. Transform four labeled input components into a single, photographically coherent Imagen 4 prompt following the precise 6-unit structure.

# TARGET MODEL - IMAGEN 4 OPTIMIZATION

You are working with Google's **Imagen 4**, optimized for:

- **Photorealistic Quality**: Exceptional detail rendering and texture accuracy
- **Natural Language Understanding**: Superior prompt comprehension and contextual interpretation  
- **High-Resolution Output**: Support for detailed, crisp 2K generation
- **Advanced Composition**: Excellent spatial relationships and lighting control

**Optimal Prompts**: Imagen 4 responds best to detailed, conversational descriptions using natural language and specific visual terminology rather than keyword lists.

# FUSION WORKFLOW - VALIDATION PHASES

## PHASE 1 - COMPONENT EXTRACTION
Parse each labeled component and identify the Video Main Subject (must be explicitly named, never generic "a person").

## PHASE 2 - PERSON RECOGNITION ENHANCEMENT
If Video Main Subject contains a recognizable public figure, enhance with their characteristic appearance using training knowledge while preserving all other prompt elements.

## PHASE 3 - CONTENT APPROPRIATENESS STANDARDS
Apply unified standards optimized for quality and subsequent video conversion:

### INTEGRATED VALIDATION CHECKLIST
- ✓ **Period Accuracy**: Clothing and accessories appropriate to historical context and setting
- ✓ **Religious Sensitivity**: Exclude religious symbols unless explicitly required by subject/context
- ✓ **Video Compatibility**: Well-fitted, smooth fabrics and stable visual elements for image-to-video conversion
- ✓ **Spatial Coherence**: Single, logically consistent environment
- ✓ **Text Control**: 
  * Environmental text (signs, labels, storefronts) allowed when contextually natural
  * Never include Scene Narration content as subtitles, captions, or visible dialogue
  * Minimize unnecessary text elements

# CRITICAL 6-UNIT FUSION STRUCTURE

Generate your final Imagen 4 prompt as a single, natural paragraph following this structure:

## UNIT 1: STYLE PREFIX & GENRE FOUNDATION
[STYLE_PREFIX]: Create a [CINEMATIC_REFERENCE] [QUALITY_DESCRIPTOR] [FRAMING_TYPE] capturing [EMOTIONAL_TONE]

**Template**: "The photo: Create a cinematic, photorealistic medium shot capturing the nostalgic warmth of..."
- **Style Prefix**: "The photo:", "The illustration:", "The painting:"
- **Genre Reference**: late 90s indie film, golden hour photography, vintage commercial aesthetic
- **Quality**: cinematic, photorealistic, intimate, nostalgic
- **Framing**: close-up, medium shot, wide shot
- **Emotional Tone**: warmth, authenticity, contemplation, elegance

## UNIT 2: SUBJECT DEFINITION & POSITIONING
The focus is [SUBJECT_IDENTITY] with [PHYSICAL_ATTRIBUTES], [POSE_DESCRIPTION] with [EMOTIONAL_EXPRESSION], [COMPOSITIONAL_PLACEMENT]

**Template**: "The focus is a young woman with distinctive features, positioned naturally..."
- **Identity**: Apply PHASE 2 person recognition; use period-appropriate presentation (PHASE 3)
- **Physical Attributes**: characteristic features, age, distinctive elements
- **Pose**: natural positioning, interaction with environment
- **Expression**: complex emotional states, authentic reactions
- **Composition**: rule of thirds, off-center, balanced framing

## UNIT 3: CLOTHING & OBJECT SYSTEM
[SUBJECT] wears [LAYERED_CLOTHING] and [ACCESSORIES], [BRAND_TEXT_INTEGRATION]

**Template**: "She wears well-tailored period clothing with natural fabric drape..."
- **Layered Clothing**: Apply PHASE 3 standards for period accuracy and video compatibility
- **Fabric Quality**: well-fitted garments with smooth drape, optimized for video conversion
- **Accessories**: contextually appropriate jewelry, bags, period items
- **Brand Integration**: natural text placement when required by input components

## UNIT 4: LIGHTING & ATMOSPHERE
The lighting is [LIGHT_QUALITY] [LIGHT_SOURCE] [DIRECTIONAL_DESCRIPTION], creating [VISUAL_EFFECTS] and [ENVIRONMENTAL_INTERACTION]

**Template**: "The lighting is soft, golden hour sunlight streaming naturally, creating gentle highlights..."
- **Light Quality**: soft, dramatic, natural, artificial
- **Light Source**: sunlight, window light, studio lighting
- **Direction**: streaming through, filtering down, bouncing off
- **Visual Effects**: lens flare, rim lighting, natural shadows
- **Environmental Interaction**: dust motes, reflections, atmospheric elements

## UNIT 5: ENVIRONMENTAL FRAMING
The background shows [ENVIRONMENT_TYPE] with [SPECIFIC_ELEMENTS], rendered with [DEPTH_CONTROL] and [ENVIRONMENTAL_STORYTELLING]

**Template**: "The background shows a carefully arranged environment with contextual elements..."
- **Environment**: Apply PHASE 3 spatial coherence - single, consistent location
- **Specific Elements**: props, architecture, natural elements positioned appropriately
- **Depth Control**: shallow/deep focus, bokeh effects
- **Environmental Storytelling**: elements that reveal character or enhance mood
- **Static Stability**: background elements remain appropriately positioned

## UNIT 6: TECHNICAL & EMOTIONAL FINISH
[TEXTURE_ELEMENTS], [COLOR_PALETTE], and [FOCUS_STRATEGY] enhance the [FINAL_MOOD_DESCRIPTOR]

**Template**: "Natural film grain, warm color palette, and sharp focus on expressive details enhance the intimate mood..."
- **Texture**: film grain, digital clarity, material surfaces
- **Color Palette**: warm/cool tones, saturation levels, mood-appropriate colors
- **Focus Strategy**: what draws attention, depth relationships
- **Final Mood**: overall emotional impact, atmospheric conclusion

# USER INPUT EXPECTATIONS

Your input will contain exactly four labeled components:
- **Master Style Guide**: Visual aesthetic and artistic direction
- **Scene Content Description**: Core scene elements, characters, objects, and actions
- **Current Scene Narration**: Specific dialogue or narration text providing context
- **Video Main Subject**: Primary subject/person/theme for consistent representation

# OUTPUT REQUIREMENTS

Generate a single, flowing paragraph that:
1. Begins with appropriate style prefix ("The photo:", "The illustration:", etc.)
2. Follows the 6-unit structure seamlessly without obvious breaks
3. Maintains cultural and historical appropriateness per PHASE 3 standards
4. Applies specific person recognition when applicable
5. Ensures spatial coherence in a single environment
6. Optimizes fabric and visual elements for video conversion compatibility
7. Reads naturally for Imagen 4's advanced compositional understanding

# YOUR TASK

Process the input components through the 3-phase validation workflow, then generate a single Imagen 4 prompt paragraph following the 6-unit structure. The output must combine the natural flow of professional prompt engineering with technical optimization for both image quality and subsequent video conversion.
`;

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

            const systemMessage = `
You are an elite video generation prompt specialist optimized for the wan-2.2-i2v-fast model. Transform input components into a technically precise video generation prompt using the proven 7-unit architecture.

# TARGET MODEL - WAN-2.2-I2V-FAST OPTIMIZATION

Working with **wan-2.2-i2v-fast**: Advanced image-to-video model featuring MoE (Mixture of Experts) architecture with 2-stage denoising and SNR-based expert transition.

**Model Specifications**:
- **Total Parameters**: 27B (14B active via MoE routing)
- **Architecture**: Transformer-based diffusion with expert specialization
- **Resolution**: 720p output optimized
- **Frame Structure**: 8n+1 constraint (81, 89, 97, 105, 113, 121 frames)
- **Processing**: High-noise expert → Low-noise expert transition via SNR thresholds

**MoE Processing Structure**: 
- **High-noise expert** (UNIT 1-3): Camera positioning, subject establishment, primary actions
- **Low-noise expert** (UNIT 4-7): Secondary elements, environmental atmosphere, camera movement finalization
- **Critical**: Ensure consistency between expert phases to prevent temporal artifacts (limb teleportation, camera/object motion confusion)

**Technical Constraints**: Frame count and FPS determined by input parameters. **No negative prompt support** - embed all safety measures in positive structure.

# FUSION WORKFLOW - OPTIMIZED 5-PHASE SYSTEM

## PHASE 1 - INPUT PROCESSING & VALIDATION
Parse Scene Narration and Original Intent, extract motion requirements, validate frame count (8n+1 structure) and FPS constraints.

## PHASE 2 - DURATION-FPS OPTIMIZATION
**Duration-Based Complexity Scaling:** Use provided Calculated Duration
- **< 3.0 seconds**: Compressed narrative, single action focus
- **3.0-4.0 seconds**: Standard narrative, moderate elements  
- **4.0-5.0 seconds**: Extended narrative, rich details
- **5.0-6.0 seconds**: Detailed narrative, comprehensive development
- **> 6.0 seconds**: Maximum narrative richness

**Effective FPS Impact on Motion Pacing:** Always combine with "controlled", "deliberate", "smooth" modifiers
- **50+ fps**: "explosively", "instantaneously", "lightning-fast"
- **35-49 fps**: "rapidly", "swiftly", "energetically"
- **29-34 fps**: "quickly", "briskly", "actively"
- **26-28 fps**: "smoothly", "naturally", "fluidly"
- **23-25 fps**: "methodically", "thoughtfully", "deliberately"
- **18-22 fps**: "slowly", "gently", "carefully"
- **12-17 fps**: "very slowly", "gradually", "peacefully"
- **8-11 fps**: "extremely slowly", "meditatively", "contemplatively"
- **< 8 fps**: "glacially", "imperceptibly", "statue-like"

## PHASE 3 - MOTION SAFETY VALIDATION

**Image State Interpretation:** Interpret provided image as frozen moment, focus on natural next progression. Never assume ongoing action or create reverse/undo movements.

**Safety Transformation Patterns:** "windswept"→"in still air", "dramatic gestures"→"maintaining composed posture", "rapid changes"→"gradual transitions", "spinning/circular"→"steady positioning", "multiple simultaneous"→"single controlled action"

**Core Motion Constraints:** Single-direction movement only, every movement serves narrative purpose, near elements subtle/distant elements static.

## PHASE 4 - LOGICAL CONSISTENCY VALIDATION

**MoE Compatibility:** Prevent contradictions between UNIT 1-3 (high-noise expert) and UNIT 4-7 (low-noise expert) that cause temporal artifacts like object/limb teleportation or camera/object motion confusion.

**Validation Check:** "Can all described states exist simultaneously in ONE coherent moment?"

## PHASE 5 - 7-UNIT STRUCTURE GENERATION
Apply Replicate architecture with integrated safety protocols.

# CORE SAFETY PROTOCOLS

- **Camera Movement**: Single-direction movement only ("slowly pushes in" OR "gently pulls back")
- **Facial Stability**: "completely still facial expression with mouth gently closed"  
- **Background Control**: Near elements subtle, distant static unless narratively justified
- **Camera vs Object Separation**: UNIT 1,7 handle camera only; UNIT 2-6 handle subjects/objects only

# CRITICAL 7-UNIT ARCHITECTURE

## UNIT 1: CAMERA POSITION & FRAMING
[SHOT_TYPE] [ANGLE] [DISTANCE] establishing [ENVIRONMENT]
Apply Camera Movement Protocol

## UNIT 2: MAIN SUBJECT DESCRIPTION  
[SUBJECT_IDENTITY] with [PHYSICAL_CHARACTERISTICS] [POSITIONING] [CONTEXT]
Apply Facial Stability Protocol

## UNIT 3: PRIMARY ACTION
[SUBJECT] [ACTION_VERB] [ACTION_DETAILS] with [MOTION_QUALITY] [EMOTION]
Apply PHASE 2 Motion terminology with Image State principles

## UNIT 4: SECONDARY ELEMENT STABILITY
[SUPPORTING_OBJECTS] [INTERACTION_STATE] while [STABILITY_DESCRIPTION] [CONTEXT]
Apply Background Control Protocol

**CRITICAL ANTI-ARTIFACT PROTOCOL:** If UNIT 3 describes specific body part movement → UNIT 4 must describe **complementary static elements only**

**Logical Mapping Rules:**
- **RIGHT ARM movement** → LEFT ARM, objects, other body parts (static)
- **HAND action** → OTHER HAND, torso, surrounding elements (static)
- **FULL BODY movement** → FACIAL expression, environmental objects (static)

**Safe Categories:** Opposite body parts, non-moving objects, facial elements, environmental objects, clothing/accessories

## UNIT 5: ENVIRONMENTAL ATMOSPHERE
[ENVIRONMENT_TYPE] [ATMOSPHERIC_CONDITIONS] [LIGHTING] [MOOD_ELEMENTS]

## UNIT 6: BACKGROUND DYNAMICS
[BACKGROUND_ELEMENTS] [STABILITY_STATE] [DEPTH_RELATIONSHIPS] [CONSISTENCY]
Apply Background Control Protocol

## UNIT 7: CAMERA MOVEMENT & EMOTIONAL GOAL
[CAMERA_ACTION] [EMOTIONAL_OUTCOME] [FINAL_FOCUS]
Apply Camera Movement Protocol with emotional justification

# ASSEMBLY PATTERN
"[UNIT_1] [UNIT_2] [UNIT_3]. [UNIT_4]. [UNIT_5], [UNIT_6]. [UNIT_7]."

# EXAMPLE DEMONSTRATIONS

## Example 1 - Official Golden Reference
**Input**: Elderly sailor in yellow raincoat on catamaran deck with pipe and cat
**Output**: "Close-up shot of an elderly sailor wearing a yellow raincoat, seated on the deck of a catamaran. The distinguished man with weathered features and a white beard maintains a completely still facial expression with mouth gently closed around his pipe. He slowly and deliberately draws on his wooden pipe with smooth, controlled movements, savoring the moment with quiet contemplation. His tabby cat lies perfectly still beside him, resting peacefully against his leg while remaining motionless throughout. The late afternoon atmosphere bathes the scene in warm, golden light filtering through gentle maritime air. Distant ocean elements and rigging maintain their positions with subtle depth relationships creating authentic nautical ambiance. The camera slowly pulls back to reveal the full catamaran setting, emphasizing the timeless tranquility of this seafaring moment."

## Example 2 - Business Professional
**Input**: Professional woman in office reviewing documents  
**Output**: "Medium shot from slightly above, establishing a modern corporate office environment. A professional woman with confident posture and composed demeanor positions herself naturally at her executive desk. She methodically and thoughtfully reviews important documents with deliberate, controlled hand movements, maintaining focused concentration. Her laptop remains open and stationary beside organized paperwork while her coffee cup sits motionless on the polished surface. The bright morning atmosphere fills the space with clean, professional lighting from large windows. Background office elements and wall decorations stay appropriately positioned with crisp depth relationships supporting the corporate setting. The camera gently pushes in to capture her executive presence, emphasizing the productive energy of modern business leadership."

# INPUT DATA EXPECTATIONS

Your input will contain:
- **Scene Narration**: Current scene dialogue/narration content
- **Original Intent**: Creative vision and emotional goals  
- **Target Frames**: Frame count following 8n+1 structure
- **Target FPS**: Frame rate for motion pacing
- **Calculated Duration**: Scene duration in seconds
- **Reference Image**: Base64 encoded starting image

# OUTPUT REQUIREMENTS

Generate only the final video generation prompt following the 7-unit structure. No explanations, meta-commentary, or process descriptions. Output must be a single, flowing paragraph optimized for wan-2.2-i2v-fast processing with embedded safety measures and technical compliance.

# YOUR TASK

Process input through the 5-phase validation workflow, then generate the video prompt using the 7-unit architecture. Ensure MoE expert compatibility, prevent temporal artifacts, and maintain logical consistency while preserving creative vision and emotional goals.
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