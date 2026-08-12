import { defineConfig } from "@trigger.dev/sdk/v3";
import { register } from "tsconfig-paths";

register({
    baseUrl: "./",
    paths: {
        "@/*": ["./*"]
    }
});

export default defineConfig({
    project: "proj_veltvttynqdoyyixrhsd",
    machine: "micro",
    runtime: "node",
    logLevel: "log",
    // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
    // You can override this on an individual task.
    // See https://trigger.dev/docs/runs/max-duration
    maxDuration: 3600,
    retries: {
        enabledInDev: true,
        default: {
            maxAttempts: 3,
            minTimeoutInMs: 1000,
            maxTimeoutInMs: 10000,
            factor: 2,
            randomize: true,
        },
    },
    dirs: ["./trigger"],
    // Remotion 렌더러는 런타임에 네이티브 바이너리(compositor, ffmpeg 등)를 node_modules에서 로드하므로
    // esbuild 번들에서 제외하고 배포 이미지의 node_modules에 그대로 유지해야 한다.
    build: {
        external: [
            "@remotion/bundler",
            "@remotion/renderer",
            "@remotion/compositor-linux-x64-gnu",
            "@remotion/media-parser",
            "mediabunny",
        ],
    },
});
