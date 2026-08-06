import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.dexerto.com',
      },
      {
        protocol: 'https',
        hostname: 'media.dotesports.com',
      },
      {
        protocol: 'https',
        hostname: 'esportsinsider.com',
      },
    ],
  },
}

export default nextConfig