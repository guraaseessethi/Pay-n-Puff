import type { Metadata } from "next";
import { PageHead, sectionStyles as s, VisitBlock } from "@/components/public/Sections";
import { StoreJsonLd } from "@/components/public/StoreJsonLd";
import { getSettings } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Visit: hours & directions", description: "Hours and directions for Pay N' Puff Vapes, 15 Dunlop St E, Barrie. 19+ only." };

export default async function VisitPage() {
  const settings = await getSettings();
  return (
    <>
      <StoreJsonLd hours={settings.hours} />
      <PageHead label="Visit" title="Downtown on Dunlop">
        15 Dunlop St E, beside 5 Points Barber. Bring photo ID if you look under 25.
      </PageHead>
      <section className={s.s}>
        <div className="wrap">
          <VisitBlock hours={settings.hours} />
        </div>
      </section>
    </>
  );
}
