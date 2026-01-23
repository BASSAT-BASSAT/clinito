import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage { role: 'user' | 'assistant'; content: string; }

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json() as { message: string; context: string; history: ChatMessage[] };
    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    const response = generateMedicalResponse(message, context);
    return NextResponse.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateMedicalResponse(message: string, context: string): string {
  const lowerMessage = message.toLowerCase();
  const disclaimer = "\n\n⚠️ *This is AI-generated information for educational purposes only. Always consult a qualified healthcare professional.*";

  if (context) {
    if (lowerMessage.includes('what') && (lowerMessage.includes('see') || lowerMessage.includes('find'))) {
      return `Based on my analysis: ${context}\n\nThe highlighted region shows the area of interest.${disclaimer}`;
    }
    if (lowerMessage.includes('explain') || lowerMessage.includes('mean')) {
      return `Let me explain the findings:\n\n${context}\n\nIn medical imaging, such findings may warrant further investigation.${disclaimer}`;
    }
    if (lowerMessage.includes('concern') || lowerMessage.includes('serious') || lowerMessage.includes('worry')) {
      return `Regarding your concern:\n\n${context}\n\nImaging findings must be interpreted in full clinical context. A qualified physician should review these images.${disclaimer}`;
    }
    if (lowerMessage.includes('next') || lowerMessage.includes('recommend') || lowerMessage.includes('should')) {
      return `Based on: ${context}\n\nTypical next steps:\n• Clinical correlation with symptoms\n• Review by qualified radiologist\n• Comparison with prior imaging\n• Additional tests as indicated${disclaimer}`;
    }
  }

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return `Hello! I'm your medical imaging assistant. Upload an image and run analysis to get started.${disclaimer}`;
  }
  if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
    return `I can help with:\n\n1. **Image Analysis**: Upload and specify what to look for\n2. **Finding Explanation**: Ask about segmentation results\n3. **General Questions**: Ask about analysis results${disclaimer}`;
  }

  return `I understand you're asking about "${message}". ${context ? `Based on ${context}, ` : ''}Please review the visualization and consider clinical context.${disclaimer}`;
}
