import {WaveRenderMode} from "@/components/page/workspace/editor/MusicEditPanel";

export function renderSymmetricWave(
    channels: (Float32Array | number[])[],
    context: CanvasRenderingContext2D,
    color: string,
    mode: WaveRenderMode = WaveRenderMode.OVERVIEW
) {

    const { width, height } = context.canvas;
    if (!width || !height) return;

    const halfHeight = height / 2;
    const peaks = channels[0];
    if (!peaks || peaks.length === 0) return;

    // Overview는 바 간격 추가
    const barWidth = 1;
    const barGap = mode === WaveRenderMode.OVERVIEW ? 0.5 : 0;
    const totalBarWidth = barWidth + barGap;
    const numberOfBars = Math.floor(width / totalBarWidth);
    const samplesPerBar = peaks.length / numberOfBars;

    // 모든 바의 peak 값 계산
    const barPeaks: number[] = [];
    for (let i = 0; i < numberOfBars; i++) {
        const startIdx = Math.floor(i * samplesPerBar);
        const endIdx = Math.floor((i + 1) * samplesPerBar);

        let maxPeak = 0;
        for (let j = startIdx; j < endIdx; j++) {
            const absPeak = Math.abs(peaks[j]);
            if (absPeak > maxPeak) {
                maxPeak = absPeak;
            }
        }
        barPeaks.push(maxPeak);
    }

    context.fillStyle = color;

    const minPeak = Math.min(...barPeaks);
    const maxPeak = Math.max(...barPeaks);
    const range = maxPeak - minPeak;

    for (let index = 0; index < numberOfBars; index++) {
        const normalized = range > 0 ? (barPeaks[index] - minPeak) / range : 0;

        let enhanced: number;
        let barHeightValue: number;

        if (mode === WaveRenderMode.OVERVIEW) {
            enhanced = Math.pow(normalized, 3.0);
            barHeightValue = enhanced * halfHeight * 0.90;
        } else {
            const minExponent = 1.0;
            const maxExponent = 3.0;

            const peakPosition = (barPeaks[index] - minPeak) / (maxPeak - minPeak);
            const peakExponent = minExponent + (maxExponent - minExponent) * peakPosition;

            enhanced = Math.pow(normalized, peakExponent);
            barHeightValue = enhanced * halfHeight;
        }

        const x = index * totalBarWidth;

        context.beginPath();
        context.roundRect(x, halfHeight - barHeightValue, barWidth, barHeightValue, [2, 2, 0, 0]);
        context.fill();

        context.beginPath();
        context.roundRect(x, halfHeight, barWidth, barHeightValue, [0, 0, 2, 2]);
        context.fill();
    }
}

// AudioBuffer를 32-bit Float WAV Blob으로 변환
export function audioBufferToWavBlob(audioBuffer: AudioBuffer): Blob {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 3; // IEEE Float
    const bitDepth = 32;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const numFrames = audioBuffer.length;

    const dataLength = numFrames * numberOfChannels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // WAV 헤더 작성
    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true); // IEEE Float
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Float32 데이터 인터리빙 작성 (L R L R L R...)
    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = audioBuffer.getChannelData(channel)[i];
            view.setFloat32(offset, sample, true);
            offset += 4;
        }
    }

    return new Blob([buffer], { type: 'audio/wav' });
}