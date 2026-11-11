import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Barlow_Condensed, Chewy, DM_Mono, Figtree } from "next/font/google";
import "./globals.css";

// Chewy is for the logo only.
const chewy = Chewy({ weight: "400", subsets: ["latin"], variable: "--font-chewy", display: "swap", preload: false });
const barlow = Barlow_Condensed({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-barlow", display: "swap" });
const figtree = Figtree({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-figtree", display: "swap" });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-dm-mono", display: "swap", preload: false });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pay N' Puff Vapes · 15 Dunlop St E, Barrie · 19+",
    template: "%s · Pay N' Puff Vapes",
  },
  description:
    "Specialty vape store at 15 Dunlop St E in downtown Barrie, beside 5 Points Barber. 19+ only. Open till 1 am Friday and Saturday. Delivery to verified adults with an ID check at the door.",
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#c4207f",
  colorScheme: "light",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the request makes every page dynamic, so each response gets its own CSP nonce (proxy.ts).
  await headers();
  return (
    <html lang="en-CA" className={`${chewy.variable} ${barlow.variable} ${figtree.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
