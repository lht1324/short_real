# Rendi API Documentation

## Overview
Rendi는 FFmpeg를 클라우드에서 REST API로 실행할 수 있는 서비스입니다. 서버 설치나 관리 없이 HTTP 요청만으로 영상 처리가 가능합니다.

## Base URL
```
https://api.rendi.dev/v1
```

## Authentication
모든 API 요청에는 `X-API-KEY` 헤더가 필요합니다.

```bash
--header 'X-API-KEY: <your-api-key>'
```

## Core Endpoints

### 1. Run FFmpeg Command
**POST** `/run-ffmpeg-command`

단일 FFmpeg 명령어를 실행합니다.

#### Request Body
```typescript
interface RunFfmpegCommandRequest {
  input_files: Record<string, string>;     // in_ 접두사 필수
  output_files: Record<string, string>;    // out_ 접두사 필수  
  ffmpeg_command: string;                  // {{alias}} 플레이스홀더 사용
  vcpu_count?: number;                     // vCPU 개수 (선택)
}
```

#### Example
```javascript
{
  "input_files": {
    "in_1": "https://example.com/video1.mp4",
    "in_2": "https://example.com/video2.mp4"
  },
  "output_files": {
    "out_1": "merged_video.mp4"
  },
  "ffmpeg_command": "-i {{in_1}} -i {{in_2}} -filter_complex '[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1' {{out_1}}"
}
```

#### Response
```typescript
interface RunFfmpegCommandResponse {
  command_id: string;
}
```

### 2. Run Chained FFmpeg Commands
**POST** `/run-chained-ffmpeg-commands`

여러 FFmpeg 명령어를 순차적으로 실행합니다.

#### Request Body
```typescript
interface RunChainedFfmpegCommandsRequest {
  input_files: Record<string, string>;
  output_files: Record<string, string>;
  ffmpeg_commands: string[];               // 명령어 배열
  vcpu_count?: number;
}
```

### 3. Poll FFmpeg Command Status
**GET** `/commands/{command_id}`

명령어 실행 상태를 확인합니다.

#### Response
```typescript
interface PollCommandResponse {
  command_id: string;
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
  command_type: 'FFMPEG_COMMAND' | 'FFMPEG_CHAINED_COMMANDS';
  vcpu_count: number;
  total_processing_seconds?: number;
  ffmpeg_command_run_seconds?: number;
  output_files?: {
    [key: string]: {
      file_id: string;
      size_mbytes: number;
      duration?: number;
      file_type: 'video' | 'audio' | 'image';
      file_format: string;
      storage_url: string;
      width?: number;
      height?: number;
      codec?: string;
      frame_rate?: number;
      bitrate_video_kb?: number;
      bitrate_audio_kb?: number;
    }
  };
  error_status?: string;
  error_message?: string;
  original_request: any;
}
```

### 4. Store and Analyze File
**POST** `/files/store-file`

파일을 Rendi 스토리지에 저장하고 FFprobe로 분석합니다.

#### Request Body
```typescript
interface StoreFileRequest {
  file_url: string;
}
```

#### Response
```typescript
interface StoreFileResponse {
  file_id: string;
}
```

### 5. Get File Info
**GET** `/files/{file_id}`

저장된 파일의 정보와 메타데이터를 조회합니다.

### 6. List FFmpeg Commands
**GET** `/commands`

계정의 모든 FFmpeg 명령어 목록을 조회합니다.

### 7. List Stored Files
**GET** `/files`

계정에 저장된 모든 파일 목록을 조회합니다.

### 8. Delete Command Files
**DELETE** `/commands/{command_id}`

특정 명령어의 출력 파일들을 삭제합니다.

### 9. Delete File
**DELETE** `/files/{file_id}`

저장된 파일을 삭제합니다.

## Webhook Integration

Rendi는 명령어 처리 완료시 웹훅을 지원합니다.

### Webhook Payload
```typescript
interface WebhookPayload {
  data: PollCommandResponse;
  timestamp: number;  // Unix epoch milliseconds
}
```

### Webhook Configuration
웹훅 URL은 계정 설정에서 미리 구성해야 합니다. 개별 요청마다 웹훅 URL 지정은 불가능합니다.

## File Naming Rules

