import {Style} from "@/api/types/supabase/Styles";

export const STYLE_DATA_LIST: Style[] = [
    {
        id: 'realistic',
        name: 'Realistic',
        description: 'Photorealistic rendering with high detail and lifelike accuracy.',
        // 수정: 기술 용어보다는 "어떤 느낌의 사진인가"에 집중
        stylePrompt: 'high-end editorial photography, capturing raw reality, authentic textures, natural daylight, documentary style realism, truth in detail',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'cinematic',
        name: 'Cinematic',
        description: 'Film-like quality with dramatic lighting and professional color grading.',
        // 수정: 영화적 서사성을 강조
        stylePrompt: 'feature film cinematography, emotional storytelling through light, moody atmosphere, anamorphic lens aesthetic, wide dynamic range, director\'s vision',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'vintage',
        name: 'Vintage',
        description: 'Emulates the look of old film stock with grain, light leaks, and faded colors.',
        // 수정: 특정 시대의 향수(Nostalgia)를 자극
        stylePrompt: 'analog film photography, nostalgic memory, faded kodachrome warmth, retro 1970s aesthetic, imperfection as beauty, timeless classic',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'line_art',
        name: 'Line Art',
        description: 'Clean, minimalist style focusing on outlines and contours with little to no shading.',
        // 수정: 단순함의 미학 강조
        stylePrompt: 'minimalist ink illustration, elegance in simplicity, continuous line drawing, negative space usage, hand-drawn sketch, architectural precision',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'cartoon',
        name: 'Cartoon',
        description: 'Stylized with exaggerated features, bold outlines, and vibrant, flat colors.',
        // 수정: 활기차고 재미있는 느낌 강조
        stylePrompt: 'vibrant Saturday morning cartoon style, playful energy, exaggerated expressions, bold graphical shapes, fun and dynamic, colorful animation',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'anime',
        name: 'Anime',
        description: 'Japanese animation style, characterized by large expressive eyes and vibrant scenes.',
        // 수정: 감성적인 애니메이션 배경 느낌 유도
        stylePrompt: 'high-budget anime production, emotional sky rendering, detailed background art, vibrant youth energy, dramatic anime lighting, Shinkai-esque atmosphere',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'pop_art',
        name: 'Pop Art',
        description: 'Inspired by Andy Warhol, featuring bold, saturated colors and comic book aesthetics.',
        // 수정: 예술적 파격과 대담함 강조
        stylePrompt: 'bold pop art aesthetic, iconic cultural imagery, high contrast screen print, saturated primary colors, retro comic book punch, artistic rebellion',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'pixel_art',
        name: 'Pixel Art',
        description: 'Retro digital art made of visible pixels, reminiscent of 8-bit and 16-bit video games.',
        // 수정: 디지털 향수 강조
        stylePrompt: 'nostalgic pixel art, golden age of gaming, intricate sprite work, digital retro aesthetic, 16-bit fantasy world, charm of low resolution',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'concept_art',
        name: 'Concept Art',
        description: 'Painterly and atmospheric style used in film and game development to visualize ideas.',
        // 수정: 상상력과 세계관 구축(World-building) 강조
        stylePrompt: 'epic digital concept art, world-building visualization, atmospheric matte painting, storytelling through environment, imagination unleashed, detailed fantasy/sci-fi',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'steampunk',
        name: 'Steampunk',
        description: 'A retrofuturistic style combining Victorian-era aesthetics with industrial steam-powered machinery.',
        // 수정: 낭만적인 과학 기술 묘사
        stylePrompt: 'victorian industrial fantasy, brass and steam aesthetic, romantic retro-futurism, intricate clockwork mechanisms, adventure and invention, warm copper tones',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'neon_synth',
        name: 'Neon Synth',
        description: 'An 80s retro-futuristic aesthetic with glowing neon grids, vibrant pinks, and purples.',
        // 수정: 밤의 열기와 사이버네틱 감성
        stylePrompt: '80s retrowave dream, neon-soaked night, digital horizon, vibrant magenta and cyan, retro-future nostalgia, electronic atmosphere',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'cyberpunk',
        name: 'Cyberpunk',
        description: 'A dystopian futuristic setting with neon-drenched cityscapes and advanced technology.',
        // 수정: 디스토피아적 우울함과 하이테크의 대비
        stylePrompt: 'high-tech low-life, dystopian noir, neon rain, sprawling futuristic metropolis, gritty realism meets advanced tech, dark sci-fi atmosphere',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'fantasy',
        name: 'Fantasy',
        description: 'Epic and magical settings featuring mythical creatures, castles, and enchanted forests.',
        // 수정: 신비로움과 장엄함 강조
        stylePrompt: 'epic high fantasy, mystical and enchanted world, legends and myths brought to life, magical realism, ethereal beauty, ancient wonder',
        thumbnailUrl: '/api/placeholder/200/356'
    },
    {
        id: 'gothic',
        name: 'Gothic',
        description: 'A dark, mysterious, and moody style with macabre themes and ornate architecture.',
        // 수정: 어둠의 미학 강조
        stylePrompt: 'dark romanticism, mysterious shadows, haunted beauty, ornate gothic grandeur, melancholic atmosphere, tales of the macabre, dramatic darkness',
        thumbnailUrl: '/api/placeholder/200/356'
    }
]
