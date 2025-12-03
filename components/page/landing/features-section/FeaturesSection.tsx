'use client'

import { memo, ForwardRefExoticComponent, RefAttributes } from "react";
import { Video, Eye, Music, Sun, LucideProps } from "lucide-react";
import FeatureCard from "@/components/page/landing/features-section/FeatureCard";

export interface Feature {
    id: number;
    title: string;
    description: string;
    prompt: string;
    videoSrc: string;
    icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
    color: string;
}

const features: Feature[] = [
    {
        id: 1,
        title: "True Motion",
        description: "Authentic physics.\nForget about static slideshows.",
        prompt: "A horse galloping through dusty desert, muscle movement, dust clouds rising, 4k",
        videoSrc: "/demo/demo_1.mp4",
        icon: Video,
        color: "border-cyan-500/50 shadow-cyan-500/20",
    },
    {
        id: 2,
        title: "Hyper Realism",
        description: "Absolute photorealism.\nTrue to life.",
        prompt: "Extreme close-up of human eye, iris details, reflection of city lights, macro photography",
        videoSrc: "/demo/demo_3.mp4",
        icon: Eye,
        color: "border-pink-500/50 shadow-pink-500/20",
    },
    {
        id: 3,
        title: "Dynamic Camera",
        description: "Breathtaking angles.\nFrom FPV to cinematic drone shots.",
        prompt: "FPV drone shot flying fast through a futuristic neon city, motion blur",
        videoSrc: "/demo/demo_main.mp4",
        icon: Music,
        color: "border-purple-500/50 shadow-purple-500/20",
    },
    {
        id: 4,
        title: "Cinematic Lighting",
        description: "Studio-grade atmosphere.\nPerfect lighting every time.",
        prompt: "Dark moody alleyway, rain on pavement, red neon sign reflection, volumetric fog, noir style",
        videoSrc: "/demo/demo_2.mp4",
        icon: Sun,
        color: "border-yellow-500/50 shadow-yellow-500/20",
    }
];

function FeaturesSection() {
    return (
        <section
            id="features"
            // [수정] 배경색 제거 (투명), style 속성 제거
            className="relative py-8 px-4 sm:px-6 lg:px-8 overflow-hidden"
        >
            {/* [삭제] 상단 마스크, 그리드 패턴, 배경 조명 모두 삭제 */}

            <div className="max-w-[1400px] mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6">
                        Not Just a Wrapper. <br />
                        <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                            This is an Engine.
                        </span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        See the raw capabilities of our generative model.
                    </p>
                </div>

                {/* 4x1 Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                    {features.map((feature, idx) => (
                        <FeatureCard key={feature.id} feature={feature} index={idx} />
                    ))}
                </div>
            </div>
        </section>
    );
}

export default memo(FeaturesSection);