from cog import BasePredictor, Input, Path
import subprocess
import tempfile
import os
import requests


class Predictor(BasePredictor):
    def predict(
        self,
        audio_url: str = Input(
            description="URL of the audio file to process"
        ),
        cutting_area_start_sec: float = Input(
            description="Start time in seconds (supports decimals)",
            ge=0
        ),
        cutting_area_end_sec: float = Input(
            description="End time in seconds (supports decimals)",
            ge=0
        ),
        volume_percentage: int = Input(
            description="Volume level (0-100)",
            ge=0,
            le=100
        ),
    ) -> Path:
        """
        Trim audio and adjust volume using FFmpeg
        """
        
        # 입력 검증
        if cutting_area_end_sec <= cutting_area_start_sec:
            raise ValueError("cutting_area_end_sec must be greater than cutting_area_start_sec")
        
        # 구간 길이 계산
        duration = cutting_area_end_sec - cutting_area_start_sec
        
        # 볼륨 비율 계산 (0-100 -> 0.0-1.0)
        volume_ratio = volume_percentage / 100.0
        
        # 임시 파일 생성
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as input_file:
            input_path = input_file.name
            
            # URL에서 오디오 다운로드
            print(f"Downloading audio from {audio_url}")
            response = requests.get(audio_url, stream=True)
            response.raise_for_status()
            
            for chunk in response.iter_content(chunk_size=8192):
                input_file.write(chunk)
        
        # 출력 파일 경로
        output_path = "/tmp/processed_audio.mp3"
        
        try:
            # FFmpeg 명령어 실행
            command = [
                "ffmpeg",
                "-y",  # 출력 파일 덮어쓰기
                "-ss", str(cutting_area_start_sec),  # 시작 시간
                "-i", input_path,  # 입력 파일
                "-t", str(duration),  # 구간 길이
                "-af", f"volume={volume_ratio}",  # 볼륨 조절
                "-codec:a", "libmp3lame",  # MP3 인코더
                "-q:a", "2",  # 고음질 (VBR 품질)
                output_path
            ]
            
            print(f"Running FFmpeg command: {' '.join(command)}")
            
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=True
            )
            
            print("FFmpeg output:", result.stdout)
            if result.stderr:
                print("FFmpeg stderr:", result.stderr)
            
            return Path(output_path)
            
        finally:
            # 임시 입력 파일 삭제
            if os.path.exists(input_path):
                os.remove(input_path)
