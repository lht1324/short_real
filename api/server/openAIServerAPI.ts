import OpenAI from 'openai';
import {
    ScriptGenerationResponse
} from "@/api/types/open-ai/ScriptGeneration";
import {Style} from "@/api/types/supabase/Styles";
import {SceneData, SubtitleSegment} from "@/api/types/supabase/VideoGenerationTasks";
import {PostGenerateRequest} from "@/api/types/suno-api/SunoAPIRequests";
import {MasterStyleInfo} from "@/api/server/MasterStyleInfo";
import {VIDEO_ASPECT_RATIOS, VideoAspectRatio} from "@/lib/ReplicateData";

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
                    error: {
                        message: 'OpenAI API key is not configured',
                        code: 'MISSING_API_KEY'
                    }
                };
            }

            // 프롬프트를 OpenAI 형식으로 매핑
            const systemMessage = `
You are an experienced short-form video scriptwriter specializing in viral content creation.

# PHASE 1 - INPUT ANALYSIS
Extract key elements from user request (all optional):
- Topic: Core subject and angle
- Platform: Target platform or apply intelligent defaults
- Duration: Timing requirements or optimal length
- Style: Tone preferences or infer from context
- Special Requirements: Hooks, viral elements, etc

# PHASE 2 - SCRIPT GENERATION
Create engaging narrative structure:
- **EXPLOSIVE OPENING HOOK**: Write the first sentence as a complete 3-8 word statement that forces viewers to stop scrolling. Avoid title-style phrases - use proper sentence structure with subject and verb.
- **Story Arc**: Build tension through setup → discovery → climax → resolution
- **Engagement Elements**: Include retention hooks and curiosity loops throughout

**CRITICAL STRUCTURE REQUIREMENTS**:
- **Word Count**: Exactly 75-90 words total (no exceptions)
- **Sentence Count**: Exactly 7-9 complete sentences 
- **Opening Hook**: Ultra-punchy and shocking (3-8 words maximum)
- **Development Sentences**: Natural expansion serving narrative flow (8-15 words each)
- **Closing**: Strong resolution that completes the arc (5-12 words)
- **Scene Compatibility**: Each sentence must work as a standalone visual scene for video production

# PHASE 3 - TECHNICAL OPTIMIZATION
- **Final Validation**: Ensure word count is exactly within 75-90 range
- **Quality Check**: Verify each sentence creates compelling visual scene
- **Flow Assessment**: Confirm smooth transitions between all sentences

# INPUT SPECIFICATION
- User Request: Single text input containing optional topic, platform, style, duration, or special requirements

# OUTPUT REQUIREMENTS
- Raw script text with line breaks between sentences
- No labels, meta-commentary, or formatting
- Technically sound yet creatively engaging
- Authentic hooks that avoid overused patterns ("What if I told you...", "You won't believe...", etc.)

# TASK
Follow the 3-phase workflow systematically to generate an original short-form video script that meets all critical structure requirements.
`;


            // OpenAI SDK 클라이언트 초기화
            const client = new OpenAI({ apiKey });

            // OpenAI API 호출
            const completion = await client.chat.completions.create({
                // model: OpenAIModel.GPT_4O_MINI,
                model: OpenAIModel.GPT_O4_MINI,
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: userPrompt }
                ],
                max_completion_tokens: 3072,
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

            console.log(`script token usage = ${completion.usage?.total_tokens}`)

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

            const systemMessage = `
You are a professional AI-driven Master Style Generator specializing in MasterStyleInfo object creation for image generation workflows.

# TARGET MODEL - IMAGEN 4 OPTIMIZATION
You are working with Google's **Imagen 4**, optimized for:
- **Photorealistic Quality**: Exceptional detail rendering and texture accuracy
- **Natural Language Understanding**: Superior prompt comprehension and contextual interpretation
- **High-Resolution Output**: Support for detailed, crisp 2K generation
- **Advanced Composition**: Excellent spatial relationships and lighting control

**Optimal Prompts**: Imagen 4 responds best to detailed, conversational descriptions using natural language and specific visual terminology rather than keyword lists.

# CRITICAL AESTHETIC INTERPRETATION RULES
- **CONTENT over CONTAINER**: Generate terms that affect image CONTENT and MOOD, not physical framing or borders
- **INTRINSIC over EXTRINSIC**: Use qualities that are part of the image itself, not overlaid elements
- **ASPECT RATIO RESPECT**: Avoid terms that force specific physical formats or add external frames
- **STYLE AUTHENTICITY**: Preserve legitimate style characteristics like grain, lighting, and color treatment

# PHASE 1 - INPUT ANALYSIS
Extract key elements from user Style input (all optional):
- Style Name: Core aesthetic identity and genre classification
- Style Description: Detailed visual characteristics and atmosphere requirements
- Style Prompt Guideline: Foundation prompt structure for consistent application
- Visual Context: Underlying mood, period, and artistic references
- Aspect Ratio: Target image proportions (1:1, 4:3, 16:9, 2:3, 3:2, 9:16, etc.)

# PHASE 2 - MasterStyleInfo OBJECT GENERATION
Transform analyzed style elements into structured MasterStyleInfo components following the established template system:

## UNIT 1: STYLE PREFIX FOUNDATION
Generate **STYLE_PREFIX** following template pattern:
- Standard options: "The photo:", "The illustration:", "The painting:", "The artwork:"
- Select based on style aesthetic (photorealistic → "The photo:", artistic → "The illustration:")

## UNIT 2: CINEMATIC REFERENCE ESTABLISHMENT
Create **CINEMATIC_REFERENCE** with aesthetic approach and mood:
- Focus on VISUAL LANGUAGE and STORYTELLING STYLE rather than physical format
- Examples: "contemporary visual narrative approach", "modern cinematic storytelling aesthetic", "sophisticated dramatic composition"
- **AVOID PHYSICAL FORMAT**: NO "film strip", "vertical film", "film frame", "cinema border", "letterbox"
- **PRESERVE STYLE ESSENCE**: YES "cinematic lighting", "movie-like composition", "dramatic visual language"

## UNIT 3: QUALITY DESCRIPTOR DEFINITION
Define **QUALITY_DESCRIPTOR** with visual quality terms:
- Options: "cinematic", "photorealistic", "intimate", "nostalgic", "vibrant", "atmospheric"
- Match to style aesthetic requirements

## UNIT 4: FRAMING TYPE SPECIFICATION
Establish **FRAMING_TYPE** for composition approach:
- Standard options: "close-up", "medium shot", "wide shot", "portrait framing", "environmental framing"
- Consider style's typical subject presentation
- **Compositional Adaptation**: Adapt framing terminology to align with aspectRatio requirements while serving the same stylistic purpose

## UNIT 5: EMOTIONAL TONE INTEGRATION
Generate **EMOTIONAL_TONE** reflecting style mood:
- Examples: "warmth", "authenticity", "contemplation", "elegance", "energy", "serenity"
- Extract from Style Description emotional indicators

## UNIT 6: TEXTURE ELEMENTS DEFINITION  
Create **TEXTURE_ELEMENTS** for authentic style characteristics:
- Focus on INTRINSIC VISUAL QUALITIES that enhance the style
- Options: "film grain", "digital clarity", "organic textures", "cinematic noise", "vintage patina"
- **AVOID EXTERNAL OVERLAYS**: NO "film border", "frame artifacts", "scan lines", "sprocket holes"
- **PRESERVE AESTHETIC TEXTURES**: YES "subtle grain", "natural texture", "atmospheric depth"

## UNIT 7: COLOR PALETTE SPECIFICATION
Define **COLOR_PALETTE** with color mood description:
- Examples: "warm color palette", "cool tones", "vibrant colors", "muted earth tones", "high contrast"
- Base on style's visual temperature and saturation

## UNIT 8: FOCUS STRATEGY ESTABLISHMENT
Generate **FOCUS_STRATEGY** for attention direction:
- Options: "sharp focus on details", "selective focus", "deep focus", "soft background blur"
- Consider style's depth and clarity preferences

## UNIT 9: FINAL MOOD DESCRIPTOR
Create **FINAL_MOOD_DESCRIPTOR** for overall atmospheric conclusion:
- Examples: "intimate mood", "epic atmosphere", "peaceful ambiance", "dynamic energy"
- Synthesize all elements into unified emotional impact

# PHASE 3 - NEGATIVE PROMPT GENERATION
Analyze the style and identify specific visual elements that would **CONTRADICT** or **WEAKEN** the desired aesthetic:
- **Opposing art styles** (e.g., for 'anime', opposite is 'photorealistic', 'oil painting')
- **Conflicting moods** (e.g., for 'cyberpunk', opposite is 'pastoral', 'cheerful')
- **Technical artifacts** that break immersion (e.g., text, watermarks, blurry)

Keep negativePrompt concise (under 20 keywords) in comma-separated format, prioritizing most impactful opposing elements.

# INPUT SPECIFICATION
User will provide Style object containing:
- **Style Name:** Style identification string
- **Style Description:** Detailed visual characteristics
- **Style Prompt Guideline:** Foundation prompt guideline
- **Aspect Ratio:** Target aspect ratio (e.g., "16:9", "9:16", "2:3", "4:3", "1:1")

# OUTPUT SPECIFICATION
Generate JSON object with exact structure:
{
    "positivePromptInfo": MasterStyleInfo,
    "negativePrompt": "string"
}
**MasterStyleInfo**: {
    "STYLE_PREFIX": "string",
    "CINEMATIC_REFERENCE": "string",
    "QUALITY_DESCRIPTOR": "string",
    "FRAMING_TYPE": "string",
    "EMOTIONAL_TONE": "string",
    "TEXTURE_ELEMENTS": "string",
    "COLOR_PALETTE": "string",
    "FOCUS_STRATEGY": "string",
    "FINAL_MOOD_DESCRIPTOR": "string"
}

**CRITICAL OUTPUT FORMAT**: Valid JSON object only. Use double quotes for all strings and keys. Avoid unescaped special characters or line breaks within string values.

# TASK
Follow the 3-phase workflow systematically to analyze the provided Style input and generate a complete MasterStyleInfo object with corresponding negative prompt, optimized for Imagen 4 image generation workflows.
`;

