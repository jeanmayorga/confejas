import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Confejas Staff",
    short_name: "Confejas",
    description: "Check-in y gestión de participantes de Confejas.",
    start_url: "/dashboard/check-in",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#e8f8ff",
    theme_color: "#046db0",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
