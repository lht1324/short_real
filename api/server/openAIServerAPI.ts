import {
    OpenAIChatOriginalResponse,
    ScriptGenerationRequest,
    ScriptGenerationResponse
} from "@/api/types/open-ai/ScriptGeneration";

export const openAIServerAPI = {
    async postOpenAIScript(request: ScriptGenerationRequest): Promise<ScriptGenerationResponse> {
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
            let systemMessage = `You are a professional AI video generation prompts engineer for Pika v2.2 who's specializing in ${request.duration}-second short-form videos like Youtube Shorts, Instagram Reels, and TikTok.
Please write a prompt according to the following specifications:

- Length: Approximately ${request.duration} seconds (roughly ${request.duration * 2.5} words)`;

            if (request.style) {
                systemMessage += `\n- Visual Style: ${request.style.name} (${request.style.description})`;
            }

            if (request.voice) {
                systemMessage += `\n- Voice Characteristics: ${request.voice.name} (${request.voice.characteristics})`;
            }

            if (request.music) {
                systemMessage += `\n- Background Music: ${request.music.title} (${request.music.artist})`;
            }

            systemMessage += `

Script Writing Guidelines:
1. Write in a direct, engaging tone that matches the selected voice characteristics
2. Create compelling short-form content that hooks viewers immediately
3. Use storytelling that builds tension and excitement, complementing the background music's atmosphere
4. Focus on dramatic moments, turning points, or surprising facts
5. Write for mobile viewers with short attention spans
6. Use present tense and active voice for immediacy

Please provide ONLY the narration script text without any formatting tags, stage directions, or metadata.`;

            // OpenAI API 호출
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'o4-mini-2025-04-16',
                    messages: [
                        { role: 'system', content: systemMessage },
                        { role: 'user', content: request.userPrompt }
                    ],
                    max_completion_tokens: 4000,
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    error: {
                        message: errorData.error?.message || 'OpenAI API request failed',
                        code: errorData.error?.code || 'API_ERROR'
                    }
                };
            }

            const completion: OpenAIChatOriginalResponse = await response.json();
            console.log("completion", completion);
            console.log("completionMessage", completion.choices[0]?.message);
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
                    wordCount,
                    estimatedDuration,
                    prompt: request.userPrompt
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
    }
}