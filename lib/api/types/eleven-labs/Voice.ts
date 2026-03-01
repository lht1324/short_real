import {SubtitleSegment} from "@/lib/api/types/supabase/VideoGenerationTasks";

export interface Voice {
    id: string;
    name: string;
    description?: string;
    gender: string;
    age: string;
    accent: string;
    descriptive?: string;
    useCase: string;
    previewUrl?: string;
}

export interface VoiceGenerationResult {
    audioBuffer: Buffer<ArrayBuffer>;
    audioBase64: string;
    subtitleSegmentList: SubtitleSegment[];
}

export interface VoiceSettings {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
    speed?: number;
}

export enum VoiceGenerationModelId {
    // 최신 플래그십 모델들
    ELEVEN_V3 = 'eleven_v3',
    ELEVEN_MULTILINGUAL_V2 = 'eleven_multilingual_v2',
    
    // 저지연 모델들  
    ELEVEN_FLASH_V2_5 = 'eleven_flash_v2_5',
    ELEVEN_FLASH_V2 = 'eleven_flash_v2',
    
    // 터보 모델들
    ELEVEN_TURBO_V2_5 = 'eleven_turbo_v2_5', 
    ELEVEN_TURBO_V2 = 'eleven_turbo_v2',
    
    // 레거시 모델들
    ELEVEN_MONOLINGUAL_V1 = 'eleven_monolingual_v1',
    ELEVEN_MULTILINGUAL_V1 = 'eleven_multilingual_v1'
}

export enum VoiceGenerationOutputFormat {
    MP3_128 = 'mp3_44100_128',
    MP3_192 = 'mp3_44100_192',
    MP3_64 = 'mp3_44100_64',
    PCM_16000 = 'pcm_16000',
    PCM_22050 = 'pcm_22050',
    PCM_24000 = 'pcm_24000',
    PCM_44100 = 'pcm_44100'
}