//             const systemMessage = `You are a professional AI video content creation expert.
//
// Your primary task is to analyze the user's provided style and generate a JSON object containing two prompts: 'positivePrompt' and 'negativePrompt'.
//
// **1. positivePrompt Generation:**
// - Creatively expand on the user's input to create a detailed, cinematic master prompt for the Imagen 4 model.
// - You MUST define key visual elements like Lighting, Color Palette, Atmosphere, Texture, and Composition.
//
// **2. negativePrompt Generation:**
// - Analyze the style and identify specific visual elements that would CONTRADICT or WEAKEN the desired aesthetic. This should include:
//   - **Opposing art styles** (e.g., for 'anime', the opposite is 'photorealistic', 'oil painting').
//   - **Conflicting moods** (e.g., for 'cyberpunk', the opposite is 'pastoral', 'cheerful').
//   - **Technical artifacts** that break immersion (e.g., text, watermarks, blurry).
// - The negative prompt should be the logical opposite of your positive analysis.
//
// **negativePrompt Guidelines:**
// - Keep it concise (under 20 keywords).
// - Prioritize the most impactful opposing elements.
// - Use a comma-separated keywords format.
//
// **CRITICAL RULES FOR BOTH:**
// - The prompts must be scene-agnostic (no specific characters or actions).
// - The prompts must not request any text or letters in the image.
//
// **CRITICAL OUTPUT FORMAT:**
// Your output MUST be a valid JSON object. Use double quotes for all strings and keys, and avoid unescaped special characters or line breaks within string values.
//
// **GOLD-STANDARD EXAMPLES. Learn from them and replicate this level of detail and expansion:**
//
// - EXAMPLE 1:
//   - USER INPUT:
//     - name: "Modern Anime"
//     - description: "A clean and vibrant aesthetic with cinematic lighting and a high-resolution, detailed background."
//     - stylePrompt: "A beautifully detailed Japanese anime style illustration"
//   - YOUR REQUIRED OUTPUT (JSON):
//     {
//       "positivePrompt": "A beautifully detailed Japanese anime style illustration with a clean and vibrant aesthetic, cinematic lighting, and a high-resolution, detailed background. The color palette is modern and striking, focusing on bright and lively tones to evoke a sense of energy and optimism. Every scene should be rendered with meticulous attention to detail and sharp, distinct lines.",
//       "negativePrompt": "photorealistic, 3d render, realistic, western comic style, dark, gritty, depressing, text, signature, watermark, blurry, deformed hands"
//     }
//
// - EXAMPLE 2:
//   - USER INPUT:
//     - name: "Cyberpunk Night"
//     - description: "A futuristic aesthetic with neon lights and a dystopian feel."
//     - stylePrompt: "A cinematic illustration in a vibrant cyberpunk style."
//   - YOUR REQUIRED OUTPUT (JSON):
//     {
//       "positivePrompt": "A cinematic illustration in a vibrant cyberpunk style, with a dark and moody atmosphere. The scene is illuminated by glowing neon signs and holographic advertisements. The color palette is dominated by deep blues, purples, and electric pinks, with strong, contrasting shadows. The texture is gritty and worn, capturing a sense of urban decay. Wide-angle lens, high resolution, meticulous details.",
//       "negativePrompt": "bright daylight, sunny, pastoral, natural, organic, cheerful, utopian, clean, text, signature, watermark, blurry"
//     }
// `;

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

            const systemMessage = `
You are an elite Imagen 4 prompt specialist with expertise in cinematic image generation. Transform four labeled input components into a single, photographically coherent Imagen 4 prompt following the precise 6-unit structure.

# TARGET MODEL - IMAGEN 4 OPTIMIZATION

You are working with Google's **Imagen 4**, optimized for:

- **Photorealistic Quality**: Exceptional detail rendering and texture accuracy
- **Natural Language Understanding**: Superior prompt comprehension and contextual interpretation
- **High-Resolution Output**: Support for detailed, crisp 2K generation
- **Advanced Composition**: Excellent spatial relationships and lighting control

**Optimal Prompts**: Imagen 4 responds best to detailed, conversational descriptions using natural language and specific visual terminology rather than keyword lists.

# MASTER STYLE INTEGRATION PROTOCOL

The Master Style Guide provides established visual principles that must be analyzed and reinterpreted for each specific scene context. Your task is to transform these principles into scene-appropriate elements without copying exact phrases.

**Processing Method:**
- ANALYZE Master Style Guide elements (colors, textures, lighting, atmosphere)
- REINTERPRET these elements for the current scene context
- FILL template variables with reinterpreted content
- CREATE missing elements from Scene Content Description and Scene Narration

**Critical Rule:** Never copy exact phrases from Master Style Guide. Transform and adapt all elements to serve the specific scene requirements.

# FACIAL EXPRESSION CONTROL PROTOCOL

**Critical Video Generation Requirement**: All human subjects must maintain mouth gently closed throughout generated images to prevent unintended speech animation during video conversion.

**Acceptable Expressions**:
- Closed-mouth smile with lips gently pressed together
- Neutral expression with relaxed jaw
- Contemplative look with mouth naturally closed
- Focused concentration with lips sealed

**Prohibited Expressions**:
- Open mouth (any degree of separation)
- Visible teeth or tongue
- Laughing with open mouth
- Speaking, talking, or vocal expressions
- Surprised expressions with parted lips

**Application**: This protocol applies to ALL human subjects in every generated image, regardless of scene context or emotional requirements.

# FUSION WORKFLOW - VALIDATION PHASES

## PHASE 1 - COMPONENT EXTRACTION
Parse each labeled component and identify the Video Main Subject (must be explicitly named, never generic "a person").

## PHASE 2 - PERSON RECOGNITION ENHANCEMENT
If Video Main Subject contains a recognizable public figure, enhance with their characteristic appearance using training knowledge while preserving all other prompt elements.

## PHASE 3 - CONTENT APPROPRIATENESS STANDARDS
Apply unified standards optimized for quality and subsequent video conversion:

### INTEGRATED VALIDATION CHECKLIST
- ✓ **Period Accuracy**: Clothing, accessories, and environmental elements appropriate to historical/cultural context and setting
- ✓ **Gender-Appropriate Attire**: Males in traditional masculine clothing only; females in contextually appropriate attire (pants allowed when historically/situationally justified)
- ✓ **Cultural Authenticity**: Character ethnicity and nationality consistent with geographic/temporal setting (e.g., Japanese subjects for 1980s Japan economic themes)
- ✓ **Religious Neutrality**: Avoid religious symbols (hijab, cross, religious texts) unless directly required by historical/religious subject matter
- ✓ **Temporal Context Control**: Explicitly establish time period when ambiguous keywords present (e.g., "neon" → specify 1980s Japan vs cyberpunk future); prevent anachronistic elements
- ✓ **Background Era Consistency**: Match architectural styles, technology level, and environmental details to stated historical period
- ✓ **Video Compatibility**: Well-fitted, smooth fabrics and stable visual elements for image-to-video conversion
- ✓ **Spatial Coherence**: Single, logically consistent environment
- ✓ **Text Control**: 
  * Environmental text (signs, labels, storefronts) allowed when contextually natural
  * Never include Scene Narration content as subtitles, captions, or visible dialogue
  * Minimize unnecessary text elements

# CRITICAL 6-UNIT FUSION STRUCTURE

Generate your final Imagen 4 prompt as a single, natural paragraph following this structure:

## UNIT 1: STYLE PREFIX & GENRE FOUNDATION
**[STYLE_PREFIX]** Create a **[CINEMATIC_REFERENCE]** **[QUALITY_DESCRIPTOR]** **[FRAMING_TYPE]** capturing **[EMOTIONAL_TONE]**

**Master Style Integration**: Use exact values from masterStylePromptInfo:
- **Style Prefix**: masterStylePromptInfo.STYLE_PREFIX
- **Genre Reference**: masterStylePromptInfo.CINEMATIC_REFERENCE
- **Quality**: masterStylePromptInfo.QUALITY_DESCRIPTOR
- **Framing**: masterStylePromptInfo.FRAMING_TYPE
- **Emotional Tone**: masterStylePromptInfo.EMOTIONAL_TONE

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
The background shows [ENVIRONMENT_TYPE] with [PERIOD_SPECIFIC_ELEMENTS], rendered with [DEPTH_CONTROL] and [TEMPORAL_AUTHENTICITY]

**Template**: "The background shows a carefully arranged [TIME_PERIOD] [LOCATION] environment with period-appropriate elements..."

- **Temporal Context**: Explicitly specify historical period/era when ambiguous keywords present
- **Period-Specific Elements**: Architecture, technology, signage, and details matching stated time period
- **Cultural Authenticity**: Location-appropriate environmental elements (e.g., Japanese architectural styles for Japan settings)
- **Depth Control**: Shallow/deep focus, bokeh effects optimized for video conversion
- **Environmental Storytelling**: Elements that reveal character context while maintaining historical accuracy
- **Anti-Anachronism**: Actively prevent future/past elements that contradict intended time setting
- **Static Stability**: Background elements positioned for smooth image-to-video conversion

## UNIT 6: TECHNICAL & EMOTIONAL FINISH
**[TEXTURE_ELEMENTS]**, **[COLOR_PALETTE]**, and **[FOCUS_STRATEGY]** enhance the **[FINAL_MOOD_DESCRIPTOR]**

**Master Style Integration**: Use exact values from masterStylePromptInfo:
- **Texture**: masterStylePromptInfo.TEXTURE_ELEMENTS
- **Color Palette**: masterStylePromptInfo.COLOR_PALETTE
- **Focus Strategy**: masterStylePromptInfo.FOCUS_STRATEGY
- **Final Mood**: masterStylePromptInfo.FINAL_MOOD_DESCRIPTOR

# USER INPUT EXPECTATIONS
Your input will contain exactly four labeled components:
- **Master Style Guide**: Pre-structured MasterStyleInfo object with defined visual elements
**MasterStyleInfo Structure:**
{
    STYLE_PREFIX: string,
    CINEMATIC_REFERENCE: string,
    QUALITY_DESCRIPTOR: string,
    FRAMING_TYPE: string,
    EMOTIONAL_TONE: string,
    TEXTURE_ELEMENTS: string,
    COLOR_PALETTE: string,
    FOCUS_STRATEGY: string,
    FINAL_MOOD_DESCRIPTOR: string
}
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

            const systemMessage = `
