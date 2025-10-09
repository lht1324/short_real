import { NextRequest, NextResponse } from 'next/server';
import { imageServerAPI } from '@/api/server/imageServerAPI';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const taskId = searchParams.get('taskId');
        const sceneCountStr = searchParams.get('sceneCount');

        if (!taskId || !sceneCountStr) {
            return NextResponse.json(
                { error: 'taskId and sceneCount are required' },
                { status: 400 }
            );
        }

        const sceneCount = parseInt(sceneCountStr);

        if (isNaN(sceneCount) || sceneCount <= 0) {
            return NextResponse.json(
                { error: 'sceneCount must be a positive number' },
                { status: 400 }
            );
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

        return NextResponse.json({
            success: true,
            imageUrls: imageUrls
        });

    } catch (error) {
        console.error('Error in GET /api/image:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            },
            { status: 500 }
        );
    }
}