export async function imageUrlToBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch image: ${url} (Status: ${response.status})`);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const base64String = buffer.toString('base64');

        return `data:${contentType};base64,${base64String}`;
    } catch (error) {
        console.error(`Error converting image to base64: ${url}`, error);
        return null;
    }
}