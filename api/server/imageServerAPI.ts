import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {fal} from "@fal-ai/client";
import {FluxPrompt} from "@/api/types/open-ai/FluxPrompt";

export const imageServerAPI = {
    async postImage(
        imageGenPrompt: FluxPrompt,
        taskId: string,
        sceneNumber: number,
    ): Promise<{ success: boolean; error?: { message: string; code: string } }> {
        const supabase = createSupabaseServiceRoleClient();

        try {
            const falAIClient = fal;
            falAIClient.config({
                credentials: process.env.FAL_AI_API_KEY!
            });

            const output = await falAIClient.subscribe('fal-ai/flux-2', {
                input: {
                    prompt: JSON.stringify(imageGenPrompt, null, 1)
                        .replace(/\n\s*/g, ' ')
                        .replace("fNumber", "f-number"),
                    guidance_scale: 20,
                    num_inference_steps: 50,
                    image_size: "portrait_16_9",
                    num_images: 1,
                    acceleration: "none",
                    enable_prompt_expansion: false,
                    enable_safety_checker: false,
                    output_format: "jpeg"
                }
            });

            const resultImageUrlList = output.data.images;
            let imageUrl: string;

            if (resultImageUrlList.length !== 0) {
                imageUrl = output.data.images[0].url;
            } else {
                throw Error("Flux 2 generation failed.")
            }

            if (!imageUrl) {
                throw new Error("No image generated from Replicate");
            }

            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                 throw new Error(`Failed to fetch image from Replicate: ${imageResponse.statusText}`);
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