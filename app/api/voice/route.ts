import { NextResponse } from "next/server";
import { voiceServerAPI } from '@/api/server/voiceServerAPI';

export async function GET() {
    try {
        const voices = await voiceServerAPI.getVoices();
        return NextResponse.json(voices);
    } catch (error) {
        console.error('Error fetching voices:', error);
        return NextResponse.json(
            { error: 'Failed to fetch voices' },
            { status: 500 }
        );
    }
}