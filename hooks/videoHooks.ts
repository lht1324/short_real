import { RefObject, useEffect } from 'react';

export const useVideoCleanup = (videoRef: RefObject<HTMLVideoElement | null>) => {
    useEffect(() => {
        const video = videoRef.current;

        return () => {
            if (video) {
                // 1. 재생 중지
                video.pause();

                // 2. 소스 연결 해제 (중요: 메모리 누수 방지 핵심)
                video.removeAttribute('src');
                video.src = "";

                // 3. 로드 호출로 버퍼 비우기
                video.load();

                // 4. DOM에서 제거 (React가 하겠지만 명시적으로 도움)
                video.remove();
            }
        };
    }, [videoRef]);
};
