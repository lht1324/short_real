import { voiceServerAPI } from './voiceServerAPI';
import { openAIServerAPI } from './openAIServerAPI';
import { videoServerAPI } from './videoServerAPI';

export const videoDataServerAPI = {
    // 통합 비디오 데이터 생성: 음성 생성 + OpenAI 분석 + Scene별 영상 생성 요청
    async postVideoData(params: {
        narrationScript: string;
        voiceId: string;
        voiceSettings?: {
            stability?: number;
            similarity_boost?: number;
            style?: number;
            use_speaker_boost?: boolean;
            speed?: number;
        };
        modelId?: string;
        outputFormat?: 'mp3_44100_128' | 'mp3_44100_192' | 'mp3_44100_64' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100';
    }) {
        try {
            // 1. ElevenLabs로 음성 생성
            const audioStream = await elevenLabsClient.textToSpeech.convert(params.voiceId, {
                text: params.narrationScript,
                modelId: params.modelId || 'eleven_multilingual_v2',
                outputFormat: params.outputFormat || 'mp3_44100_128',
                voiceSettings: params.voiceSettings
            });

            // 2. 음성 파일을 Base64로 인코딩
            const reader = audioStream.getReader();
            const audioChunks: Uint8Array[] = [];
            
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    audioChunks.push(value);
                }
            } finally {
                reader.releaseLock();
            }
            
            const audioBuffer = Buffer.concat(audioChunks.map(chunk => Buffer.from(chunk)));
            const audioBase64 = audioBuffer.toString('base64');

            // 3. OpenAI API로 영상 데이터 생성 (음성 + 텍스트 분석)
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                throw new Error('OpenAI API key is not configured');
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
  "estimatedDuration": ${params.narrationScript.split(' ').length / 2.5}
}

Important guidelines:
- ANALYZE THE AUDIO for natural pauses, breathing, emphasis, and timing
- Keep the narrationScript exactly as provided - do not modify the text
- Use audio cues to determine scene timing - longer pauses suggest scene breaks
- Assign time duration based on actual spoken rhythm, not text length
- Each scene timing should reflect the audio pacing and natural speech patterns`;

            const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                                    text: `Analyze this narration script and audio file to create video production data: "${params.narrationScript}"`
                                },
                                {
                                    type: 'audio_url',
                                    audio_url: {
                                        url: `data:audio/mp3;base64,${audioBase64}`
                                    }
                                }
                            ]
                        }
                    ],
                    max_completion_tokens: 4000,
                })
            });

            if (!openAIResponse.ok) {
                const errorData = await openAIResponse.json();
                throw new Error(`OpenAI API request failed: ${errorData.error?.message || 'Unknown error'}`);
            }

            const completion = await openAIResponse.json();
            const generatedContent = completion.choices[0]?.message?.content;

            if (!generatedContent) {
                throw new Error('No video data generated from OpenAI');
            }

            let videoData;
            try {
                videoData = JSON.parse(generatedContent);
            } catch (parseError) {
                // JSON 파싱 실패 시 기본 구조로 반환
                const estimatedDuration = Math.round(params.narrationScript.split(' ').length / 2.5);
                videoData = {
                    videoPrompt: generatedContent,
                    narrationScript: params.narrationScript,
                    sceneBreakdown: [{
                        sceneNumber: 1,
                        narration: params.narrationScript,
                        startSec: 0,
                        endSec: estimatedDuration
                    }],
                    estimatedDuration
                };
            }

            // 4. FAL에 Scene별 영상 생성 요청
            const falClient = createFalAiClient();
            
            interface SceneVideoRequest {
                sceneNumber: number;
                requestId: string;
                startSec: number;
                endSec: number;
                duration: number;
                narration: string;
            }
            
            const sceneRequests: SceneVideoRequest[] = [];
            
            // Scene별 비동기 요청 생성
            const scenePromises = videoData.sceneBreakdown.map(async (scene: SceneVideoRequest) => {
                const sceneDuration = scene.endSec - scene.startSec;
                
                // 각 Scene에 대한 상세한 프롬프트 생성
                const scenePrompt = `${videoData.videoPrompt}

Scene ${scene.sceneNumber} (${scene.startSec}s-${scene.endSec}s):
Narration: "${scene.narration}"
Duration: ${sceneDuration} seconds

Focus on visual elements that match this specific narration segment while maintaining overall video coherence.`;

                const result = await falClient.submitRequest({
                    prompt: scenePrompt,
                    aspect_ratio: '9:16', // 숏폼 비디오용
                    resolution: '720p',
                    duration: sceneDuration
                });
                
                return {
                    sceneNumber: scene.sceneNumber,
                    requestId: result.request_id,
                    startSec: scene.startSec,
                    endSec: scene.endSec,
                    duration: sceneDuration,
                    narration: scene.narration
                };
            });
            
            // 모든 Scene 요청 완료 대기
            const sceneRequestResults = await Promise.all(scenePromises);
            sceneRequests.push(...sceneRequestResults);
            
            // Scene 번호 순서대로 정렬
            sceneRequests.sort((a, b) => a.sceneNumber - b.sceneNumber);

            return {
                success: true,
                audioStream: audioBuffer,
                videoData,
                sceneVideoRequests: sceneRequests,
                message: `음성 생성, 영상 데이터 분석 및 ${sceneRequests.length}개 Scene 영상 생성 요청 완료`
            };
        } catch (error) {
            console.error('Video data generation error:', error);
            throw new Error('영상 데이터 생성 중 오류가 발생했습니다.');
        }
    }
}