'use client'

import { usePathname } from 'next/navigation';
import Header from './Header';

function ConditionalHeader() {
    const pathname = usePathname();
    const shouldHideHeader = pathname.includes('workspace');

    if (shouldHideHeader) {
        return null;
    }

    return <Header />;
}

export default ConditionalHeader;