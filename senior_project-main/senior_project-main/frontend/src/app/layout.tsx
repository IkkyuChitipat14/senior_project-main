 
// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'MFU WiFi',
  description: 'Login with Face Scan and Thai ID',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body>
        <Suspense fallback={<div>Loading...</div>}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}