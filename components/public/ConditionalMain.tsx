'use client'

import {ReactNode, useMemo} from 'react';
import { usePathname } from 'next/navigation';

interface ConditionalMainProps {
    children: ReactNode;
}

function ConditionalMain({ children }: ConditionalMainProps) {
    const pathname = usePathname();
    const shouldHideHeader = pathname.includes('workspace');
    
    const paddingClass = useMemo(() => {
        return shouldHideHeader ? 'pt-0' : 'pt-16'
    }, [shouldHideHeader]);

    return (
        <main className={paddingClass}>
            {children}
        </main>
    );
}

export default ConditionalMain;