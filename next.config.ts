import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/cardgames',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
