import type { MetadataRoute } from "next";

/** Installable driver app (scope /driver). No app-store fees. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pay N' Puff Driver",
    short_name: "PNP Driver",
    description: "Delivery runs and door ID checks for Pay N' Puff drivers.",
    start_url: "/driver",
    scope: "/driver",
    display: "standalone",
    orientation: "portrait",
    background_color: "#2d2142",
    theme_color: "#2d2142",
    icons: [
      { src: "/icons/driver-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/driver-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/driver-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
