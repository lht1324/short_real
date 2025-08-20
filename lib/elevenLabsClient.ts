import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const elevenLabsClient = new ElevenLabsClient({
    apiKey: process.env.ELEVEN_LABS_API_KEY!
});

export { elevenLabsClient };