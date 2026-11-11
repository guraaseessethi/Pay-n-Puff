import { Suspense } from "react";
import { Checkout } from "@/components/admin/pages/Checkout";
export const metadata = { title: "Checkout" };
export default function Page() {
  return (
    <Suspense>
      <Checkout />
    </Suspense>
  );
}
