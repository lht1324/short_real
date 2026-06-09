export enum falAIEndpointID {
    // ==== Image Models (T2I & I2I Pairs) ====
    NANO_BANANA_T2I = "fal-ai/nano-banana",
    NANO_BANANA_I2I = "fal-ai/nano-banana/edit",

    NANO_BANANA_2_T2I = "fal-ai/nano-banana-2",
    NANO_BANANA_2_I2I = "fal-ai/nano-banana-2/edit",

    NANO_BANANA_PRO_T2I = "fal-ai/nano-banana-pro",
    NANO_BANANA_PRO_I2I = "fal-ai/nano-banana-pro/edit",

    GPT_IMAGE_2_T2I = "openai/gpt-image-2",
    GPT_IMAGE_2_I2I = "openai/gpt-image-2/edit",

    GROK_IMAGINE_IMAGE_T2I = "xai/grok-imagine-image",
    GROK_IMAGINE_IMAGE_I2I = "xai/grok-imagine-image/edit",

    QWEN_IMAGE_2_T2I = "fal-ai/qwen-image-2/text-to-image",
    QWEN_IMAGE_2_I2I = "fal-ai/qwen-image-2/edit",

    QWEN_IMAGE_2_PRO_T2I = "fal-ai/qwen-image-2/pro/text-to-image",
    QWEN_IMAGE_2_PRO_I2I = "fal-ai/qwen-image-2/pro/edit",

    QWEN_IMAGE_MAX_T2I = "fal-ai/qwen-image-max/text-to-image",
    QWEN_IMAGE_MAX_I2I = "fal-ai/qwen-image-max/edit",

    KLING_IMAGE_V3_T2I = "fal-ai/kling-image/v3/text-to-image",
    KLING_IMAGE_V3_I2I = "fal-ai/kling-image/v3/image-to-image",

    KLING_IMAGE_O3_T2I = "fal-ai/kling-image/o3/text-to-image",
    KLING_IMAGE_O3_I2I = "fal-ai/kling-image/o3/image-to-image",

    WAN_2_7_T2I = "fal-ai/wan/v2.7/text-to-image",
    WAN_2_7_I2I = "fal-ai/wan/v2.7/edit",

    WAN_2_7_PRO_T2I = "fal-ai/wan/v2.7/pro/text-to-image",
    WAN_2_7_PRO_I2I = "fal-ai/wan/v2.7/pro/edit",

    // Models without explicit I2I counterparts
    FLUX_PRO_KONTEXT_I2I = "fal-ai/flux-pro/kontext",
    FLUX_PRO_KONTEXT_T2I = "fal-ai/flux-pro/kontext/text-to-image",

    // ==== Image-to-Video Models ====
    VIDU_Q3_I2V = "fal-ai/vidu/q3/image-to-video",
    VIDU_Q3_TURBO_I2V = "fal-ai/vidu/q3/image-to-video/turbo",
    VIDU_Q2_TURBO_I2V = "fal-ai/vidu/q2/image-to-video/turbo",
    VIDU_Q2_PRO_I2V = "fal-ai/vidu/q2/image-to-video/pro",
    
    KLING_VIDEO_O3_PRO_I2V = "fal-ai/kling-video/o3/pro/image-to-video",
    KLING_VIDEO_O3_STANDARD_I2V = "fal-ai/kling-video/o3/standard/image-to-video",
    KLING_VIDEO_O3_4K_I2V = "fal-ai/kling-video/o3/4k/image-to-video",
    
    GROK_IMAGINE_VIDEO_I2V = "xai/grok-imagine-video/image-to-video",
    
    SEEDANCE_1_5_PRO_I2V = "fal-ai/bytedance/seedance/v1.5/pro/image-to-video",
    SEEDANCE_1_PRO_FAST_I2V = "fal-ai/bytedance/seedance/v1/pro/fast/image-to-video",
    SEEDANCE_2_0_I2V = "bytedance/seedance-2.0/image-to-video",
    SEEDANCE_2_0_FAST_I2V = "bytedance/seedance-2.0/fast/image-to-video",
    
    HAPPY_HORSE_I2V = "alibaba/happy-horse/image-to-video",
    
    LTX_VIDEO_13B_DEV_I2V = "fal-ai/ltx-video-13b-dev/image-to-video",
    LTX_VIDEO_13B_DISTILLED_I2V = "fal-ai/ltx-video-13b-distilled/image-to-video",
    LTXV_13B_098_DISTILLED_I2V = "fal-ai/ltxv-13b-098-distilled/image-to-video",
    
    WAN_2_7_I2V = "fal-ai/wan/v2.7/image-to-video",
    
    PIXVERSE_V6_I2V = "fal-ai/pixverse/v6/image-to-video",
    PIXVERSE_C1_I2V = "fal-ai/pixverse/c1/image-to-video"
}

export interface CommonInputParams {
    prompt: string;
    imageUrls?: string[];
    aspectRatio: "16:9" | "9:16";
}

