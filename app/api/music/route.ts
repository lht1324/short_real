import { NextRequest, NextResponse } from "next/server";
import { musicServerAPI } from "@/api/server/musicServerAPI";
import { BGMInfo, BGMType } from "@/api/types/supabase/BackgroundMusics";

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