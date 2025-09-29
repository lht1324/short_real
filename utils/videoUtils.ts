// const VALID_NUM_FRAMES = [81, 89, 97, 105, 113, 121];
const VALID_NUM_FRAMES = [81, 89, 97, 105, 113];
const MIN_FPS = 5;
const MAX_FPS = 30;
const STANDARD_FPS = 24;
const MIN_ACCEPTABLE_FPS = 20;

const MIN_DURATION_PARAMS = {
    num_frames: 81,
    frames_per_second: 30,
    resulting_duration: (81 - 1) / 30, // 2.667s
};
const MAX_DURATION_PARAMS = {
    // num_frames: 121,
    num_frames: 113,
    frames_per_second: 20,
    // resulting_duration: (121 - 1) / 20, // 6.0s
    resulting_duration: (113 - 1) / 20, // 5.6s
};

interface VideoParameters {
    num_frames: number;
    frames_per_second: number;
    resulting_duration: number;
}

export function findOptimalVideoParameters(targetDuration: number): VideoParameters {
    if (targetDuration < MIN_DURATION_PARAMS.resulting_duration) {
        return MIN_DURATION_PARAMS;
    }
    if (targetDuration > MAX_DURATION_PARAMS.resulting_duration) {
        return MAX_DURATION_PARAMS;
    }

    const candidates: VideoParameters[] = [];

    for (const num_frames of VALID_NUM_FRAMES) {
        for (let fps = MIN_FPS; fps <= MAX_FPS; fps++) {
            const duration = (num_frames - 1) / fps;
            candidates.push({
                num_frames: num_frames,
                frames_per_second: fps,
                resulting_duration: duration
            });
        }
    }

    const validCandidates = candidates.filter(c =>
        c.resulting_duration >= targetDuration && c.frames_per_second >= MIN_ACCEPTABLE_FPS
    );

    const bestDuration = Math.min(...validCandidates.map(c => c.resulting_duration));
    const bestCandidates = validCandidates.filter(c => c.resulting_duration === bestDuration);

    if (bestCandidates.length === 1) {
        return bestCandidates[0];
    }

    return bestCandidates.reduce((best, current) => {
        const bestDiff = Math.abs(best.frames_per_second - STANDARD_FPS);
        const currentDiff = Math.abs(current.frames_per_second - STANDARD_FPS);
        return currentDiff < bestDiff ? current : best;
    });
}