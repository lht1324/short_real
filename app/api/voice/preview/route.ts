import { NextRequest, NextResponse } from 'next/server';
import { voiceServerAPI } from '@/api/server/voiceServerAPI';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, voice_id, model_id } = body;

        if (!text || !voice_id) {
            return NextResponse.json(
                { error: 'text and voice_id are required' },
                { status: 400 }
            );
        }

        const audioStream = await voiceServerAPI.postVoicePreview({
            text,
            voice_id,
            model_id
        });

        return new NextResponse(audioStream, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': 'attachment; filename="preview.mp3"'
            }
        });
    } catch (error) {
        console.error('Error generating voice preview:', error);
        return NextResponse.json(
            { error: 'Failed to generate voice preview' },
            { status: 500 }
        );
    }
}