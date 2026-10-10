import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: '%s | EsportingHQ',
    default: 'Esports Results and Live Scores',
  },
  description: 'Track live scores, follow tournaments, and explore real-time match stats for FIFA, EA FC, Call of Duty, Valorant, League of Legends, and more.',
  keywords: ['esports', 'live scores', 'tournaments', 'FIFA', 'EA FC', 'Call of Duty', 'Valorant', 'League of Legends', 'esports results', 'gaming', 'Nigeria esports', 'Africa esports'],
  authors: [{ name: 'EsportingHQ' }],
  creator: 'EsportingHQ',
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://esportinghq.com',
    siteName: 'EsportingHQ',
    title: 'Esports Results and Live Scores',
    description: 'Track live scores, follow tournaments, and explore real-time match stats for top esports titles globally.',
    images: [
      {
        url: 'https://esportinghq.com/esportinghq-logo-stacked.png',
        width: 1080,
        height: 1080,
        alt: 'EsportingHQ Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Esports Results and Live Scores',
    description: 'Track live scores, follow tournaments, and explore real-time match stats for top esports titles.',
    images: ['https://esportinghq.com/esportinghq-logo-stacked.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#09090B',
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
      className={`${geistSans.variable} ${geistMono.variable} font-body bg-bg-void text-text-primary antialiased selection:bg-accent-primary/30 selection:text-white`}
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
      </head>
      <body className="min-h-screen flex flex-col relative bg-bg-void text-text-primary">
        <div className="noise-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
