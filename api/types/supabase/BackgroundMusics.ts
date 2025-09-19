export interface BackgroundMusic {
    id: string,
    title: string,
    artist: string,
    themes: string[],
    created_at?: string,
    updated_at?: string,
}

export interface BGMInfo {
    id: string,
    title: string,
    artist: string,
    themes: string[],
    previewUrl: string,
}

export enum BGMType {
    Preview = "preview",
    Full = "full",
}