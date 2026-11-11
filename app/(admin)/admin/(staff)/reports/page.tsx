import { redirect } from "next/navigation";
import { Reports } from "@/components/admin/pages/Reports";
import { getStaffSession } from "@/lib/auth/session";
export const metadata = { title: "Reports" };
export default async function Page() {
  if ((await getStaffSession())?.role !== "owner") redirect("/admin/today");
  return <Reports />;
}
