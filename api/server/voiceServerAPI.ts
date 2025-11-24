import {deepgramClient} from '@/lib/deepgramClient';
import {SubtitleSegment} from "@/api/types/supabase/VideoGenerationTasks";
import {createSupabaseServer} from "@/lib/supabaseServer";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";

// ElevenLabs 관련 타입은 호환성을 위해 남겨두거나, 필요 없다면 제거하셔도 됩니다.
// 여기서는 함수 시그니처 유지를 위해 import만 유지합니다.
import {VoiceGenerationModelId, VoiceGenerationOutputFormat, VoiceSettings} from "@/api/types/eleven-labs/Voice";
import {DeepgramModel} from "@/api/types/deepgram/DeepgramModel";
import {Voice, VoiceGender} from "@/api/types/deepgram/Voice";
import {elevenLabsClient} from "@/lib/elevenLabsClient";
import {SpeechToTextChunkResponseModel} from "@elevenlabs/elevenlabs-js/api/types/SpeechToTextChunkResponseModel";

// 헬퍼 함수: Web ReadableStream을 Buffer로 변환
async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
    const reader = stream.getReader();
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    return Buffer.concat(chunks);
}

export const voiceServerAPI = {
    // ------------------------------------------------------------------
    // GET /voices - Deepgram SDK (manage) 사용하여 모델 리스팅
    // ------------------------------------------------------------------
    async getVoices(): Promise<Voice[]> {
        try {
            // const { result, error } = await deepgramClient.models.getAll();
            const getDeepgramModelsResponse = await fetch("https://api.deepgram.com/v1/models", {
                method: "GET",
                headers: {
                    'Authorization': `Token ${process.env.DEEPGRAM_API_KEY!}`
                }
            });
            const getDeepgramModelsResult = await getDeepgramModelsResponse.json();

            const ttsModels = getDeepgramModelsResult?.tts || [];

            return ttsModels.filter((model: DeepgramModel) => {
                return !!(model.languages?.find((language) => {
                    return language.includes("en") || language.includes("US");
                }));
            }).map((model: DeepgramModel) => {
                const tags = model.metadata?.tags || [];

                return {
                    id: model.canonical_name,
                    name: model.name,
                    accent: model.metadata?.accent || '',
                    age: model.metadata?.age || '',
                    gender: tags.includes("masculine")
                        ? VoiceGender.MALE
                        : tags.includes("feminine")
                            ? VoiceGender.FEMALE
                            : VoiceGender.NEUTRAL,
                    previewUrl: model.metadata?.sample || '',
                    color: model.metadata?.color || '',
                    imageUrl: model.metadata?.image || '',
                    tags: tags.filter((tag) => {
                        return tag !== "masculine" && tag !== "feminine";
                    }),
                    useCases: model.metadata?.use_cases || [],
                };
            });
        } catch (e) {
            console.error('Failed to fetch Deepgram voices via SDK', e);
            return [];
        }
    },

    // POST /voices/narration/buffer - Deepgram TTS + STT 파이프라인
    async postVoice(
        text: string,
        voiceId: string = "aura-asteria-en", // 기본값: Asteria
        // 아래 파라미터들은 호환성을 위해 남겨두지만 Deepgram에서는 무시되거나 적절히 매핑합니다.
        voiceSettings?: VoiceSettings,
        voiceModelId?: VoiceGenerationModelId,
        voiceOutputFormat?: VoiceGenerationOutputFormat,
    ): Promise<{
        audioBuffer: Buffer;
        audioBase64: string;
        subtitleSegmentList: SubtitleSegment[];
    }> {
        try {
            // -------------------------------------------------------
            // 1단계: TTS (Text-to-Speech) - 오디오 생성 (Deepgram)
            // -------------------------------------------------------
            const ttsResponse = await deepgramClient.speak.request(
                { text },
                {
                    model: voiceId,
                    encoding: "mp3", // 기본 MP3
                }
            );

            const stream = await ttsResponse.getStream();
            if (!stream) {
                throw new Error("Deepgram TTS returned an empty stream.");
            }

            // 스트림을 버퍼로 변환
            const audioBuffer = await streamToBuffer(stream);

            // -------------------------------------------------------
            // 2단계: STT (Speech-to-Text) - 타임스탬프(Alignment) 추출 (ElevenLabs)
            // -------------------------------------------------------
            const elevenLabsResponse = await elevenLabsClient.speechToText.convert({
                file: audioBuffer,
                modelId: "scribe_v1",
                languageCode: "en",
            }) as SpeechToTextChunkResponseModel;

            // -------------------------------------------------------
            // 3단계: 결과 매핑 (Deepgram Words -> SubtitleSegment)
            // -------------------------------------------------------
            const subtitleSegments: SubtitleSegment[] = [];

            // Deepgram 결과 구조에서 'words' 배열 추출
            const words = elevenLabsResponse.words;

            for (let index = 0; index < words.length; index++) {
                const currentWord = words[index];

                // "현재가 단어(word)"일 때만 처리 (공백은 무시하고 넘어감)
                if (currentWord.type === 'word' && currentWord.start && currentWord.end) {
                    let finalText = currentWord.text;
                    let finalStart = currentWord.start;
                    const finalEnd = currentWord.end;

                    // [안전 장치] 인덱스가 0이 아니고, 바로 앞이 공백(spacing)인 경우에만 합침
                    if (index > 0 && words[index - 1].type === 'spacing') {
                        const prevWord = words[index - 1];
                        finalText = prevWord.text + finalText; // " " + "word"
                        finalStart = prevWord.start ?? currentWord.start; // 시작 시간 앞당기기
                    }

                    subtitleSegments.push({
                        word: finalText,
                        startSec: finalStart,
                        endSec: finalEnd
                    });
                }
            }

            return {
                audioBuffer: audioBuffer,
                audioBase64: audioBuffer.toString("base64"),
                subtitleSegmentList: subtitleSegments,
            };

        } catch (error) {
            console.error("voiceServerAPI.postVoice error:", error);
            throw error;
        }
    },

    // POST /voices/narration/storage - Supabase 저장 (기존 로직 유지)
    async postNarrationBufferStream(
        audioBuffer: Buffer,
        taskId: string,
    ) {
        const supabase = await createSupabaseServiceRoleClient();
        const fileName = `${taskId}.mp3`;

        const { data, error: uploadError } = await supabase.storage
            .from('narration_voice_storage')
            .upload(fileName, audioBuffer, {
                contentType: 'audio/mpeg',
                upsert: true
            });

        if (uploadError) {
            throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        return {
            success: true,
            message: `Audio file saved successfully: ${fileName}`
        };
    },

    // GET /voices/narration/storage - URL 조회 (기존 로직 유지)
    async getVoiceByTaskId(taskId: string) {
        const supabase = await createSupabaseServer("mutate");
        const { data: voiceData } = supabase.storage
            .from('narration_voice_storage')
            .getPublicUrl(`${taskId}.mp3`);

        if (!voiceData || !voiceData.publicUrl) {
            throw new Error('Voice data not found or public URL is missing');
        }

        return voiceData.publicUrl;
    }
};