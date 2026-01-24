import type { Metadata } from 'next';
import Script from 'next/script';
import { ConvexClientProvider } from '@/components/ConvexClientProvider';
import { PatientContextBanner } from '@/components/PatientContextBanner';
import './globals.css';

export const metadata: Metadata = {
  title: 'CLINITO - AI Medical Image Analysis',
  description: 'AI-powered medical image analysis with voice commands. Detect fractures, tumors, and more using SAM 3 technology.',
  keywords: ['medical imaging', 'AI', 'SAM', 'radiology', 'voice commands', 'healthcare'],
  authors: [{ name: 'CLINITO' }],
  openGraph: {
    title: 'CLINITO - AI Medical Image Analysis',
    description: 'Voice-powered medical image analysis using SAM 3 AI',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0a0a0f" />
      </head>
      <body className="min-h-screen bg-[#0a0a0f] antialiased noise">
        <ConvexClientProvider>
          {children}
          <PatientContextBanner />
        </ConvexClientProvider>

        {/* Botpress Chatbot */}
        <Script 
          src="https://cdn.botpress.cloud/webchat/v3.5/inject.js"
          strategy="afterInteractive"
        />
        <Script 
          src="https://files.bpcontent.cloud/2026/01/23/09/20260123091128-V0WNET1N.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
