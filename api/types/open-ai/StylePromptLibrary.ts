export const STYLE_PROMPT_LIBRARY = {
    realistic: {
        style: {
            Horizontal: (textureDetail: string, grainLevel: string) => `Professional cinematic RAW aesthetic with ${textureDetail} detail and ${grainLevel} grain.`,
            Vertical: (textureDetail: string, grainLevel: string) => `High-fidelity RAW portrait photography with ${textureDetail} surface detail and ${grainLevel} organic texture.`,
            Square: (textureDetail: string, grainLevel: string) => `Balanced RAW texture style with ${textureDetail} and ${grainLevel} definition.`,
        },
        effects: {
            // grainLevel에 따른 매핑
            grain: {
                Gritty: ["heavy film grain"],
                Filmic: ["subtle film grain"],
                Clean: ["clean digital sensor finish"]
            },
            // canvasType에 따른 매핑
            canvas: {
                Horizontal: ["4K UHD", "8K resolution", "ultra-sharp details"],
                Vertical: ["highly defined textures", "hyper-detailed rendering", "extreme visual fidelity"],
                Square: ["highly defined textures", "hyper-detailed rendering", "extreme visual fidelity"],
            },
            // 해당 스타일일 때 무조건 추가되는 기본 효과
            base: ["photorealistic textures", "physically based rendering"]
        }
    },
    anime: {
        style: {
            Horizontal: (textureDetail: string, grainLevel: string) => `High-budget anime production with ${textureDetail} line art and ${grainLevel} cinematic shading.`,
            Vertical: (textureDetail: string, grainLevel: string) => `Detailed anime character portrait featuring ${textureDetail} outlines and ${grainLevel} surface texture.`,
            Square: (textureDetail: string, grainLevel: string) => `Balanced anime art style with ${textureDetail} linework and ${grainLevel} color depth.`,
        },
        effects: {
            grain: {
                // 애니메이션에서 Gritty는 '복고풍/수작업' 느낌으로 해석
                Gritty: ["90s retro aesthetic", "analog hand-drawn noise", "vintage cel texture"],
                Filmic: ["soft cinematic glow", "modern digital shading"],
                Clean: ["ultra-clean digital cel-shading", "vibrant color depth", "sharp line art"]
            },
            canvas: {
                Horizontal: ["hand-painted background art", "wide environmental grandeur"],
                Vertical: ["expressive character linework", "detailed facial features"],
                Square: ["balanced composition art", "centered character focus"]
            },
            base: ["stylized sun flare", "Shinkai-esque clouds"]
        }
    }
}