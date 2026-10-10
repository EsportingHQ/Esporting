import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/contributor/',
          '/organiser/',
          '/dashboard-redirect/',
          '/settings/',
          '/api/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/contributor/',
          '/organiser/',
          '/dashboard-redirect/',
          '/settings/',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://esportinghq.com/sitemap.xml',
    host: 'https://esportinghq.com',
  };
}
