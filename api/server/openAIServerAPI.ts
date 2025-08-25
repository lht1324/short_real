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
            let systemMessage = `You are an expert video script writer specializing in ${request.duration}-second short-form videos.
Please write a script according to the following specifications:

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
1. Write in a tone that matches the selected voice characteristics
2. Create content and pacing that complements the background music's atmosphere
3. Include descriptions and storytelling appropriate for the visual style
4. Write naturally and engagingly for short-form video narration

Please provide only the script content without any additional explanations.`;

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
                        { role: 'user', content: request.prompt }
                    ],
                    max_tokens: 1000,
                    temperature: 0.7
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
                    prompt: request.prompt
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