export interface PostOpenAISceneRequest {
    taskId?: string; // 첫 호출 시 undefined
    narrationScript: string;
    voiceId: string;
    styleId?: string;
}