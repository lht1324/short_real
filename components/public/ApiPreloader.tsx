// components/public/ApiPreloader.tsx
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

                // 3001 포트 API 서버 URL (환경변수 사용)
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

                // 모든 API 라우트 (tree 구조 기반)
                const apiRoutes = [
                    // image
                    '/api/image',

                    // music
                    '/api/music',
                    '/api/music/data',
                    '/api/music/modifying',

                    // open-ai
                    '/api/open-ai/scene',
                    '/api/open-ai/script',

                    // user (동적 라우트는 제외 - 실제 사용 시 컴파일됨)
                    // '/api/user/[userId]',

                    // video
                    '/api/video',
                    '/api/video/merge',
                    '/api/video/merge/caption',
                    '/api/video/merge/final',
                    '/api/video/merge/music',
                    '/api/video/merge/voice',
                    '/api/video/process',
                    '/api/video/task',
                    '/api/video/url',
                    // 동적 라우트 제외:
                    // '/api/video/task/user/[userId]',
                    // '/api/video/task/[taskId]',

                    // voice
                    '/api/voice',
                ];

                // 병렬로 HEAD 요청하여 프리컴파일
                const precompilePromises = apiRoutes.map(route =>
                    fetch(`${API_BASE}${route}`, {
                        method: 'HEAD',
                        headers: { 'Content-Type': 'application/json' }
                    }).catch(() => {}) // 에러 무시 (404나 405 응답도 컴파일은 트리거됨)
                );

                await Promise.all(precompilePromises);
                console.log('✓ API routes pre-compiled successfully');
            } catch (error) {
                console.error('Failed to pre-compile APIs:', error);
            }
        };

        // 약간의 딜레이 후 실행 (초기 렌더링 방해 안 하도록)
        const timer = setTimeout(precompileAPIs, 100);
        return () => clearTimeout(timer);
    }, []);

    return null;
}
