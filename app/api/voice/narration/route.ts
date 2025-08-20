import { NextRequest, NextResponse } from 'next/server';
import { voiceServerAPI } from '@/api/server/voiceServerAPI';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, voice_id, model_id, voice_settings, output_format } = body;

        if (!text || !voice_id) {
            return NextResponse.json(
                { error: 'text and voice_id are required' },
                { status: 400 }
            );
        }

        const audioStream = await voiceServerAPI.postNarration({
            text,
            voice_id,
            model_id,
            voice_settings,
            output_format
        });

        return new NextResponse(audioStream, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': 'attachment; filename="narration.mp3"'
            }
        });
    } catch (error) {
        console.error('Error generating narration:', error);
        return NextResponse.json(
            { error: 'Failed to generate narration' },
            { status: 500 }
        );
    }
}