import { NextRequest } from 'next/server';
import { imageServerAPI } from '@/api/server/imageServerAPI';
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const taskId = searchParams.get('taskId');
        const sceneCountStr = searchParams.get('sceneCount');

        if (!taskId || !sceneCountStr) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'taskId and sceneCount are required'
            });
        }

        const sceneCount = parseInt(sceneCountStr);

        if (isNaN(sceneCount) || sceneCount <= 0) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'sceneCount must be a positive number'
            });
        }

        // sceneNumber는 1부터 시작
        const imageUrlPromises = Array.from({ length: sceneCount }, async (_, index) => {
            const sceneNumber = index + 1;
            const filePath = `${taskId}/${sceneNumber}.jpeg`;
            try {
                const url = await imageServerAPI.getImageSignedUrl(filePath);
                return ({sceneNumber, url});
            } catch (error) {
                console.error(`Failed to get signed URL for scene ${sceneNumber}:`, error);
                return {sceneNumber, url: null};
            }
        });

        const imageResults = await Promise.all(imageUrlPromises);

        // URL만 추출 (null 제외)
        const imageUrls = imageResults.sort((a, b) => {
            return a.sceneNumber - b.sceneNumber;
        }).filter((result) => {
            return result.url !== null;
        }).map((result) => {
            return result.url;
        });

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                imageUrls: imageUrls
            },
            message: "Fetching image urls successfully."
        });

    } catch (error) {
        console.error('Error in GET /api/image:', error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
}