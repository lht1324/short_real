import {Composition} from 'remotion';
import FullVideo from '@/components/remotion/server/FullVideo';
import {REMOTION_DEFAULT_FPS, RemotionFullVideoInput} from '@/components/remotion/remotionTypes';

/**
 * 서버 렌더링 전용 엔트리 컴포지션.
 * durationInFrames는 렌더 스크립트가 inputProps 기반으로 덮어쓴다 (정적 더미값 유지).
 */
const DEFAULT_FULL_VIDEO_INPUT_PROPS: RemotionFullVideoInput = {
    isCaptionEnabled: true,
    width: 1080,
    height: 1920,
    fps: REMOTION_DEFAULT_FPS,
    scenes: [],
    voiceUrl: null,
    voiceDurationSec: 0,
    captions: [],
    captionStyle: {
        fontFamilyName: 'Poppins',
        fontSize: 72,
        fontWeight: 900,
        captionPosition: 80,
        captionChunkSize: 'auto',
        captionAnimation: 'pop',
        activeColor: '#FFFFFF',
        inactiveColor: '#AAAAAA',
        activeOutlineColor: '#000000',
        inactiveOutlineColor: '#000000',
        activeOutlineThickness: 50,
        inactiveOutlineThickness: 50,
        isActiveOutlineEnabled: true,
        isInactiveOutlineEnabled: true,
    },
    bgm: null,
};

export function FullVideoRoot() {
    return (
        <Composition
            id="FullVideo"
            component={FullVideo}
            durationInFrames={1}
            fps={REMOTION_DEFAULT_FPS}
            width={1080}
            height={1920}
            defaultProps={DEFAULT_FULL_VIDEO_INPUT_PROPS}
        />
    );
}
