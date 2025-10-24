import {NextRequest, NextResponse} from "next/server";
import {sunoAPIServerAPI} from "@/api/server/sunoAPIServerAPI";
import {PostGenerateRequest, SunoModelType} from "@/api/types/suno-api/SunoAPIRequests";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";

export async function POST(request: NextRequest) {
    try {
        // URL에서 파라미터 추출
        const { searchParams } = new URL(request.url);
        const generationTaskId = searchParams.get('generationTaskId');

        if (!generationTaskId) {
            return NextResponse.json(
                { error: 'Missing required query param: generationTaskId' },
                { status: 400 }
            );
        }

        const {
            prompt,
            style,
            title,
            negativeTags,
            // styleWeight,
            // weirdnessConstraint,
            // audioWeight,
        }: Partial<PostGenerateRequest> = await request.json();

        // 필수 파라미터 검증
        if (!prompt || !style || !title) {
            return NextResponse.json(
                { error: 'Missing required parameters: prompt, style, title' },
                { status: 400 }
            );
        }

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(generationTaskId, VideoGenerationTaskStatus.COMPOSING_MUSIC);

        const baseUrl = process.env.BASE_URL;

        const fullRequest: PostGenerateRequest = {
            prompt: prompt,
            style: style,
            title: title,
            customMode: true,
            instrumental: true,
            model: SunoModelType.V4_5,
            styleWeight: 0.65,
            weirdnessConstraint: 0.65,
            audioWeight: 0.65,
            callBackUrl: `${baseUrl}/webhook/suno-api?generationTaskId=${generationTaskId}`,
        }

        // Suno API를 통한 음악 생성 요청
        const result = await sunoAPIServerAPI.postGenerate(fullRequest);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in POST /api/music:', error);
        return NextResponse.json(
            { error: 'Failed to generate music' },
            { status: 500 }
        );
    }
}