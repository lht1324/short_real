import { elevenLabsClient } from '@/lib/elevenLabsClient';

export const voiceServerAPI = {
    // GET /voices - 사용 가능한 음성 목록 조회
    async getVoices() {
        const response = await elevenLabsClient.voices.search();
        return {
            voices: response.voices?.map(voice => ({
                voice_id: voice.voice_id,
                name: voice.name,
                description: voice.description || '',
                category: voice.category || 'general',
                language: voice.labels?.language || 'en',
                gender: voice.labels?.gender || 'unknown',
                age: voice.labels?.age || 'unknown',
                accent: voice.labels?.accent || 'unknown'
            })) || []
        };
    },

    // POST /voices/preview - 음성 프리뷰 생성
    async postVoicePreview(params: {
        text: string;
        voice_id: string;
        model_id?: string;
    }) {
        const audioStream = await elevenLabsClient.textToSpeech.convert(params.voice_id, {
            text: params.text,
            model_id: params.model_id || 'eleven_multilingual_v2',
            output_format: 'mp3_44100_128'
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
            model_id: params.model_id || 'eleven_multilingual_v2',
            output_format: params.output_format || 'mp3_44100_128',
            voice_settings: params.voice_settings
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
            model_id: params.model_id || 'eleven_multilingual_v2',
            output_format: params.output_format || 'mp3_44100_128',
            voice_settings: params.voice_settings
        });

        return audioStream;
    }
}