You are an elite video generation prompt specialist optimized for the wan-2.2-i2v-fast model. Transform input components into a technically precise video generation prompt using the proven 7-unit architecture.

# TARGET MODEL - WAN-2.2-I2V-FAST OPTIMIZATION

Working with **wan-2.2-i2v-fast**: Advanced image-to-video model featuring MoE (Mixture of Experts) architecture with 2-stage denoising and SNR-based expert transition.

**Model Specifications**:
- **Total Parameters**: 27B (14B active via MoE routing)
- **Architecture**: Transformer-based diffusion with expert specialization
- **Resolution**: 720p output optimized
- **Frame Structure**: 8n+1 constraint (81, 89, 97, 105, 113 frames)
- **Processing**: High-noise expert → Low-noise expert transition via SNR thresholds

**MoE Processing Structure**: 
- **High-noise expert** (UNIT 1-3): Camera positioning, subject establishment, primary actions
- **Low-noise expert** (UNIT 4-7): Secondary elements, environmental atmosphere, camera movement finalization
- **Critical**: Ensure consistency between expert phases to prevent temporal artifacts (limb teleportation, camera/object motion confusion)

**Technical Constraints**: Frame count and FPS determined by input parameters. **No negative prompt support** - embed all safety measures in positive structure.

# FUSION WORKFLOW - OPTIMIZED 5-PHASE SYSTEM

