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
            reasoning,
            temperature,
            presencePenalty,
            frequencyPenalty,
        } = input;

        const client = new OpenAI({
            baseURL: this.OPEN_ROUTER_BASE_URL,
            apiKey: this.apiKey,
            defaultHeaders: {
                'HTTP-Referer': process.env.BASE_URL,
                'X-Title': location,
            }
        });
        const messages = [{ role: 'user' as const, content: userMessage }];

        const completion = await client.chat.completions.create({
            model: model,
            messages: [
                ...(!!systemMessage ? [{ role: 'system' as const, content: systemMessage }] : []),
                ...messages,
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: maxCompletionTokens,

            // @ts-expect-error: OpenRouter specific parameter not in OpenAI SDK types
            reasoning: { enabled: !!reasoning },
            temperature: temperature,
            presence_penalty: presencePenalty,
            frequency_penalty: frequencyPenalty,
        });

        return completion.choices[0]?.message?.content;
    }

    async createCompletions(input: CompletionBaseInput): Promise<{
        completionIndex: number;
        completion: string | null;
    }[]> {
        const {
            model,
            systemMessage,
            userMessage,
            maxCompletionTokens,
            reasoning,
            temperature,
            presencePenalty,
            frequencyPenalty,
        } = input;

        const client = new OpenAI({
            baseURL: this.OPEN_ROUTER_BASE_URL,
            apiKey: this.apiKey,
        });
        const messages = [{ role: 'user' as const, content: userMessage }];

        const completion = await client.chat.completions.create({
            model: model,
            messages: [
                ...(!!systemMessage ? [{ role: 'system' as const, content: systemMessage }] : []),
                ...messages,
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: maxCompletionTokens,

            // @ts-expect-error: OpenRouter specific parameter not in OpenAI SDK types
            reasoning: { enabled: !!reasoning },
            temperature: temperature,
            presence_penalty: presencePenalty,
            frequency_penalty: frequencyPenalty,
        });

        return completion.choices.map((choice, index) => {
            return {
                completionIndex: index,
                completion: choice.message.content,
            };
        });
    }
}