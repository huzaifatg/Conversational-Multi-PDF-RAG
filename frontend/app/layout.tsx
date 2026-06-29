import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Conversational Multi-PDF RAG — Chat with your PDFs',
  description:
    'A local, self-hosted RAG application. Upload PDFs and ask questions, answered with cited sources using Next.js, FastAPI, Qdrant, and Ollama.',
  applicationName: 'Conversational Multi-PDF RAG',
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: 'Conversational Multi-PDF RAG — Chat with your PDFs',
    description: 'Upload PDFs and ask questions, answered with cited sources, entirely on your own machine.',
    type: 'website',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0c0f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
