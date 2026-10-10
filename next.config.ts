import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/attendance-sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
  devIndicators: {
    position: "bottom-right",
  },
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
