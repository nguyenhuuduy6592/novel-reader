import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.truyenchucv.org',
      },
    ],
  },
  turbopack: {},
}

export default nextConfig
