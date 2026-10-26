import {r2ServerAPI} from "@/lib/r2";
import {fal} from "@fal-ai/client";
import {FluxPrompt} from "@/lib/api/types/open-ai/FluxPrompt";
import {ImageFile} from "@fal-ai/client/endpoints";
import {Entity} from "@/lib/api/types/open-ai/Entity";
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
    ): Promise<{ success: boolean; error?: { message: string; code: string; status?: number } }> {
        try {
            const decryptedApiKey = cryptoUtils.decrypt(falAiApiKey, userId);
            
            const falAIClient = fal;
            falAIClient.config({
                credentials: decryptedApiKey
            });

            let resultImageUrlList: Array<ImageFile>;
            let imageUrl: string;

            const getSignedUrlPromiseList = subjectEntityManifestList.map(async (entity) => {
                console.log(`${userId}/${taskId}/reference_image_${entity.id}.jpeg`)
                return await this.getImageSignedUrl(`${userId}/${taskId}/reference_image_${entity.id}.jpeg`);
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

            // R2(scene_image_temp_storage 폴더)에 이미지 업로드 — putObject는 upsert 고정
            await r2ServerAPI.putObject(
                `scene_image_temp_storage/${userId}/${taskId}/${sceneNumber}.jpeg`,
                imageBuffer,
                'image/jpeg',
            );

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
            status?: number;
        }
    }> {
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

            // R2(scene_image_temp_storage 폴더)에 이미지 업로드 — putObject는 upsert 고정
            await r2ServerAPI.putObject(
                `scene_image_temp_storage/${userId}/${taskId}/reference_image_${entityId}.jpeg`,
                imageBuffer,
                'image/jpeg',
            );

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
        // R2(scene_image_temp_storage 폴더) 서명 URL — Supabase 24시간 계약 유지
        return r2ServerAPI.presignGet(`scene_image_temp_storage/${filePath}`, 60 * 60 * 24);
    }
}