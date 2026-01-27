import type { Metadata } from 'next';
import { ConvexClientProvider } from '@/components/ConvexClientProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { ChatbotProvider } from '@/components/ChatbotProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clinito - Doctor Portal',
  description: 'Simple and efficient medical image analysis for doctors',
  keywords: ['medical', 'doctor', 'patients', 'healthcare', 'image analysis'],
  authors: [{ name: 'Clinito' }],
  openGraph: {
    title: 'Clinito - Doctor Portal',
    description: 'Simple medical image analysis and patient management',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="min-h-screen bg-gray-50 antialiased">
        <ConvexClientProvider>
          <AuthProvider>
            {children}
            <ChatbotProvider />
          </AuthProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
