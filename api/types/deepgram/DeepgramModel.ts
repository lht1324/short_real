export interface DeepgramModel {
    name: string;
    canonical_name: string;
    architecture: string;
    languages?: string[];
    version: string;
    uuid: string;
    metadata?: DeepgramModelMetadata;
}

export interface DeepgramModelMetadata {
    accent: string;
    age: string;
    color: string;
    image: string;
    sample: string;
    tags: string[];
    use_cases: string[];
}