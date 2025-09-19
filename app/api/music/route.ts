import {NextRequest, NextResponse} from "next/server";
import {musicServerAPI} from "@/api/server/musicServerAPI";
import {BGMInfo, BGMType} from "@/api/types/supabase/BackgroundMusics";
import {sunoAPIServerAPI} from "@/api/server/sunoAPIServerAPI";
import {PostGenerateRequest, SunoModelType} from "@/api/types/suno-api/SunoAPIRequests";

export async function GET(request: NextRequest) {
    try {
        // URL에서 type 파라미터 추출 (기본값: preview)
        const { searchParams } = new URL(request.url);
        const typeParam = searchParams.get('type') as BGMType;
        const bgmType = Object.values(BGMType).includes(typeParam) ? typeParam : BGMType.Preview;

        // 1. background_musics 테이블에서 음악 정보 조회
        const backgroundMusics = await musicServerAPI.getBackgroundMusics();
        
        if (backgroundMusics.length === 0) {
            return NextResponse.json({ bgmInfoList: [] });
        }

        // 2. 음악 제목을 가공해서 파일명 리스트 생성 (소문자-[type].mp3 형태)
        const fileNameList = backgroundMusics.map(music => 
            `${music.title.toLowerCase().replaceAll(" ", "_")}-${bgmType}.mp3`
        );

        // 3. 배치로 signed URL들 받아오기
        const signedUrlDataList = await musicServerAPI.getBackgroundMusicSignedUrls(fileNameList);

        // 4. BGMInfo 타입으로 매핑
        const bgmInfoList: BGMInfo[] = backgroundMusics.map((music, index) => {
            const signedUrlData = signedUrlDataList.find(
                urlData => urlData.path === fileNameList[index]
            );

            return {
                id: music.id,
                title: music.title,
                artist: music.artist,
                themes: music.themes,
                previewUrl: signedUrlData?.signedUrl || ''
            };
        });

        return NextResponse.json({ bgmInfoList });
    } catch (error) {
        console.error('Error in GET /api/music:', error);
        return NextResponse.json(
            { error: 'Failed to fetch background musics' },
            { status: 500 }
        );
    }
}

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

        const baseUrl = process.env.BASE_URL;

        const fullRequest: PostGenerateRequest = {
            prompt: prompt,
            style: style,
            title: title,
            customMode: true,
            instrumental: true,
            model: SunoModelType.V4,
            negativeTags: negativeTags,
            // styleWeight: styleWeight,
            // weirdnessConstraint: weirdnessConstraint,
            // audioWeight: audioWeight,
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