export const falAIInputMapper = {
    buildImageInput(endpointId: string, params: CommonInputParams): Record<string, any> {
        const {
            prompt,
            imageUrls,
            aspectRatio,
        } = params;

        const hasImage = imageUrls && imageUrls.length > 0;
        const isVertical = aspectRatio === '9:16';

        switch (endpointId) {
            case falAIEndpointID.NANO_BANANA_T2I:
            case falAIEndpointID.NANO_BANANA_I2I: return {
                prompt: prompt,
                num_images: 1,
                ...(hasImage && { image_urls: imageUrls }),
                aspect_ratio: aspectRatio,
                output_format: 'jpeg',
                safety_tolerance: 6,
            };

            case falAIEndpointID.NANO_BANANA_2_T2I:
            case falAIEndpointID.NANO_BANANA_2_I2I: return {
                prompt: prompt,
                num_images: 1,
                output_format: 'jpeg',
                safety_tolerance: 6,
                ...(hasImage && { image_urls: imageUrls }),
                resolution: '1K',
                limit_generations: false,
            };

            case falAIEndpointID.NANO_BANANA_PRO_T2I:
            case falAIEndpointID.NANO_BANANA_PRO_I2I:
                return {};

            case falAIEndpointID.GPT_IMAGE_2_T2I:
            case falAIEndpointID.GPT_IMAGE_2_I2I:
                return {};

            case falAIEndpointID.GROK_IMAGINE_IMAGE_T2I:
            case falAIEndpointID.GROK_IMAGINE_IMAGE_I2I:
                return {};

            case falAIEndpointID.QWEN_IMAGE_2_T2I:
            case falAIEndpointID.QWEN_IMAGE_2_I2I:
                return {};

            case falAIEndpointID.QWEN_IMAGE_2_PRO_T2I:
            case falAIEndpointID.QWEN_IMAGE_2_PRO_I2I:
                return {};

            case falAIEndpointID.QWEN_IMAGE_MAX_T2I:
            case falAIEndpointID.QWEN_IMAGE_MAX_I2I:
                return {};

            case falAIEndpointID.KLING_IMAGE_V3_T2I:
            case falAIEndpointID.KLING_IMAGE_V3_I2I:
                return {};

            case falAIEndpointID.KLING_IMAGE_O3_T2I:
            case falAIEndpointID.KLING_IMAGE_O3_I2I:
                return {};

            case falAIEndpointID.WAN_2_7_T2I:
            case falAIEndpointID.WAN_2_7_I2I:
                return {};

            case falAIEndpointID.WAN_2_7_PRO_T2I:
            case falAIEndpointID.WAN_2_7_PRO_I2I:
                return {};

            case falAIEndpointID.FLUX_PRO_KONTEXT_T2I:
            case falAIEndpointID.FLUX_PRO_KONTEXT_I2I:
                return {};

            default:
                console.warn(`[falAIInputMapper - Image] Unknown endpointId: ${endpointId}.`);
                return {};
        }
    },

    buildVideoInput(endpointId: string, params: CommonInputParams): Record<string, any> {
        const hasImage = params.imageUrls && params.imageUrls.length > 0;

        switch (endpointId) {
            case falAIEndpointID.VIDU_Q3_I2V:
            case falAIEndpointID.VIDU_Q3_TURBO_I2V:
            case falAIEndpointID.VIDU_Q2_TURBO_I2V:
            case falAIEndpointID.VIDU_Q2_PRO_I2V:
                return {};

            case falAIEndpointID.KLING_VIDEO_O3_PRO_I2V:
            case falAIEndpointID.KLING_VIDEO_O3_STANDARD_I2V:
            case falAIEndpointID.KLING_VIDEO_O3_4K_I2V:
                return {};

            case falAIEndpointID.GROK_IMAGINE_VIDEO_I2V:
                return {};

            case falAIEndpointID.SEEDANCE_1_5_PRO_I2V:
            case falAIEndpointID.SEEDANCE_1_PRO_FAST_I2V:
            case falAIEndpointID.SEEDANCE_2_0_I2V:
            case falAIEndpointID.SEEDANCE_2_0_FAST_I2V:
                return {};

            case falAIEndpointID.HAPPY_HORSE_I2V:
                return {};

            case falAIEndpointID.LTX_VIDEO_13B_DEV_I2V:
            case falAIEndpointID.LTX_VIDEO_13B_DISTILLED_I2V:
            case falAIEndpointID.LTXV_13B_098_DISTILLED_I2V:
                return {};

            case falAIEndpointID.WAN_2_7_I2V:
                return {};

            case falAIEndpointID.PIXVERSE_V6_I2V:
            case falAIEndpointID.PIXVERSE_C1_I2V:
                return {};

            default:
                console.warn(`[falAIInputMapper - Video] Unknown endpointId: ${endpointId}.`);
                return {};
        }
    }
};
