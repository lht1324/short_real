# AI API 연동 플랜
*작성일: 2025년 8월 23일*

## 📋 프로젝트 개요

영상 생성부터 편집까지 AI를 활용한 자동화 파이프라인 구축 계획입니다. 사용자가 스크립트를 입력하면 AI가 영상 대본과 나레이션을 생성하고, 최종적으로 완성된 영상을 다운로드할 수 있는 시스템을 개발합니다.

## 🔄 전체 워크플로우

```
1. 스크립트 작성 → 2. 대본/나레이션 생성 → 3. 영상 생성 → 4. 에디터 통합 → 5. 최종 렌더링
```

## 📝 단계별 상세 계획

### 1단계: 스크립트 작성 (Script Generation)

**현재 상태**: UI 구현 완료 (`WorkspaceCreatePageClient.tsx`)

**처리 방식**:
- **수동 입력**: 사용자가 직접 스크립트 작성
- **AI 생성**: GPT-o4-mini를 통한 자동 스크립트 생성

**구현 대상**:
- [ ] `onGenerateScript` 함수에 실제 OpenAI API 연동
- [ ] 프롬프트 엔지니어링 (주제, 톤앤매너, 길이별 최적화)

**API 연동**:
```typescript
// /api/script/generate
interface ScriptGenerateRequest {
    topic: string;
    theme: 'historical' | 'sci-fi' | 'mystery' | 'adventure' | 'comedy' | 'documentary';
    duration: '15' | '30';
    style: 'cinematic' | 'anime' | 'realistic' | 'cartoon' | 'vintage';
}

interface ScriptGenerateResponse {
    generatedScript: string;
    estimatedDuration: number;
}
```

---

### 2단계: 대본 및 나레이션 생성 (Script Processing)

**사용 모델**: GPT-o4-mini
**처리 내용**:
1. **영상 대본 생성**: Pika v2.2에 전달할 씬별 비주얼 디스크립션
2. **나레이션 텍스트**: ElevenLabs에 전달할 음성 합성용 텍스트
3. **타이밍 정보**: 각 씬별 길이와 나레이션 구간 매칭

**구현 대상**:
- [ ] `/api/script/process` 엔드포인트 생성
- [ ] 씬 분할 로직 구현
- [ ] 타이밍 계산 알고리즘

**API 스키마**:
```typescript
interface ScriptProcessRequest {
    originalScript: string;
    duration: number;
    theme: string;
    style: string;
}

interface ScriptProcessResponse {
    scenes: {
        id: string;
        visualPrompt: string;
        narrationText: string;
        startTime: number;
        endTime: number;
    }[];
    totalDuration: number;
}
```

**프롬프트 전략**:
```
Role: Professional video script writer and scene director
Task: Convert user script into visual scenes and narration
Output: JSON format with scene descriptions and timing
Context: ${theme} theme, ${style} visual style, ${duration}s total
```

---

### 3단계: 영상 생성 및 나레이션 저장 (Media Generation)

#### 3.1 영상 생성 (Pika v2.2 via FAL)

**현재 패키지**: `@fal-ai/client: ^1.6.2` 이미 설치됨

**사용 엔드포인트**: `fal-ai/pika/v2.2/text-to-video`
**비용**: 720p 5초 영상당 $0.20

**구현 대상**:
- [ ] `/api/video/generate` 엔드포인트
- [ ] 비동기 처리 (Queue 시스템)
- [ ] 웹훅 또는 폴링을 통한 상태 확인
- [ ] 생성된 영상 파일 저장 (Supabase Storage)

**FAL API 연동 코드**:
```typescript
import * as fal from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/pika/v2.2/text-to-video", {
    input: {
        prompt: visualPrompt,
        video_duration: sceneDuration,
        video_quality: "720p",
        aspect_ratio: "9:16"
    },
    webhookUrl: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/video-complete`
});
```

#### 3.2 음성 합성 (ElevenLabs)

**현재 패키지**: `@elevenlabs/elevenlabs-js: ^2.10.0` 이미 설치됨

**구현 대상**:
- [ ] `/api/voice/generate` 엔드포인트
- [ ] 선택된 음성 모델 매핑 (josh, emma, alex 등)
- [ ] 생성된 오디오 파일 저장

**ElevenLabs 연동**:
```typescript
import { ElevenLabsApi } from "@elevenlabs/elevenlabs-js";

const elevenlabs = new ElevenLabsApi({
    apiKey: process.env.ELEVENLABS_API_KEY
});

const audio = await elevenlabs.generate({
    voice: voiceId,
    text: narrationText,
    model_id: "eleven_multilingual_v2"
});
```

#### 3.3 데이터베이스 설계 (Supabase)

**테이블 구조**:
```sql
-- projects 테이블
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    title TEXT,
    original_script TEXT,
    status TEXT CHECK (status IN ('processing', 'editing', 'completed', 'failed')),
    settings JSONB, -- theme, duration, style, voice, music
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- scenes 테이블  
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    sequence_number INTEGER,
    visual_prompt TEXT,
    narration_text TEXT,
    start_time DECIMAL,
    end_time DECIMAL,
    video_url TEXT,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- narrations 테이블
CREATE TABLE narrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    audio_url TEXT,
    segments JSONB, -- 자막 구간 정보
    voice_settings JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 4단계: 에디터 통합 (Editor Integration)

