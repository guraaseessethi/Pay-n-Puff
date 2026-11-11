import type { MetadataRoute } from "next";

/** Public routes only. The shelf, back office and driver view are never listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return ["", "/visit", "/rules", "/delivery", "/wholesale", "/verify"].map((p) => ({
    url: `${site}${p}`,
    changeFrequency: "monthly",
    priority: p === "" ? 1 : 0.6,
  }));
}
