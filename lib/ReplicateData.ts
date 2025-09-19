/**
 * @param image (필수) 입력 이미지의 URL입니다. Data URL 형식도 지원합니다.
 * @param prompt 생성될 비디오에 대한 긍정적인 프롬프트입니다. (default: "")
 * @param negative_prompt 비디오에서 피하고 싶은 요소에 대한 부정적인 프롬프트입니다. (default: "")
 * @param seed (정수) 난수 시드 값입니다. 동일한 시드는 동일한 결과를 생성합니다. 지정하지 않으면 무작위로 생성됩니다. (default: null)
 * @param num_inference_steps (정수) 노이즈 제거 단계의 수입니다. 값이 높을수록 품질이 향상되지만 생성 시간이 길어집니다. (default: 28)
 * @param guidance_scale 프롬프트에 얼마나 충실할지를 결정하는 값입니다. 값이 높을수록 프롬프트를 더 엄격하게 따릅니다. (default: 3.5)
 * @param num_frames (정수) 생성할 비디오의 총 프레임 수입니다. (default: 40)
 * @param motion_scale 비디오의 움직임 강도를 조절합니다. (default: 1)
 * @param frames_per_second (정수) 비디오의 초당 프레임 수 (FPS)입니다. (default: 24)
 * @param enable_safety_checker NSFW(Not Safe For Work) 콘텐츠를 감지하는 안전 필터의 활성화 여부입니다. (default: false)
 * @param enable_prompt_expansion 내부적으로 프롬프트를 확장하여 더 나은 결과를 유도할지 여부입니다. (default: false)
 * @param resolution 비디오의 해상도입니다. 옵션: 576p, 720p, 480p (default: 720p)
 * @param aspect_ratio 비디오의 종횡비입니다. 옵션: 16:9, 9:16, 1:1, 4:5, 2.39:1 (default: 9:16)
 * @param shift 카메라 움직임의 양을 조절합니다. (default: 5)
 */
export interface ReplicateInput {
    image: string;
    prompt?: string;
    negative_prompt?: string;
    seed?: number;
    num_inference_steps?: number;
    guidance_scale?: number;
    num_frames?: number;
    motion_scale?: number;
    frames_per_second?: number;
    enable_safety_checker?: boolean;
    enable_prompt_expansion?: boolean;
    resolution?: VideoResolution;
    aspect_ratio?: VideoAspectRatio;
    shift?: number;
}

/**
 * @param id 예측 작업의 고유 ID (e.g., "pj2y5n7k6zrqjnp5s2fxto6yoe")
 * @param model 사용된 모델 (e.g., "wan-video/wan-2-2-i2v-fast")
 * @param version 사용된 모델의 버전 해시
 * @param input 요청 시 전달했던 입력 값들
 * @param logs 생성 과정에서 발생한 로그
 * @param error 에러가 발생한 경우 에러 정보
 * @param status 현재 작업 상태 ("starting" | "processing" | "succeeded" | "failed" | "canceled")
 * @param output 웹훅(Webhook) 또는 get()으로 받을 최종 결과물. create() 호출 직후에는 항상 'null'입니다.
 * @param created_at 작업 생성 시간 (ISO 8601 형식)
 * @param started_at 작업 시작 시간 (ISO 8601 형식)
 * @param completed_at 작업 완료 시간 (ISO 8601 형식)
 * @param urls 작업 상태 확인 및 취소를 위한 URL 정보
 * @param metrics 성능 측정 지표 (e.g., predict_time)
 */
export interface ReplicatePrediction {
    id: string;
    model: string;
    version: string;
    input: { [key: string]: any };
    logs: string | null;
    error: any | null;
    status: VideoGenerationStatus;
    output: any | null;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
    urls: {
        get: string;
        cancel: string;
    };
    metrics?: {
        predict_time?: number;
    };
}

export const VIDEO_RESOLUTIONS = {
    RES_480P: "480p",
    RES_580P: "576p",
    RES_720P: "720p",
} as const;

export const VIDEO_ASPECT_RATIOS = {
    LANDSCAPE_16_9: "16:9",
    LANDSCAPE_2P39_1: "2.39:1",
    PORTRAIT_9_16: "9:16",
    PORTRAIT_4_5: "4:5",
    SQUARE: "1:1",
} as const;

export const VIDEO_GENERATION_STATUS = {
    STARTING: "starting",
    PROCESSING: "processing",
    SUCCEEDED: "succeeded",
    FAILED: "failed",
    CANCELED: "canceled"
}

// 타입 추출
export type VideoResolution = typeof VIDEO_RESOLUTIONS[keyof typeof VIDEO_RESOLUTIONS];
export type VideoAspectRatio = typeof VIDEO_ASPECT_RATIOS[keyof typeof VIDEO_ASPECT_RATIOS];

export type VideoGenerationStatus = typeof VIDEO_GENERATION_STATUS[keyof typeof VIDEO_GENERATION_STATUS];