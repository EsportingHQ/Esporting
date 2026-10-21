import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://esportinghq.com'),
  title: {
    default: 'Esports Results and Live Score | Esporting',
    template: '%s | Esporting',
  },
  description:
    'Track real-time esports scores, live match results, tournament brackets, standings, and competitive gaming analytics.',
  applicationName: 'Esporting',
  keywords: [
    'Esports results',
    'live score',
    'esports live score',
    'esports results and live score',
    'esports match results',
    'tournament brackets',
    'live tournament standings',
    'African esports',
    'Nigeria esports live scores',
    'competitive gaming analytics',
    'Esporting',
    'EsportingHQ',
  ],
  authors: [{ name: 'Esporting', url: 'https://esportinghq.com' }],
  creator: 'Esporting',
  publisher: 'Esporting',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://esportinghq.com',
    siteName: 'Esporting',
    title: 'Esports Results and Live Score | Esporting',
    description:
      'Track real-time esports scores, live match results, tournament brackets, standings, and competitive gaming analytics.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Esporting — Esports Results and Live Score',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Esports Results and Live Score | Esporting',
    description:
      'Track real-time esports scores, live match results, tournament brackets, and competitive gaming analytics.',
    creator: '@esportinghq',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-48x48.png', type: 'image/png', sizes: '48x48' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'esports',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#09090B',
};

const jsonLdData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://esportinghq.com/#website',
      url: 'https://esportinghq.com',
      name: 'Esporting',
      alternateName: ['EsportingHQ', 'Esporting HQ'],
      description:
        'Live esports scores, tournament schedules, real-time match results, and competitive gaming analytics.',
      inLanguage: 'en-US',
    },
    {
      '@type': 'SportsOrganization',
      '@id': 'https://esportinghq.com/#organization',
      name: 'Esporting',
      url: 'https://esportinghq.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://esportinghq.com/icon-512.png',
        width: 512,
        height: 512,
      },
      image: 'https://esportinghq.com/og-image.png',
      description:
        'Premier live esports platform tracking real-time match scores, tournament brackets, and player statistics.',
      sameAs: ['https://twitter.com/esportinghq'],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} font-body bg-bg-void text-text-primary antialiased selection:bg-accent-primary/30 selection:text-text-primary`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('esporting_theme');
                  if (saved && saved !== 'system') {
                    document.documentElement.setAttribute('data-theme', saved);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdData),
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col relative bg-bg-void text-text-primary">
        <div className="noise-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
