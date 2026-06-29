export enum FalAIEndpointID {
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
    // FLUX_PRO_KONTEXT_I2I = "fal-ai/flux-pro/kontext",
    // FLUX_PRO_KONTEXT_T2I = "fal-ai/flux-pro/kontext/text-to-image",

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
    
    // LTX_VIDEO_13B_DEV_I2V = "fal-ai/ltx-video-13b-dev/image-to-video",
    LTX_VIDEO_13B_DISTILLED_I2V = "fal-ai/ltx-video-13b-distilled/image-to-video",
    LTXV_13B_098_DISTILLED_I2V = "fal-ai/ltxv-13b-098-distilled/image-to-video",
    
    WAN_2_7_I2V = "fal-ai/wan/v2.7/image-to-video",
    
    PIXVERSE_V6_I2V = "fal-ai/pixverse/v6/image-to-video",
    PIXVERSE_C1_I2V = "fal-ai/pixverse/c1/image-to-video"
}

export interface CommonInputParams {
    prompt: string;
    aspectRatio: '16:9' | '9:16';
    resolution: '720p' | '1080p' | '2160p'
}

export interface ImageInputParams extends CommonInputParams {
    imageUrls?: string[];
}

export interface VideoInputParams extends CommonInputParams {
    imageUrl: string;
    duration: number;
}

