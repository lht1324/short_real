import {useMemo} from 'react';
import {Audio, Loop, useVideoConfig, Video} from 'remotion';
import {RemotionSceneInput} from '@/components/remotion/remotionTypes';
import CaptionLayer from '@/components/remotion/CaptionLayer';

// Remotion Composition/Player의 component prop은 Props 추론이 불가한 구조(유니언 제네릭)라
// Record<string, unknown> 수용형으로 선언 후 내부에서 타입 캐스팅한다.
function SceneBlock(props: Record<string, unknown>) {
    const {
        isCaptionEnabled,
        scene,
        captionSegments,
        captionStyle,
    } = props as unknown as RemotionSceneInput;

    const speedMultiplier = scene.speedMultiplier || 1.0;
    const {durationInFrames} = useVideoConfig();

    // 캡션 절대 시간 타임스탬프 -> 씬 로컬 시간 변환 (UI 미리보기/서버 렌더링 동일 경로)
    const localCaptionSegments = useMemo(() => {
        return captionSegments.map((segment) => {
            return {
                ...segment,
                startSec: (segment.startSec - scene.startSec) / speedMultiplier,
                endSec: (segment.endSec - scene.startSec) / speedMultiplier,
            };
        });
    }, [captionSegments, scene.startSec, speedMultiplier]);

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#000000',
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            {/* 씬 배경 영상. mute: 보이스(voiceUrl)를 단일 오디오 소스로 사용하기 위함 */}
            {scene.videoUrl && (
                <Loop durationInFrames={durationInFrames}>
                    <Video
                        src={scene.videoUrl}
                        playbackRate={speedMultiplier}
                        muted={true}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            pointerEvents: 'none',
                        }}
                    />
                </Loop>
            )}

            {/* 씬 나레이션 보이스 */}
            {scene.voiceUrl && (
                <Audio src={scene.voiceUrl} playbackRate={speedMultiplier} />
            )}

            <CaptionLayer
                captionSegments={localCaptionSegments}
                captionStyle={captionStyle}
                isCaptionEnabled={isCaptionEnabled}
            />
        </div>
    );
}

export default SceneBlock;