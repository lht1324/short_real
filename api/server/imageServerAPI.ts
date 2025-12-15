import Replicate from "replicate";
import {GenerateImagesResponse, GoogleGenAI, PersonGeneration} from "@google/genai";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";

export const imageServerAPI = {
    async postImage(
        imageGenPrompt: string,
        generationTaskId: string,
        sceneNumber: number,
        negativePrompt?: string
    ): Promise<{ success: boolean; error?: { message: string; code: string } }> {
        const supabase = createSupabaseServiceRoleClient();

        try {
            const replicate = new Replicate();

            const output = await replicate.run("bytedance/seedream-4.5", {
                input: {
                    prompt: imageGenPrompt,
                    size: '2K',
                    aspect_ratio: '9:16'
                },
            });

            // Replicate 결과(URL)에서 이미지 다운로드 및 Buffer 변환

            if (!Array.isArray(output) || (Array.isArray(output) && output.length === 0)) {
                throw new Error("Replicate output is invalid.");
            }

            const imageUrl = output[0].url();
            
            if (!imageUrl) {
                throw new Error("No image generated from Replicate");
            }

            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                 throw new Error(`Failed to fetch image from Replicate: ${imageResponse.statusText}`);
            }
            
            const arrayBuffer = await imageResponse.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);
            // // 환경 변수 GOOGLE_APPLICATION_CREDENTIALS를 설정했기 때문에 API 키는 필요 없습니다.
            // const project = process.env.GCP_PROJECT_ID; // 환경 변수
            // const location = 'us-central1'; // 사용하려는 리전
            //
            // if (!project) {
            //     return {
            //         success: false,
            //         error: {
            //             message: 'Google Cloud Project ID is not configured.',
            //             code: 'MISSING_PROJECT_ID'
            //         }
            //     };
            // }
            //
            // // Dev ONLY!!!!!!
            //
            // const isDev = process.env.NODE_ENV === 'development';
            // const credentials = isDev ? JSON.parse(process.env.GCP_CREDENTIALS_JSON!) : undefined;
            //
            // // 1. GoogleGenAI 클라이언트 초기화
            // const ai = new GoogleGenAI(({
            //     vertexai: true,
            //     project: project,
            //     location: location,
            //     // DEV ONLY!!!!!
            //     ...(isDev && credentials && {
            //         googleAuthOptions: {
            //             credentials: {
            //                 ...credentials,
            //                 private_key: credentials.private_key.replace(/\\n/g, '\n'),
            //             },
            //         }
            //     })
            // }))
            //
            // // 3. 이미지 생성 요청
            // const response: GenerateImagesResponse = await ai.models.generateImages({
            //     model: "imagen-4.0-generate-001",
            //     prompt: imageGenPrompt,
            //     config: {
            //         numberOfImages: 1,
            //         aspectRatio: "9:16",
            //         negativePrompt: negativePrompt,
            //         personGeneration: PersonGeneration.ALLOW_ALL,
            //         enhancePrompt: false,
            //     }
            // });
            //
            // if (!response || !response?.generatedImages || response?.generatedImages?.length === 0) {
            //     throw Error("No image generated from Imagen 4");
            // }
            //
            // // 4. 응답에서 이미지 데이터 추출
            // const generatedImageList = response.generatedImages;
            //
            // const imageBase64 = generatedImageList[0]?.image?.imageBytes;
            //
            // if (!imageBase64) {
            //     throw Error("Generated image is invalid.");
            // }

            // Base64 문자열을 Node.js의 Buffer 객체로 디코딩합니다.
            // const imageBuffer = Buffer.from(imageBase64, 'base64');

            // Supabase Storage에 이미지 업로드
            const { error: uploadError } = await supabase.storage
                .from('scene_image_temp_storage') // 버킷 이름
                .upload(`${generationTaskId}/${sceneNumber}.jpeg`, imageBuffer, {
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