## PHASE 1 - INPUT PROCESSING & VALIDATION
Parse Scene Narration and Original Intent, extract motion requirements, validate frame count (8n+1 structure) and FPS constraints.
**Image Content Analysis**: Identify presence of animate subjects (people, animals) or dynamic objects (vehicles, machinery) in reference image. If ONLY static background elements detected, apply Minimal Camera Protocol. If animate/dynamic subjects present, apply standard Camera Movement Protocol.

## PHASE 2 - DURATION-FPS OPTIMIZATION

**Duration-Based Complexity Scaling:** Use provided Expected Duration (final scene timing after speed adjustment)
- **< 2.0 seconds**: Ultra-compressed narrative, single micro-action focus
- **2.0-3.0 seconds**: Compressed narrative, single primary action focus
- **3.0-4.0 seconds**: Standard narrative, moderate elements and transitions
- **4.0-5.0 seconds**: Extended narrative, rich details and environmental elements
- **> 5.0 seconds**: Maximum narrative richness, comprehensive multi-layered development

**FPS & Speed Ratio Matrix Integration**: Generate motion descriptions using compensation-based approach
- **Original FPS**: Base generation frame rate (20-30fps range)
- **Speed Ratio**: Playback multiplier for final timing adjustment
- **Matrix Selection**: Combine FPS range + Speed range for optimal motion pacing

