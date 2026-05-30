import { useState, useEffect } from 'react';

/**
 * 브라우저 너비가 모바일(1024px 미만, lg 기준)인지 여부를 반환하는 훅
 * 클라이언트 사이드에서만 동작하며, 초기 hydration 불일치를 방지함
 */
export const useIsMobile = (breakpoint: number = 1024) => {
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        const checkMobile = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        // 초기 실행
        checkMobile();

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [breakpoint]);

    // 서버 사이드나 초기 클라이언트 렌더링 시에는 기본값(false, 데스크탑)을 반환하되,
    // hydration 이후에 정확한 값을 전달함
    return hasMounted ? isMobile : false;
};
