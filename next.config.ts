import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    // Allow uploads up to 100MB through route handlers (default is 10MB)
    proxyClientMaxBodySize: '100mb',
  },
};

export default nextConfig;
