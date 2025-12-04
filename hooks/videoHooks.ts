import { RefObject, useEffect } from 'react';

export const useVideoCleanup = (videoRef: RefObject<HTMLVideoElement | null>) => {
    useEffect(() => {
        const video = videoRef.current;

        // 1. 마운트(나타남) 시: 영상 재생 시도
        if (video) {
            // play()는 Promise를 반환하므로 에러(자동재생 정책 등)를 무시하도록 catch 추가
            video.play().catch(() => {});
        }

        return () => {
            if (video) {
                // 2. 언마운트(사라짐) 시: 영상 정지
                video.pause();
            }
        };
    }, [videoRef]);
};