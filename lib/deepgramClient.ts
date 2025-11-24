import { createClient } from "@deepgram/sdk";

// Deepgram API Key가 .env에 설정되어 있어야 합니다.
const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY!);

export { deepgramClient };
