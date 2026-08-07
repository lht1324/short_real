'use client'

import { memo } from "react";
import { Atom, Scan, Aperture, CloudFog, LucideProps } from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";
import FeatureCard from "./FeatureCard";
import { motion } from "framer-motion";

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
        videoSrc: `${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_physics.mp4`,
        icon: Atom,
        color: "border-zinc-500/20",
    },
    {
        id: 2,
        title: "Framing",
        description:
            "The AI chooses how close to shoot.\nFrom close-ups to wide shots automatically.",
        prompt:
            "A continuous visceral sequence of a professional boxer: tracking a sweat drop on bruised skin, tensing neck muscles under a mouthpiece, rebounding off the flexible ropes, connecting a crushing Right Cross with glove compression, and exploding into a fine mist of atomized sweat.",
        videoSrc: `${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_framing.mp4`,
        icon: Scan,
        color: "border-zinc-500/20",
    },
    {
        id: 3,
        title: "Camera",
        description:
            "The engine adds cinematic camera moves.\nIt matches each scene's energy for you.",
        prompt:
            "A thief slips through the shadows, ignoring the museum lasers.\n\nHe stops, pressing his back flat against the cold marble wall.\n\nWith steady gloved hands, he cuts the glass of the display case.\n\nInstead of the diamond, he pulls out a small black USB drive.\n\nA sudden red siren flashes, but the thief only smiles.\n\nThe real treasure is never what they leave behind.",
        videoSrc: `${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_camera.mp4`,
        icon: Aperture,
        color: "border-zinc-500/20",
    },
    {
        id: 4,
        title: "Atmosphere",
        description:
            "Rain, fog, and neon when your story needs it.\nWeather and light follow your script's tone.",
        prompt:
            "A cinematic journey through 1980s Tokyo at the height of the Bubble Economy: aerial cranes descend over a glittering neon skyline as luxury cars trace streaks of light on rain-slicked asphalt, street-level dolly shots glide through fog-choked avenues flanked by kanji neon signs bleeding magenta into wet pavement, and a showroom red Italian exotic catches anamorphic lens flares on polished marble — before the mood shifts, the rain grows heavier, the lights grow cold, and a lone figure slumps on a curb as the city falls silent around him.",
        videoSrc: `${process.env.NEXT_PUBLIC_DEMO_ASSETS_URL}/demo_atmosphere.mp4`,
        icon: CloudFog,
        color: "border-zinc-500/20",
    },
];

function FeaturesSection() {
    return (
        <section
            id="features"
            className="relative py-24 md:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden"
        >
            <div className="max-w-[1400px] mx-auto relative z-10">
                {/* Header: Left Aligned Asymmetric */}
                <div className="mb-16 md:mb-24 max-w-3xl">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 leading-[1.1]"
                    >
                        Not Just a Wrapper.<br />
                        <span className="text-zinc-600">
                            This is an Engine.
                        </span>
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed"
                    >
                        Experience the raw capabilities of our generative model. Built for realistic physics, dynamic framing, and cinematic motion.
                    </motion.p>
                </div>

                {/* Staggered Grid for 9:16 Videos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 items-start">
                    {/* Feature 1 */}
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full lg:mt-0"
                    >
                        <FeatureCard feature={features[0]} index={0} className="w-full aspect-[9/16]" />
                    </motion.div>

                    {/* Feature 2: Staggered down */}
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full sm:mt-16 lg:mt-24"
                    >
                        <FeatureCard feature={features[1]} index={1} className="w-full aspect-[9/16]" />
                    </motion.div>

                    {/* Feature 3: Staggered up */}
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full lg:mt-8"
                    >
                        <FeatureCard feature={features[2]} index={2} className="w-full aspect-[9/16]" />
                    </motion.div>

                    {/* Feature 4: Staggered down */}
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full sm:mt-16 lg:mt-32"
                    >
                        <FeatureCard feature={features[3]} index={3} className="w-full aspect-[9/16]" />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

export default memo(FeaturesSection);
