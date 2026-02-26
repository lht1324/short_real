export interface MusicGenerationData {
    prompt: string,
    style: string,
    title: string,
    negativeTags: string,
    styleWeight: number,
    weirdnessConstraint: number,
    audioWeight: number
}