export const falAIInputMapper = {
    buildImageInput(endpointId: FalAIEndpointID, params: ImageInputParams) {
        const {
            prompt,
            imageUrls,
            aspectRatio,
            resolution,
        } = params;

        const hasImage = imageUrls && imageUrls.length > 0;
        const isVertical = aspectRatio === '9:16';
        const width = resolution === '720p'
            ? isVertical ? 720 : 1280
            : isVertical ? 1080 : 1920;
        const height = resolution === '720p'
            ? isVertical ? 1280 : 720
            : isVertical ? 1920 : 1080;

        switch (endpointId) {
            case FalAIEndpointID.NANO_BANANA_T2I:
            case FalAIEndpointID.NANO_BANANA_I2I: return {
                prompt: prompt,
                num_images: 1,
                ...(hasImage && { image_urls: imageUrls }),
                aspect_ratio: aspectRatio,
                output_format: 'jpeg',
                safety_tolerance: 6,
            };

            case FalAIEndpointID.NANO_BANANA_2_T2I:
            case FalAIEndpointID.NANO_BANANA_2_I2I: return {
                prompt: prompt,
                num_images: 1,
                output_format: 'jpeg',
                safety_tolerance: 6,
                ...(hasImage && { image_urls: imageUrls }),
                resolution: '1K',
                limit_generations: false,
            };

            case FalAIEndpointID.NANO_BANANA_PRO_T2I:
            case FalAIEndpointID.NANO_BANANA_PRO_I2I: return {
                prompt: prompt,
                num_images: 1,
                aspect_ratio: aspectRatio,
                output_format: 'jpeg',
                safety_tolerance: 6,
                ...(hasImage && { image_urls: imageUrls }),
                resolution: '1K',
                limit_generations: false,
            };

            case FalAIEndpointID.GPT_IMAGE_2_T2I:
            case FalAIEndpointID.GPT_IMAGE_2_I2I: return {
                prompt: prompt,
                quality: 'high', // 검토
                image_size: {
                    width: width,
                    height: height,
                },
                ...(hasImage && { image_urls: imageUrls }),
                num_images: 1,
                output_format: 'jpeg',
            };

            case FalAIEndpointID.GROK_IMAGINE_IMAGE_T2I:
            case FalAIEndpointID.GROK_IMAGINE_IMAGE_I2I: return {
                prompt: prompt,
                num_images: 1,
                aspect_ratio: aspectRatio,
                resolution: '1k',
                ...(hasImage && { image_urls: imageUrls }),
                output_format: 'jpeg',
            };

            case FalAIEndpointID.QWEN_IMAGE_2_T2I:
            case FalAIEndpointID.QWEN_IMAGE_2_I2I:
            case FalAIEndpointID.QWEN_IMAGE_2_PRO_T2I:
            case FalAIEndpointID.QWEN_IMAGE_2_PRO_I2I:
            case FalAIEndpointID.QWEN_IMAGE_MAX_T2I:
            case FalAIEndpointID.QWEN_IMAGE_MAX_I2I: return {
                prompt: prompt,
                negative_prompt: "low resolution, error, worst quality, low quality, deformed",
                enable_prompt_expansion: false,
                enable_safety_checker: false,
                num_images: 1,
                output_format: 'jpeg',
                ...(hasImage && { image_urls: imageUrls }),
                image_size: {
                    width: width,
                    height: height,
                },
            };

            // I2I는 image_url 단일 입력이 강제되어 실질적으로 T2I에 reference_image_urls만 사용하는 걸로 고정됨
            case FalAIEndpointID.KLING_IMAGE_V3_T2I:
            case FalAIEndpointID.KLING_IMAGE_V3_I2I: return {
                prompt: prompt,
                elements: [
                    {
                        reference_image_urls: hasImage ? imageUrls : [],
                    }
                ],
                resolution: "2K",
                num_images: 1,
                aspect_ratio: aspectRatio,
                output_format: "jpeg"
            };

            case FalAIEndpointID.KLING_IMAGE_O3_T2I:
            case FalAIEndpointID.KLING_IMAGE_O3_I2I: return {
                prompt: prompt,
                ...(hasImage && { image_urls: imageUrls }),
                resolution: '2K',
                result_type: 'single',
                num_images: 1,
                aspect_ratio: aspectRatio,
                output_format: 'jpeg',
            };

            case FalAIEndpointID.WAN_2_7_T2I:
            case FalAIEndpointID.WAN_2_7_I2I:
            case FalAIEndpointID.WAN_2_7_PRO_T2I:
            case FalAIEndpointID.WAN_2_7_PRO_I2I: return {
                prompt: prompt,
                ...(hasImage && { image_urls: imageUrls }),
                image_size: {
                    width: width,
                    height: height,
                },
                num_images: 1,
                enable_prompt_expansion: false,
                enable_safety_checker: false,
                output_format: 'jpeg',
            };

            // 이후 DB에서도 지워야 하니 잊지 말라고 남겨둠
            // case falAIEndpointID.FLUX_PRO_KONTEXT_T2I:
            // case falAIEndpointID.FLUX_PRO_KONTEXT_I2I: return {
            //
            // };

            default:
                console.warn(`[falAIInputMapper - Image] Unknown endpointId: ${endpointId}.`);
                return { };
        }
    },

    buildVideoInput(endpointId: string, params: VideoInputParams) {
        const {
            prompt,
            imageUrl,
            duration,
            aspectRatio,
            resolution,
        } = params;

        switch (endpointId) {
            case FalAIEndpointID.VIDU_Q3_I2V:
            case FalAIEndpointID.VIDU_Q3_TURBO_I2V: return {
                prompt: prompt,
                image_url: imageUrl,
                duration: duration, // 1 ~ 16
                resolution: resolution,
                audio: false,
            };

            case FalAIEndpointID.VIDU_Q2_TURBO_I2V:
            case FalAIEndpointID.VIDU_Q2_PRO_I2V: return {
                prompt: prompt,
                image_url: imageUrl,
                duration: duration, // 2 ~ 8
                resolution: resolution,
                movement_amplitude: 'auto',
                bgm: false,
            }

            case FalAIEndpointID.KLING_VIDEO_O3_PRO_I2V:
            case FalAIEndpointID.KLING_VIDEO_O3_STANDARD_I2V:
            case FalAIEndpointID.KLING_VIDEO_O3_4K_I2V: return {
                prompt: prompt,
                image_url: imageUrl,
                duration: duration, // 3 ~ 15
                multi_prompt: null,
                shot_type: 'customize',
            };

            case FalAIEndpointID.GROK_IMAGINE_VIDEO_I2V: return {
                prompt: prompt,
                duration: duration, // 1 ~ 15
                resolution: '720p',
                image_url: imageUrl,
                aspect_ratio: aspectRatio,
            };

            case FalAIEndpointID.SEEDANCE_1_5_PRO_I2V: return {
                prompt: prompt,
                aspect_ratio: aspectRatio,
                resolution: resolution,
                duration: duration, // 4 ~ 12
                enable_safety_checker: false,
                generate_audio: false,
                image_url: imageUrl,
            };

            case FalAIEndpointID.SEEDANCE_1_PRO_FAST_I2V: return {
                prompt: prompt,
                aspect_ratio: aspectRatio,
                resolution: resolution,
                duration: duration, // 2 ~ 12
                enable_safety_checker: false,
                image_url: imageUrl,
            };

            case FalAIEndpointID.SEEDANCE_2_0_I2V:
            case FalAIEndpointID.SEEDANCE_2_0_FAST_I2V: return {
                prompt: prompt,
                duration: duration, // 4 ~ 15
                image_url: imageUrl,
                resolution: resolution,
                aspect_ratio: aspectRatio,
                generate_audio: false,
            };

            case FalAIEndpointID.HAPPY_HORSE_I2V: return {
                image_url: imageUrl,
                prompt: prompt,
                resolution: resolution,
                duration: duration, // 3 ~ 15
                enable_safety_checker: false,
            };

            // Deprecated
            // case falAIEndpointID.LTX_VIDEO_13B_DEV_I2V:

            case FalAIEndpointID.LTX_VIDEO_13B_DISTILLED_I2V:
            case FalAIEndpointID.LTXV_13B_098_DISTILLED_I2V: return {
                prompt: prompt,
                negative_prompt: "worst quality, inconsistent motion, blurry, jittery, distorted",
                loras: [],
                resolution: resolution,
                aspect_ratio: aspectRatio,
                num_frames: (duration * 24) + 1, // 2 ~ 10
                frame_rate: 24,
                first_pass_num_inference_steps: 12,
                second_pass_num_inference_steps: 12,
                second_pass_skip_initial_steps: 5,
                expand_prompt: false,
                reverse_video: false,
                enable_safety_checker: false,
                enable_detail_pass: false,
                temporal_adain_factor: 0.5,
                tone_map_compression_ratio: 0,
                constant_rate_factor: 29,
                image_url: imageUrl,
            };

            case FalAIEndpointID.WAN_2_7_I2V: return {
                prompt: prompt,
                image_url: imageUrl,
                resolution: resolution,
                duration: duration, // 2 ~ 15
                negative_prompt: "low resolution, errors, worst quality, low quality, incomplete, extra fingers, bad proportions, blurry, distorted",
                enable_prompt_expansion: false,
                enable_safety_checker: false,
            };

            case FalAIEndpointID.PIXVERSE_V6_I2V: return {
                prompt: prompt,
                resolution: resolution,
                duration: duration, // 1 ~ 15
                negative_prompt: "blurry, low quality, low resolution, pixelated, noisy, grainy, out of focus, poorly lit, poorly exposed, poorly composed, poorly framed, poorly cropped, poorly color corrected, poorly color graded",
                image_url: imageUrl,
                thinking_type: "auto",
            };

            case FalAIEndpointID.PIXVERSE_C1_I2V: return {
                prompt: prompt,
                resolution: resolution,
                duration: duration, // 1 ~ 15
                image_url: imageUrl,
            };

            default:
                console.warn(`[falAIInputMapper - Video] Unknown endpointId: ${endpointId}.`);
                return { };
        }
    },
};