**현재 상태**: UI 구현 완료 (`WorkspaceEditorPageClient.tsx`)

**구현 대상**:
- [ ] 생성된 영상 로드 기능
- [ ] 저장된 나레이션 데이터 불러오기
- [ ] 실시간 자막 동기화
- [ ] 씬별 편집 기능 (Re-run, Edit Script)

**API 엔드포인트**:
```typescript
// /api/projects/[id]/editor
interface EditorDataResponse {
    project: ProjectData;
    scenes: SceneData[];
    narration: NarrationData;
    captions: CaptionSegment[];
}
```

**주요 기능**:
1. **씬 재생성**: 특정 씬만 다시 생성
2. **스크립트 편집**: 씬별 스크립트 수정 후 재생성
3. **자막 편집**: 폰트, 색상, 위치 등 실시간 조정
4. **음악 편집**: 배경음악 선택 및 타이밍 조정

---

### 5단계: 최종 렌더링 (Final Rendering)

**사용 기술**: FFmpeg (서버사이드 처리)

**구현 대상**:
- [ ] 서버용 FFmpeg 설치 및 설정
- [ ] 영상 + 자막 + 배경음악 합성
- [ ] 렌더링 큐 시스템
- [ ] 진행 상황 웹소켓 알림

**FFmpeg 처리 파이프라인**:
```bash
# 1. 자막 오버레이
ffmpeg -i video.mp4 -vf "subtitles=captions.srt:force_style='FontName=Arial,FontSize=32'" video_with_subs.mp4

# 2. 배경음악 합성
ffmpeg -i video_with_subs.mp4 -i background_music.mp3 -i narration.mp3 -filter_complex "[1:a][2:a]amix=inputs=2[a]" -map 0:v -map "[a]" final_output.mp4
```

**API 구조**:
```typescript
// /api/projects/[id]/render
interface RenderRequest {
    captionSettings: CaptionSettings;
    musicSettings: MusicSettings;
    exportQuality: '720p' | '1080p';
}

interface RenderResponse {
    taskId: string;
    estimatedTime: number;
}

// WebSocket: /api/ws/render-progress
interface RenderProgress {
    taskId: string;
    progress: number; // 0-100
    currentStep: string;
    downloadUrl?: string;
}
```

---

## 🛠 기술 스택 및 인프라

### API 서비스
- **텍스트 생성**: OpenAI GPT-4o-mini
- **영상 생성**: Pika v2.2 (via FAL)
- **음성 합성**: ElevenLabs
- **영상 처리**: FFmpeg

### 백엔드 인프라
- **데이터베이스**: Supabase PostgreSQL
- **파일 저장소**: Supabase Storage
- **인증**: Supabase Auth
- **실시간 통신**: Supabase Realtime / WebSocket

### 프론트엔드
- **프레임워크**: Next.js 15.4.6
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **아이콘**: Lucide React

---

## 💰 비용 예측 (영상 1개 기준)

### 30초 영상 생성 비용
- **GPT-4o-mini** (스크립트 + 대본 생성): ~$0.01
- **Pika v2.2** (씬 6개 × $0.20): ~$1.20
- **ElevenLabs** (30초 음성): ~$0.05
- **서버 비용** (렌더링): ~$0.02
- **총 예상 비용**: ~$1.28/영상

### 확장성 고려사항
- 월 1000개 영상 생성 시: ~$1,280
- Supabase 저장소 비용 별도
- CDN 전송 비용 별도

---

## 📅 구현 일정

### Phase 1: 기본 파이프라인 (2주)
- [ ] OpenAI API 연동
- [ ] Pika API 연동
- [ ] ElevenLabs API 연동
- [ ] 기본 데이터베이스 설계

### Phase 2: 고도화 (2주)
- [ ] 비동기 처리 시스템
- [ ] 에디터 기능 완성
- [ ] FFmpeg 렌더링

### Phase 3: 최적화 (1주)
- [ ] 에러 핸들링
- [ ] 성능 최적화
- [ ] 모니터링 시스템

---

## 🚨 리스크 및 대응방안

### 기술적 리스크
1. **API 응답 지연**: 타임아웃 설정 및 재시도 로직
2. **영상 생성 실패**: 대체 프롬프트 자동 생성
3. **서버 과부하**: Queue 시스템 및 Rate Limiting

### 비즈니스 리스크
1. **API 비용 급증**: 사용량 모니터링 및 알림
2. **품질 일관성**: 프롬프트 템플릿 표준화
3. **저작권 문제**: AI 생성 콘텐츠 라이선스 명시

---

## 🔧 개발 환경 설정

### 환경 변수
```env
# OpenAI
OPENAI_API_KEY=sk-...

# FAL AI
FAL_KEY=...

# ElevenLabs  
ELEVENLABS_API_KEY=...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# 기타
NEXT_PUBLIC_URL=http://localhost:3000
```

### 추가 패키지 설치 예정
```json
{
    "dependencies": {
        "openai": "^4.52.0",
        "ws": "^8.17.0",
        "bull": "^4.12.0",
        "ioredis": "^5.4.0"
    }
}
```

이 계획을 단계별로 실행하여 완전한 AI 영상 생성 파이프라인을 구축할 예정입니다.