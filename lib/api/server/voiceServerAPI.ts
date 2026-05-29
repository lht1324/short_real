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
import Replicate from "replicate";

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

    /**
     * 오디오 길이 및 자막 타임라인을 특정 비율로 조절합니다.
     * @param voiceResult 원본 음성 생성 결과
     * @param ratio 적용할 배율 (목표 길이 / 원본 길이). 1보다 작으면 빨라짐.
     * @param tempIdentifier 임시 파일 식별자 (예: seriesId)
     */
    async scaleVoiceDuration(
        voiceResult: VoiceGenerationResult,
        ratio: number,
        tempIdentifier: string
    ): Promise<VoiceGenerationResult> {
        if (ratio === 1.0) return voiceResult;

        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });
        const supabase = createSupabaseServiceRoleClient();

        try {
            // 1. 배속 계산 (FFmpeg atempo 필터용)
            // atempo = 1 / ratio (예: ratio 0.87 -> 약 1.15배속)
            const speed = (1 / ratio).toFixed(6);

            // 2. 임시 업로드 (Replicate 호출용)
            const tempFileName = `temp/scale-voice-${tempIdentifier}.mp3`;
            const { error: uploadError } = await supabase.storage
                .from('narration_voice_storage')
                .upload(tempFileName, voiceResult.audioBuffer, {
                    contentType: 'audio/mpeg',
                    upsert: true
                });

            if (uploadError) throw new Error(`Temp audio upload failed: ${uploadError.message}`);

            const { data: signedData, error: signedError } = await supabase.storage
                .from('narration_voice_storage')
                .createSignedUrl(tempFileName, 300);

            if (signedError || !signedData?.signedUrl) throw new Error("Failed to create signed URL for temp audio.");

            // 3. Replicate FFmpeg Sandbox 호출
            // atempo 필터는 0.5 ~ 2.0 사이만 지원하나, 현재 우리의 보정 범위(1.0 ~ 1.15)는 안전함.
            const ffmpegArgs = `-filter:a "atempo=${speed}" -c:a libmp3lame -q:a 2`;
            
            const processedAudioUrl = await replicate.run(
                "lht1324/ffmpeg-sandbox-2:06262bdc243f9afe6d1b9a8d338ab536044d0604ce4c420c9cde7ee7fe781339",
                {
                    input: {
                        video_urls: JSON.stringify([signedData.signedUrl]),
                        ffmpeg_args: ffmpegArgs,
                    }
                }
            );

            if (!processedAudioUrl) throw new Error("Replicate audio scaling failed.");

            // 4. 결과 다운로드 및 업데이트
            const response = await fetch(processedAudioUrl.toString());
            if (!response.ok) throw new Error("Failed to download scaled audio.");
            
            const scaledAudioBuffer = Buffer.from(await response.arrayBuffer());

            // 5. 자막 타임라인 업데이트
            const scaledSubtitleList = voiceResult.subtitleSegmentList.map(segment => ({
                ...segment,
                startSec: segment.startSec * ratio,
                endSec: segment.endSec * ratio,
            }));

            // 6. 임시 파일 삭제 (비동기로 진행하여 응답 속도 확보)
            supabase.storage.from('narration_voice_storage').remove([tempFileName]).catch(console.error);

            return {
                audioBuffer: scaledAudioBuffer,
                audioBase64: scaledAudioBuffer.toString('base64'),
                subtitleSegmentList: scaledSubtitleList,
            };
        } catch (error) {
            console.error("[scaleVoiceDuration] Error:", error);
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