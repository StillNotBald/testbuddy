import type { NextConfig } from 'next';

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return {
      // afterFiles: Next filesystem routes (e.g. src/app/api/health/route.ts and the
      // later src/app/api/mcp/route.ts) are matched FIRST and take precedence over
      // these rewrites. Only unmatched /api/* and /_/* paths proxy to PocketBase.
      beforeFiles: [],
      afterFiles: [
        { source: '/api/:path*', destination: `${PB_URL}/api/:path*` },
        { source: '/_/:path*', destination: `${PB_URL}/_/:path*` },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
