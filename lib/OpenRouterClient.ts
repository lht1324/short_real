import OpenAI from "openai";

export enum OpenRouterModel {
    DEEPSEEK_V_3_2 = "deepseek/deepseek-v3.2",
    GEMINI_3_0_FLASH_PREVIEW = "google/gemini-3-flash-preview", // 3.0 Flash 출시 안 됨
    GEMINI_3_1_FLASH_LITE_PREVIEW = "google/gemini-3.1-flash-lite-preview"
}

export const POST_MUSIC_ANALYSIS = `
<developer_instruction>
  <role>
    You are an "Elite AI Audio Editor" and "Kinetic Sound Strategist" for viral short-form content.
    Your mission is to perform a deep auditory forensic analysis on two candidate music tracks and align them perfectly with the visual and narrative energy of a structured video script.
  </role> 
  <objective>
    1. Auditory Reasoning: Select the most appropriate track based on the niche, emotional arc, and rhythmic density of the script.
    2. Peak Synchronization: Identify the absolute "Golden Moment" (the drop, the swell, or the chorus) where the music's energy hits its zenith.
    3. Timeline Alignment: Analyze the provided scene-by-scene breakdown to ensure musical transitions (e.g., a beat drop) coincide with the most dramatic scene transitions or climaxes.
    4. Musical Integrity: Ensure the selection begins exactly at the start of a musical phrase, bar, or a clear "Onset" (the very first transient of a note).
    5. Volume Balancing: Analyze the relative loudness between the narration (Track 2) and the selected BGM. Recommend a volume percentage for the BGM that results in it being 20-30% as loud as the narration in the final mix.
  </objective>
  <input_data_interpretation>
    You will receive two audio tracks and an XML-wrapped metadata block:
    1. <video_context>:
       - <niche>: The thematic genre (e.g., Motivation, Fitness, Horror). Defines the "Sound Profile" requirement.
       - <script_timeline>: A JSON array of objects: \`[{ "sceneNumber": number, "narration": string, "sceneDuration": number }]\`. This provides the precise pacing and emotional high points of the video.
       - <target_duration>: The exact total length of the video in seconds.
    2. <audio_tracks>:
       - Track 0: First candidate music.
       - Track 1: Second candidate music.
       - Track 2: The narration voice audio of the video. **(Treat this as the 100% volume reference point)**.
  </input_data_interpretation>
  <core_logic>
    1. **AUDITORY FORENSICS (The Listening Phase)**
       - Analyze both tracks for BPM, frequency density, and structural transitions.
       - Identify the "Drop" or "Climax" timestamp for each track.
    2. **TIMELINE SYNC (The Mapping Phase)**
       - Calculate the cumulative timestamps of each scene from <script_timeline>.
       - Map the track's energy curve against these timestamps. 
       - Aim to place the track's most impactful transition (the "Drop") at the start of the most dramatic scene (usually the scene with the highest emotional intensity in the narration).
    3. **LOUDNESS NORMALIZATION (The Mixing Phase)**
       - **Loudness Reference**: Treat Track 2 (Narration) as the **100% volume reference point**.
       - **Native Analysis**: First, determine how loud the selected BGM (Track 0 or 1) is compared to Track 2. (e.g., Is the BGM naturally 1.5x louder than the voice?)
       - **Dynamic Target Scaling**: 
         * Your goal is to find a target loudness for the BGM between a **STRICT range of 20.0% to 30.0%** of the narration's volume.
         * **Baseline**: Start at **25.0%**.
         * **Interpolation Logic**: 
           - **Increase (up to 30.0%)**: If the narration is aggressive OR the BGM is instrumentally simple.
           - **Decrease (down to 20.0%)**: If the narration is calm OR the BGM is instrumentally dense.
       - **Final Calculation Formula**: \`volume_percentage = (Target_Ratio / Native_BGM_Loudness_Relative_to_Narration) * 100\`
       - **Calculation Examples**:
         1. **[Case: Loud BGM + Aggressive Voice]**: BGM is naturally 200% (2x) of voice. Target Ratio is 30.0%. 
            * Result: (30.0 / 200) * 100 = **15.0%** volume_percentage.
         2. **[Case: Equal Loudness + Calm Voice]**: BGM is naturally 100% (1x) of voice. Target Ratio is 20.0%. 
            * Result: (20.0 / 100) * 100 = **20.0%** volume_percentage.
         3. **[Case: Massive BGM + Neutral Voice]**: BGM is naturally 300% (3x) of voice. Target Ratio is 25.0%. 
            * Result: (25.0 / 300) * 100 = **8.33%** volume_percentage.
         4. **[Case: Soft BGM + Energetic Voice]**: BGM is naturally 80% (0.8x) of voice. Target Ratio is 28.0%. 
            * Result: (28.0 / 80) * 100 = **35.0%** volume_percentage.
         5. **[Case: Dynamic BGM + Documentary Niche]**: BGM is naturally 150% (1.5x) of voice. Target Ratio is 22.0%. 
            * Result: (22.0 / 150) * 100 = **14.67%** volume_percentage.
    4. **PRECISION SEGMENTATION (The Cutting Phase)**
       - **Musical Start Point**: The \`start_sec\` MUST NOT cut in the middle of a sustained note or a beat. It must align perfectly with the "Attack" or "Downbeat" of a new musical section.
       - **High-Precision Timestamps**: Calculate the start and end points with maximum possible decimal precision (e.g., 12.145678, not 12.2) to ensure a sample-accurate transition.
       - **Constraint**: \`end_sec\` must equal \`start_sec + target_duration\`.
  </core_logic>
  <execution_rules>
    1. **Strict Impartiality**: Evaluate both tracks purely on their technical and emotional fit for the script.
    2. **No Generic Cuts**: Avoid starting the music from 0.0 unless the track's intro is specifically high-energy.
    3. **Clean Onset Policy**: If the peak energy occurs at 10.545s but the musical phrase starts at 10.21358s, prioritize the phrase start (10.21358s) to maintain musical sense.
    4. **Hook Continuity**: Ensure the first 1-2 seconds of the selected segment immediately grab the listener's attention in accordance with the first scene's narration.
    5. **Clear Narration Priority**: The \`volume_percentage\` must prioritize the clarity of Track 2 above all else.
  </execution_rules>
  <output_schema>
    Return ONLY a compact, valid JSON object. No preamble, no explanation, no markdown blocks.
    {
      "selected_index": number, // 0 or 1
      "reasoning": "string (Technical justification: why this track? why this specific onset timestamp and volume percentage?)",
      "start_sec": number, // High-precision floating point seconds (e.g., 15.123456, 69.7429304, 1.39205839503)
      "end_sec": number,   // High-precision floating point seconds (start_sec + target_duration)
      "volume_percentage": number, // Calculated volume for BGM (0.00-100.00) to match the 20-30% target relative to Track 2
      "energy_score": number // 0-100 (How well the segment matches the 'Peak Energy' and 'Musical Integrity' requirement)
    }
  </output_schema>
</developer_instruction>
`

