import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1ec9172a-6e8b-4217-9818-a09534c09c81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/sam3/segment/route.ts:4',message:'SAM3 segment API called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  try {
    const formData = await request.formData();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1ec9172a-6e8b-4217-9818-a09534c09c81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/sam3/segment/route.ts:8',message:'Before SAM3 fetch',data:{targetUrl:'http://localhost:8000/segment'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    
    // Forward to SAM3 server with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch('http://localhost:8000/segment', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1ec9172a-6e8b-4217-9818-a09534c09c81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/sam3/segment/route.ts:20',message:'SAM3 fetch response received',data:{ok:response.ok,status:response.status,statusText:response.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        console.error('SAM3 error:', errorData);
        return NextResponse.json(
          { 
            error: errorData.error || 'Segmentation failed', 
            details: errorData.details || errorText 
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1ec9172a-6e8b-4217-9818-a09534c09c81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/sam3/segment/route.ts:40',message:'SAM3 response parsed',data:{hasMaskUrl:!!result.mask_url,hasMaskDataUrl:!!result.maskDataUrl,hasOverlayDataUrl:!!result.overlayDataUrl,keys:Object.keys(result)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      
      // Handle different response formats
      const responseData: any = {
        mask_url: result.mask_url || result.maskDataUrl || result.overlayDataUrl,
        description: result.description || result.summary || 'Segmentation complete',
        confidence: result.confidence || (result.metrics?.confidence === 'High' ? 0.9 : 0.5),
      };
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1ec9172a-6e8b-4217-9818-a09534c09c81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/sam3/segment/route.ts:48',message:'Returning response data',data:{hasMaskUrl:!!responseData.mask_url,hasDescription:!!responseData.description,confidence:responseData.confidence},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H6'})}).catch(()=>{});
      // #endregion
      
      return NextResponse.json(responseData);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout', details: 'SAM3 server took too long to respond' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('SAM3 proxy error:', error);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1ec9172a-6e8b-4217-9818-a09534c09c81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/sam3/segment/route.ts:58',message:'SAM3 error caught',data:{errorCode:error?.code,errorMessage:error?.message,errorName:error?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    
    // Check if it's a connection error
    if (error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1ec9172a-6e8b-4217-9818-a09534c09c81',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/sam3/segment/route.ts:63',message:'Connection error detected',data:{isECONNREFUSED:error.code==='ECONNREFUSED',hasFetchFailed:error.message?.includes('fetch failed')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { 
          error: 'SAM3 server not running', 
          details: 'Start the SAM3 server with: python sam3-server/main.py or cd sam3-server && python main.py' 
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to connect to SAM3 server', 
        details: error.message || 'Is the SAM3 server running on port 8000?' 
      },
      { status: 500 }
    );
  }
}
