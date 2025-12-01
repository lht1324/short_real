export interface PostGenerateRequest {
    prompt: string;
    style: string;
    title: string;
    customMode: boolean;
    instrumental: boolean;
    model: SunoModelType;
    negativeTags: string;
    vocalGender?: SunoVoiceGenderType;
    styleWeight: number;
    weirdnessConstraint: number;
    audioWeight: number;
    callBackUrl: string;
}

export enum SunoModelType {
    V3_5 = "V3_5",
    V4 = "V4",
    V4_5 = "V4_5",
    V4_5PLUS = "V4_5PLUS",
    V5 = "V5",
}

export enum SunoVoiceGenderType {
    MALE = "m",
    FEMALE = "f",
}

export interface GetTaskRequest {
    taskId: string;
}

export interface GetTasksRequest {
    taskIds: string[];
}

