import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    console.log('Transcribe API route called');
    
    const formData = await request.formData();
    const audioFile = formData.get('file') as File;

    if (!audioFile) {
      console.error('No audio file provided');
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('Audio file received:', {
      type: audioFile.type,
      size: audioFile.size,
      name: audioFile.name
    });

    // Create a File object that OpenAI can accept
    const file = new File([audioFile], 'audio.wav', {
      type: audioFile.type,
    });

    console.log('Calling OpenAI transcription API');
    const response = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
    });

    console.log('Transcription successful:', response);
    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error('Detailed transcription error:', error);
    return NextResponse.json(
      { error: 'Error transcribing audio', details: error.message },
      { status: 500 }
    );
  }
}