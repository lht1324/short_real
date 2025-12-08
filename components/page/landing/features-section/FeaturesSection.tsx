'use client'

import { memo, ForwardRefExoticComponent, RefAttributes } from "react";
import { Atom, Scan, Aperture, CloudFog, LucideProps } from "lucide-react";
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
        title: "Physics",
        description:
            "Objects move with real weight.\nNot just pictures sliding around.",
        prompt:
            "A continuous high-octane sequence of a monster truck: launching into a torque-heavy wheelie, drifting with visible tire deformation, crushing scrap cars with metal destruction physics, landing a massive jump with full suspension compression, and sliding to a smoky halt.",
        videoSrc: "/demo/demo_physics.mp4",
        icon: Atom,
        color: "border-cyan-500/50 shadow-cyan-500/20",
    },
    {
        id: 2,
        title: "Framing",
        description:
            "The AI chooses how close to shoot.\nFrom close-ups to wide shots automatically.",
        prompt:
            "Extreme close-up of a human eye, detailed iris, reflection of city lights at night, ultra sharp macro photography",
        videoSrc: "/demo/demo_3.mp4",
        icon: Scan,
        color: "border-pink-500/50 shadow-pink-500/20",
    },
    {
        id: 3,
        title: "Camera",
        description:
            "The engine adds cinematic camera moves.\nIt matches each scene's energy for you.",
        prompt:
            "FPV drone shot flying fast through a futuristic neon city at night, motion blur, smooth camera path",
        videoSrc: "/demo/demo_main.mp4",
        icon: Aperture,
        color: "border-purple-500/50 shadow-purple-500/20",
    },
    {
        id: 4,
        title: "Atmosphere",
        description:
            "Rain, fog, and neon when your story needs it.\nWeather and light follow your script's tone.",
        prompt:
            "Dark moody alleyway at night, rain on pavement, red neon sign reflections, volumetric fog, noir style, high contrast",
        videoSrc: "/demo/demo_2.mp4",
        icon: CloudFog,
        color: "border-yellow-500/50 shadow-yellow-500/20",
    },
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