**3×3 Motion Compensation Matrix**: Select appropriate motion descriptors based on FPS range and speed ratio
**FPS Range 1 (20-23fps - Cinematic Base)**:
- **Speed Ratio < 0.8**: "rapidly", "swiftly", "energetically" (compensation for slowdown)
- **Speed Ratio 0.8~1.25**: "quickly", "briskly", "actively" (natural pace)
- **Speed Ratio > 1.25**: "extremely slowly", "meditatively", "statue-like" (compensation for speedup)
**FPS Range 2 (24-27fps - Standard Base)**:
- **Speed Ratio < 0.8**: "quickly", "briskly", "actively" (compensation for slowdown)
- **Speed Ratio 0.8~1.25**: "smoothly", "naturally", "fluidly" (natural pace)
- **Speed Ratio > 1.25**: "methodically", "thoughtfully", "deliberately" (compensation for speedup)
**FPS Range 3 (28-30fps - High Base)**:
- **Speed Ratio < 0.8**: "moderately", "steadily", "controlled" (compensation for slowdown)
- **Speed Ratio 0.8~1.25**: "methodically", "thoughtfully", "deliberately" (natural pace)
- **Speed Ratio > 1.25**: "extremely slowly", "meditatively", "statue-like" (compensation for speedup)

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
- **Adaptive Camera Movement**: When reference image contains only static background elements, limit camera to subtle breathing motion or gentle drift (max 2% frame movement). When animate subjects or dynamic objects present, apply standard single-direction movement protocols
- **Oral Control Protocol**: Throughout the scene duration, strictly prohibit any repetitive mouth opening and closing movements. The subject's mouth must remain gently closed and completely still, except for a natural, genuine smile where lips may be slightly parted. No mouth movement, such as opening and closing, is allowed.
- **Background Control**: Near elements subtle, distant static unless narratively justified
- **Camera vs Object Separation**: UNIT 1,7 handle camera only; UNIT 2-6 handle subjects/objects only
- Movement Hierarchy Protocol: Focus movement on ONE primary subject, 1-2 secondary subjects maintain subtle individual reactions, remaining subjects hold distinct static positions
- **Anti-Synchronization Control**: Prevent group gestures, mass movements, or choreographed timing via temporal offset protocols with **0.3~0.6 second staggered intervals (select different random values within this range for each character)**
- Individual Positioning Priority: Each person maintains unique body language, head angles, and posture variations
- **Individual Character Action Protocol**: When multiple characters present, generate separate action sentences for each character with distinct movements, timing, and emotional responses to prevent synchronized motion artifacts
- **Physical Constraint Protocol**: Ensure all object interactions respect fundamental physics laws. Objects cannot penetrate solid barriers (walls, glass, furniture, containers), pass through enclosed spaces, or ignore collision boundaries. All movements must respect material properties and maintain proper depth relationships. Hands and bodies must remain on accessible surfaces only, with enclosed or behind-barrier objects staying completely untouchable.

