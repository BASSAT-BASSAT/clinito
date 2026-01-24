import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@gradio/client';

const HF_TOKEN = process.env.HF_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const prompt = formData.get('prompt') as string;

    if (!imageFile || !prompt) {
      return NextResponse.json(
        { error: 'Image and prompt are required' },
        { status: 400 }
      );
    }

    // Convert image to base64 for the API
    const imageBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageFile.type || 'image/png';
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    console.log('Connecting to SAM3 HuggingFace Space...');
    
    // Connect to the HuggingFace Space
    const client = await Client.connect("akhaliq/sam3", {
      token: HF_TOKEN as `hf_${string}`,
    });

    console.log(`Running segmentation for prompt: "${prompt}"`);

    // Call the segment API with lower thresholds
    const result = await client.predict("/segment", {
      image: {
        url: dataUrl,
        path: null,
        size: imageBuffer.byteLength,
        orig_name: imageFile.name,
        mime_type: mimeType,
        is_stream: false,
        meta: {},
      },
      text: prompt,
      threshold: 0.2,        // Detection threshold (20% - more sensitive)
      mask_threshold: 0.3,   // Mask threshold (lower for more coverage)
    });

    console.log('SAM3 API response received');
    console.log('Raw result:', JSON.stringify(result.data, null, 2));

    // Parse the result
    const data = result.data as [
      { image: string; annotations: Array<{ image: string; label: string }> },
      string
    ];

    const annotatedResult = data[0];
    const infoText = data[1];

    // Check if we got any annotations/masks
    if (!annotatedResult.annotations || annotatedResult.annotations.length === 0) {
      if (annotatedResult.image) {
        return NextResponse.json({
          success: true,
          mask_url: annotatedResult.image,
          description: `🔬 SAM3 analyzed "${prompt}". ${infoText}\n\n⚠️ This AI highlights visual features for reference only.`,
          confidence: 0.5,
          stats: { mode: 'sam3-cloud', prompt, info: infoText, used_main_image: true },
        });
      }
      
      return NextResponse.json({
        success: true,
        mask_url: null,
        description: `No regions detected for "${prompt}". Try a different prompt.`,
        confidence: 0.2,
        stats: { mode: 'sam3-cloud', prompt, info: infoText },
      });
    }

    // Get the FIRST annotation (highest confidence)
    const bestAnnotation = annotatedResult.annotations[0];
    const maskUrl = bestAnnotation.image;

    // Parse confidence from label if available
    let confidence = 0.7;
    const labelMatch = bestAnnotation.label?.match(/\((\d+\.?\d*)%?\)/);
    if (labelMatch) {
      confidence = parseFloat(labelMatch[1]) / 100;
    }

    const description = (
      `🔬 SAM3 detected "${prompt}" - showing highest confidence region. ` +
      `Found ${annotatedResult.annotations.length} total region(s). ` +
      `\n\n${infoText}` +
      `\n\n⚠️ This AI highlights visual features for reference only. ` +
      `ALWAYS consult a qualified physician for medical interpretation.`
    );

    return NextResponse.json({
      success: true,
      mask_url: maskUrl,
      description,
      confidence,
      stats: {
        mode: 'sam3-cloud',
        prompt,
        annotations_count: annotatedResult.annotations.length,
        label: bestAnnotation.label,
        info: infoText,
      },
    });

  } catch (error) {
    console.error('SAM3 Cloud API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      mask_url: null,
      description: `Cloud analysis failed: ${errorMessage.slice(0, 100)}. Please try again.`,
      confidence: 0,
      stats: { error: errorMessage.slice(0, 200) },
    }, { status: 500 });
  }
}
