import { createXRay } from "@hellyeah/x-ray/server";

export const tracker = createXRay(
    process.env.NEXT_PUBLIC_HELLYEAH_TRACKER_ID,
    {
        env: process.env.HELLYEAH_TRACKER_ENV,
    }
);
