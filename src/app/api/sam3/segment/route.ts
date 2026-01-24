import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Forward to SAM3 server
    const response = await fetch('http://localhost:8000/segment', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SAM3 error:', error);
      return NextResponse.json(
        { error: 'Segmentation failed', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('SAM3 proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to SAM3 server. Is it running on port 8000?' },
      { status: 500 }
    );
  }
}
