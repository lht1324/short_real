import {ElevenLabsClient} from '@elevenlabs/elevenlabs-js';

/**
 * ElevenLabs 클라이언트 — 지연 초기화(lazy singleton).
 *
 * ⚠️ 모듈 레벨에서 생성하면 안 된다: Next.js 빌드의 "Collecting page data" 단계가 모든
 * 라우트 모듈을 import(평가)하는데, 그 시점에 env(ELEVEN_LABS_API_KEY)가 없으면
 * 생성자가 즉시 throw해 빌드 자체가 죽는다 (Workers Builds 실측 — 2026-10-26).
 * 런타임 Secrets 전략과도 정합: 키는 실제 사용 시점에만 읽는다.
 *
 * 사용처: voiceServerAPI (getVoices·postVoice)
 */
let cached: ElevenLabsClient | null = null;

export function getElevenLabsClient(): ElevenLabsClient {
    if (!process.env.ELEVEN_LABS_API_KEY) {
        throw new Error('ELEVEN_LABS_API_KEY is not set.')
    }
    if (!cached) {
        cached = new ElevenLabsClient({
            apiKey: process.env.ELEVEN_LABS_API_KEY
        });
    }
    return cached;
}
