import {createSupabaseServiceRoleClient} from "@/lib/supabase/supabaseServiceRole";
import {fal} from "@fal-ai/client";
import {FluxPrompt} from "@/lib/api/types/open-ai/FluxPrompt";
import {ImageFile} from "@fal-ai/client/endpoints";
import {Entity} from "@/lib/api/types/open-ai/Entity";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";
import {cryptoUtils} from "@/lib/utils/cryptoUtils";
import {FalAIEndpointID, falAIInputMapper} from "@/lib/falAIInputMapper";

export const imageServerAPI = {
    async postImage(
        imageGenPrompt: FluxPrompt,
        imageGenPromptSentence: string,
        subjectEntityManifestList: Entity[], // Sorted
        taskId: string,
        sceneNumber: number,
        falAiApiKey: string,
        userId: string,
        t2iAIModelEndpointId: string,
        i2iAIModelEndpointId: string,
        resolution: '720p' | '1080p' | '2160p',
        aspectRatio: '16:9' | '9:16',
    ): Promise<{ success: boolean; error?: { message: string; code: string } }> {
        const supabase = createSupabaseServiceRoleClient();

        try {
            const decryptedApiKey = cryptoUtils.decrypt(falAiApiKey, userId);
            
            const falAIClient = fal;
            falAIClient.config({
                credentials: decryptedApiKey
            });

            let resultImageUrlList: Array<ImageFile>;
            let imageUrl: string;

            const getSignedUrlPromiseList = subjectEntityManifestList.map(async (entity) => {
                return await this.getImageSignedUrl(`${taskId}/reference_image_${entity.id}.jpeg`);
            });
            const imageSignedUrlList = (await Promise.all(getSignedUrlPromiseList))
                .filter((url): url is string => !!url);

            // 실제로 유효한 URL이 있을 때만 I2I 분기
            const isSubjectExists = imageSignedUrlList.length !== 0;

            try {
                const modelEndpointId = isSubjectExists
                    ? i2iAIModelEndpointId
                    : t2iAIModelEndpointId;
                const imageModelInput = falAIInputMapper.buildImageInput(modelEndpointId as FalAIEndpointID, {
                    prompt: imageGenPromptSentence,
                    resolution: resolution,
                    aspectRatio: aspectRatio,
                    ...(isSubjectExists && { imageUrls: imageSignedUrlList }),
                })
                const output = await fal.subscribe(modelEndpointId, {
                    input: imageModelInput,
                });

                resultImageUrlList = output.data.images;
            } catch (error) {
                console.error(`Scene #${sceneNumber} Nano Banana Image generation Error: `, error);

                const isVertical = aspectRatio === '9:16';
                const width = resolution === '720p'
                    ? isVertical ? 720 : 1280
                    : isVertical ? 1080 : 1920;
                const height = resolution === '720p'
                    ? isVertical ? 1280 : 720
                    : isVertical ? 1920 : 1080;

                const modelName = isSubjectExists ? "fal-ai/flux-2/edit" : "fal-ai/flux-2"
                const output = await falAIClient.subscribe(modelName, {
                    input: {
                        prompt: JSON.stringify({
                            ...imageGenPrompt,
                            subjects: imageGenPrompt.subjects.map((subject) => {
                                return {
                                    type: subject.type,
                                    description: subject.description,
                                    pose: subject.pose,
                                    position: subject.position,
                                }
                            })
                        }, null, 1)
                            .replace(/\n\s*/g, ' ')
                            .replace("fNumber", "f-number"),
                        guidance_scale: 20,
                        num_inference_steps: 50,
                        image_size: {
                            width: width,
                            height: height,
                        },
                        num_images: 1,
                        acceleration: "none",
                        enable_prompt_expansion: false,
                        enable_safety_checker: false,
                        output_format: "jpeg",
                        ...(isSubjectExists && { image_urls: imageSignedUrlList }),
                    }
                });
                resultImageUrlList = output.data.images;
            }

            if (resultImageUrlList.length !== 0) {
                imageUrl = resultImageUrlList[0].url;
            } else {
                console.log("resultImageUrlList: ", JSON.stringify(resultImageUrlList));
                throw Error("Image generation failed.")
            }

            if (!imageUrl) {
                throw new Error("No image generated from Fal-AI");
            }

            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                 throw new Error(`Failed to fetch image from Fal-AI: ${imageResponse.statusText}`);
            }
            
            const arrayBuffer = await imageResponse.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);

            // Supabase Storage에 이미지 업로드
            const { error: uploadError } = await supabase.storage
                .from('scene_image_temp_storage') // 버킷 이름
                .upload(`${taskId}/${sceneNumber}.jpeg`, imageBuffer, {
                    contentType: 'image/jpeg', // 파일 포맷 지정
                    upsert: true // 덮어쓰기 허용
                });

            // imageBase64 지우는 것 고려하기
            if (uploadError) {
                // 업로드 실패 시, 에러를 던져서 전체 프로세스를 중단시킵니다.
                throw new Error(`Supabase Storage 업로드 실패: ${uploadError.message}`);
            }

            return {
                success: true,
            };
        } catch (error) {
            console.error('Image generation error:', error);
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error occurred',
                    code: 'INTERNAL_ERROR'
                }
            };
        }
    },

    async postReferenceImage(
        referenceImagePrompt: string,
        taskId: string,
        entityId: string,
        falAiApiKey: string,
        referenceImageAIModelEndpointId: string,
        userId: string,
    ): Promise<{
        success: boolean;
        error?: {
            code: string;
            message: string;
        }
    }> {
        const supabase = createSupabaseServiceRoleClient();

        try {
            const decryptedApiKey = cryptoUtils.decrypt(falAiApiKey, userId);
            
            fal.config({
                credentials: decryptedApiKey
            });

            let imageUrl: string;

            const imageModelInput = falAIInputMapper.buildImageInput(referenceImageAIModelEndpointId as FalAIEndpointID, {
                prompt: referenceImagePrompt,
                resolution: '720p',
                aspectRatio: '9:16',
            })
            const output = await fal.subscribe(referenceImageAIModelEndpointId, {
                input: imageModelInput,
            });

            const resultImageUrlList = output.data.images;

            if (resultImageUrlList.length !== 0) {
                imageUrl = resultImageUrlList[0].url;
            } else {
                console.log("resultImageUrlList: ", JSON.stringify(resultImageUrlList));
                throw Error("Image generation failed.")
            }

            if (!imageUrl) {
                throw new Error("No image generated from Fal-AI");
            }

            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image from Fal-AI: ${imageResponse.statusText}`);
            }

            const arrayBuffer = await imageResponse.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);

            // Supabase Storage에 이미지 업로드
            const { error: uploadError } = await supabase.storage
                .from('scene_image_temp_storage') // 버킷 이름
                .upload(`${taskId}/reference_image_${entityId}.jpeg`, imageBuffer, {
                    contentType: 'image/jpeg', // 파일 포맷 지정
                    upsert: true // 덮어쓰기 허용
                });

            // imageBase64 지우는 것 고려하기
            if (uploadError) {
                // 업로드 실패 시, 에러를 던져서 전체 프로세스를 중단시킵니다.
                throw new Error(`Supabase Storage 업로드 실패: ${uploadError.message}`);
            }

            return {
                success: true,
            };
        } catch (error) {
            console.error('Image generation error:', error);
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error occurred',
                    code: 'INTERNAL_ERROR',
                    status: (error && typeof error === 'object' && 'status' in error) ? (error as any).status : undefined
                }
            };
        }
    },

    async getImageSignedUrl(filePath: string) {
        const supabase = createSupabaseServiceRoleClient();

        const { data, error } = await supabase.storage
            .from('scene_image_temp_storage')
            .createSignedUrl(filePath, 60 * 60 * 24);

        if (error || !data?.signedUrl) {
            throw new Error(error?.message || `There is no image data.`);
        }

        return data.signedUrl;
    }
}