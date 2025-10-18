'use client'

import { useEffect } from 'react';

// 전역 플래그: 앱 전체에서 단 한 번만 실행되도록 보장
let isPrecompiled = false;

export default function ApiPreloader() {
    useEffect(() => {
        // 이미 실행했으면 스킵
        if (isPrecompiled) return;
        isPrecompiled = true;

        const precompileAPIs = async () => {
            try {
                console.log('Pre-compiling API routes...');

                // 모든 API 라우트들을 병렬로 프리컴파일
                const apiRoutes = [
                    '/api/open-ai/script',
                    '/api/open-ai/scene',
                    '/api/music',
                    '/api/video',
                    '/api/video/merge',
                    '/api/video/merge/caption',
                    // '/api/video/merge/music',
                    '/webhook/replicate',
                    '/webhook/suno-api'
                ];

                const precompilePromises = apiRoutes.map(route =>
                    fetch(route, {
                        method: 'OPTIONS',
                        headers: { 'Content-Type': 'application/json' }
                    }).catch(() => {}) // 에러 무시
                );

                await Promise.all(precompilePromises);
                console.log('All API routes pre-compiled');
            } catch (error) {
                console.log('API pre-compilation completed:', error);
            }
        };

        // 즉시 실행
        precompileAPIs().then();
    }, []);

    // UI 없음 (단순히 로직만 실행)
    return null;
}