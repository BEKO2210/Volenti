import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Volenti — Sag, was du möchtest.',
  description:
    'Volenti ist ein generativer Produktivitäts-Launcher: Du beschreibst dein Ziel, ' +
    'Volenti liefert ein echtes, fertiges Artefakt — Text, Dokument oder Bild.',
  applicationName: 'Volenti',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0b' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body style={{ ['--font-sans' as string]: 'ui-sans-serif, system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
