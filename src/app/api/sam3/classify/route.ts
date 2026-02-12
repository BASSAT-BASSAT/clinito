import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Forward to SAM3 server classify endpoint
    const CLASSIFY_TIMEOUT_MS = 60_000; // 1 minute for classification
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLASSIFY_TIMEOUT_MS);
    
    try {
      const response = await fetch('http://localhost:8000/classify', {
        method: 'POST',
        body: formData,
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
        console.error('Classification error:', errorData);
        return NextResponse.json(
          { 
            error: errorData.error || 'Classification failed', 
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
          { error: 'Request timeout', details: 'Classification took too long' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Classification proxy error:', error);
    
    if (error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      return NextResponse.json(
        { 
          error: 'SAM3 server not running', 
          details: 'Classification service unavailable' 
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