### Input Files (`input_files`)
- 키는 반드시 `in_` 접두사로 시작
- 값은 공개적으로 접근 가능한 URL
- 지원: 공개 URL, Google Drive, Dropbox, S3, Rendi 저장소 등

### Output Files (`output_files`)
- 키는 반드시 `out_` 접두사로 시작
- 값은 원하는 출력 파일명 (경로 제외)
- 허용 문자: 영숫자, 언더스코어, 점(확장자용)
- 예: `"output_1.mp4"`, `"thumbnail.jpg"`

## FFmpeg Command Syntax

FFmpeg 명령어에서 파일 참조시 `{{alias}}` 플레이스홀더를 사용합니다.

```bash
# 올바른 예시
"-i {{in_1}} -i {{in_2}} -filter_complex '[0:v][1:v]concat=n=2:v=1:a=0' {{out_1}}"

# 잘못된 예시 (ffmpeg 키워드 불필요)
"ffmpeg -i {{in_1}} {{out_1}}"
```

## Error Handling

### Common Error Status
- `UNREACHABLE_INPUT_FILE`: 입력 파일 다운로드 실패
- `PROCESSING_ERROR`: FFmpeg 실행 중 오류
- `TIMEOUT`: 처리 시간 초과

## Rate Limits & Quotas

### Free Plan
- 월 50GB 처리 가능
- 4 vCPUs
- 최대 1분 실행 시간
- 5GB 월간 스토리지 (CDN 포함)

### Best Practices

1. **파일명에 식별자 포함**
   ```javascript
   // taskId를 파일명에 포함하여 웹훅에서 추출
   output_files: {
     "out_1": `${taskId}_result.mp4`
   }
   ```

2. **에러 처리**
   ```javascript
   if (response.status === 'FAILED') {
     console.error(response.error_message);
   }
   ```

3. **폴링 최적화**
   ```javascript
   // 상태 확인을 위한 간격 조정
   const pollInterval = 2000; // 2초
   ```

## TypeScript Types

```typescript
// Request Types
export interface RunFfmpegCommandRequest {
  input_files: Record<string, string>;
  output_files: Record<string, string>;
  ffmpeg_command: string;
  vcpu_count?: number;
}

export interface RunChainedFfmpegCommandsRequest extends RunFfmpegCommandRequest {
  ffmpeg_commands: string[];
}

export interface StoreFileRequest {
  file_url: string;
}

// Response Types
export interface CommandResponse {
  command_id: string;
}

export interface FileResponse {
  file_id: string;
}

export interface OutputFile {
  file_id: string;
  size_mbytes: number;
  duration?: number;
  file_type: 'video' | 'audio' | 'image';
  file_format: string;
  storage_url: string;
  width?: number;
  height?: number;
  codec?: string;
  frame_rate?: number;
  bitrate_video_kb?: number;
  bitrate_audio_kb?: number;
}

export interface PollCommandResponse {
  command_id: string;
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
  command_type: 'FFMPEG_COMMAND' | 'FFMPEG_CHAINED_COMMANDS';
  vcpu_count: number;
  total_processing_seconds?: number;
  ffmpeg_command_run_seconds?: number;
  output_files?: Record<string, OutputFile>;
  error_status?: string;
  error_message?: string;
  original_request: any;
}

export interface WebhookPayload {
  data: PollCommandResponse;
  timestamp: number;
}
```

## Example Use Cases

### Video Merging
```javascript
const mergeRequest = {
  input_files: {
    "in_1": "https://example.com/video1.mp4",
    "in_2": "https://example.com/video2.mp4"
  },
  output_files: {
    "out_1": `${taskId}_merged.mp4`
  },
  ffmpeg_command: "-i {{in_1}} -i {{in_2}} -filter_complex '[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1' {{out_1}}"
};
```

### Speed Adjustment
```javascript
const speedAdjustRequest = {
  input_files: {
    "in_1": "https://example.com/input.mp4"
  },
  output_files: {
    "out_1": `${taskId}_speed_adjusted.mp4`
  },
  ffmpeg_command: "-i {{in_1}} -filter_complex '[0:v]setpts=0.5*PTS[v];[0:a]atempo=2.0[a]' -map '[v]' -map '[a]' {{out_1}}"
};
```