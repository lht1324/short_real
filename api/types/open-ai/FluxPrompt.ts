export interface FluxPrompt {
    scene: string;
    subjects: FluxPromptSubject[];
    style: string;
    color_palette: string[]; // RGB Hex (#[00~FF][00~FF][00~FF])
    lighting: string;
    mood: string;
    background: string;
    composition: string;
    camera: FluxPromptCameraInfo;
    effects: string[];
}

export interface FluxPromptSubject {
    type: string;
    description: string;
    pose: string;
    position: string;
}

export interface FluxPromptCameraInfo {
    angle: string;
    distance: string;
    focus: string;
    lens: string;
    fNumber: string; // 사용 시 f-number로 매핑
    ISO: number;
}