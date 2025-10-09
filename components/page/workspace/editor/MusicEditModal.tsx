'use client'

import {memo, useCallback, useEffect, useRef, useState} from "react";
import {MusicData} from "@/api/types/supabase/VideoGenerationTasks";
import {useWavesurfer} from "@wavesurfer/react";
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

interface MusicEditModalProps {
    musicData: MusicData;
    videoDuration: number;
    isOpen: boolean;
    onClose: () => void;
    onSave: (startTime: number, volume: number) => void;
}

function MusicEditModal({
    musicData,
    videoDuration,
    isOpen,
    onClose,
    onSave,
}: MusicEditModalProps) {
    const overviewContainerRef = useRef(null);
    const detailContainerRef = useRef(null);
    const [volume, setVolume] = useState(1);
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(videoDuration);
    const regionsRef = useRef(null);

    // 로딩 상태를 명확하게 관리
    const [isWavesurferReady, setIsWavesurferReady] = useState(false);

    // 전체 파형 (미니맵)
    const {wavesurfer: overviewWavesurfer} = useWavesurfer({
        container: overviewContainerRef,
        url: musicData.audioUrl,
        waveColor: 'rgba(168, 85, 247, 0.3)',
        progressColor: 'rgba(236, 72, 153, 0.8)',
        cursorColor: 'transparent',
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 60,
        normalize: true,
        interact: false,
    });

    // 상세 파형
    const {wavesurfer: detailWavesurfer} = useWavesurfer({
        container: detailContainerRef,
        url: musicData.audioUrl,
        waveColor: 'rgba(168, 85, 247, 0.5)',
        progressColor: 'rgba(236, 72, 153, 1)',
        cursorColor: 'rgba(255, 255, 255, 0.5)',
        barWidth: 3,
        barGap: 2,
        barRadius: 3,
        height: 120,
        normalize: true,
    });

    // 모달이 열릴 때마다 초기화
    useEffect(() => {
        if (isOpen) {
            setIsWavesurferReady(false);
            setStartTime(0);
            setEndTime(videoDuration);
            setVolume(1);
        }
    }, [isOpen, videoDuration]);

    // Wavesurfer와 Region 초기화
    useEffect(() => {
        if (!overviewWavesurfer || !detailWavesurfer || !isOpen) return;

        const initializeRegion = () => {
            const duration = overviewWavesurfer.getDuration();

            if (duration <= 0) return;

            // 기존 region이 있으면 제거
            if (regionsRef.current) {
                regionsRef.current.destroy();
            }

            // Region 플러그인 등록
            const regions = overviewWavesurfer.registerPlugin(RegionsPlugin.create());
            regionsRef.current = regions;

            // 초기 region 생성
            const regionEnd = Math.min(videoDuration, duration);
            regions.addRegion({
                start: 0,
                end: regionEnd,
                color: 'rgba(168, 85, 247, 0.3)',
                drag: true,
                resize: true,
            });

            setStartTime(0);
            setEndTime(regionEnd);
            setIsWavesurferReady(true);

            // Region 변경 이벤트 리스너
            regions.on('region-updated', (region) => {
                setStartTime(region.start);
                setEndTime(region.end);

                const duration = region.end - region.start;
                detailWavesurfer.zoom(overviewWavesurfer.getDuration() / duration);
            });
        };

        // ready 이벤트 대기
        if (overviewWavesurfer.getDuration() > 0) {
            initializeRegion();
        } else {
            overviewWavesurfer.once('ready', initializeRegion);
        }

        return () => {
            if (regionsRef.current) {
                regionsRef.current.destroy();
                regionsRef.current = null;
            }
        };
    }, [overviewWavesurfer, detailWavesurfer, videoDuration, isOpen]);

    // 볼륨 조절
    const onChangeVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (overviewWavesurfer) overviewWavesurfer.setVolume(newVolume);
        if (detailWavesurfer) detailWavesurfer.setVolume(newVolume);
    }, [overviewWavesurfer, detailWavesurfer]);

    const onClickSave = useCallback(() => {
        onSave(startTime, volume);
        onClose();
    }, [startTime, volume, onSave, onClose]);

    const formattedTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 rounded-lg shadow-2xl">
                {/* 헤더 */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-gray-700 bg-gray-900">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{musicData.title}</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Edit music for your video ({formattedTime(videoDuration)} required)
                        </p>
                    </div>
                </div>

                {/* 컨텐츠 */}
                <div className="relative p-6 space-y-6">
                    {/* 전체 파형 (미니맵) */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Overview</h3>
                            <span className="text-sm text-gray-400">
                Selected: {formattedTime(startTime)} - {formattedTime(endTime)} ({formattedTime(endTime - startTime)})
              </span>
                        </div>
                        <div
                            ref={overviewContainerRef}
                            className="w-full bg-gray-800 rounded-lg overflow-hidden"
                        />
                        <p className="text-xs text-gray-500">
                            Drag the highlighted region to select the music segment
                        </p>
                    </div>

                    {/* 상세 파형 */}
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-white">Detail View</h3>
                        <div
                            ref={detailContainerRef}
                            className="w-full bg-gray-800 rounded-lg overflow-hidden"
                        />
                        <p className="text-xs text-gray-500">
                            Zoomed view of the selected region
                        </p>
                    </div>

                    {/* 볼륨 조절 */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Volume</h3>
                            <span className="text-sm text-gray-400">{Math.round(volume * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={onChangeVolume}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                        />
                    </div>

                    {/* 로딩 오버레이 */}
                    {!isWavesurferReady && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm rounded-lg">
                            <div className="text-center">
                                <div className="inline-block w-12 h-12 border-4 border-gray-600 border-t-pink-500 rounded-full animate-spin mb-4" />
                                <p className="text-white font-semibold text-lg">Loading waveform...</p>
                                <p className="text-gray-400 text-sm mt-2">Please wait while we prepare your audio</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 p-6 border-t border-gray-700 bg-gray-900">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onClickSave}
                        disabled={!isWavesurferReady}
                        className="px-6 py-2 text-white bg-pink-600 rounded-lg hover:bg-pink-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                        Apply to Video
                    </button>
                </div>
            </div>
        </div>
    );
}

export default memo(MusicEditModal);
