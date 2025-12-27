export interface FluxPrompt {
    scene: string;
    subjects: FluxPromptSubject[];
    style: string;
    color_palette: string[]; // RGB Hex (#[00~FF][00~FF][00~FF])
    lighting: string;
    mood: string;
    background: string;
    composition: "rule of thirds" | "circular arrangement" | "framed by foreground" | "minimalist negative space" | "S-curve" | "vanishing point center" | "dynamic off-center" | "leading leads" | "golden spiral" | "diagonal energy" | "strong verticals" | "triangular arrangement";
    camera: FluxPromptCameraInfo;
    effects: string[];
}

export interface FluxPromptSubject {
    id: string; // Entity 매칭용. 실 사용 시 매핑으로 제거 후 넣어주기
    type: string;
    description: string;
    pose: string;
    position: 'foreground' | 'midground' | 'background';
}

export interface FluxPromptCameraInfo {
    angle: "eye level" | "low angle" | "slightly low" | "bird's-eye" | "worm's-eye" | "over-the-shoulder" | "isometric";
    distance: "close-up" | "medium close-up" | "medium shot" | "medium wide" | "wide shot" | "extreme wide";
    focus: "deep focus" | "macro focus" | "soft background" | "selective focus" | "sharp on subject";
    lens: "14mm" | "24mm" | "35mm" | "50mm" | "70mm" | "85mm";
    fNumber: string; // 사용 시 f-number로 매핑
    ISO: number;
}