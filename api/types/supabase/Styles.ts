export interface Style {
    uiMetadata: StyleUIMetadata;
    generationParams: StyleGenerationParams;
}

export interface StyleUIMetadata {
    id: string;
    label: string;
    thumbnailUrl: string;
}

export interface StyleGenerationParams {
    coreConcept: string;
    visualKeywords: string[];
    negativeGuidance: string;
    preferredFramingLogic: string;
}