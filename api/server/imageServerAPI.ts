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
            // 환경 변수 GOOGLE_APPLICATION_CREDENTIALS를 설정했기 때문에 API 키는 필요 없습니다.
            const project = process.env.GCP_PROJECT_ID; // 환경 변수
            const location = 'us-central1'; // 사용하려는 리전

            if (!project) {
                return {
                    success: false,
                    error: {
                        message: 'Google Cloud Project ID is not configured.',
                        code: 'MISSING_PROJECT_ID'
                    }
                };
            }
            // 1. GoogleGenAI 클라이언트 초기화
            const ai = new GoogleGenAI(({
                vertexai: true,
                project: project,
                location: location,
            }))

            // 3. 이미지 생성 요청
            const response: GenerateImagesResponse = await ai.models.generateImages({
                model: "imagen-4.0-generate-001",
                prompt: imageGenPrompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: "9:16",
                    negativePrompt: negativePrompt,
                    personGeneration: PersonGeneration.ALLOW_ALL
                }
            });

            if (!response || !response?.generatedImages || response?.generatedImages?.length === 0) {
                throw Error("No image generated from Imagen 4");
            }

            // 4. 응답에서 이미지 데이터 추출
            const generatedImageList = response.generatedImages;

            const imageBase64 = generatedImageList[0]?.image?.imageBytes;

            if (!imageBase64) {
                throw Error("Generated image is invalid.");
            }

            // Base64 문자열을 Node.js의 Buffer 객체로 디코딩합니다.
            const imageBuffer = Buffer.from(imageBase64, 'base64');

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