import { waitUntil } from '@vercel/functions';

export function internalFireAndForgetFetch(url: string, options: RequestInit = {}, body?: unknown) {
    const fetchPromise = fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            "Content-Type": "application/json",
            "x-internal-secret": process.env.INTERNAL_FIRE_AND_FORGET_API_SECRET!,
        },
        body: JSON.stringify(body, null, 2),
    }).catch(error => {
        console.error(`[Internal Fetch Error] ${url}:`, error);
    });

    waitUntil(fetchPromise);
}
