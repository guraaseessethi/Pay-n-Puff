import { headers } from "next/headers";
import { STORE } from "@/lib/content/store";
import { toOpeningHoursSpec, type WeekHours } from "@/lib/hours/hours";

/** Local SEO: name, address, contact and hours only. No products, no offers, no prices. */
export async function StoreJsonLd({ hours }: { hours: WeekHours }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const data = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: STORE.name,
    url: site,
    email: STORE.email,
    ...(STORE.phone ? { telephone: STORE.phone } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: STORE.street,
      addressLocality: STORE.city,
      addressRegion: STORE.region,
      postalCode: STORE.postal,
      addressCountry: STORE.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: STORE.geo.lat, longitude: STORE.geo.lng },
    openingHoursSpecification: toOpeningHoursSpec(hours),
  };
  return <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
