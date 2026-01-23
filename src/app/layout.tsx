import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'MedAssist AI - Medical Image Analysis',
  description: 'AI-powered medical image analysis assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-medical-bg antialiased">
        {children}
        
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
