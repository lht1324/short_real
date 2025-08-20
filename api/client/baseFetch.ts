export async function getFetch(route: string) {
    const response = await fetch(route, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        console.error('HTTP error:', response.status, response.statusText);
        throw Error(`[${response.status}] ${response.statusText}`);
    }

    return response;
}

export async function postFetch(route: string, body?: any) {
    const response = await fetch(route, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        console.error('HTTP error:', response.status, response.statusText);
        throw Error(`[${response.status}] ${response.statusText}`);
    }

    return response;
}

export async function patchFetch(route: string, body?: any) {
    const response = await fetch(route, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
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
    const response = await fetch(route, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        console.error('HTTP error:', response.status, response.statusText);
        throw Error(`[${response.status}] ${response.statusText}`);
    }

    return response;
}