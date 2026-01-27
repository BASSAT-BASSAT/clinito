import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phone, message, patientName } = await request.json();

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Phone and message are required' },
        { status: 400 }
      );
    }

    // Clean phone number (remove spaces, dashes, etc.)
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Add country code if not present (assuming Egypt +20)
    if (!cleanPhone.startsWith('+')) {
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '+20' + cleanPhone.substring(1);
      } else {
        cleanPhone = '+20' + cleanPhone;
      }
    }

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp click-to-chat URL
    // This opens WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodedMessage}`;

    return NextResponse.json({
      success: true,
      whatsappUrl,
      phone: cleanPhone,
      message: `WhatsApp link generated for ${patientName || 'patient'}`,
    });
  } catch (error: any) {
    console.error('WhatsApp error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate WhatsApp link' },
      { status: 500 }
    );
  }
}
