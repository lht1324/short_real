import os
import shutil
import subprocess
import re
import librosa
import numpy as np
from cog import BasePredictor, Input, Path

class Predictor(BasePredictor):
    def setup(self):
        """환경 설정 및 필요한 라이브러리 체크"""
        pass

    def predict(
        self,
        audio_url: Path = Input(description="분석할 음악 파일 URL"),
        target_duration: float = Input(description="추출할 클립의 길이 (초)", default=30.0),
        candidate_count: int = Input(description="추출할 후보 클립 개수 (최대 5)", default=3, ge=1, le=5),
    ) -> list[Path]:
        """
        Librosa를 사용하여 음악의 하이라이트 구간을 비트에 맞춰 추출합니다.
        """
        # 1. 오디오 로드
        print(f"Loading audio: {audio_url}", flush=True)
        # sr=None으로 로드하여 원본 샘플링 레이트 유지
        y, sr = librosa.load(str(audio_url), sr=None)
        
        # 2. 비트 트래킹 (BPM 및 Beat 위치 파악)
        print("Analyzing beats...", flush=True)
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        
        # 3. 구간 에너지 분석 (Sliding Window RMS)
        # 사장님 말씀대로 특정 지점이 아닌 '구간'의 평균 에너지를 계산합니다.
        print(f"Analyzing energy for {target_duration}s windows...", flush=True)
        hop_length = 512
        rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
        rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
        
        # 30초(target_duration) 길이에 해당하는 윈도우 사이즈 계산
        window_size_frames = int(librosa.time_to_frames(target_duration, sr=sr, hop_length=hop_length))
        
        # 슬라이딩 윈도우로 평균 RMS 계산
        if len(rms) > window_size_frames:
            window_avg_rms = np.convolve(rms, np.ones(window_size_frames)/window_size_frames, mode='valid')
            # convolve 결과의 시간축 매핑
            window_times = rms_times[:len(window_avg_rms)]
        else:
            # 오디오가 target_duration보다 짧은 경우 (비정상 케이스 처리)
            window_avg_rms = np.array([np.mean(rms)])
            window_times = np.array([0.0])

        # 4. 하이라이트 후보 선정 (거리 제한 적용)
        candidates = []
        min_distance_sec = target_duration + 5.0  # 클립 간 최소 간격 유지 (중복 방지)
        
        # 에너지가 높은 순서대로 인덱스 정렬
        sorted_indices = np.argsort(window_avg_rms)[::-1]
        
        for idx in sorted_indices:
            start_time_candidate = window_times[idx]
            
            # 곡의 끝부분 확보 가능 여부 체크
            if start_time_candidate + target_duration > len(y) / sr:
                continue
                
            # 이미 선정된 후보와 너무 가까운지 체크
            if any(abs(start_time_candidate - c['raw_start']) < min_distance_sec for c in candidates):
                continue
            
            # 5. [핵심] 비트 정렬 (Beat Alignment)
            # 해당 피크 지점에서 가장 가까운 '이전' 비트 위치를 찾음 (정박 시작 보장)
            past_beats = beat_times[beat_times <= start_time_candidate]
            if len(past_beats) > 0:
                # 피크 바로 직전의 비트 지점을 시작점으로 보정
                aligned_start_sec = past_beats[-1]
            else:
                aligned_start_sec = start_time_candidate
            
            candidates.append({
                'raw_start': start_time_candidate,
                'start_sec': float(aligned_start_sec),
                'avg_rms': float(window_avg_rms[idx])
            })
            
            # 목표 개수만큼 찾으면 중단
            if len(candidates) >= candidate_count:
                break
        
        # 6. 클립 추출 및 저장 (FFmpeg 사용)
        output_paths = []
        output_dir = "candidates_output"
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
        os.makedirs(output_dir)
        
        print(f"Extracting {len(candidates)} candidates...", flush=True)
        for i, cand in enumerate(candidates):
            out_filename = f"candidate_{i}.mp3"
            out_path = os.path.join(output_dir, out_filename)
            start = cand['start_sec']
            
            # FFmpeg: 정밀 커팅
            # -ss (start), -t (duration)
            cmd = [
                "ffmpeg", "-y",
                "-ss", f"{start:.6f}",
                "-t", f"{target_duration:.6f}",
                "-i", str(audio_url),
                "-acodec", "libmp3lame",
                "-b:a", "192k",
                out_path
            ]
            
            try:
                subprocess.run(cmd, check=True, capture_output=True)
                
                # 추가: 각 클립의 LUFS 측정 (Step 2를 위한 데이터 확보)
                lufs = self.measure_lufs(out_path)
                print(f"Candidate {i}: Start at {start:.2f}s (RMS: {cand['avg_rms']:.4f}, LUFS: {lufs})", flush=True)
                
                output_paths.append(Path(out_path))
            except subprocess.CalledProcessError as e:
                print(f"Error extracting candidate {i}: {e.stderr.decode()}", flush=True)
                continue

        return output_paths

    def measure_lufs(self, file_path):
        """FFmpeg을 사용하여 파일의 Integrated Loudness(LUFS)를 측정합니다."""
        cmd = [
            "ffmpeg", "-i", file_path,
            "-af", "ebur128=peak=true",
            "-f", "null", "-"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        # stderr에서 Integrated loudness 추출
        output = result.stderr
        match = re.search(r"I:\s+(-?\d+\.?\d*)\s+LUFS", output)
        if match:
            return float(match.group(1))
        return None
