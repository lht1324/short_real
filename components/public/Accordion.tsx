'use client'

import {useState, ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';

interface AccordionSectionProps {
    id: string;
    title: string;
    defaultExpanded?: boolean;
    children: ReactNode;
}

export function AccordionSection({ id, title, defaultExpanded = false, children }: AccordionSectionProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="space-y-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between text-white text-lg font-medium hover:text-purple-300 transition-colors"
            >
                <span>{title}</span>
                <ChevronDown
                    size={20}
                    className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>
            {isExpanded && (
                <div className="space-y-4">
                    {children}
                </div>
            )}
        </div>
    );
}