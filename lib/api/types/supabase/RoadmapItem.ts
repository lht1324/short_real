export interface RoadmapItem {
    id: string;
    title: string;
    description: string;
    status: RoadmapStatus;
    created_at: string;
    updated_at: string;
}

export enum RoadmapStatus {
    LIVE = 0,
    IN_PROGRESS = 1,
    COMING_SOON = 2,
    SKETCH = 3,
}