import OpenAI from "openai";

export enum OpenRouterModel {
    GPT_4O_MINI = "openai/gpt-4o-mini",
    DEEPSEEK_V_3_2 = "deepseek/deepseek-v3.2",
    GEMINI_3_0_FLASH_PREVIEW = "google/gemini-3-flash-preview" // 3.0 Flash 출시 안 됨
}

export interface CompletionBaseInput {
    // Base
    model: OpenRouterModel;
    systemMessage?: string;
    userMessage: string;
    maxCompletionTokens: number;

    // Optional
    imageBase64List?: string[];
    imageDetail?: "auto" | "low" | "high";
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
            reasoning,
            temperature,
            presencePenalty,
            frequencyPenalty,
        } = input;

        const client = new OpenAI({
            baseURL: this.OPEN_ROUTER_BASE_URL,
            apiKey: this.apiKey,
            defaultHeaders: {
                'HTTP-Referer': `${process.env.BASE_URL}${location ? `?location=${location?.replaceAll(' ', '_')}` : ""}`,
                'X-Title': location ?? 'Unknown',
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
        });

        return completion.choices[0]?.message?.content;
    }
}