import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to silence the error and use default behavior
  turbopack: {},
  async rewrites() {
    return [
      {
        // Forward all /api/* requests to the backend,
        // EXCEPT /api/auth/login which is handled by our Next.js server-side route
        source: '/api/:path*',
        destination: 'http://backend:3001/api/:path*',
        missing: [
          {
            type: 'header',
            key: 'x-nextjs-route-handler',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

