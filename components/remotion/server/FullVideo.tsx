import {useMemo} from 'react';
import {AbsoluteFill, Audio, OffthreadVideo, Sequence, useVideoConfig} from 'remotion';
import {RemotionFullVideoInput} from '@/components/remotion/remotionTypes';
import CaptionLayer from '@/components/remotion/CaptionLayer';

const BGM_FADE_SEC = 0.9;

/**
 * 전체 영상 컴포지션 Input 기반 최종 프레임 수 계산 (렌더 스크립트/태스크에서 사용)
 * FullVideo 내부 sceneTimings와 동일한 반올림 로직을 유지해야 한다.
 */
export function getFullVideoDurationInFrames(input: RemotionFullVideoInput): number {
    let totalFrames = 0;
    for (const scene of input.scenes) {
        const sceneDurationSec = (scene.endSec ?? scene.startSec) - scene.startSec;
        totalFrames += Math.max(1, Math.round(sceneDurationSec / scene.speedMultiplier * input.fps));
    }
    return totalFrames;
}

// Composition/Player의 component prop은 Props 추론이 불가한 구조(유니언 제네릭)라
// Record<string, unknown> 수용형으로 선언 후 내부에서 타입 캐스팅한다.
function FullVideo(props: Record<string, unknown>) {
    const input = props as unknown as RemotionFullVideoInput;

    const {fps} = useVideoConfig();

    // 배속 반영 실제 시작 프레임 및 길이 계산 (클라이언트 sceneRealStartTimes와 동일 로직)
    const sceneTimings = useMemo(() => {
        let realFrame = 0;
        return input.scenes.map((scene) => {
            const sceneDurationSec = (scene.endSec ?? scene.startSec) - scene.startSec;
            const frames = Math.max(1, Math.round(sceneDurationSec / scene.speedMultiplier * fps));
            const timing = {
                sceneNumber: scene.sceneNumber,
                startFrame: realFrame,
                frames: frames,
            };
            realFrame += frames;
            return timing;
        });
    }, [input.scenes, fps]);

    // BGM 볼륨 램프 (0.9초 페이드 인/아웃, 기존 afade 필터와 동일)
    const bgmVolumeRamp = useMemo(() => {
        if (!input.bgm || input.bgm.volume <= 0) {
            return null;
        }

        const totalSec = input.bgm.endSec - input.bgm.startSec;

        return (frame: number): number => {
            const sec = frame / fps;
            const volume = input.bgm!.volume;

            if (sec < BGM_FADE_SEC) {
                return (sec / BGM_FADE_SEC) * volume;
            }
            if (sec > totalSec - BGM_FADE_SEC) {
                return Math.max(0, (totalSec - sec) / BGM_FADE_SEC) * volume;
            }
            return volume;
        };
    }, [input.bgm, fps]);

    if (input.scenes.length === 0) {
        return null;
    }

    return (
        <AbsoluteFill
            style={{
                backgroundColor: '#000000',
            }}
        >
            {/* 씬별 타임라인 (배속 반영) */}
            {input.scenes.map((scene, index) => {
                const timing = sceneTimings[index];
                const caption = input.captions.find((c) => c.sceneNumber === scene.sceneNumber);

                // 클라이언트 미리보기(processed 기반)와의 호환: optional 필드 기본값
                const videoPlaybackRate = scene.videoPlaybackRate ?? scene.speedMultiplier;
                const videoTrimBeforeSec = scene.videoTrimBeforeSec ?? 0;
                const sceneEndSec = scene.endSec ?? scene.startSec;

                // 캡션 절대 시간 타임스탬프 -> 씬 로컬 시간 변환 (SceneBlock과 동일 경로)
                const localCaptionSegments = (caption?.segments ?? []).map((segment) => {
                    return {
                        ...segment,
                        startSec: (segment.startSec - scene.startSec) / scene.speedMultiplier,
                        endSec: (segment.endSec - scene.startSec) / scene.speedMultiplier,
                    };
                });

                return (
                    <Sequence
                        key={scene.sceneNumber}
                        from={timing.startFrame}
                        durationInFrames={timing.frames}
                        name={`Scene ${scene.sceneNumber}`}
                    >
                        {/* 씬 영상: raw + 합성 배율(1차×2차) + 앞 0.2초 트림.
                            mute: 음성(voiceUrl)을 단일 오디오 소스로 사용하기 위함 */}
                        {scene.videoUrl && (
                            <OffthreadVideo
                                src={scene.videoUrl}
                                playbackRate={videoPlaybackRate}
                                trimBefore={Math.round(videoTrimBeforeSec * fps)}
                                muted={true}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    pointerEvents: 'none',
                                }}
                            />
                        )}

                        {/* 나레이션: voice_full을 씬 구간으로 트림 + 2차 배속(피치 보존).
                            trimBefore/trimAfter는 미디어 시작 기준 [시작, 종료] 재생 구간 (기존 atrim start/end와 동일).
                            음성이 이미 끝난 씬(voiceDurationSec <= startSec)은 재생할 구간이 없어 Audio 생략 */}
                        {input.voiceUrl && input.voiceDurationSec > scene.startSec && (
                            <Audio
                                src={input.voiceUrl}
                                trimBefore={Math.round(scene.startSec * fps)}
                                trimAfter={Math.round(Math.min(sceneEndSec, input.voiceDurationSec) * fps)}
                                playbackRate={scene.speedMultiplier}
                            />
                        )}

                        <CaptionLayer
                            captionSegments={localCaptionSegments}
                            captionStyle={input.captionStyle}
                            isCaptionEnabled={input.isCaptionEnabled}
                        />
                    </Sequence>
                );
            })}

            {/* BGM: 구간 트림 + 볼륨 램프 */}
            {input.bgm?.audioUrl && input.bgm.volume > 0 && (
                <Sequence from={0}>
                    <Audio
                        src={input.bgm.audioUrl}
                        trimBefore={Math.round(Math.min(input.bgm.startSec, input.bgm.durationSec) * fps)}
                        trimAfter={Math.round(Math.min(input.bgm.endSec, input.bgm.durationSec) * fps)}
                        volume={bgmVolumeRamp ?? input.bgm.volume}
                    />
                </Sequence>
            )}
        </AbsoluteFill>
    );
}

export default FullVideo;
