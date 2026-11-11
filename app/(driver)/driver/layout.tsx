import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { AdminProvider } from "@/components/admin/AdminContext";
import { DriverShell } from "@/components/driver/DriverShell";
import { Toaster } from "@/components/ui/Toast";
import { getSettings, getStaffSession } from "@/lib/auth/session";
import { seedState } from "@/lib/data/mock/seed.server";

export const metadata: Metadata = {
  title: { default: "Driver", template: "%s · Driver" },
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "PNP Driver", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#2d2142" };

/**
 * Driver view. Staff session required. Drivers get only what they need for a handoff:
 * first name + initial, address, items, total, payment method. No customer history, no full names.
 */
export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffSession();
  if (!staff) redirect("/admin");
  const settings = await getSettings();
  const s = seedState();
  const seed = {
    products: [],
    ...s,
    orders: s.orders.map((o) => ({ ...o, recipientName: o.recipientShort, contact: undefined })),
  };
  const me = staff.role === "driver" ? staff.name : "Driver 1";
  return (
    <AdminProvider staff={{ role: staff.role, name: me }} settings={settings} seed={seed}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <DriverShell previewing={staff.role !== "driver"}>{children}</DriverShell>
      <Toaster />
    </AdminProvider>
  );
}
