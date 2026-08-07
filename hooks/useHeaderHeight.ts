'use client'

import { useState, useEffect } from "react";

export function useHeaderHeight(defaultHeight: number = 64): number {
    const [headerHeight, setHeaderHeight] = useState<number>(defaultHeight);

    useEffect(() => {
        const updateHeight = () => {
            const headerEl = document.getElementById("main-header");
            if (headerEl) {
                const rect = headerEl.getBoundingClientRect();
                if (rect.height > 0) {
                    setHeaderHeight(rect.height);
                }
            }
        };

        updateHeight();
        window.addEventListener("resize", updateHeight);
        return () => window.removeEventListener("resize", updateHeight);
    }, []);

    return headerHeight;
}
