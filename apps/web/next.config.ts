import type { NextConfig } from 'next';

const serverInternalApiBaseUrl = (
  process.env.SERVER_INTERNAL_API_BASE_URL ?? 'http://localhost:4000'
).replace(/\/$/, '');

const allowedDevOrigins = Array.from(
  new Set(
    [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.NEXT_PUBLIC_APP_ORIGIN,
    ].filter((value): value is string => Boolean(value)),
  ),
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins,
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${serverInternalApiBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
