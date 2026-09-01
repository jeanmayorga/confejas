import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@hugeicons/core-free-icons"],
  },
};

export default nextConfig;
