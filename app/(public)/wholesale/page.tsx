import type { Metadata } from "next";
import { PageHead, sectionStyles as s, WholesaleServices } from "@/components/public/Sections";
import { WholesaleForm } from "@/components/public/WholesaleForm";

export const metadata: Metadata = { title: "Wholesale consultation", description: "Wholesale consultations for registered retailers: fair-price review, price match and market overview." };

export default function WholesalePage() {
  return (
    <>
      <PageHead label="For retailers" title="Wholesale consultation">
        For registered stores only. Pricing always depends on brand and quantity, so we don&apos;t publish a price list.
      </PageHead>
      <section className={s.s}>
        <div className="wrap">
          <div className={s.whole}>
            <WholesaleServices />
            <WholesaleForm />
          </div>
        </div>
      </section>
    </>
  );
}
