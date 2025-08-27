import { OpenAIChatOriginalResponse } from "@/api/types/open-ai/OpenAIResponse"
import {
    ScriptGenerationRequest,
    ScriptGenerationResponse
} from "@/api/types/open-ai/ScriptGeneration";
import {
    VideoDataGenerationRequest,
    VideoDataGenerationResponse
} from "@/api/types/open-ai/VideoDataGeneration";

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
            let systemMessage = `You are a professional narration writer who specializes in creating engaging voiceover scripts for ${request.duration}-second short-form videos like Youtube Shorts, Instagram Reels, and TikTok.

Your task is to write compelling narration text that will be spoken as voiceover and displayed as subtitles in the video.

Please write narration according to the following specifications:

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

Narration Writing Guidelines:
1. Write in a direct, engaging tone that matches the selected voice characteristics
2. Create compelling narration that hooks listeners immediately
3. Use storytelling that builds tension and excitement, complementing the background music's atmosphere
4. Focus on dramatic moments, turning points, or surprising facts
5. Write for mobile viewers with short attention spans
6. Use present tense and active voice for immediacy
7. Keep sentences concise and impactful for easy subtitle reading
8. Ensure the narration flows naturally when spoken aloud

Please provide ONLY the narration text that will be spoken as voiceover and displayed as subtitles. Do not include any visual descriptions, scene directions, or formatting tags.`;

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
    },

    async postOpenAIVideoData(request: VideoDataGenerationRequest): Promise<VideoDataGenerationResponse> {
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
            let systemMessage = `You are a professional AI video generation prompts engineer for Pika v2.2 who specializes in converting narration scripts into comprehensive video production data.

Your task is to analyze the provided narration script (text that will be spoken as voiceover and displayed as subtitles) and generate:
1. A detailed AI video generation prompt for Pika v2.2 model
2. Scene breakdown that divides the narration into appropriate scenes for ${request.duration}-second video
3. The same narration script organized by scenes (do not modify the narration text itself)

Narration Duration: ${request.duration} seconds`;

            if (request.style) {
                systemMessage += `\nVisual Style: ${request.style.name} (${request.style.description})`;
            }

            if (request.voice) {
                systemMessage += `\nVoice Characteristics: ${request.voice.name} (${request.voice.characteristics})`;
            }

            if (request.music) {
                systemMessage += `\nBackground Music: ${request.music.title} (${request.music.artist})`;
            }

            systemMessage += `

Please provide your response in the following JSON format:
{
  "videoPrompt": "Detailed Pika v2.2 video generation prompt with visual descriptions and cinematography",
  "narrationScript": "The original narration script (keep this exactly as provided)",
  "sceneBreakdown": [
    {
      "sceneNumber": 1,
      "narration": "[narration text for this scene]",
      "startSec": 0,
      "endSec": 4
    },
    {
      "sceneNumber": 2,
      "narration": "[narration text for this scene]",
      "startSec": 4,
      "endSec": 10
    }
  ],
  "estimatedDuration": ${request.duration}
}

Important guidelines:
- Keep the narrationScript exactly as provided - do not modify the text
- Divide the narration into logical scenes based on content flow and timing
- Assign appropriate time duration to each scene based on text length and content complexity (not necessarily equal duration)
- Longer or more complex narration segments should get more time, shorter segments should get less time
- Each scene object in sceneBreakdown should include sceneNumber, narration text for that scene, startSec, and endSec
- Ensure startSec and endSec times are continuous and add up to the total duration
- Ensure the videoPrompt is highly detailed and optimized for Pika v2.2's visual capabilities`;

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
                        { role: 'user', content: `Convert this narration script into video production data: "${request.script}"` }
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
            console.log("Video data completion", completion);
            const generatedContent = completion.choices[0]?.message?.content;

            if (!generatedContent) {
                return {
                    success: false,
                    error: {
                        message: 'No video data generated from OpenAI',
                        code: 'EMPTY_RESPONSE'
                    }
                };
            }

            try {
                // JSON 파싱 시도
                const parsedData = JSON.parse(generatedContent);
                
                return {
                    success: true,
                    data: {
                        videoPrompt: parsedData.videoPrompt || '',
                        narrationScript: parsedData.narrationScript || request.script,
                        sceneBreakdown: parsedData.sceneBreakdown || [],
                        estimatedDuration: parsedData.estimatedDuration || request.duration
                    },
                    usage: completion.usage
                };
            } catch (parseError) {
                // JSON 파싱 실패 시 텍스트 그대로 반환
                return {
                    success: true,
                    data: {
                        videoPrompt: generatedContent,
                        narrationScript: request.script,
                        sceneBreakdown: [{
                            sceneNumber: 1,
                            narration: request.script,
                            startSec: 0,
                            endSec: request.duration
                        }],
                        estimatedDuration: request.duration
                    },
                    usage: completion.usage
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

    async postOpenAIAudioVideoData(request: {
        narrationScript: string;
        audioBase64: string;
    }): Promise<VideoDataGenerationResponse> {
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

            const systemMessage = `You are a professional AI video generation prompts engineer for Pika v2.2 who specializes in converting narration scripts and audio analysis into comprehensive video production data.

Your task is to analyze the provided narration script (text) AND the corresponding audio file to generate:
1. A detailed AI video generation prompt for Pika v2.2 model
2. Scene breakdown that divides the narration into appropriate scenes based on AUDIO TIMING analysis
3. The same narration script organized by scenes (do not modify the narration text itself)

CRITICAL: Use the audio timing, pacing, and natural pauses to determine scene breaks. Do not just divide text equally - listen to the audio rhythm, breathing patterns, and emphasis to create natural scene transitions.

Please provide your response in the following JSON format:
{
  "videoPrompt": "Detailed Pika v2.2 video generation prompt with visual descriptions and cinematography",
  "narrationScript": "The original narration script (keep this exactly as provided)",
  "sceneBreakdown": [
    {
      "sceneNumber": 1,
      "narration": "[narration text for this scene]",
      "startSec": 0,
      "endSec": 4
    }
  ],
  "estimatedDuration": ${request.narrationScript.split(' ').length / 2.5}
}

Important guidelines:
- ANALYZE THE AUDIO for natural pauses, breathing, emphasis, and timing
- Keep the narrationScript exactly as provided - do not modify the text
- Use audio cues to determine scene timing - longer pauses suggest scene breaks
- Assign time duration based on actual spoken rhythm, not text length
- Each scene timing should reflect the audio pacing and natural speech patterns`;

            // OpenAI API 호출
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-audio-preview',
                    modalities: ['text'],
                    messages: [
                        { role: 'system', content: systemMessage },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: `Analyze this narration script and audio file to create video production data: "${request.narrationScript}"`
                                },
                                {
                                    type: 'audio_url',
                                    audio_url: {
                                        url: `data:audio/mp3;base64,${request.audioBase64}`
                                    }
                                }
                            ]
                        }
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
            const generatedContent = completion.choices[0]?.message?.content;

            if (!generatedContent) {
                return {
                    success: false,
                    error: {
                        message: 'No video data generated from OpenAI',
                        code: 'EMPTY_RESPONSE'
                    }
                };
            }

            try {
                // JSON 파싱 시도
                const parsedData = JSON.parse(generatedContent);
                
                return {
                    success: true,
                    data: {
                        videoPrompt: parsedData.videoPrompt || '',
                        narrationScript: parsedData.narrationScript || request.narrationScript,
                        sceneBreakdown: parsedData.sceneBreakdown || [],
                        estimatedDuration: parsedData.estimatedDuration || Math.round(request.narrationScript.split(' ').length / 2.5)
                    },
                    usage: completion.usage
                };
            } catch (parseError) {
                // JSON 파싱 실패 시 기본 구조로 반환
                const estimatedDuration = Math.round(request.narrationScript.split(' ').length / 2.5);
                return {
                    success: true,
                    data: {
                        videoPrompt: generatedContent,
                        narrationScript: request.narrationScript,
                        sceneBreakdown: [{
                            sceneNumber: 1,
                            narration: request.narrationScript,
                            startSec: 0,
                            endSec: estimatedDuration
                        }],
                        estimatedDuration
                    },
                    usage: completion.usage
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
    }
}