'use client'

import { usePathname } from 'next/navigation';
import Header from './Header';

const HIDE_PATHNAME_LIST = [
    "workspace",
    "admin",
]

function ConditionalHeader() {
    const pathname = usePathname();
    const shouldHideHeader = HIDE_PATHNAME_LIST.some((hidePathName) => {
        return pathname.includes(hidePathName);
    });

    if (shouldHideHeader) {
        return null;
    }

    return <Header />;
}

export default ConditionalHeader;