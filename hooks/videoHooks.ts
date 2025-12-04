import { RefObject, useEffect } from 'react';

export const useVideoCleanup = (videoRef: RefObject<HTMLVideoElement | null>) => {
    useEffect(() => {
        const video = videoRef.current;

        return () => {
            if (video) {
                // 리렌더링 시 DOM을 파괴하지 않고 재생만 안전하게 중지
                video.pause();
            }
        };
    }, [videoRef]);
};
