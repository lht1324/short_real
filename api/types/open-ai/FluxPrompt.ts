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
    // 내수용
    id: string; // Entity 매칭용. 실 사용 시 매핑으로 제거 후 넣어주기
    role: 'main_hero' | 'sub_character' | 'prop',
    // 실사용
    type: string;
    description: string;
    clothes: string;
    accessories: string[];
    pose: string;
    position: 'foreground' | 'midground' | 'background';
}

export interface FluxPromptCameraInfo {
    angle: string;
    distance: string;
    focus: string;
    lens: string;
    fNumber: string; // 사용 시 f-number로 매핑
    ISO: number;
}