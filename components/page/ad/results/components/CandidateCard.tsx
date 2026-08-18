'use client'

import { memo, useCallback } from 'react';
import AdOverlay from "@/components/page/ad/results/components/AdOverlay";
import { AdAspectRatio, AdCandidate } from "@/lib/api/client/ad/adClientAPI";

const ASPECT_CLASS: Record<AdAspectRatio, string> = {
    '1:1': 'aspect-square',
    '4:5': 'aspect-[4/5]',
    '9:16': 'aspect-[9/16]',
};

interface CandidateCardProps {
    candidate: AdCandidate;
    index: number;
    selected: boolean;
    onSelect: () => void;
}

function CandidateCard({ candidate, index, selected, onSelect }: CandidateCardProps) {
    const onClickCard = useCallback(() => {
        onSelect();
    }, [onSelect]);

    return (
        <button
            type="button"
            onClick={onClickCard}
            className={`group relative w-full overflow-hidden rounded-[1.5rem] border text-left transition-all duration-300 ${
                selected
                    ? 'border-accent ring-1 ring-accent/30'
                    : 'border-hairline hover:border-text2/50'
            } ${ASPECT_CLASS[candidate.ratio]}`}
            aria-pressed={selected}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={candidate.url}
                alt={`Candidate ${index + 1}`}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <AdOverlay design={candidate.design} />

            {/* 라벨 */}
            <span className="absolute left-3 top-3 rounded-full bg-surface/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text1 backdrop-blur-sm">
                {candidate.ratio}
            </span>

            {/* VLM 점수 */}
            <span
                className={`absolute right-3 top-3 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] backdrop-blur-sm ${
                    candidate.score !== null
                        ? 'bg-surface/85 text-text1'
                        : 'bg-surface/60 text-text2'
                }`}
            >
                {candidate.score !== null ? `${candidate.score.toFixed(1)} / 10` : 'score skipped'}
            </span>
        </button>
    );
}

export default memo(CandidateCard);