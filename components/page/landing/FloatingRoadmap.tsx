"use client";

import { useState, useRef, useEffect, memo, useCallback } from "react";
import { Sparkles, X, ChevronRight } from "lucide-react";

enum RoadmapStatus {
    IN_PROGRESS = 1,
    COMING_SOON = 2,
    SKETCH = 3,
}

// ✨ Updates List (Copywriting Optimized)
const ROADMAP_ITEM_LIST = [
    {
        title: "Auto-Pilot Mode",
        status: RoadmapStatus.SKETCH,
        desc: "Set a schedule, and we'll generate & upload videos to your channel automatically.",
    },
    {
        title: "Quality Selection (720p/1080p)", // 720p/1080p choice -> Updated
        status: RoadmapStatus.SKETCH,
        desc: "Flexibility to choose between standard 720p or premium 1080p resolution.",
    },
    {
        title: "Custom Visual Styles", // Style Selection -> Updated
        status: RoadmapStatus.SKETCH,
        desc: "Pick the perfect visual tone for your videos, from Cinematic to Animation.",
    },
    {
        title: "TikTok Direct Export",
        status: RoadmapStatus.IN_PROGRESS,
        desc: "One-click publishing directly to your TikTok account.",
    },
    {
        title: "Instagram Reels Integration",
        status: RoadmapStatus.IN_PROGRESS,
        desc: "Seamless export to Instagram Reels to maximize your reach.",
    },
];

function FloatingRoadmap() {
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
                return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
            case RoadmapStatus.IN_PROGRESS:
                // 파란색/보라색 (열심히 만드는 중, 신뢰감)
                return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            case RoadmapStatus.COMING_SOON:
                // 노란색/주황색 (곧 나옴! 기대감, 주목도 높음)
                return "bg-amber-500/10 text-amber-400 border-amber-500/20";
        }
    }, []);

    const getStatusText = useCallback((status: RoadmapStatus) => {
        switch (status) {
            case RoadmapStatus.SKETCH: return "Sketching";
            case RoadmapStatus.IN_PROGRESS: return "In Progress";
            case RoadmapStatus.COMING_SOON: return "Coming Soon";
        }
    }, []);

    return (
        <div ref={widgetRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">

            {/* 팝업 패널 */}
            <div
                className={`pointer-events-auto mb-3 w-80 overflow-hidden rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-2xl transition-all duration-300 origin-bottom-right ${
                    isOpen
                        ? "translate-y-0 opacity-100 scale-100"
                        : "translate-y-4 opacity-0 scale-95 pointer-events-none"
                }`}
            >
                <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-sm font-semibold text-white">Upcoming Features</span>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-2 space-y-1">
                    {ROADMAP_ITEM_LIST.sort((a, b) => {
                        // 1차 정렬: 상태 우선순위
                        const priorityA = a.status
                        const priorityB = b.status;

                        if (priorityA !== priorityB) {
                            return priorityA - priorityB;
                        }

                        // 2차 정렬: 알파벳순 (Title 기준)
                        return a.title.localeCompare(b.title);
                    }).map((item, i) => (
                        <div key={i} className="group flex gap-3 rounded-xl p-3 hover:bg-white/5 transition-colors">
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-base font-medium text-white/90">{item.title}</span>
                                </div>
                                <p className="text-sm text-white/75 leading-snug">{item.desc}</p>
                                <div className="pt-2">
                                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] uppercase tracking-wide font-semibold ${getStatusColor(item.status)}`}>
                                        {getStatusText(item.status)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 트리거 버튼 (알약 형태) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`pointer-events-auto group flex items-center gap-2 h-10 pl-3 pr-4 rounded-full border border-white/10 bg-white/5 shadow-lg backdrop-blur-xl transition-all hover:scale-105 hover:bg-white/10 hover:border-purple-500/50 ${
                    isOpen ? "bg-white/10 border-purple-500/50" : ""
                }`}
            >
                <Sparkles className={`w-4 h-4 text-yellow-400 transition-transform ${isOpen ? "rotate-12" : "group-hover:rotate-12"}`} />

                <span className="text-sm font-medium text-white/90">Roadmap</span>

                <ChevronRight className={`w-3 h-3 text-white/50 transition-transform ${isOpen ? "rotate-90" : "group-hover:-translate-y-0.5"}`} />

                {!isOpen && (
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
