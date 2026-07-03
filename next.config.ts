import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow uploads up to 100MB through route handlers (default is 10MB)
    proxyClientMaxBodySize: '100mb',
  },
};

export default nextConfig;
