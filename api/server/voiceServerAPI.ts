import { elevenLabsClient } from '@/lib/elevenLabsClient';
import { Voice as VoiceOrigin } from "@elevenlabs/elevenlabs-js/api";
import { Voice } from "@/api/types/eleven-labs/Voice";

export const voiceServerAPI = {
    // GET /voices - 사용 가능한 음성 목록 조회
    async getVoices(): Promise<Voice[]> {
        const response = await elevenLabsClient.voices.search({
            pageSize: 100,
            search: "label.language=en"
        });

        return response.voices.map((voice: VoiceOrigin) => {
            return {
                id: voice.voiceId,
                name: voice.name || 'Unknown',
                description: voice.description || '',
                category: voice.category || 'general',
                language: voice.labels?.language || 'en',
                gender: voice.labels?.gender || 'unknown',
                age: voice.labels?.age || 'unknown',
                accent: voice.labels?.accent || 'unknown',
                previewUrl: voice.previewUrl || '',
                labels: voice.labels ? {
                    accent: voice.labels.accent,
                    descriptive: voice.labels.descriptive,
                    age: voice.labels.age,
                    gender: voice.labels.gender,
                    language: voice.labels.language,
                    use_case: voice.labels.use_case
                } : undefined
            }
        }).sort((a: Voice, b: Voice) => {
            return a.name.localeCompare(b.name)
        });
    },

    // POST /voices/preview - 음성 프리뷰 생성
    async postVoicePreview(params: {
        text: string;
        voice_id: string;
        model_id?: string;
    }) {
        const audioStream = await elevenLabsClient.textToSpeech.convert(params.voice_id, {
            text: params.text,
            modelId: params.model_id || 'eleven_multilingual_v2',
            outputFormat: 'mp3_44100_128'
        });

        return audioStream;
    },

    // POST /voices/narration - 나레이션 생성
    async postNarration(params: {
        text: string;
        voice_id: string;
        model_id?: string;
        voice_settings?: {
            stability?: number;
            similarity_boost?: number;
            style?: number;
            use_speaker_boost?: boolean;
            speed?: number;
        };
        output_format?: 'mp3_44100_128' | 'mp3_44100_192' | 'mp3_44100_64' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100';
    }) {
        const audioStream = await elevenLabsClient.textToSpeech.convert(params.voice_id, {
            text: params.text,
            modelId: params.model_id || 'eleven_multilingual_v2',
            outputFormat: params.output_format || 'mp3_44100_128',
            voiceSettings: params.voice_settings
        });

        return audioStream;
    },

    // POST /voices/narration/stream - 스트리밍 나레이션 생성
    async postNarrationStream(params: {
        text: string;
        voice_id: string;
        model_id?: string;
        voice_settings?: {
            stability?: number;
            similarity_boost?: number;
            style?: number;
            use_speaker_boost?: boolean;
            speed?: number;
        };
        output_format?: 'mp3_44100_128' | 'mp3_44100_192' | 'mp3_44100_64' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100';
    }) {
        const audioStream = await elevenLabsClient.textToSpeech.stream(params.voice_id, {
            text: params.text,
            modelId: params.model_id || 'eleven_multilingual_v2',
            outputFormat: params.output_format || 'mp3_44100_128',
            voiceSettings: params.voice_settings
        });

        return audioStream;
    },

    // POST /voices/narration/buffer - 나레이션 생성 후 Base64 인코딩
    async postNarrationWithBase64(params: {
        text: string;
        voice_id: string;
        model_id?: string;
        voice_settings?: {
            stability?: number;
            similarity_boost?: number;
            style?: number;
            use_speaker_boost?: boolean;
            speed?: number;
        };
        output_format?: 'mp3_44100_128' | 'mp3_44100_192' | 'mp3_44100_64' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100';
    }) {
        const audioStream = await elevenLabsClient.textToSpeech.convert(params.voice_id, {
            text: params.text,
            modelId: params.model_id || 'eleven_multilingual_v2',
            outputFormat: params.output_format || 'mp3_44100_128',
            voiceSettings: params.voice_settings
        });

        // ReadableStream을 Buffer로 변환
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

        return {
            audioBuffer,
            audioBase64
        };
    }
}