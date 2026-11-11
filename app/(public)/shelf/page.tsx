import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HealthWarning } from "@/components/ui/HealthWarning";
import { Shelf } from "@/components/public/Shelf";
import { SignOut } from "@/components/public/VerifyFlows";
import { sectionStyles as s } from "@/components/public/Sections";
import { VerifyTag } from "@/components/ui/VerifyTag";
import { requireShelfAccess } from "@/lib/auth/session";
import { shelfProducts } from "@/lib/data/mock/seed.server";

export const metadata: Metadata = { title: "The shelf (verified adults)", robots: { index: false, follow: false } };

/**
 * Verified-only. The signed cookie is checked HERE on the server before any product data is loaded,
 * so an unverified request never receives product names or prices in HTML or the RSC payload.
 */
export default async function ShelfPage() {
  const access = await requireShelfAccess();
  if (!access) redirect("/verify");
  const { session, settings } = access;
  const products = shelfProducts();

  return (
    <section className={s.s}>
      <div className="wrap">
        <HealthWarning />
        <div className={s.sh} style={{ marginTop: 22, marginBottom: 18 }}>
          <div>
            <div className="lab">The shelf · verified adult</div>
            <h1 style={{ fontFamily: "var(--board)", fontSize: "clamp(32px,4.4vw,48px)", lineHeight: 1, textTransform: "uppercase", marginTop: 6 }}>In stock tonight</h1>
          </div>
          <p>
            Signed in as <b>{session.name}</b>. Prices include tax. <span className="confirm">stock levels are a demo</span>{" "}
            <VerifyTag note="Every product, price, nicotine level and stamp needs confirming" /> <SignOut />
          </p>
        </div>
        <Shelf
          products={products}
          customerName={session.name}
          minAge={settings.minAge}
          deliveryEnabled={settings.deliveryEnabled}
          reservationsEnabled={settings.reservationsEnabled}
          holdHours={settings.holdHours}
          delivery={{
            fsas: settings.delivery.fsas,
            feeCents: settings.delivery.feeCents,
            minimumCents: settings.delivery.minimumCents,
            windows: settings.delivery.windows,
            payment: settings.delivery.payment,
          }}
        />
      </div>
    </section>
  );
}
