import {Composition} from 'remotion';
import SceneBlock from '@/components/remotion/SceneBlock';
import {REMOTION_DEFAULT_FPS, RemotionSceneInput} from '@/components/remotion/remotionTypes';

const DEFAULT_SCENE_INPUT_PROPS: RemotionSceneInput = {
    isCaptionEnabled: true,
    scene: {
        sceneNumber: 1,
        startSec: 0,
        videoUrl: null,
        voiceUrl: null,
        speedMultiplier: 1.0,
    },
    captionSegments: [
        { word: 'Hello', startSec: 0.0, endSec: 0.5 },
        { word: 'World', startSec: 0.5, endSec: 1.0 },
    ],
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
};

export function RemotionRoot() {
    return (
        <>
            <Composition
                id="RemotionScene"
                component={SceneBlock}
                durationInFrames={150}
                fps={REMOTION_DEFAULT_FPS}
                width={1080}
                height={1920}
                defaultProps={DEFAULT_SCENE_INPUT_PROPS}
            />
        </>
    );
}