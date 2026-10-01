import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@hugeicons/core-free-icons"],
  },
  outputFileTracingIncludes: {
    "/api/participants/*/welcome": [
      "./public/welcome-footer-pdf.jpg",
      "./public/welcome-header-pdf.jpg",
    ],
  },
};

export default nextConfig;
