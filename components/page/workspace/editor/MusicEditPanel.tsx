import {ChangeEvent, memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import Peaks, {PeaksInstance, PeaksOptions} from "peaks.js";
import {Pause, Play, Volume2, VolumeX} from "lucide-react";
import { MusicData } from "@/lib/api/types/supabase/VideoGenerationTasks";

declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext;
    }
}

interface MusicEditPanelProps {
    musicData: MusicData;
    videoDuration: number;
    panelHeight: number;
    onChangeMusicStartSec: (newStartSec: number) => void;
    onChangeMusicVolume: (newVolume: number) => void;
    onChangeIsMuted: (newIsMuted: boolean) => void;
}

function MusicEditPanel({
    musicData,
    videoDuration,
    panelHeight,
    onChangeMusicStartSec,
    onChangeMusicVolume,
    onChangeIsMuted,
}: MusicEditPanelProps) {
    const zoomviewRef = useRef<HTMLDivElement>(null);
    const overviewRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const zoomOverlayRef = useRef<HTMLDivElement>(null);

    const isDraggingRef = useRef(false);

    const [peaksInstance, setPeaksInstance] = useState<PeaksInstance | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [startTime, setStartTime] = useState(0);

    const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
    const [decodedAudioBuffer, setDecodedAudioBuffer] = useState<AudioBuffer | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const [volume, setVolume] = useState(1.0);
    const [isMuted, setIsMuted] = useState(false);

    // 뷰 높이 계산
    const waveformHeight = Math.floor((panelHeight - 40) / 2);

    // 6. 렌더링 계산 (Overview 핑크 박스용)
    const { boxWidth, boxLeft } = useMemo(() => {
        const safeAudioDuration = audioDuration > 0 ? audioDuration : 1;
        if (containerWidth === 0) return { boxWidth: 0, boxLeft: 0 };

        const overviewPPS = containerWidth / safeAudioDuration;
        const boxWidth = videoDuration * overviewPPS;
        const boxLeft = startTime * overviewPPS;

        return { boxWidth, boxLeft }
    }, [audioDuration, containerWidth, startTime, videoDuration]);

    const onChangeVolume = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);

        setVolume(newVolume);
        onChangeMusicVolume(newVolume);
    }, [onChangeMusicVolume]);

    const onToggleMute = useCallback(() => {
        setIsMuted((prev) => {
            onChangeIsMuted(!prev);
            return !prev;
        });
    }, [onChangeIsMuted]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted
                ? 0
                : Math.max(0, Math.min(1, volume));
        }
    }, [volume, isMuted]);

    // 1. 컨테이너 너비 감지
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0) {
                    setContainerWidth(entry.contentRect.width);
                }
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // [단계 1] 오디오 Fetch -> 디코딩 -> 정규화
    useEffect(() => {
        if (!musicData.audioUrl) return;

        // [초기화] 오디오 소스가 변경되면 상태를 리셋하고 기존 인스턴스 파괴
        setStartTime(0);
        setIsPlaying(false);
        setDecodedAudioBuffer(null);
        setPeaksInstance((prev) => {
            if (prev) {
                prev.destroy();
            }
            return null;
        });

        let isMounted = true;
        setIsDownloading(true);

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const tempCtx = new AudioContextClass();

        fetch(musicData.audioUrl)
            .then(async (response) => {
                if (!response.ok) throw new Error("Audio fetch failed");

                const clone = response.clone();
                const blob = await response.blob();
                const arrayBuffer = await clone.arrayBuffer();

                if (!isMounted) return;

                const objectUrl = URL.createObjectURL(blob);
                setAudioBlobUrl(objectUrl);

                try {
                    const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);

                    // 정규화 (Normalization)
                    const rawData = audioBuffer.getChannelData(0);
                    let maxAmp = 0;
                    for (let i = 0; i < rawData.length; i++) {
                        const val = Math.abs(rawData[i]);
                        if (val > maxAmp) maxAmp = val;
                    }

                    // 소리가 작으면 증폭
                    if (maxAmp > 0 && maxAmp < 0.9) {
                        const multiplier = 0.95 / maxAmp;
                        for (let i = 0; i < rawData.length; i++) {
                            rawData[i] *= multiplier;
                        }
                    }

                    setDecodedAudioBuffer(audioBuffer);
                } catch (decodeErr) {
                    console.error("Decode Error:", decodeErr);
                }
            })
            .catch(err => console.error(err))
            .finally(() => {
                if (isMounted) setIsDownloading(false);
                if (tempCtx.state !== 'closed') tempCtx.close();
            });

        return () => {
            isMounted = false;
            if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [musicData.audioUrl]);


    // [단계 2] Peaks.js 초기화
    useEffect(() => {
        if (
            !zoomviewRef.current ||
            !overviewRef.current ||
            !audioRef.current ||
            !decodedAudioBuffer ||
            containerWidth <= 0
        ) return;

        if (zoomviewRef.current.clientHeight === 0) return;
        if (peaksInstance) return;

        const options: PeaksOptions = {
            zoomview: {
                container: zoomviewRef.current,
                // [디자인 복구] 모노톤/인디고 계열
                waveformColor: 'rgba(161, 161, 170, 0.4)',
                playedWaveformColor: 'rgba(99, 102, 241, 0.9)',
                playheadColor: 'rgba(244, 244, 245, 1)',
                showPlayheadTime: true,
                axisLabelColor: '#aaa',
                wheelMode: "scroll",
                formatAxisTime: () => "",
                autoScroll: false,
            },
            overview: {
                container: overviewRef.current,
                waveformColor: 'rgba(255, 255, 255, 0.2)',
                playedWaveformColor: 'rgba(99, 102, 241, 0.9)',
                playheadColor: 'rgba(244, 244, 245, 1)',
                highlightColor: 'transparent',
                axisLabelColor: '#aaa',
            },
            mediaElement: audioRef.current,
            webAudio: {
                audioBuffer: decodedAudioBuffer,
                scale: 128,
                multiChannel: false,
            },
            showAxisLabels: true,
            emitCueEvents: true,
        };

        Peaks.init(options, (err, peaks) => {
            if (err) {
                console.error("Peaks Init Error:", err);
                return;
            }
            if (!peaks) return;

            // [안전한 줌 적용]
            const zoomView = peaks.views.getView('zoomview');
            if (zoomView && videoDuration > 0) {
                zoomView.setZoom({ seconds: videoDuration });
                zoomView.setStartTime(0);
            }

            setAudioDuration(decodedAudioBuffer.duration);
            setPeaksInstance(peaks);
            peaks.segments.removeAll();
        });

        return () => {
            if (peaksInstance && typeof peaksInstance === 'object') (peaksInstance as PeaksInstance).destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [decodedAudioBuffer, containerWidth]);


    // 3. Zoomview 동기화
    useEffect(() => {
        if (!peaksInstance) return;
        const zoomView = peaksInstance.views.getView('zoomview');
        if (!zoomView) return;

        zoomView.setStartTime(startTime);

        if (videoDuration > 0) {
            zoomView.setZoom({ seconds: videoDuration });
        }
    }, [startTime, peaksInstance, containerWidth, videoDuration]);


    // 4. 이벤트 핸들러
    useEffect(() => {
        if (!peaksInstance) return;
        const onTimeUpdate = (time: number) => {
            if (time >= startTime + videoDuration) peaksInstance.player.seek(startTime);
        };
        const onOverviewClick = (event: { time: number; evt: MouseEvent }) => {
            if (isDraggingRef.current) return;
            const clickTime = event.time;
            const maxTime = audioDuration - videoDuration;
            const newTime = Math.max(0, Math.min(clickTime, maxTime));
            setStartTime(newTime);
            onChangeMusicStartSec(newTime);
            peaksInstance.player.seek(newTime);
        };
        const onPlayerPlaying = () => setIsPlaying(true);
        const onPlayerPause = () => setIsPlaying(false);
        const onPlayerEnded = () => setIsPlaying(false);

        peaksInstance.on('player.timeupdate', onTimeUpdate);
        peaksInstance.on('player.playing', onPlayerPlaying);
        peaksInstance.on('player.pause', onPlayerPause);
        peaksInstance.on('player.ended', onPlayerEnded);
        peaksInstance.on('overview.click', onOverviewClick);

        return () => {
            peaksInstance.off('player.timeupdate', onTimeUpdate);
            peaksInstance.off('player.playing', onPlayerPlaying);
            peaksInstance.off('player.pause', onPlayerPause);
            peaksInstance.off('player.ended', onPlayerEnded);
            peaksInstance.off('overview.click', onOverviewClick);
        };
    }, [peaksInstance, startTime, videoDuration, audioDuration, onChangeMusicStartSec]);

    // 5. 드래그 핸들러 (Overview)
    const handleDragStart = (e: React.MouseEvent) => {
        if (!peaksInstance) return;
        isDraggingRef.current = true;
        const startX = e.clientX;
        const initialStartTime = startTime;
        const safeAudioDuration = audioDuration > 0 ? audioDuration : 1;
        const pps = containerWidth / safeAudioDuration;
        if (!pps || pps === Infinity) return;
        let currentDragTime = initialStartTime;
        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaTime = deltaX / pps;
            let newTime = initialStartTime + deltaTime;
            const maxTime = audioDuration - videoDuration;
            if (newTime < 0) newTime = 0;
            if (newTime > maxTime) newTime = maxTime;
            currentDragTime = newTime;
            setStartTime(newTime);
        };
        const handleMouseUp = () => {
            isDraggingRef.current = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            peaksInstance.player.seek(currentDragTime);
            onChangeMusicStartSec(currentDragTime);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // 6. 스크러빙 핸들러 (Zoomview)
    const handleZoomScrub = (e: React.MouseEvent) => {
        if (!peaksInstance || !zoomOverlayRef.current) return;
        e.preventDefault();
        const rect = zoomOverlayRef.current.getBoundingClientRect();
        if (rect.width === 0) return;
        const calculateTime = (clientX: number) => {
            const offsetX = clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, offsetX / rect.width));
            const timeOffset = ratio * videoDuration;
            let targetTime = startTime + timeOffset;
            targetTime = Math.max(startTime, Math.min(startTime + videoDuration, targetTime));
            return targetTime;
        };
        const initialTime = calculateTime(e.clientX);
        peaksInstance.player.seek(initialTime);
        const onMouseMove = (moveEvt: MouseEvent) => {
            const time = calculateTime(moveEvt.clientX);
            peaksInstance.player.seek(time);
        };
        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const togglePlay = useCallback(() => {
        if (!peaksInstance) return;
        if (isPlaying) {
            peaksInstance.player.pause();
        } else {
            const current = peaksInstance.player.getCurrentTime();
            if (current < startTime || current > startTime + videoDuration) {
                peaksInstance.player.seek(startTime);
            }
            peaksInstance.player.play();
        }
    }, [peaksInstance, isPlaying, startTime, videoDuration]);

    return (
        <div
            className="w-full bg-zinc-950 border-t border-white/5 flex flex-col select-none overflow-hidden"
            style={{ height: `${panelHeight}px` }}
            ref={containerRef}
        >
            {audioBlobUrl && (
                <audio ref={audioRef} src={audioBlobUrl} className="hidden" />
            )}

            {/* --- Controls --- */}
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border-b border-white/5 h-10 shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePlay}
                        disabled={isDownloading}
                        className={`p-1.5 rounded-full shadow-sm flex items-center justify-center transition-transform active:scale-95 ${
                            isDownloading ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200'
                        }`}
                    >
                        {isDownloading ? (
                            <div className="w-3.5 h-3.5 border-2 border-zinc-500/30 border-t-zinc-400 rounded-full animate-spin" />
                        ) : isPlaying ? (
                            <Pause size={14} fill="currentColor" />
                        ) : (
                            <Play size={14} fill="currentColor" />
                        )}
                    </button>
                    <span className="text-xs text-zinc-400 font-mono font-medium">
                        {startTime.toFixed(1)}s ~ {(startTime + videoDuration).toFixed(1)}s
                    </span>
                </div>

                {/* [수정됨] 볼륨 컨트롤러 (가로형) */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleMute}
                        className="p-1.5 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? (
                            <VolumeX size={14} />
                        ) : (
                            <Volume2 size={14} />
                        )}
                    </button>

                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={onChangeVolume}
                        className="w-20 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-300 hover:accent-white"
                    />
                    <span className="text-[10px] text-zinc-500 font-medium w-6 text-right tabular-nums">
                            {Math.round(volume * 100)}%
                        </span>
                </div>
            </div>

            <div className="flex-1 flex flex-col relative min-h-0">
                <div className="w-full relative bg-zinc-900/30 border-b border-white/5 shrink-0 group" style={{ height: `${waveformHeight}px` }}>
                    <div ref={zoomviewRef} className="w-full h-full" />
                    <div ref={zoomOverlayRef} onMouseDown={handleZoomScrub} className="absolute inset-0 z-30 cursor-crosshair bg-transparent" title="Click or Drag to scrub" />
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/40 text-[9px] text-zinc-400 font-medium tracking-wide rounded border border-white/10 pointer-events-none z-10">Detailed View</div>
                </div>

                <div className="w-full relative bg-zinc-900/10 flex-1 min-h-0" style={{ height: `${waveformHeight}px` }}>
                    <div ref={overviewRef} className="w-full h-full" />
                    {audioDuration > 0 && (
                        <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none">
                            <div onMouseDown={handleDragStart} className="absolute h-full bg-indigo-500/10 border-x border-indigo-500/50 cursor-grab active:cursor-grabbing hover:bg-indigo-500/20 transition-colors z-10 group" style={{ width: `${boxWidth}px`, transform: `translateX(${boxLeft}px)`, pointerEvents: 'auto' }}>
                                <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500/30" />
                                <div className="absolute top-0 right-0 bottom-0 w-1 bg-indigo-500/30" />
                                <div className="absolute -top-4 left-0 text-[9px] text-indigo-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-zinc-900 border border-white/10 px-1 rounded shadow-lg">Move</div>
                            </div>
                        </div>
                    )}
                </div>

                {(audioDuration === 0 || isDownloading) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-50">
                        <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full" />
                            <span className="text-xs font-medium text-zinc-400 tracking-wide">{isDownloading ? "Analysing Audio..." : "Waiting for Audio..."}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default memo(MusicEditPanel);