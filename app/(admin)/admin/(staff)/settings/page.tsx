import { redirect } from "next/navigation";
import { Settings } from "@/components/admin/pages/Settings";
import { getStaffSession } from "@/lib/auth/session";
export const metadata = { title: "Settings" };
export default async function Page() {
  if ((await getStaffSession())?.role !== "owner") redirect("/admin/today");
  return <Settings />;
}