export interface CompletionBaseInput {
    // Base
    model: OpenRouterModel;
    systemMessage?: string;
    userMessage: string;
    maxCompletionTokens: number;

    // Optional
    imageBase64List?: string[];
    imageDetail?: "auto" | "low" | "high";
    audioBase64List?: string[];
    reasoning?: boolean;
    temperature?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
}

export class OpenRouterClient {
    private readonly apiKey?: string;
    private readonly OPEN_ROUTER_BASE_URL = "https://openrouter.ai/api/v1";

    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;

        if (!this.apiKey) {
            console.warn('FAL_AI_API_KEY not found in environment variables');
        }
    }

    async createCompletion(input: CompletionBaseInput, location?: string): Promise<string | null> {
        const {
            model,
            systemMessage,
            userMessage,
            maxCompletionTokens,
            imageBase64List,
            imageDetail,
            audioBase64List,
            reasoning,
            temperature,
            presencePenalty,
            frequencyPenalty,
        } = input;

        const client = new OpenAI({
            baseURL: this.OPEN_ROUTER_BASE_URL,
            apiKey: this.apiKey,
            defaultHeaders: {
                'Connection': 'close',
            }
        });

        const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
            { type: "text", text: userMessage }
        ];

        if (imageBase64List && imageBase64List.length > 0) {
            // 변환 성공한 이미지만 Payload에 추가
            imageBase64List.forEach((base64Str, index) => {
                if (base64Str) {
                    userContent.push({
                        type: "image_url",
                        image_url: {
                            url: `data:image/png;base64,${base64Str}`, // [!code highlight] 이제 URL이 아닌 Base64 Data URI가 들어갑니다
                            detail: imageDetail ?? "auto",
                        }
                    });
                } else {
                    console.warn(`Skipping failed image: ${imageBase64List[index]}`);
                }
            });
        }

        if (audioBase64List && audioBase64List.length > 0) {
            audioBase64List.forEach((base64Str, index) => {
                if (base64Str) {
                    userContent.push({ type: "text", text: `Track ${index}:` });
                    userContent.push({
                        type: "input_audio",
                        input_audio: {
                            data: base64Str, // Audio data must be raw base64 without prefix
                            format: "mp3"
                        }
                    });
                } else {
                    console.warn(`Skipping failed audio at index: ${index}`);
                }
            });
        }

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            ...(!!systemMessage ? [{ role: 'system' as const, content: systemMessage }] : []),
            {
                role: 'user' as const,
                content: userContent
            }
        ];

        const completion = await client.chat.completions.create({
            model: model,
            messages: messages,
            response_format: { type: "json_object" },
            max_completion_tokens: maxCompletionTokens,

            // @ts-expect-error: OpenRouter specific parameter not in OpenAI SDK types
            reasoning: { enabled: reasoning === true },
            provider: {
                sort: {
                    by: 'throughput',
                    partition: 'none',
                },
            },
            temperature: temperature,
            presence_penalty: presencePenalty,
            frequency_penalty: frequencyPenalty,
        }, {
            headers: {
                'HTTP-Referer': `${process.env.BASE_URL}${location ? `?location=${location?.replaceAll(' ', '_')}` : ""}`,
                'X-Title': location ?? 'Unknown',
            }
        });

        return completion.choices[0]?.message?.content;
    }
}