import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, subject, message, patientName } = await request.json();

    if (!email || !message) {
      return NextResponse.json(
        { error: 'Email and message are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Encode for mailto URL
    const encodedSubject = encodeURIComponent(subject || 'Message from Dr.');
    const encodedBody = encodeURIComponent(message);
    
    // Create mailto URL (opens default email client)
    const mailtoUrl = `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;

    // For Gmail specifically (opens Gmail compose)
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodedSubject}&body=${encodedBody}`;

    return NextResponse.json({
      success: true,
      mailtoUrl,
      gmailUrl,
      email,
      message: `Email link generated for ${patientName || 'patient'}`,
    });
  } catch (error: any) {
    console.error('Email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate email link' },
      { status: 500 }
    );
  }
}
