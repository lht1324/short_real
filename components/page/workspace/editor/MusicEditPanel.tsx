import {ChangeEvent, memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useWavesurfer} from "@wavesurfer/react";
import RegionsPlugin, {Region} from "wavesurfer.js/plugins/regions";
import {Pause, Play, Volume2, VolumeX} from "lucide-react";
import {MusicData} from "@/api/types/supabase/VideoGenerationTasks";
import {audioBufferToWavBlob, renderSymmetricWave} from "@/utils/audioUtils";
import type {WaveSurferOptions} from "wavesurfer.js";
import {Property} from "csstype";
import WritingMode = Property.WritingMode;
import {MusicPlayConfig} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";

export enum WaveRenderMode {
    OVERVIEW = 'overview',
    DETAIL = 'detail'
}

interface MusicEditPanelProps {
    musicData: MusicData;
    videoDuration: number;
    panelHeight: number;
    onChangeMusicStartSec: (newStartSec: number) => void;
    onChangeMusicVolume: (newVolume: number) => void;
}

function MusicEditPanel({
    musicData,
    videoDuration,
    panelHeight,
    onChangeMusicStartSec,
    onChangeMusicVolume,
}: MusicEditPanelProps) {
    const overviewContainerRef = useRef<HTMLDivElement | null>(null);
    const detailContainerRef = useRef<HTMLDivElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const volumeRef = useRef<number>(100.0 / 100.0); // range: 0 ~ 1
    const isClickingOverviewWaveRef = useRef(false);

    const [startTime, setStartTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // 로딩 상태
    const [isOverviewReady, setIsOverviewReady] = useState(false);
    const [isDetailReady, setIsDetailReady] = useState(false);

    // Regions 플러그인 (useMemo로 안정화)
    const overviewRegionsPlugin = useMemo(() => RegionsPlugin.create(), []);
    const detailRegionsPlugin = useMemo(() => RegionsPlugin.create(), []);

    // Plugins 배열도 안정화 (매 렌더마다 새 배열 생성 방지)
    const overviewPlugins = useMemo(() => [overviewRegionsPlugin], [overviewRegionsPlugin]);
    const detailPlugins = useMemo(() => [detailRegionsPlugin], [detailRegionsPlugin]);

    const symmetricWaveRenderFunction = useCallback((
        channels: (Float32Array | number[])[],
        context: CanvasRenderingContext2D,
        color: string,
        mode: WaveRenderMode = WaveRenderMode.OVERVIEW
    ) => {
        return renderSymmetricWave(channels, context, color, mode);
    }, []);

    const overviewWaveRenderFunction = useCallback((channels: (Float32Array | number[])[], ctx: CanvasRenderingContext2D) => {
        return symmetricWaveRenderFunction(channels, ctx, 'rgba(168, 85, 247, 0.5)', WaveRenderMode.OVERVIEW);
    }, [symmetricWaveRenderFunction]);

    const detailWaveRenderFunction = useCallback((channels: (Float32Array | number[])[], ctx: CanvasRenderingContext2D) => {
        return symmetricWaveRenderFunction(channels, ctx, 'rgba(168, 85, 247, 0.5)', WaveRenderMode.DETAIL);
    }, [symmetricWaveRenderFunction]);

    // Overview 설정
    const overviewOption = useMemo(() => {
        return {
            container: overviewContainerRef,
            url: musicData.audioUrl,
            waveColor: 'rgba(168, 85, 247, 0.5)', // 보라색: 아직 재생 안된 부분
            progressColor: 'rgba(236, 72, 153, 0.85)',
            cursorColor: 'rgba(236, 72, 153, 1)',
            height: 'auto' as const,
            normalize: false,
            interact: true, // 클릭으로 Region 이동 가능
            sampleRate: 48000,
            backend: "WebAudio" as const,
            renderFunction: overviewWaveRenderFunction, // 대칭 렌더링
            plugins: overviewPlugins,
        }
    }, [musicData.audioUrl, overviewPlugins, overviewWaveRenderFunction]);

    // Detail 설정
    const detailOption = useMemo(() => {
        return {
            container: detailContainerRef,
            // url: musicData.audioUrl, ← 이 줄 삭제 (peaks로 파형만 그림)
            waveColor: 'rgba(168, 85, 247, 0.5)',
            progressColor: 'rgba(236, 72, 153, 0.85)',
            cursorColor: 'rgba(236, 72, 153, 1)',
            cursorWidth: 2,
            height: 'auto' as const,
            hideScrollbar: true,
            normalize: false,
            interact: true,
            autoScroll: false,
            fillParent: true, // ← 컨테이너에 꽉 채움
            renderFunction: detailWaveRenderFunction,
            plugins: detailPlugins,
        };
    }, [detailPlugins, detailWaveRenderFunction]);
    
    // Overview 파형
    const { wavesurfer: overviewWavesurfer } = useWavesurfer(overviewOption);

    // Detail 파형 (확대된 뷰)
    const { wavesurfer: detailWavesurfer } = useWavesurfer(detailOption);

    const originalAudioBuffer = useMemo(() => {
        if (!overviewWavesurfer || !isOverviewReady) return null;

        return overviewWavesurfer.getDecodedData();
    }, [overviewWavesurfer, isOverviewReady]);

    const focusedAudioBufferData = useMemo(() => {
        if (!originalAudioBuffer) return null;

        const musicDuration = originalAudioBuffer.duration;
        const regionLength = Math.min(videoDuration, musicDuration);
        const regionStart = startTime;
        const regionEnd = Math.min(regionStart + regionLength, musicDuration);

        const sampleRate = originalAudioBuffer.sampleRate;
        const startSample = Math.floor(regionStart * sampleRate);
        const endSample = Math.floor(regionEnd * sampleRate);

        if (endSample <= startSample) return null;

        // ✅ subarray로 참조만 (복사 없음)
        const peaks = [];
        for (let channel = 0; channel < originalAudioBuffer.numberOfChannels; channel++) {
            const channelData = originalAudioBuffer.getChannelData(channel);
            peaks.push(channelData.subarray(startSample, endSample));
        }

        return {
            peaks: peaks,
            duration: (endSample - startSample) / sampleRate,
            startOffset: regionStart,
            endOffset: regionEnd,
        };
    }, [originalAudioBuffer, startTime, videoDuration]);

    const playBetween = useCallback(async (start: number, end: number) => {
        if (!overviewWavesurfer) return;

        overviewWavesurfer.setTime(start);
        await overviewWavesurfer.play();

        // ✅ media.stopAt 제거 (finish 이벤트 차단 방지)
        // overviewWavesurfer.media.stopAt(end);
    }, [overviewWavesurfer]);

    // 볼륨 조절
    const onChangeVolume = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        volumeRef.current = newVolume;
        if (overviewWavesurfer) overviewWavesurfer.setVolume(newVolume);
    }, [overviewWavesurfer]);

    const onToggleMute = useCallback(() => {
        setIsMuted((prev) => {
            const newIsMuted = !prev;

            setVolume(newIsMuted ? 0 : volumeRef.current);
            overviewWavesurfer?.setMuted(newIsMuted);
            return newIsMuted;
        });
    }, [overviewWavesurfer]);

    // Overview Wavesurfer 준비 완료 체크
    useEffect(() => {
        if (!overviewWavesurfer) return;

        const onReady = () => {
            setIsOverviewReady(true);
        };

        if (overviewWavesurfer.getDuration() > 0) {
            setIsOverviewReady(true);
        } else {
            overviewWavesurfer.once('ready', onReady);
        }

        return () => {
            overviewWavesurfer.un('ready', onReady);
        };
    }, [overviewWavesurfer]);

    // Detail Wavesurfer 준비 완료 체크 - load() 완료 시마다 체크
    useEffect(() => {
        if (!detailWavesurfer) return;

        const onReady = () => {
            console.log("Detail ready!");
            setIsDetailReady(true);
        };

        // ready 이벤트 리스너 등록
        detailWavesurfer.on('ready', onReady);

        return () => {
            detailWavesurfer.un('ready', onReady);
        };
    }, [detailWavesurfer]);
    
    // Overview 파형 Region 설정 및 동기화
    useEffect(() => {
        if (!overviewWavesurfer || !isOverviewReady || !overviewRegionsPlugin) return;

        const musicDuration = overviewWavesurfer.getDuration();
        const regionLength = Math.min(videoDuration, musicDuration);

        // 기존 Region 제거
        overviewRegionsPlugin.clearRegions();

        // Region 추가 (videoDuration 길이, 드래그만 가능)
        const region: Region = overviewRegionsPlugin.addRegion({
            start: 0,
            end: regionLength,
            color: 'rgba(236, 72, 153, 0.3)',
            drag: true,
            resize: false,
        });
        
        // Region 드래그 중 실시간 경계 체크 및 Detail View 업데이트
        const handleUpdate = () => {
            console.log("handleUpdate");
            const regionStart = region.start;
            const regionEnd = region.end;

            if (regionStart <= 0) {
                region.setOptions({
                    start: 0,
                    end: regionLength,
                });
                setStartTime(0);
            }
            // 오른쪽 경계 체크 - musicDuration을 넘으면 끝으로
            else if (regionEnd >= musicDuration) {
                region.setOptions({
                    start: musicDuration - regionLength,
                    end: musicDuration,
                });
                setStartTime(musicDuration - regionLength);
            }
            // 정상 범위 - 실시간 업데이트
            else {
                setStartTime(regionStart);
            }
        };

        // 드래그 완료 시 startTime 업데이트
        const handleUpdateEnd = async () => {
            console.log("handleUpdateEnd");
            const wasPlaying = overviewWavesurfer.isPlaying();

            const regionStart = region.start;
            const regionEnd = region.end;

            // 최종 경계 체크 및 startTime 업데이트
            if (regionStart <= 0) {
                region.setOptions({
                    start: 0,
                    end: regionLength,
                });
                setStartTime(0);
            }
            // 오른쪽 경계 체크 - musicDuration을 넘으면 끝으로
            else if (regionEnd >= musicDuration) {
                region.setOptions({
                    start: musicDuration - regionLength,
                    end: musicDuration,
                });
                setStartTime(musicDuration - regionLength);
            }
            // 정상 범위 - 실시간 업데이트
            else {
                setStartTime(regionStart);
            }

            if (wasPlaying) {
                const finalStart = Math.max(0, Math.min(region.start, musicDuration - regionLength));
                const finalEnd = finalStart + regionLength;

                // 기존 재생 중지 후 새 구간에서 재생
                overviewWavesurfer.pause();
                await overviewWavesurfer.play(finalStart, finalEnd);
            }
        };
        
        const handleClick = (relativeX: number) => {
            console.log("handleClick");
            const clickedTime = relativeX * musicDuration;

            let newStart = clickedTime - (regionLength / 2);

            if (newStart < 0) {
                newStart = 0;
            } else if (newStart + regionLength > musicDuration) {
                newStart = musicDuration - regionLength;
            }

            region.setOptions({
                start: newStart,
                end: newStart + regionLength,
            });

            // ✅ 플래그 설정 (timeupdate가 간섭하지 못하도록)
            isClickingOverviewWaveRef.current = true;

            setStartTime(newStart);
            overviewWavesurfer.setTime(newStart);

            if (detailWavesurfer && isDetailReady) {
                detailWavesurfer.setTime(0);
            }

            // ✅ 짧은 딜레이 후 플래그 해제
            setTimeout(() => {
                isClickingOverviewWaveRef.current = false;
            }, 100);
        };

        region.on('update', handleUpdate);
        region.on('update-end', handleUpdateEnd);
        overviewWavesurfer.on('click', handleClick);

        return () => {
            region.un('update', handleUpdate);
            region.un('update-end', handleUpdateEnd);
            overviewWavesurfer.un('click', handleClick);
        };
    }, [overviewWavesurfer, isOverviewReady, overviewRegionsPlugin, videoDuration, detailWavesurfer, isDetailReady]);

    // // Detail 파형 Region 설정 및 동기화 (Region 범위만 슬라이싱하여 표시)
    useEffect(() => {
        if (!detailWavesurfer || !focusedAudioBufferData) return;

        // ✅ setIsDetailReady(false) 제거

        detailWavesurfer.load('', focusedAudioBufferData.peaks, focusedAudioBufferData.duration)
            .then(() => {
                console.log("Detail peaks loaded");
                setIsDetailReady(true); // 첫 로드 시에만 true로
            });

    }, [detailWavesurfer, focusedAudioBufferData]);

    // Detail 클릭 시 Overview 위치 조절
    useEffect(() => {
        if (!detailWavesurfer || !isDetailReady || !overviewWavesurfer) return;
        if (!focusedAudioBufferData) return;

        const handleDetailClick = (relativeX: number) => {
            console.log("Detail click:", relativeX);

            // ✅ Detail의 상대적 위치를 Overview의 절대 위치로 변환
            const detailDuration = focusedAudioBufferData.duration;
            const clickedTimeInDetail = relativeX * detailDuration;
            const absoluteTime = focusedAudioBufferData.startOffset + clickedTimeInDetail;

            console.log(`Clicked at ${absoluteTime.toFixed(2)}s`);

            // ✅ Overview의 재생 위치 변경 (이게 전부!)
            overviewWavesurfer.setTime(absoluteTime);
        };

        detailWavesurfer.on('click', handleDetailClick);

        return () => {
            detailWavesurfer.un('click', handleDetailClick);
        };
    }, [detailWavesurfer, isDetailReady, overviewWavesurfer, focusedAudioBufferData]);


    // Overview와 Detail 커서 동기화 + 반복 재생
    useEffect(() => {
        if (!overviewWavesurfer || !isOverviewReady || !focusedAudioBufferData) return;
        if (!detailWavesurfer || !isDetailReady) return; // ✅ Detail도 필요
        
        const handleTimeUpdate = (currentTime: number) => {
            // ✅ 클릭 직후에는 timeupdate 무시
            if (isClickingOverviewWaveRef.current) return;

            const { startOffset, endOffset } = focusedAudioBufferData;

            if (currentTime >= startOffset && currentTime < endOffset) {
                const relativeTime = currentTime - startOffset;
                detailWavesurfer.setTime(relativeTime);
            }

            if (currentTime >= endOffset) {
                overviewWavesurfer.setTime(startOffset);
                detailWavesurfer.setTime(0);
            }
        };

        overviewWavesurfer.on('timeupdate', handleTimeUpdate);

        return () => {
            overviewWavesurfer.un('timeupdate', handleTimeUpdate);
        };
    }, [overviewWavesurfer, detailWavesurfer, isOverviewReady, isDetailReady, focusedAudioBufferData]);

    // 재생/일시정지 토글
    const onClickPlayPause = useCallback(async () => {
        if (!overviewWavesurfer || !focusedAudioBufferData) return;

        if (!overviewWavesurfer.isPlaying()) {
            const regionStart = focusedAudioBufferData.startOffset;
            const regionEnd = focusedAudioBufferData.endOffset;
            const currentTime = overviewWavesurfer.getCurrentTime();

            if (currentTime >= regionStart && currentTime < regionEnd) {
                await overviewWavesurfer.play();
            } else {
                await playBetween(
                    focusedAudioBufferData.startOffset,
                    focusedAudioBufferData.endOffset
                );
            }
        } else {
            overviewWavesurfer.pause();
        }
    }, [overviewWavesurfer, focusedAudioBufferData, playBetween]);

    // 컴포넌트 마운트 시 AudioContext 생성
    useEffect(() => {
        audioContextRef.current = new AudioContext();
        return () => {
            audioContextRef.current?.close();
        };
    }, []);

    // musicData 변경 시 초기화
    useEffect(() => {
        // 재생 중이면 정지
        if (overviewWavesurfer?.isPlaying()) {
            overviewWavesurfer.pause();
        }
        if (detailWavesurfer?.isPlaying()) {
            detailWavesurfer.pause();
        }

        // state 초기화
        setStartTime(0);
        setIsOverviewReady(false);
        setIsDetailReady(false);

        overviewWavesurfer?.setTime(0);
        detailWavesurfer?.setTime(0);

        // region 클리어
        overviewRegionsPlugin.clearRegions();
        detailRegionsPlugin.clearRegions();

    }, [musicData.audioUrl, overviewWavesurfer, detailWavesurfer, overviewRegionsPlugin, detailRegionsPlugin]);

    useEffect(() => {
        onChangeMusicStartSec(startTime);
    }, [startTime, onChangeMusicStartSec]);

    useEffect(() => {
        onChangeMusicVolume(volume);
    }, [volume, onChangeMusicVolume]);

    return (
        <div
            className="relative bg-gray-900/30 backdrop-blur-sm border-t border-purple-500/20 flex"
            style={{ height: `${panelHeight}px` }}
        >
            {/* 왼쪽: Wave 패널 */}
            <div className="flex-1 flex flex-col p-2 gap-2">
                {/* Overview 파형 */}
                <div className="relative flex-[0.35] bg-gray-800/50 border border-purple-500/30 rounded-lg overflow-hidden">
                    <div ref={overviewContainerRef} className="h-full" />
                    {/*<div ref={overviewContainerRef} />*/}
                </div>

                {/* Detail 파형 */}
                <div className="relative flex-[0.65] bg-gray-800/50 border border-purple-500/30 rounded-lg overflow-hidden">
                    <div ref={detailContainerRef} className="h-full overflow-x-auto" />
                    {/*<div ref={detailContainerRef} />*/}
                    <button
                        onClick={onClickPlayPause}
                        disabled={!isDetailReady}
                        className="absolute top-2 left-2 p-1.5 text-white bg-purple-600/80 rounded-md hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors z-10"
                    >
                        {overviewWavesurfer?.isPlaying() ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                </div>
            </div>

            {/* 오른쪽: 볼륨 슬라이더 */}
            <div className="w-20 flex flex-col items-center justify-center p-2 border-l border-purple-500/30">
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={onChangeVolume}
                    className="accent-purple-500"
                    style={{
                        writingMode: 'bt-lr' as WritingMode,
                        WebkitAppearance: 'slider-vertical',
                        height: '70%',
                        width: '8px'
                    }}
                />
                {/* 볼륨 퍼센트 + 뮤트 버튼 (가로 배치) */}
                <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm text-purple-300">
                        {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
                    </span>
                    <button
                        onClick={onToggleMute}
                        className="p-0.5 rounded hover:bg-purple-600/20 transition-all"
                        title={isMuted ? "Mute" : "Unmute"}
                    >
                        {isMuted ? (
                            <VolumeX size={16} className="text-purple-400" />
                        ) : (
                            <Volume2 size={16} className="text-purple-400" />
                        )}
                    </button>
                </div>
            </div>

            {/* 로딩 오버레이 */}
            {(!isOverviewReady || !isDetailReady) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm z-50">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                        <p className="text-white text-sm">Loading Music data...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(MusicEditPanel);