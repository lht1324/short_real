// 공통적으로 이미지 품질 저하 및 기형적 표현을 방지하는 네거티브 프롬프트
const commonNegativePrompts = "worst quality, low quality, lowres, blurry, ugly, duplicate, text, watermark, logo, signature, username, error, bad anatomy, deformed, malformed, mutated, extra limbs, extra fingers, missing limbs, missing fingers, poorly drawn hands, poorly drawn face, fused fingers, cloned face";

// 각 스타일에 특화된 네거티브 프롬프트를 포함한 최종 객체
export const MasterNegativePrompts = {
    Common: commonNegativePrompts,

    Realistic: `${commonNegativePrompts}, painting, drawing, illustration, sketch, cartoon, anime, 3d render, cgi, stylized, abstract, unrealistic`,

    Cinematic: `${commonNegativePrompts}, flat lighting, harsh lighting, amateur photography, snapshot, home video, surveillance, webcam, poorly composed, boring, unprofessional, illustration, painting`,

    Vintage: `${commonNegativePrompts}, modern, contemporary, digital, clean, sharp, high definition, 4k, futuristic, sci-fi, photoshop, over-processed, hdr, vibrant colors`,

    LineArt: `${commonNegativePrompts}, color, shading, shadows, gradients, painting, realistic, photorealistic, 3d render, detailed textures, soft edges, messy lines`,

    Cartoon: `${commonNegativePrompts}, realistic, photorealistic, photography, lifelike, detailed skin texture, pores, wrinkles, natural lighting, subtle expression, 3d render`,

    Anime: `${commonNegativePrompts}, realistic, photorealistic, photography, 3d render, western animation, live action, real person, detailed skin texture, natural lighting`,

    PopArt: `${commonNegativePrompts}, realistic, muted colors, subtle, pastel, natural lighting, soft lighting, traditional art, classical, monochrome, black and white`,

    PixelArt: `${commonNegativePrompts}, smooth, anti-aliased, high resolution, vector art, realistic, photorealistic, 3d render, soft edges, detailed textures, hd`,

    ConceptArt: `${commonNegativePrompts}, finished artwork, polished, clean, vector art, flat colors, cartoon, graphic design, minimalist, simple composition, sterile`,

    Steampunk: `${commonNegativePrompts}, modern, futuristic, sci-fi, cyberpunk, digital, electronic, plastic, neon, led, minimalist, contemporary`,

    NeonSynth: `${commonNegativePrompts}, natural lighting, daylight, sunlight, earth tones, muted colors, organic, wood, stone, realistic, vintage, old-fashioned, monochrome`,

    Cyberpunk: `${commonNegativePrompts}, natural environment, countryside, pastoral, utopian, clean, bright daylight, sunny, organic, vintage, medieval, low-tech`,

    Fantasy: `${commonNegativePrompts}, realistic, modern, contemporary, sci-fi, urban, industrial, technological, everyday, mundane, corporate, scientific`,

    Gothic: `${commonNegativePrompts}, bright, cheerful, colorful, happy, upbeat, modern, minimalist, clean, light colors, pastel, sunny, optimistic, sterile`
};