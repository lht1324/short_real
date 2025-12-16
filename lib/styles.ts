import { Style } from "@/api/types/supabase/Styles";

export const STYLE_DATA_LIST: Style[] = [
    {
        uiMetadata: {
            id: 'realistic',
            label: 'Realistic',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        generationParams: {
            coreConcept: "High-fidelity cinematic rendering with atmospheric depth and storytelling composition.",
            visualKeywords: [
                "wide cinematic imagery",
                "anamorphic lens look",
                "natural lighting",
                "believable texture",
                "visual clarity"
            ],
            negativeGuidance: "Avoid editorial fashion close-ups, avoid excessive micro-contrast, avoid grotesque skin textures.",
            preferredFramingLogic: "Prioritize wide shots and medium shots over extreme close-ups to enhance cinematic feel."
        }
    },
    {
        uiMetadata: {
            id: 'cinematic',
            label: 'Cinematic',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        generationParams: {
            coreConcept: "Film-like quality with dramatic lighting and professional color grading.",
            visualKeywords: [
                "feature film cinematography",
                "emotional storytelling through light",
                "moody atmosphere",
                "anamorphic lens aesthetic",
                "wide dynamic range",
                "director's vision"
            ],
            negativeGuidance: "Avoid flat lighting, avoid amateur video look, avoid oversaturation.",
            preferredFramingLogic: "Use cinematic composition techniques like rule of thirds and leading lines."
        }
    },
    {
        uiMetadata: {
            id: 'vintage',
            label: 'Vintage',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        generationParams: {
            coreConcept: "Emulates the look of old film stock with nostalgic warmth and imperfections.",
            visualKeywords: [
                "analog film photography",
                "nostalgic memory",
                "faded kodachrome warmth",
                "retro 1970s aesthetic",
                "imperfection as beauty",
                "timeless classic"
            ],
            negativeGuidance: "Avoid sharp digital clarity, avoid modern HD look, avoid cold colors.",
            preferredFramingLogic: "Focus on candid moments and slightly softer focus to mimic vintage lenses."
        }
    },
    {
        uiMetadata: {
            id: 'line_art',
            label: 'Line Art',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        generationParams: {
            coreConcept: "Clean, minimalist style focusing on outlines and contours with little to no shading.",
            visualKeywords: [
                "minimalist ink illustration",
                "elegance in simplicity",
                "continuous line drawing",
                "negative space usage",
                "hand-drawn sketch",
                "architectural precision"
            ],
            negativeGuidance: "Avoid shading, avoid gradients, avoid photorealism, avoid complex textures.",
            preferredFramingLogic: "Use clean compositions with ample negative space to highlight the lines."
        }
    },
    {
        uiMetadata: {
            id: 'cartoon',
            label: 'Cartoon',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        generationParams: {
            coreConcept: "Stylized with exaggerated features, bold outlines, and vibrant, flat colors.",
            visualKeywords: [
                "vibrant Saturday morning cartoon style",
                "playful energy",
                "exaggerated expressions",
                "bold graphical shapes",
                "fun and dynamic",
                "colorful animation"
            ],
            negativeGuidance: "Avoid realistic textures, avoid sombre tones, avoid gritty details.",
            preferredFramingLogic: "Emphasize dynamic action poses and exaggerated perspectives."
        }
    },
    {
        uiMetadata: {
            id: 'anime',
            label: 'Anime',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        generationParams: {
            coreConcept: "Japanese animation style, characterized by large expressive eyes and vibrant scenes.",
            visualKeywords: [
                "high-budget anime production",
                "emotional sky rendering",
                "detailed background art",
                "vibrant youth energy",
                "dramatic anime lighting",
                "Shinkai-esque atmosphere"
            ],
            negativeGuidance: "Avoid western cartoon style, avoid low quality sketch, avoid realistic proportions.",
            preferredFramingLogic: "Use dramatic angles and focus on character expressions and environmental grandeur."
        }
    },
    {
        uiMetadata: {
            id: 'pop_art',
            label: 'Pop Art',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        generationParams: {
            coreConcept: "Inspired by Andy Warhol, featuring bold, saturated colors and comic book aesthetics.",
            visualKeywords: [
                "bold pop art aesthetic",
                "iconic cultural imagery",
                "high contrast screen print",
                "saturated primary colors",
                "retro comic book punch",
                "artistic rebellion"
            ],
            negativeGuidance: "Avoid subtle gradients, avoid muted colors, avoid realistic shading.",
            preferredFramingLogic: "Focus on bold, iconic close-ups and repetitive patterns."
        }
    },
    {
        uiMetadata: {
            id: 'pixel_art',
            label: 'Pixel Art',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        generationParams: {
            coreConcept: "Retro digital art made of visible pixels, reminiscent of 8-bit and 16-bit video games.",
            visualKeywords: [
                "nostalgic pixel art",
                "golden age of gaming",
                "intricate sprite work",
                "digital retro aesthetic",
                "16-bit fantasy world",
                "charm of low resolution"
            ],
            negativeGuidance: "Avoid anti-aliasing, avoid vector curves, avoid high resolution smoothness.",
            preferredFramingLogic: "Use orthogonal or side-scrolling perspectives typical of retro games."
        }
    },
    {
        uiMetadata: {
            id: 'concept_art',
            label: 'Concept Art',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        generationParams: {
            coreConcept: "Painterly and atmospheric style used in film and game development to visualize ideas.",
            visualKeywords: [
                "epic digital concept art",
                "world-building visualization",
                "atmospheric matte painting",
                "storytelling through environment",
                "imagination unleashed",
                "detailed fantasy/sci-fi"
            ],
            negativeGuidance: "Avoid doodles, avoid unfinished sketch look, avoid flat lighting.",
            preferredFramingLogic: "Prioritize wide environmental shots that establish scale and mood."
        }
    },
    {
        uiMetadata: {
            id: 'steampunk',
            label: 'Steampunk',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        generationParams: {
            coreConcept: "A retrofuturistic style combining Victorian-era aesthetics with industrial steam-powered machinery.",
            visualKeywords: [
                "victorian industrial fantasy",
                "brass and steam aesthetic",
                "romantic retro-futurism",
                "intricate clockwork mechanisms",
                "adventure and invention",
                "warm copper tones"
            ],
            negativeGuidance: "Avoid modern digital tech, avoid clean plastic surfaces, avoid cold blue tones.",
            preferredFramingLogic: "Highlight mechanical details and grand industrial landscapes."
        }
    },
    {
        uiMetadata: {
            id: 'neon_synth',
            label: 'Neon Synth',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        generationParams: {
            coreConcept: "An 80s retro-futuristic aesthetic with glowing neon grids, vibrant pinks, and purples.",
            visualKeywords: [
                "80s retrowave dream",
                "neon-soaked night",
                "digital horizon",
                "vibrant magenta and cyan",
                "retro-future nostalgia",
                "electronic atmosphere"
            ],
            negativeGuidance: "Avoid dull colors, avoid daylight scenes, avoid rustic textures.",
            preferredFramingLogic: "Use central perspective grids and silhouette contrasts."
        }
    },
    {
        uiMetadata: {
            id: 'cyberpunk',
            label: 'Cyberpunk',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        generationParams: {
            coreConcept: "A dystopian futuristic setting with neon-drenched cityscapes and advanced technology.",
            visualKeywords: [
                "high-tech low-life",
                "dystopian noir",
                "neon rain",
                "sprawling futuristic metropolis",
                "gritty realism meets advanced tech",
                "dark sci-fi atmosphere"
            ],
            negativeGuidance: "Avoid sunny utopian vibes, avoid clean nature, avoid primitive tech.",
            preferredFramingLogic: "Use low angles to emphasize towering skylines and dense urban clutter."
        }
    },
    {
        uiMetadata: {
            id: 'fantasy',
            label: 'Fantasy',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        generationParams: {
            coreConcept: "Epic and magical settings featuring mythical creatures, castles, and enchanted forests.",
            visualKeywords: [
                "epic high fantasy",
                "mystical and enchanted world",
                "legends and myths brought to life",
                "magical realism",
                "ethereal beauty",
                "ancient wonder"
            ],
            negativeGuidance: "Avoid sci-fi elements, avoid modern technology, avoid mundane urban settings.",
            preferredFramingLogic: "Emphasize grandeur and scale, showcasing the magical environment."
        }
    },
    {
        uiMetadata: {
            id: 'gothic',
            label: 'Gothic',
            thumbnailUrl: '/api/placeholder/200/356'
        },
        generationParams: {
            coreConcept: "A dark, mysterious, and moody style with macabre themes and ornate architecture.",
            visualKeywords: [
                "dark romanticism",
                "mysterious shadows",
                "haunted beauty",
                "ornate gothic grandeur",
                "melancholic atmosphere",
                "tales of the macabre",
                "dramatic darkness"
            ],
            negativeGuidance: "Avoid bright cheerful colors, avoid modern minimalism, avoid comedy vibes.",
            preferredFramingLogic: "Use shadows and high contrast to create mystery and depth."
        }
    }
];
