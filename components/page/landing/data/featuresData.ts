import { Atom, Scan, Aperture, CloudFog, LucideProps } from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";

export interface Feature {
    id: number;
    title: string;
    description: string;
    prompt: string;
    videoSrc: string;
    icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
    color: string;
}

export const FEATURES_DATA: Feature[] = [
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
