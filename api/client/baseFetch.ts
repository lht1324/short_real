function getRootPath(route: string) {
    const isProd = process.env.NODE_ENV === 'production';

    return isProd || route.includes("http") || route.includes("https")
        ? ""
        : `${process.env.NEXT_PUBLIC_BASE_URL!}`
}

export async function getFetch(route: string) {
    const rootPath = getRootPath(route);
    const response = await fetch(`${rootPath}${route}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': '69420',
        },
    });

    if (!response.ok) {
        console.error('HTTP error:', response.status, response.statusText);
        throw Error(`[${response.status}] ${response.statusText}`);
    }

    return response;
}

export async function postFetch(route: string, body?: unknown) {
    const rootPath = getRootPath(route);
    const response = await fetch(`${rootPath}${route}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': '69420',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        console.error('HTTP error:', response.status, response.statusText);
        throw Error(`[${response.status}] ${response.statusText}`);
    }

    return response;
}

export async function patchFetch(route: string, body?: unknown) {
    const rootPath = getRootPath(route);
    const response = await fetch(`${rootPath}${route}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': '69420',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        console.error('HTTP error:', response.status, response.statusText);
        throw Error(`[${response.status}] ${response.statusText}`);
    }

    return response;
}

export async function deleteFetch(route: string) {
    const rootPath = getRootPath(route);
    const response = await fetch(`${rootPath}${route}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': '69420',
        },
    });

    if (!response.ok) {
        console.error('HTTP error:', response.status, response.statusText);
        throw Error(`[${response.status}] ${response.statusText}`);
    }

    return response;
}