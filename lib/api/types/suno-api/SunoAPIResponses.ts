export interface BaseSunoAPIResponse<T> {
    code: number;
    msg: string;
    data: T;
}

export interface SunoAPIBaseData {
    taskId: string;
}


// (POST) generate (callback)
export interface PostGenerateWebhookPayload {
    callbackType: PostGenerateWebhookType;
    task_id: string;
    data?: GeneratedMusicMetadata[];
}

export enum PostGenerateWebhookType {
    TEXT = "text",
    FIRST = "first",
    COMPLETE = "complete",
    ERROR = "error",
}

export interface GeneratedMusicMetadata {
    id: string;
    audio_url: string;
    source_audio_url: string;
    stream_audio_url: string;
    source_stream_audio_url: string;
    image_url: string;
    source_image_url: string;
    prompt: string;
    model_name: string;
    title: string;
    tags: string;
    createTime: string;
    duration: number;
}


// (GET) generate/record-info
export interface GetGenerateRecordInfoResponse extends SunoAPIBaseData {
    parentMusicId: string,
    param: string,
    response: {
        taskId: string,
        sunoData: SunoMusicData[]
    },
    status: SunoMusicGenerationStatus,
    type: string,
    errorCode: null,
    errorMessage: null
}

export interface SunoMusicData {
    id: string
    audioUrl: string
    streamAudioUrl: string
    imageUrl: string
    prompt: string
    modelName: string
    title: string
    tags: string
    createTime: string
    duration: number
}

export enum SunoMusicGenerationStatus {
    PENDING = "PENDING",
    TEXT_SUCCESS = "TEXT_SUCCESS",
    FIRST_SUCCESS = "FIRST_SUCCESS",
    SUCCESS = "SUCCESS",
    CREATE_TASK_FAILED = "CREATE_TASK_FAILED",
    GENERATE_AUDIO_FAILED = "GENERATE_AUDIO_FAILED",
    CALLBACK_EXCEPTION = "CALLBACK_EXCEPTION",
    SENSITIVE_WORD_ERROR = "SENSITIVE_WORD_ERROR",
}