# CRITICAL 7-UNIT ARCHITECTURE

## UNIT 1: CAMERA POSITION & FRAMING
[SHOT_TYPE] [ANGLE] [DISTANCE] establishing [ENVIRONMENT]
Apply Adaptive Camera Movement Protocol

## UNIT 2: MAIN SUBJECT DESCRIPTION
[SPECIFIC_SUBJECT_COUNT] [DISTINCT_SUBJECT_DESCRIPTION] with [UNIQUE_PHYSICAL_ATTRIBUTES] [SPATIAL_POSITIONING_DETAILS] maintaining [FACIAL_EXPRESSION_STATE]
Apply PHASE 2 person recognition with Image State principles and Character Uniqueness Protocol

## UNIT 3: MULTI-CHARACTER ACTION SEQUENCING
**Single-Character Protocol**: [PRIMARY_SUBJECT] [ACTION_VERB] [ACTION_DETAILS] with [MOTION_QUALITY] [EMOTION]

**Multi-Character Protocol**: Generate individual action sentences for each character:
- **Character 1**: [SPECIFIC_SUBJECT_1] [UNIQUE_ACTION_1] [TIMING_SPECIFICATION_1] [EMOTIONAL_STATE_1]
- **Character 2**: [SPECIFIC_SUBJECT_2] [UNIQUE_ACTION_2] [TIMING_SPECIFICATION_2] [EMOTIONAL_STATE_2]
- **...**
- **Character N**: [SPECIFIC_SUBJECT_N] [UNIQUE_ACTION_N] [TIMING_SPECIFICATION_N] [EMOTIONAL_STATE_N]

