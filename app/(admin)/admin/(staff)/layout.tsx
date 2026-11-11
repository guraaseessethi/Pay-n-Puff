import { redirect } from "next/navigation";
import { AdminProvider } from "@/components/admin/AdminContext";
import { AdminShell } from "@/components/admin/AdminShell";
import { DemoRibbon } from "@/components/ui/DemoRibbon";
import { getSettings, getStaffSession } from "@/lib/auth/session";
import { counterProducts, seedProducts, seedState } from "@/lib/data/mock/seed.server";

/** Staff-only. Checked on the server; product data is only loaded after the check. */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffSession();
  if (!staff) redirect("/admin");
  if (staff.role === "driver") redirect("/driver");
  const settings = await getSettings();
  const seed = { products: staff.role === "owner" ? seedProducts() : counterProducts(), ...seedState() };
  return (
    <AdminProvider staff={{ role: staff.role, name: staff.name }} settings={settings} seed={seed}>
      <DemoRibbon extra={`signed in as ${staff.name}`} />
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
