export interface Voice {
    id: string;
    name: string;
    description: string;
    category: string;
    language: string;
    gender: string;
    age: string;
    accent: string;
    previewUrl?: string;
    labels?: {
        accent?: string;
        descriptive?: string;
        age?: string;
        gender?: string;
        language?: string;
        use_case?: string;
    };
}