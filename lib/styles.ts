import {Style} from "@/api/types/supabase/Styles";

export const STYLE_DATA_LIST: Style[] = [
    {
        id: 'realistic',
        name: 'Realistic',
        description: 'Photorealistic rendering with high detail and lifelike accuracy.',
        stylePrompt: 'photorealistic, DSLR quality, professional photography, high detail, natural lighting, lifelike textures, 8K resolution, sharp focus',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'cinematic',
        name: 'Cinematic',
        description: 'Film-like quality with dramatic lighting and professional color grading.',
        stylePrompt: 'cinematic lighting, film grain, dramatic shadows, professional color grading, movie still, widescreen aspect ratio, depth of field',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'vintage',
        name: 'Vintage',
        description: 'Emulates the look of old film stock with grain, light leaks, and faded colors.',
        stylePrompt: 'vintage photography, film grain, retro colors, aged paper texture, light leaks, faded colors, nostalgic mood, old film aesthetic',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'line_art',
        name: 'Line Art',
        description: 'Clean, minimalist style focusing on outlines and contours with little to no shading.',
        stylePrompt: 'line art, clean lineart, minimalist design, black and white, simple outlines, no shading, vector style, contour drawing',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'cartoon',
        name: 'Cartoon',
        description: 'Stylized with exaggerated features, bold outlines, and vibrant, flat colors.',
        stylePrompt: 'cartoon style, bold outlines, flat colors, exaggerated features, vibrant colors, cell shading, animated style, colorful',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'anime',
        name: 'Anime',
        description: 'Japanese animation style, characterized by large expressive eyes and vibrant scenes.',
        stylePrompt: 'anime style, manga art, cel-shading, vibrant colors, Japanese animation, large expressive eyes, clean lineart, anime aesthetic',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'pop_art',
        name: 'Pop Art',
        description: 'Inspired by Andy Warhol, featuring bold, saturated colors and comic book aesthetics.',
        stylePrompt: 'pop art, Andy Warhol style, bold saturated colors, comic book aesthetic, halftone dots, high contrast, retro poster style',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'pixel_art',
        name: 'Pixel Art',
        description: 'Retro digital art made of visible pixels, reminiscent of 8-bit and 16-bit video games.',
        stylePrompt: 'pixel art, 8-bit style, 16-bit graphics, retro gaming, visible pixels, low resolution, pixelated, retro digital art',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'concept_art',
        name: 'Concept Art',
        description: 'Painterly and atmospheric style used in film and game development to visualize ideas.',
        stylePrompt: 'concept art, digital painting, atmospheric lighting, painterly style, matte painting, cinematic concept, detailed artwork',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'steampunk',
        name: 'Steampunk',
        description: 'A retrofuturistic style combining Victorian-era aesthetics with industrial steam-powered machinery.',
        stylePrompt: 'steampunk aesthetic, Victorian era, brass machinery, industrial design, steam-powered, gears and cogs, retrofuturistic, copper tones',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'neon_synth',
        name: 'Neon Synth',
        description: 'An 80s retro-futuristic aesthetic with glowing neon grids, vibrant pinks, and purples.',
        stylePrompt: 'synthwave aesthetic, neon lights, 80s retro, glowing grids, vibrant pinks and purples, cyberpunk neon, retrowave, vaporwave',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'cyberpunk',
        name: 'Cyberpunk',
        description: 'A dystopian futuristic setting with neon-drenched cityscapes and advanced technology.',
        stylePrompt: 'cyberpunk aesthetic, neon-drenched cityscape, futuristic technology, dark atmosphere, sci-fi, dystopian future, holographic displays',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'fantasy',
        name: 'Fantasy',
        description: 'Epic and magical settings featuring mythical creatures, castles, and enchanted forests.',
        stylePrompt: 'fantasy art, magical atmosphere, mythical creatures, enchanted forest, medieval castles, epic landscape, mystical lighting, magical realism',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'gothic',
        name: 'Gothic',
        description: 'A dark, mysterious, and moody style with macabre themes and ornate architecture.',
        stylePrompt: 'gothic architecture, dark atmosphere, mysterious mood, ornate details, dramatic shadows, macabre themes, medieval gothic, dark romanticism',
        thumbnailUrl: '/api/placeholder/200/356'
    }
]