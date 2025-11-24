export interface Voice {
    id: string;                    // DeepgramModel.canonical_name
    name: string;                  // DeepgramModel.name
    accent: string;                // DeepgramModel.metadata.accent
    age: string;                   // DeepgramModel.metadata.age
    gender: VoiceGender;
    previewUrl?: string;           // DeepgramModel.metadata.sample
    color?: string;                // DeepgramModel.metadata.color
    imageUrl?: string;             // DeepgramModel.metadata.image
    tags?: string[];               // DeepgramModel.metadata.tags
    useCases?: string[];           // DeepgramModel.metadata.use_cases
}

export interface VoiceSettings {
    encoding?: string;
    sample_rate?: number;
}

export enum VoiceGender {
    MALE = "Male",
    FEMALE = "Female",
    NEUTRAL = "Neutral",
}