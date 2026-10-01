import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@hugeicons/core-free-icons"],
  },
  outputFileTracingIncludes: {
    "/api/participants/*/welcome": ["./public/welcome-footer.png"],
  },
};

export default nextConfig;
