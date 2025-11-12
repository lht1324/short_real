import subprocess
import tempfile
import shutil
from pathlib import Path
import requests
from cog import BasePredictor, Input, Path as CogPath

class Predictor(BasePredictor):
    def setup(self):
        """모델 초기화 및 폰트 설정"""
        print("="*70)
        print("FFmpeg Caption Burner - Setup")
        print("="*70)
        
        # 폰트 디렉토리 생성
        font_dst = Path("/fonts")
        font_dst.mkdir(exist_ok=True)
        
        # /src/fonts에서 /fonts로 TTF 복사
        font_src = Path("/src/fonts")
        if font_src.exists():
            print("\n>>> Copying fonts from {} to {}".format(font_src, font_dst))
            copied_count = 0
            for font_file in font_src.glob("*.ttf"):
                # Variable Font 제외
                if "VariableFont" not in font_file.name:
                    try:
                        shutil.copy(font_file, font_dst)
                        print("  ✓ {}".format(font_file.name))
                        copied_count += 1
                    except Exception as e:
                        print("  ✗ Failed to copy {}: {}".format(font_file.name, e))
            print("\nTotal fonts copied: {}".format(copied_count))
        else:
            print("\n⚠ Warning: Font source directory not found: {}".format(font_src))

        # fontconfig 캐시 갱신
        print("\n>>> Updating fontconfig cache...")
        try:
            subprocess.run(['fc-cache', '-f', '-v'], check=True, capture_output=True)
            print("  ✓ Font cache updated")
        except Exception as e:
            print("  ⚠ Warning: Failed to update font cache: {}".format(e))

        # 설치된 폰트 확인
        print("\n>>> Checking installed fonts in /fonts:")
        if font_dst.exists():
            font_list = list(font_dst.glob("*.ttf"))
            for font in sorted(font_list)[:10]:  # 처음 10개만 표시
                print("  - {}".format(font.name))
            if len(font_list) > 10:
                print("  ... and {} more fonts".format(len(font_list) - 10))
            print("\nTotal: {} fonts".format(len(font_list)))

        print("="*70 + "\n")

    def predict(
        self,
        video_url: str = Input(description="Video URL to download"),
        ass_content: str = Input(description="ASS subtitle content as string"),
    ) -> CogPath:
        """비디오에 자막 입히기"""
        print("\n" + "="*70)
        print("PREDICTION START")
        print("="*70)

        # Temp 디렉토리 생성
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # 1. 비디오 다운로드
            print("\n--- Downloading video ---")
            video_path = temp_path / "input_video.mp4"
            self._download_file(video_url, video_path)

            # 2. ASS 콘텐츠를 파일로 저장
            print("\n--- Saving ASS subtitle ---")
            ass_path = temp_path / "subtitle.ass"
            with open(ass_path, 'w', encoding='utf-8-sig') as f:
                f.write(ass_content)

            ass_size = ass_path.stat().st_size
            print("✓ ASS file saved: {}".format(ass_path))
            print("✓ File size: {:,} bytes".format(ass_size))

            # ASS 파일 내용 미리보기
            print("\n--- ASS Content Preview (first 15 lines) ---")
            lines = ass_content.split('\n')[:15]
            for i, line in enumerate(lines, 1):
                print("{:3d}: {}".format(i, line))
            if len(ass_content.split('\n')) > 15:
                print("... ({} more lines)".format(len(ass_content.split('\n')) - 15))
            print("--- End of preview ---\n")

            # 3. FFmpeg로 자막 합성
            print("--- Burning subtitles with FFmpeg ---")
            output_path = temp_path / "output_with_subtitles.mp4"

            # fontsdir 옵션으로 /fonts 폴더 지정
            cmd = [
                'ffmpeg',
                '-i', str(video_path),
                '-vf', 'subtitles={}:fontsdir=/fonts'.format(ass_path),
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-c:a', 'copy',
                '-y',
                str(output_path)
            ]

            print("FFmpeg command:\n{}\n".format(' '.join(cmd)))

            try:
                result = subprocess.run(
                    cmd,
                    check=True,
                    capture_output=True,
                    text=True
                )

                # FFmpeg stderr (진행상황 표시용)
                if result.stderr:
                    stderr_lines = result.stderr.split('\n')
                    # 마지막 20줄만 출력
                    print("FFmpeg output (last 20 lines):")
                    for line in stderr_lines[-20:]:
                        if line.strip():
                            print("  {}".format(line))

            except subprocess.CalledProcessError as e:
                print("\n✗ FFmpeg error: {}".format(e))
                print("\n✗ FFmpeg stderr:\n{}".format(e.stderr))
                raise

            # 4. 결과 파일 복사
            final_output = Path("/tmp/final_output.mp4")
            shutil.copy(output_path, final_output)
            file_size = final_output.stat().st_size

            print("\n" + "="*70)
            print("PREDICTION COMPLETE")
            print("✓ Output saved to: {}".format(final_output))
            print("✓ File size: {:,} bytes ({:.2f} MB)".format(file_size, file_size / 1024 / 1024))
            print("="*70 + "\n")

            return CogPath(final_output)

    def _download_file(self, url: str, dest_path: Path):
        """파일 다운로드"""
        print("Downloading from: {}".format(url))

        try:
            response = requests.get(url, stream=True, timeout=60)
            response.raise_for_status()

            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0

            with open(dest_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
                    downloaded += len(chunk)

                    # 진행상황 출력 (10MB마다)
                    if total_size > 0 and (downloaded % (10 * 1024 * 1024) < 8192 or downloaded == total_size):
                        progress = (downloaded / total_size) * 100
                        print("  Progress: {:,} / {:,} bytes ({:.1f}%)".format(downloaded, total_size, progress))

            file_size = dest_path.stat().st_size
            print("✓ Downloaded to: {}".format(dest_path))
            print("✓ File size: {:,} bytes ({:.2f} MB)".format(file_size, file_size / 1024 / 1024))

        except requests.exceptions.Timeout:
            print("✗ Download timeout after 60 seconds")
            raise
        except Exception as e:
            print("✗ Download failed: {}".format(e))
            raise
