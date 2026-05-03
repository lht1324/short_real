import os
import shutil
import subprocess
import re
import librosa
import numpy as np
from cog import BasePredictor, Input, Path

class Predictor(BasePredictor):
    def setup(self):
        """환경 설정"""
        pass

    def predict(
        self,
        music_audio_url: Path = Input(description="분석 및 추출할 원본 음악 파일 URL"),
        voice_audio_url: Path = Input(description="기준점이 될 나레이션(음성) 파일 URL"),
        target_duration: float = Input(description="추출할 클립의 길이 (초)", default=30.0),
        candidate_count: int = Input(description="추출할 후보 클립 개수 (최대 5)", default=3, ge=1, le=5),
    ) -> list[Path]:
        """
        1. 음성 오디오의 평균 LUFS 측정
        2. 음악 하이라이트 구간(비트 정렬) 추출
        3. 각 음악 클립을 음성 LUFS에 맞춰 1:1 볼륨 조절 후 반환
        """
        # --- [Step 1] 음성(나레이션) LUFS 분석 ---
        print(f"--- Step 1: Analyzing Voice Anchor ---", flush=True)
        print(f"Voice URL: {voice_audio_url}", flush=True)
        voice_lufs = self.measure_lufs(str(voice_audio_url))
        
        if voice_lufs is None:
            print("Warning: Failed to measure voice LUFS. Falling back to -20.0 LUFS.", flush=True)
            voice_lufs = -20.0
        else:
            print(f"Voice Anchor LUFS: {voice_lufs}", flush=True)

        # --- [Step 2] 음악 분석 및 하이라이트 후보 선정 ---
        print(f"\n--- Step 2: Analyzing Music Highlights ---", flush=True)
        print(f"Music URL: {music_audio_url}", flush=True)
        
        # 오디오 로드
        y, sr = librosa.load(str(music_audio_url), sr=None)
        duration = len(y) / sr
        print(f"Music Duration: {duration:.2f}s, SR: {sr}", flush=True)
        
        # 비트 트래킹
        print("Detecting beats...", flush=True)
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        
        # 구간 에너지 분석 (Sliding Window RMS)
        print(f"Scanning for high-energy {target_duration}s windows...", flush=True)
        hop_length = 512
        rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
        rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
        
        window_size_frames = int(librosa.time_to_frames(target_duration, sr=sr, hop_length=hop_length))
        
        if len(rms) > window_size_frames:
            window_avg_rms = np.convolve(rms, np.ones(window_size_frames)/window_size_frames, mode='valid')
            window_times = rms_times[:len(window_avg_rms)]
        else:
            window_avg_rms = np.array([np.mean(rms)])
            window_times = np.array([0.0])

        # 후보지 선정 (거리 제한 35초 적용)
        candidates = []
        min_distance_sec = target_duration + 5.0
        sorted_indices = np.argsort(window_avg_rms)[::-1]
        
        for idx in sorted_indices:
            start_time_candidate = window_times[idx]
            if start_time_candidate + target_duration > duration:
                continue
            if any(abs(start_time_candidate - c['raw_start']) < min_distance_sec for c in candidates):
                continue
            
            # 비트 정렬 (시작점을 가장 가까운 이전 비트로 당김)
            past_beats = beat_times[beat_times <= start_time_candidate]
            aligned_start_sec = past_beats[-1] if len(past_beats) > 0 else start_time_candidate
            
            candidates.append({
                'raw_start': start_time_candidate,
                'start_sec': float(aligned_start_sec),
                'avg_rms': float(window_avg_rms[idx])
            })
            if len(candidates) >= candidate_count:
                break
        
        # --- [Step 3] 클립 추출 및 1:1 볼륨 정렬 (Normalization) ---
        print(f"\n--- Step 3: Extracting & Normalizing {len(candidates)} Clips ---", flush=True)
        output_paths = []
        output_dir = "normalized_candidates"
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
        os.makedirs(output_dir)
        
        for i, cand in enumerate(candidates):
            temp_path = os.path.join(output_dir, f"temp_raw_{i}.mp3")
            final_path = os.path.join(output_dir, f"candidate_{i}.mp3")
            start = cand['start_sec']
            
            # 1. 구간 추출 (원본 볼륨 유지)
            extract_cmd = [
                "ffmpeg", "-y", "-ss", f"{start:.6f}", "-t", f"{target_duration:.6f}",
                "-i", str(music_audio_url), "-acodec", "libmp3lame", "-b:a", "192k", temp_path
            ]
            subprocess.run(extract_cmd, check=True, capture_output=True)
            
            # 2. 추출된 클립의 LUFS 측정
            music_clip_lufs = self.measure_lufs(temp_path)
            
            # 3. 보정값(Gain) 계산: Voice Anchor - Music Clip LUFS
            # 예: 음성이 -20, 음악이 -15라면 -5dB를 적용해 음악을 낮춤
            if music_clip_lufs is not None:
                gain = voice_lufs - music_clip_lufs
            else:
                gain = 0.0
                
            print(f"Clip {i}: Music LUFS {music_clip_lufs}, Target LUFS {voice_lufs} -> Applying Gain: {gain:.2f}dB", flush=True)
            
            # 4. 볼륨 보정 적용하여 최종 파일 생성
            norm_cmd = [
                "ffmpeg", "-y", "-i", temp_path,
                "-af", f"volume={gain:.2f}dB",
                "-acodec", "libmp3lame", "-b:a", "192k", final_path
            ]
            subprocess.run(norm_cmd, check=True, capture_output=True)
            
            # 임시 파일 삭제
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
            output_paths.append(Path(final_path))

        print(f"\n--- Processing Complete: {len(output_paths)} clips generated ---", flush=True)
        return output_paths

    def measure_lufs(self, file_path):
        """Integrated LUFS 측정 유틸리티"""
        # ebur128 필터를 사용하여 Integrated Loudness(I) 추출
        cmd = ["ffmpeg", "-i", file_path, "-af", "ebur128", "-f", "null", "-"]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            output = result.stderr
            # re.findall을 사용하여 모든 'I:' 값을 찾고, 그 중 마지막(최종 결과) 값을 선택합니다.
            matches = re.findall(r"I:\s+(-?\d+\.?\d*)\s+LUFS", output)
            if matches:
                return float(matches[-1])
        except Exception as e:
            print(f"LUFS Measurement Error: {e}", flush=True)
        return None