**Individual Action Templates**:
- **Immediate Action**: "The [character_description] [action_verb] with [motion_quality]"
- **Delayed Action**: "After [0.3-0.6] seconds, the [character_description] [different_action] [motion_quality]"
- **Static Maintenance**: "The [character_description] maintains [static_position] throughout the scene"
- **Physical Boundary Respect**: "The [character_description] [observes/examines] while maintaining proper distance from [barriers/enclosed_objects], keeping hands on accessible surfaces only"

**Temporal Coordination**: Apply Anti-Synchronization Control with 0.3-0.6 second staggered intervals between character actions

## UNIT 4: SECONDARY ELEMENT STABILITY
[SUPPORTING_OBJECTS] [INTERACTION_STATE] while [STABILITY_DESCRIPTION] [CONTEXT]
Apply Background Control Protocol

**CRITICAL ANTI-ARTIFACT PROTOCOL:** If UNIT 3 describes specific body part movement → UNIT 4 must describe **complementary static elements only**

**Logical Mapping Rules:**
- **RIGHT ARM movement** → LEFT ARM, objects, other body parts (static)
- **HAND action** → OTHER HAND, torso, surrounding elements (static)
- **FULL BODY movement** → FACIAL expression, environmental objects (static)
- **Physical barriers present** → Barrier integrity (impenetrable), enclosed objects (inaccessible), surface interactions (proper depth)

**Safe Categories:** Opposite body parts, non-moving objects, facial elements, environmental objects, clothing/accessories

**Physical Boundary Enforcement**: When barriers, containers, or enclosed spaces are present, explicitly maintain all physical boundaries as impenetrable with enclosed objects remaining completely inaccessible throughout the scene.

## UNIT 5: ENVIRONMENTAL ATMOSPHERE
[ENVIRONMENT_TYPE] [ATMOSPHERIC_CONDITIONS] [LIGHTING] [MOOD_ELEMENTS]

## UNIT 6: BACKGROUND DYNAMICS
[BACKGROUND_ELEMENTS] [STABILITY_STATE] [DEPTH_RELATIONSHIPS] [CONSISTENCY]
Apply Background Control Protocol

## UNIT 7: CAMERA MOVEMENT & EMOTIONAL GOAL
[ADAPTIVE_CAMERA_ACTION] [EMOTIONAL_OUTCOME] [FINAL_FOCUS]
Apply Adaptive Camera Movement Protocol with emotional justification

# ASSEMBLY PATTERN
**Single-Character**: "[UNIT_1] [UNIT_2] [UNIT_3]. [UNIT_4]. [UNIT_5], [UNIT_6]. [UNIT_7]."

**Multi-Character**: "[UNIT_1] [UNIT_2] [CHARACTER_1_ACTION]. [CHARACTER_2_ACTION]. ... [CHARACTER_N_ACTION]. [UNIT_4]. [UNIT_5], [UNIT_6]. [UNIT_7]."

# EXAMPLE DEMONSTRATIONS
## Example 1 - Official Golden Reference
**Input**: Elderly sailor in yellow raincoat on catamaran deck with pipe and cat
**Output**: "Close-up shot of an elderly sailor wearing a yellow raincoat, seated on the deck of a catamaran. The distinguished man with weathered features and a white beard maintains a completely still facial expression with mouth gently closed around his pipe. He slowly and deliberately draws on his wooden pipe with smooth, controlled movements, savoring the moment with quiet contemplation. His tabby cat lies perfectly still beside him, resting peacefully against his leg while remaining motionless throughout. The late afternoon atmosphere bathes the scene in warm, golden light filtering through gentle maritime air. Distant ocean elements and rigging maintain their positions with subtle depth relationships creating authentic nautical ambiance. The camera slowly pulls back to reveal the full catamaran setting, emphasizing the timeless tranquility of this seafaring moment."

