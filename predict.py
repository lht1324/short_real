import os
import shutil
import subprocess
import re
import librosa
import numpy as np
import soundfile as sf
from cog import BasePredictor, Input, Path

class Predictor(BasePredictor):
    def setup(self):
        """환경 설정 및 필요한 라이브러리 체크"""
        print("--- Environment Check ---", flush=True)
        try:
            res = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
            print(f"FFmpeg found: {res.stdout.splitlines()[0]}", flush=True)
        except Exception as e:
            print(f"FFmpeg NOT FOUND: {e}", flush=True)
            
        try:
            print(f"Soundfile version: {sf.__version__}", flush=True)
        except Exception as e:
            print(f"Soundfile error: {e}", flush=True)

    def predict(
        self,
        audio_url: Path = Input(description="분석할 음악 파일 URL"),
        target_duration: float = Input(description="추출할 클립의 길이 (초)", default=30.0),
        candidate_count: int = Input(description="추출할 후보 클립 개수 (최대 5)", default=3, ge=1, le=5),
    ) -> list[Path]:
        """
        Librosa를 사용하여 음악의 하이라이트 구간을 비트에 맞춰 추출합니다.
        """
        print(f"--- Prediction Start ---", flush=True)
        print(f"audio_url path: {audio_url}", flush=True)
        
        if os.path.exists(str(audio_url)):
            file_size = os.path.getsize(str(audio_url))
            print(f"Audio file exists. Size: {file_size} bytes", flush=True)
            # 사전 정보 출력 (librosa.load hang 오해 방지)
            try:
                info = sf.info(str(audio_url))
                print(f"Audio info: Duration={info.duration:.2f}s, SR={info.samplerate}, Channels={info.channels}", flush=True)
            except Exception as e:
                print(f"Could not read audio info via soundfile: {e}", flush=True)
        else:
            print(f"ERROR: Audio file does not exist at {audio_url}", flush=True)
            return []

        # 1. 오디오 로드
        print(f"Loading audio with librosa (this may take 10-30s for typical tracks)...", flush=True)
        try:
            # sr=None으로 로드하여 원본 샘플링 레이트 유지
            y, sr = librosa.load(str(audio_url), sr=None)
            print(f"Audio loaded. Data shape: {y.shape}, Final Duration: {len(y)/sr:.2f}s", flush=True)
        except Exception as e:
            print(f"FAILED to load audio: {e}", flush=True)
            return []
        
        # 2. 비트 트래킹 (BPM 및 Beat 위치 파악)
        print("Analyzing beats...", flush=True)
        try:
            tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
            # librosa 0.10+ 대응 (scalar tempo 처리)
            bpm = float(np.atleast_1d(tempo)[0])
            print(f"Estimated BPM: {bpm:.2f}", flush=True)
            beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        except Exception as e:
            print(f"Beat tracking failed: {e}", flush=True)
            beat_times = np.array([])
        
        # 3. 구간 에너지 분석 (Sliding Window RMS)
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
            print("Warning: Audio is shorter than target_duration.", flush=True)
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
            past_beats = beat_times[beat_times <= start_time_candidate]
            if len(past_beats) > 0:
                aligned_start_sec = past_beats[-1]
            else:
                aligned_start_sec = start_time_candidate
            
            candidates.append({
                'raw_start': start_time_candidate,
                'start_sec': float(aligned_start_sec),
                'avg_rms': float(window_avg_rms[idx])
            })
            
            if len(candidates) >= candidate_count:
                break
        
        # 6. 클립 추출 및 저장 (FFmpeg 사용)
        output_paths = []
        output_dir = "/tmp/candidates_output"  # 안정성을 위한 절대경로 (/tmp 권장)
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
        os.makedirs(output_dir)
        
        print(f"Extracting {len(candidates)} candidates...", flush=True)
        for i, cand in enumerate(candidates):
            out_filename = f"candidate_{i}.mp3"
            out_path = os.path.join(output_dir, out_filename)
            start = cand['start_sec']
            
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
                
                # 추가: 각 클립의 LUFS 측정
                lufs = self.measure_lufs(out_path)
                print(f"Candidate {i}: Start at {start:.2f}s (RMS: {cand['avg_rms']:.4f}, LUFS: {lufs})", flush=True)
                
                output_paths.append(Path(out_path))
            except subprocess.CalledProcessError as e:
                print(f"Error extracting candidate {i}: {e.stderr.decode()}", flush=True)
                continue

        print(f"--- Prediction Finished. Generated {len(output_paths)} clips. ---", flush=True)
        return output_paths

    def measure_lufs(self, file_path):
        """FFmpeg을 사용하여 파일의 Integrated Loudness(LUFS)를 측정합니다."""
        cmd = [
            "ffmpeg", "-i", file_path,
            "-af", "ebur128=peak=true",
            "-f", "null", "-"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        # stderr에서 Integrated loudness 추출 (정규식 수정)
        output = result.stderr
        match = re.search(r"I:\s+(-?\d+\.?\d*)\s+LUFS", output)
        if match:
            return float(match.group(1))
        return None
