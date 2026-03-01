"use client";

import {memo, useCallback, useEffect, useRef, useState} from "react";
import {ChevronRight, Loader2, Sparkles, X} from "lucide-react";
import {RoadmapItem, RoadmapStatus} from "@/lib/api/types/supabase/RoadmapItem";

interface FloatingRoadmapProps {
    roadmapItemList: RoadmapItem[];
    isLoading: boolean;
}

function FloatingRoadmap({
    roadmapItemList,
    isLoading,
}: FloatingRoadmapProps) {
    const [isOpen, setIsOpen] = useState(false);
    const widgetRef = useRef<HTMLDivElement>(null);

    // 외부 클릭 시 닫기
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 🎨 Status Colors (Tailwind Classes)
    const getStatusColor = useCallback((status: RoadmapStatus) => {
        switch (status) {
            case RoadmapStatus.SKETCH:
                // 회색 (아직 아이디어 단계, 차분함)
                return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
            case RoadmapStatus.IN_PROGRESS:
                // 파란색/보라색 (열심히 만드는 중, 신뢰감)
                return "text-blue-400 bg-blue-500/10 border-blue-500/20";
            case RoadmapStatus.COMING_SOON:
                // 노란색/주황색 (곧 나옴! 기대감, 주목도 높음)
                return "text-amber-400 bg-amber-500/10 border-amber-500/20";
            case RoadmapStatus.LIVE:
                return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
        }
    }, []);

    const getStatusText = useCallback((status: RoadmapStatus) => {
        switch (status) {
            case RoadmapStatus.SKETCH: return "Sketching";
            case RoadmapStatus.IN_PROGRESS: return "In Progress";
            case RoadmapStatus.COMING_SOON: return "Coming Soon";
            case RoadmapStatus.LIVE: return "Live";
        }
    }, []);

    return (
        <div ref={widgetRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">

            {/* 팝업 패널 */}
            <div
                className={`mb-3 w-80 overflow-hidden rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-2xl transition-all duration-300 origin-bottom-right ${
                    isOpen
                        ? "translate-y-0 opacity-100 scale-100 pointer-events-auto"
                        : "translate-y-4 opacity-0 scale-95 pointer-events-none"
                }`}
            >
                <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-base font-semibold text-white">Upcoming Features</span>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 text-white/50 space-y-2">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                            <span className="text-sm">Loading roadmap...</span>
                        </div>
                    ) : roadmapItemList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                            <Sparkles className="w-8 h-8 text-white/20 mb-2" />
                            <p className="text-base text-white/70">No upcoming features planned yet.</p>
                            <p className="text-sm text-white/50 mt-1">Check back later for updates!</p>
                        </div>
                    ) : (
                        roadmapItemList.sort((a, b) => {
                            // 1차 정렬: 상태 우선순위
                            // (status 값이 낮을수록 우선순위가 높다고 가정하거나, 필요시 순서 조정)
                            // 여기서는 단순 값 비교
                            const priorityA = a.status;
                            const priorityB = b.status;

                            if (priorityA !== priorityB) {
                                return priorityA - priorityB;
                            }

                            // 2차 정렬: 알파벳순 (Title 기준)
                            return a.title.localeCompare(b.title);
                        }).map((item, i) => (
                            <div key={i} className="group flex flex-col gap-2 rounded-xl p-3 hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-sm font-medium text-white/90 leading-tight">{item.title}</span>
                                    <span className={`flex-shrink-0 inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wide font-bold ${getStatusColor(item.status)}`}>
                                        {getStatusText(item.status)}
                                    </span>
                                </div>
                                <p className="text-xs text-white/60 leading-relaxed">{item.description}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 트리거 버튼 (알약 형태) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`pointer-events-auto group flex items-center gap-2 h-10 pl-3 pr-4 rounded-full border border-white/10 bg-black/40 shadow-lg backdrop-blur-xl transition-all hover:scale-105 hover:bg-white/10 hover:border-purple-500/50 ${
                    isOpen ? "bg-white/10 border-purple-500/50 text-white" : "text-white/80"
                }`}
            >
                <Sparkles className={`w-4 h-4 text-yellow-400 transition-transform ${isOpen ? "rotate-12" : "group-hover:rotate-12"}`} />

                <span className="text-base font-medium">Roadmap</span>

                <ChevronRight className={`w-3 h-3 text-white/50 transition-transform duration-300 ${isOpen ? "rotate-90" : "group-hover:-translate-y-0.5"}`} />

                {!isOpen && !isLoading && roadmapItemList.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-500 opacity-75"></span>
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-purple-500"></span>
                    </span>
                )}
            </button>
        </div>
    );
}

export default memo(FloatingRoadmap);
