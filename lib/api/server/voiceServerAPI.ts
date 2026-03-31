import {elevenLabsClient} from '@/lib/elevenLabsClient';
import {Voice as VoiceOrigin} from "@elevenlabs/elevenlabs-js/api";
import {
    Voice,
    VoiceGenerationModelId,
    VoiceGenerationOutputFormat,
    VoiceGenerationResult,
    VoiceSettings
} from "@/lib/api/types/eleven-labs/Voice";
import {SubtitleSegment} from "@/lib/api/types/supabase/VideoGenerationTasks";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {VoiceResponseModelCategory} from "@elevenlabs/elevenlabs-js/api/types/VoiceResponseModelCategory";

export const voiceServerAPI = {
    // GET /voices - 사용 가능한 음성 목록 조회
    async getVoices(): Promise<Voice[]> {
        const response = await elevenLabsClient.voices.getAll({
            showLegacy: false,
        });

        // return response.voices.filter(isVerifiedEnglishVoice).map((voice: VoiceOrigin) => {
        return response.voices.filter((voice: VoiceOrigin) => {
            return voice.category === VoiceResponseModelCategory.Premade &&
                voice.labels?.language === "en";
        }).map((voice: VoiceOrigin) => {
            return {
                id: voice.voiceId,
                name: voice.name || 'Unknown',
                description: voice.description || '',
                gender: voice.labels?.gender || '',
                age: voice.labels?.age || '',
                accent: voice.labels?.accent || '',
                descriptive: voice.labels?.descriptive,
                useCase: voice.labels?.use_case || '',
                previewUrl: voice.previewUrl || '',
            }
        }).sort((a: Voice, b: Voice) => {
            return a.name.localeCompare(b.name)
        });
    },

    // POST /voices/narration/buffer - 나레이션 생성 후 Base64 인코딩
    async postVoice(
        text: string,
        voiceId: string,
        voiceSettings: VoiceSettings = {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.1,
            use_speaker_boost: true,
            speed: 1.1
        },
        voiceModelId: VoiceGenerationModelId = VoiceGenerationModelId.ELEVEN_FLASH_V2_5,
        voiceOutputFormat: VoiceGenerationOutputFormat = VoiceGenerationOutputFormat.MP3_128,
    ): Promise<VoiceGenerationResult> {
        try {
            // ElevenLabs API 호출
            const audioConvertResponse = await elevenLabsClient.textToSpeech.convertWithTimestamps(voiceId, {
                text: text,
                modelId: voiceModelId,
                outputFormat: voiceOutputFormat,
                voiceSettings: voiceSettings,
                applyTextNormalization: "off",
            });

            if (!audioConvertResponse || (!audioConvertResponse.audioBase64)) {
                throw new Error('ElevenLabs API returned invalid audio stream');
            }

            if (!(audioConvertResponse.alignment) || !(audioConvertResponse.normalizedAlignment)) {
                throw new Error('ElevenLabs API returned invalid timestamps');
            }

            // normalizedAlignment를 SubtitleSegment[]로 변환
            const subtitleSegments: SubtitleSegment[] = [];
            const { characters, characterStartTimesSeconds, characterEndTimesSeconds } = audioConvertResponse.normalizedAlignment;
            
            let currentWord = '';
            let wordStartTime = 0;
            
            for (let i = 0; i < characters.length; i++) {
                const char = characters[i];
                const startTime = characterStartTimesSeconds[i];
                const endTime = characterEndTimesSeconds[i];
                
                // 단어의 첫 문자인 경우 시작 시간 기록
                if (currentWord === '' && char.trim() !== '') {
                    wordStartTime = startTime;
                }

                // ★★★ [수정] 단어를 나누는 조건 변경 ★★★
                // 공백 또는 특정 문장 부호(.,?!)를 만났을 때 단어 완성
                const isWordBoundary = [' ', ',', '.', '?', '!'].includes(char);
                const isLastCharacter = i === characters.length - 1;

                if (isWordBoundary || isLastCharacter) {
                    // 마지막 글자이면서 단어 경계가 아닌 경우, 해당 글자를 단어에 포함
                    if (isLastCharacter && !isWordBoundary) {
                        currentWord += char;
                    }

                    // 완성된 단어가 있으면 SubtitleSegment에 추가
                    if (currentWord.trim() !== '') {
                        // 단어 뒤에 붙는 문장 부호 처리
                        let finalWord = currentWord.trim();
                        if (['.', ',', '?', '!'].includes(char)) {
                            finalWord += char;
                        }

                        subtitleSegments.push({
                            word: finalWord,
                            startSec: wordStartTime,
                            endSec: endTime
                        });
                    }

                    // 다음 단어를 위해 초기화
                    currentWord = '';
                } else {
                    // 현재 문자를 단어에 추가 (이제 하이픈과 아포스트로피도 여기에 포함됨)
                    currentWord += char;
                }
            }

            return {
                audioBuffer: Buffer.from(audioConvertResponse.audioBase64, 'base64'),
                audioBase64: audioConvertResponse.audioBase64,
                subtitleSegmentList: subtitleSegments.map((subtitleSegment) => {
                    return {
                        ...subtitleSegment,
                        word: subtitleSegment.word
                            .replaceAll('--', '...')
                            .replaceAll('—', '...')
                            .replaceAll(/["\u201C\u201D]/g, ''),
                    }
                }),
            };
            
        } catch (error) {
            console.error('postNarrationBase64 error:', error);
            throw error;
        }
    },

    // POST /voices/narration/storage - 오디오 Buffer를 Supabase Storage에 저장
    async postNarrationBufferStream(
        audioBuffer: Buffer,
        taskId: string,
    ) {
        // Supabase Storage에 저장
        const supabase = createSupabaseServiceRoleClient();
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

    async getVoiceSignedUrl(taskId: string) {
        const supabase = createSupabaseServiceRoleClient();

        const { data, error } = await supabase.storage
            .from('narration_voice_storage')
            .createSignedUrl(`${taskId}.mp3`, 60 * 60);

        if (!data || !data.signedUrl) {
            throw new Error(error instanceof Error ? error.message : "Unexpected error in getVoiceSignedUrl()");
        }

        return data.signedUrl;
    }
}