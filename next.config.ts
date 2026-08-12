import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    // Allow uploads up to 100MB through route handlers (default is 10MB)
    proxyClientMaxBodySize: '100mb',
  },
  outputFileTracingExcludes: {
    '*': ['storage/**/*'],
  },
  async headers() {
    return [
      {
        source: "/api/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
