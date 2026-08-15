'use client'

import Image from 'next/image';

interface WallImageItem {
    src: string;
    pos: string;
    rot: string;
}

const WALL_IMAGES: WallImageItem[] = [
    { src: '/preview/demo_main_left.webp', pos: 'right-[15%] top-[0%] w-[170px] xl:w-[190px]', rot: '-rotate-1' },
    { src: '/preview/demo_good_example.webp', pos: 'right-[42%] top-[3%] w-[130px] xl:w-[150px]', rot: 'rotate-[1.2deg]' },
    { src: '/preview/demo_main_right.webp', pos: 'right-[-1%] top-[38%] w-[140px] xl:w-[160px]', rot: 'rotate-[0.7deg]' },
    { src: '/preview/demo_atmosphere.webp', pos: 'left-[2%] bottom-[6%] w-[210px] xl:w-[235px]', rot: '-rotate-[0.5deg]' },
    { src: '/preview/demo_camera.webp', pos: 'left-[26%] bottom-[-1%] w-[150px] xl:w-[170px]', rot: 'rotate-[1deg]' },
    { src: '/preview/demo_main_center.webp', pos: 'right-[2%] bottom-[30%] w-[170px] xl:w-[195px]', rot: '-rotate-[0.9deg]' },
    { src: '/preview/demo_physics.webp', pos: 'right-[20%] bottom-[1%] w-[120px] xl:w-[135px]', rot: 'rotate-[1.2deg]' },
    { src: '/preview/demo_framing.webp', pos: 'left-[6%] top-[16%] w-[115px] xl:w-[130px]', rot: '-rotate-[1.1deg]' },
];

function WallFrame({ item, index, variant }: { item: WallImageItem; index: number; variant: 'wall' | 'grid' }) {
    const frameClass = variant === 'wall' ? `absolute ${item.pos} ${item.rot}` : 'relative w-full';
    const aspectClass = variant === 'wall' ? 'aspect-[4/5]' : index % 2 === 0 ? 'aspect-[4/5]' : 'aspect-[3/4]';

    return (
        <div aria-hidden="true" className={`pointer-events-none ${frameClass}`}>
            <div className="border border-hairline bg-surface p-[6px] shadow-[0_30px_80px_-28px_rgba(0,0,0,0.95)]">
                <div className={`relative w-full overflow-hidden ${aspectClass}`}>
                    <Image
                        src={item.src}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 50vw, 260px"
                        className="object-cover"
                        priority={variant === 'wall' && index < 3}
                    />
                </div>
            </div>
        </div>
    );
}

export default function HeroWall() {
    return (
        <>
            <div className="pointer-events-none absolute inset-0 hidden md:block">
                {WALL_IMAGES.map((item, index) => (
                    <WallFrame key={item.src} item={item} index={index} variant="wall" />
                ))}
            </div>
            <div className="pointer-events-none mt-14 grid grid-cols-2 gap-3 md:hidden">
                {WALL_IMAGES.map((item, index) => (
                    <WallFrame key={item.src} item={item} index={index} variant="grid" />
                ))}
            </div>
        </>
    );
}