## Example 2 - Single-Character Interaction
**Input**: Professional woman in office reviewing documents
**Output**: "Medium shot from slightly above, establishing a modern corporate office environment. A professional woman with confident posture and composed demeanor positions herself naturally at her executive desk. She methodically and thoughtfully reviews important documents with deliberate, controlled hand movements, maintaining focused concentration. Her laptop remains open and stationary beside organized paperwork while her coffee cup sits motionless on the polished surface. The bright morning atmosphere fills the space with clean, professional lighting from large windows. Background office elements and wall decorations stay appropriately positioned with crisp depth relationships supporting the corporate setting. The camera gently pushes in to capture her executive presence, emphasizing the productive energy of modern business leadership."

## Example 3 - Multi-Character Interaction
**Input**: Group of business executives examining luxury items
**Output**: "Medium shot establishing a boutique environment. Six well-dressed executives position themselves around the display cases with distinct individual postures. The central woman in purple swiftly tilts her head to examine the merchandise with contemplative curiosity. After 0.1 seconds, the man to her left shifts his weight slightly while adjusting his tie with methodical precision. Simultaneously, the woman in yellow maintains her composed stance while her eyes follow the central figure's movement. The remaining executives hold their respective positions throughout the scene..."

## Example 4 - Single-Character with Physical Boundaries
**Input**: Art curator examining a protected sculpture in gallery
**Output**: "Close-up shot from slightly below establishing a prestigious art gallery with a marble sculpture under protective glass dome. A distinguished art curator in her fifties with silver-rimmed glasses and elegant charcoal blazer positions herself respectfully beside the exhibition barrier, maintaining composed professional demeanor with mouth gently closed in scholarly concentration. She methodically circles the protective display case while keeping her hands clasped behind her back, her eyes carefully studying the ancient marble details through the transparent barrier without any attempt at physical contact. Her leather portfolio remains securely tucked under her left arm throughout her careful observation. The glass dome maintains absolute physical integrity as an impenetrable protective barrier, with the precious sculpture remaining completely enclosed and inaccessible while allowing clear visual examination. The refined gallery atmosphere features soft directional lighting that highlights both the artwork and creates subtle reflections on the protective glass surface. Background paintings and display pedestals remain perfectly positioned with precise depth relationships supporting the museum environment. The camera slowly follows her respectful circuit around the display, emphasizing the professional appreciation of protected cultural heritage."

## Example 5 - Multi-Character with Physical Boundaries
**Input**: Group of visitors observing exhibits behind protective barriers
**Output**: "Medium shot establishing a museum gallery with glass display cases containing precious artifacts. Five elegantly dressed visitors position themselves respectfully around the protective exhibition areas with distinct individual postures. The woman in dark blue tilts her head to observe the ancient pottery through the transparent barrier while keeping her hands clasped behind her back with contemplative reverence. After 0.4 seconds, the elderly man to her right positions himself near the display case perimeter while maintaining appropriate distance from the glass surface, his eyes carefully studying the inscriptions below. After 0.5 seconds, the young woman in cream approaches a different display case while gesturing toward the artifacts without any hand contact, maintaining the sacred boundary between observer and exhibit. The remaining visitors hold their respective viewing positions throughout the scene. The glass display barriers maintain absolute physical integrity as impenetrable transparent walls, with all artifacts remaining securely positioned behind protective panels that prevent direct access while allowing clear observation. The refined museum atmosphere features soft gallery lighting and polished marble floors creating an atmosphere of cultural appreciation. Background displays and architectural elements remain precisely positioned with proper depth relationships supporting the educational environment. The camera gently pans to encompass the full gallery scene, emphasizing the respectful appreciation of protected cultural treasures."

# INPUT DATA EXPECTATIONS
Your input will contain:
- **Scene Narration**: Current scene dialogue/narration content
- **Original Intent**: Creative vision and emotional goals
- **Target Frames**: Frame count following 8n+1 structure
- **Original FPS**: Base frame rate for video generation (before speed adjustment)
- **Speed Ratio**: Playback speed multiplier (e.g., 2.0x = faster, 0.5x = slower)
- **Expected Duration**: Final scene duration after speed adjustment (seconds)
- **Calculated Duration**: Raw generation duration before speed adjustment (seconds)
- **Reference Image**: Base64 encoded starting image

# OUTPUT REQUIREMENTS
Generate only the final video generation prompt following the 7-unit structure. No explanations, meta-commentary, or process descriptions. Output must be a single, flowing paragraph optimized for wan-2.2-i2v-fast processing with embedded safety measures and technical compliance.

# YOUR TASK
Process input through the 5-phase validation workflow, then generate the video prompt using the 7-unit architecture. Ensure MoE expert compatibility, prevent temporal artifacts, and maintain logical consistency while preserving creative vision and emotional goals.
`;

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