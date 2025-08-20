import { getFetch, postFetch } from './baseFetch';

export const voiceClientAPI = {
    // GET /api/voice - 사용 가능한 음성 목록 조회
    async getVoices() {
        const response = await getFetch('/api/voice');
        return await response.json();
    },

    // POST /api/voice/preview - 음성 프리뷰 생성
    async postVoicePreview(params: {
        text: string;
        voice_id: string;
        model_id?: string;
    }) {
        const response = await postFetch('/api/voice/preview', params);
        return response; // ReadableStream을 반환
    },

    // POST /api/voice/narration - 나레이션 생성
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
        const response = await postFetch('/api/voice/narration', params);
        return response; // ReadableStream을 반환
    },

    // POST /api/voice/narration/stream - 스트리밍 나레이션 생성
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
        const response = await postFetch('/api/voice/narration/stream', params);
        return response; // ReadableStream을 반환
    }
}