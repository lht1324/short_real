export enum falAIEndpointID {
    // Image Models
    NANO_BANANA_2 = "fal-ai/nano-banana-2",
    NANO_BANANA_PRO = "fal-ai/nano-banana-pro",
    GPT_IMAGE_2 = "openai/gpt-image-2",
    NANO_BANANA = "fal-ai/nano-banana",
    FLUX_PRO_KONTEXT = "fal-ai/flux-pro/kontext",
    GROK_IMAGINE = "xai/grok-imagine-image",
    QWEN_IMAGE_2 = "fal-ai/qwen-image-2",
    QWEN_IMAGE_2_PRO = "fal-ai/qwen-image-2/pro",
    KLING_V3 = "fal-ai/kling-image/v3",
    KLING_OMNI_3 = "fal-ai/kling-image/o3",
    WAN_2_7 = "fal-ai/wan/v2.7",
    WAN_2_7_PRO = "fal-ai/wan/v2.7/pro",
    QWEN_IMAGE_MAX = "fal-ai/qwen-image-max",

    // Video Models
    SEEDANCE_2 = "bytedance/seedance-2.0",
    GROK_IMAGINE_VIDEO = "xai/grok-imagine-video",
    SEEDANCE_2_FAST = "bytedance/seedance-2.0/fast",
    SEEDANCE_1_5_PRO = "fal-ai/bytedance/seedance/v1.5/pro",
    HAPPY_HORSE = "alibaba/happy-horse",
    KLING_VIDEO_O3_PRO = "fal-ai/kling-video/o3/pro",
    KLING_VIDEO_O3_STANDARD = "fal-ai/kling-video/o3/standard",
    WAN_2_7_VIDEO = "fal-ai/wan/v2.7", // same base endpoint as image, handled carefully
    PIXVERSE_V6 = "fal-ai/pixverse/v6",
    SEEDANCE_1_PRO_FAST = "fal-ai/bytedance/seedance/v1/pro/fast",
    VIDU_Q3 = "fal-ai/vidu/q3",
    KLING_VIDEO_O3_4K = "fal-ai/kling-video/o3/4k",
    VIDU_Q3_TURBO = "fal-ai/vidu/q3", // turbo suffix
    PIXVERSE_C1 = "fal-ai/pixverse/c1",
    LTX_VIDEO_13B_DISTILLED = "fal-ai/ltx-video-13b-distilled",
    LTXV_13B_098_DISTILLED = "fal-ai/ltxv-13b-098-distilled",
    VIDU_Q2_TURBO = "fal-ai/vidu/q2", // turbo suffix
    VIDU_Q2_PRO = "fal-ai/vidu/q2", // pro suffix
    LTX_VIDEO_13B_DEV = "fal-ai/ltx-video-13b-dev"
}

export interface CommonImageInputParams {
    prompt: string;
    imageUrls?: string[];
}

export const falAIInputMapper = {
    buildImageInput(endpointId: string, params: CommonImageInputParams): Record<string, any> {
        const hasImage = params.imageUrls && params.imageUrls.length > 0;
        
        // Map the specific t2i or i2i or i2v endpoint string back to the base enum
        let baseEndpointId = endpointId;
        
        // Strip out specific suffixes to match the base enum
        if (endpointId.endsWith('/edit')) {
            baseEndpointId = endpointId.replace('/edit', '');
        } else if (endpointId.endsWith('/text-to-image')) {
            baseEndpointId = endpointId.replace('/text-to-image', '');
        } else if (endpointId.endsWith('/image-to-image')) {
            baseEndpointId = endpointId.replace('/image-to-image', '');
        } else if (endpointId.endsWith('/image-to-video')) {
            baseEndpointId = endpointId.replace('/image-to-video', '');
        } else if (endpointId.endsWith('/image-to-video/turbo')) {
            baseEndpointId = endpointId.replace('/image-to-video/turbo', '');
        } else if (endpointId.endsWith('/image-to-video/pro')) {
            baseEndpointId = endpointId.replace('/image-to-video/pro', '');
        }

        switch (baseEndpointId) {
            case falAIEndpointID.NANO_BANANA_2:
            case falAIEndpointID.NANO_BANANA_PRO:
            case falAIEndpointID.NANO_BANANA:
                return {
                };

            case falAIEndpointID.GPT_IMAGE_2:
                return {
                };

            case falAIEndpointID.FLUX_PRO_KONTEXT:
                return {
                };

            case falAIEndpointID.GROK_IMAGINE:
                return {
                };

            case falAIEndpointID.QWEN_IMAGE_2:
            case falAIEndpointID.QWEN_IMAGE_2_PRO:
            case falAIEndpointID.QWEN_IMAGE_MAX:
                return {
                };

            case falAIEndpointID.KLING_V3:
            case falAIEndpointID.KLING_OMNI_3:
                return {
                };

            case falAIEndpointID.WAN_2_7:
            case falAIEndpointID.WAN_2_7_PRO:
                return {
                };

            // Video models cases (base ID without suffixes)
            case falAIEndpointID.SEEDANCE_2:
            case falAIEndpointID.SEEDANCE_2_FAST:
            case falAIEndpointID.SEEDANCE_1_5_PRO:
            case falAIEndpointID.SEEDANCE_1_PRO_FAST:
                return {
                };

            case falAIEndpointID.GROK_IMAGINE_VIDEO:
                return {
                };

            case falAIEndpointID.HAPPY_HORSE:
                return {
                };

            case falAIEndpointID.KLING_VIDEO_O3_PRO:
            case falAIEndpointID.KLING_VIDEO_O3_STANDARD:
            case falAIEndpointID.KLING_VIDEO_O3_4K:
                return {
                };
            
            case falAIEndpointID.PIXVERSE_V6:
            case falAIEndpointID.PIXVERSE_C1:
                return {
                };

            case falAIEndpointID.VIDU_Q3:
            case falAIEndpointID.VIDU_Q2_TURBO:
            case falAIEndpointID.VIDU_Q2_PRO:
                return {
                };
                
            case falAIEndpointID.LTX_VIDEO_13B_DISTILLED:
            case falAIEndpointID.LTXV_13B_098_DISTILLED:
            case falAIEndpointID.LTX_VIDEO_13B_DEV:
                return {
                };

            default:
                console.warn(`[falAIInputMapper] Unknown baseEndpointId: ${baseEndpointId}.`);
                return {
                };
        }
    }
}
