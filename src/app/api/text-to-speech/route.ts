import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('Text-to-speech API route called');
    
    const { text } = await request.json();
    console.log('Received text for conversion:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    
    if (!ELEVENLABS_API_KEY) {
      console.error('ElevenLabs API key is missing');
      return NextResponse.json(
        { error: 'ElevenLabs API key is not configured' },
        { status: 500 }
      );
    }
    
    const VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam voice
    console.log('Using voice ID:', VOICE_ID);

    console.log('Sending request to ElevenLabs API...');
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    // Log the response status and headers
    console.log('ElevenLabs response status:', response.status);
    console.log('ElevenLabs response status text:', response.statusText);
    
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('ElevenLabs response headers:', headers);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('ElevenLabs API error body:', errorBody);
      
      let errorMessage = `Failed to generate speech: ${response.status} ${response.statusText}`;
      try {
        // Try to parse the error as JSON for more details
        const errorJson = JSON.parse(errorBody);
        if (errorJson.detail) {
          errorMessage += ` - ${errorJson.detail}`;
        }
      } catch (e) {
        // If parsing fails, use the raw error body
        errorMessage += ` - ${errorBody.substring(0, 200)}`;
      }
      
      console.error(errorMessage);
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    console.log('Successfully received audio from ElevenLabs');
    const audioBuffer = await response.arrayBuffer();
    console.log('Audio buffer size:', audioBuffer.byteLength);
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Text-to-speech detailed error:', error);
    
    // Get stack trace
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Error generating speech', 
        message: error.message,
        stack: error instanceof Error ? error.stack : 'No stack trace available'
      },
      { status: 500 }
    );
  }
}