import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract fields from incoming FormData
    const image = formData.get('image') as File | null;
    const prompt = formData.get('prompt') as string | null;
    const classifier = formData.get('classifier') as string | null;
    
    if (!image || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields', details: 'image and prompt are required' },
        { status: 400 }
      );
    }
    
    // Reconstruct FormData for forwarding to Python server
    const forwardFormData = new FormData();
    forwardFormData.append('image', image, image.name || 'image.png');
    forwardFormData.append('prompt', prompt);
    forwardFormData.append('classifier', classifier || 'biomedclip');
    
    // Forward to SAM3 server segment_and_classify endpoint
    const TIMEOUT_MS = 180_000; // 3 minutes for combined operation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    try {
      const response = await fetch('http://localhost:8000/segment_and_classify', {
        method: 'POST',
        body: forwardFormData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        console.error('Segment+Classify error:', errorData);
        return NextResponse.json(
          { 
            error: errorData.error || 'Analysis failed', 
            details: errorData.details || errorText 
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      return NextResponse.json(result);
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout', details: 'Analysis took too long' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Segment+Classify proxy error:', error);
    
    if (error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      return NextResponse.json(
        { 
          error: 'SAM3 server not running', 
          details: 'Start the Medical-SAM3 server first' 
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
