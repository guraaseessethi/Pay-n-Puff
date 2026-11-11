import { redirect } from "next/navigation";
import { Wholesale } from "@/components/admin/pages/Wholesale";
import { getStaffSession } from "@/lib/auth/session";
export const metadata = { title: "Wholesale" };
export default async function Page() {
  if ((await getStaffSession())?.role !== "owner") redirect("/admin/today");
  return <Wholesale />;
}
