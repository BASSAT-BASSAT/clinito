import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    if (!ELEVENLABS_API_KEY) {
      console.error('ElevenLabs API key not configured');
      return NextResponse.json({ error: 'STT not configured' }, { status: 500 });
    }

    // Create form data for ElevenLabs STT
    // ElevenLabs expects 'file' as the parameter name
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append('file', audioFile);
    elevenLabsFormData.append('model_id', 'scribe_v1');

    const response = await fetch(
      'https://api.elevenlabs.io/v1/speech-to-text',
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: elevenLabsFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs STT error:', response.status, errorText);
      return NextResponse.json({ error: 'STT processing failed' }, { status: 500 });
    }

    const data = await response.json();

    return NextResponse.json({ text: data.text || '' });
  } catch (error) {
    console.error('STT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
