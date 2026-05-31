import { useEffect, useState, useRef } from 'react';

export function useIntersectionObserver(
    threshold: number = 0,
    rootMargin: string = '0px',
    root: Element | null = null
) {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const [hasIntersected, setHasIntersected] = useState(false);
    const targetRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsIntersecting(entry.isIntersecting);
                if (entry.isIntersecting) {
                    setHasIntersected(true);
                }
            },
            { threshold, rootMargin, root }
        );

        const currentTarget = targetRef.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [threshold, rootMargin, root]);

    return { targetRef, isIntersecting, hasIntersected };
}
