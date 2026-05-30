import { RefObject, useEffect } from 'react';

/**
 * 비디오 자원을 확실하게 해제하는 훅
 * 단순히 pause()만 하는 것이 아니라 src를 비우고 버퍼를 강제 해제함
 */
export const useVideoCleanup = (videoRef: RefObject<HTMLVideoElement | null>) => {
    useEffect(() => {
        const video = videoRef.current;

        return () => {
            if (video) {
                video.pause();
                // 메모리 해제를 위해 src 비우기 및 로드 강제
                video.removeAttribute('src');
                video.load();
            }
        };
    }, [videoRef]);
};

/**
 * 뷰포트 교차 여부(Intersection Observer)에 따라 비디오 재생/정지를 제어하는 훅
 * 화면에 보이지 않는 영상이 리소스를 점유하는 것을 방지함
 */
export const useIntersectionPlay = (
    videoRef: RefObject<HTMLVideoElement | null>,
    threshold: number = 0.1
) => {
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    video.play().catch(() => {
                        // 자동재생 정책 등으로 실패 시 무시
                    });
                } else {
                    video.pause();
                }
            });
        }, { threshold });

        observer.observe(video);

        return () => {
            observer.unobserve(video);
            observer.disconnect();
        };
    }, [videoRef, threshold]);
};
