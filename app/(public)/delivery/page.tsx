import type { Metadata } from "next";
import Link from "next/link";
import { DeliveryRules, PageHead, sectionStyles as s, TwoWays } from "@/components/public/Sections";
import { getSettings } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Pickup & delivery", description: "How pickup and delivery work at Pay N' Puff: verified adults only, photo ID at the door, no ID no handoff." };

export default async function DeliveryPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHead label="Two ways to fly" title="Pickup & delivery">
        Walk in to the counter on Dunlop, or have it flown to you. Either way, there&apos;s an ID check.
      </PageHead>
      <section className={s.s}>
        <div className="wrap">
          <TwoWays settings={settings} />
        </div>
      </section>
      <section className={`${s.s} ${s.alt}`} aria-labelledby="dr-h">
        <div className="wrap">
          <div className={s.sh}>
            <div>
              <div className="lab">Delivery rules</div>
              <h2 id="dr-h">How a delivery lands</h2>
            </div>
            <p>Ontario requires the buyer&apos;s age to be verified before an online sale, and the person who receives it to be {settings.minAge}+.</p>
          </div>
          {settings.deliveryEnabled ? <DeliveryRules settings={settings} /> : <p className="warnbox">Delivery is switched off right now. Visit the store instead.</p>}
          {settings.reservationsEnabled && (
            <div className={s.card} style={{ marginTop: 24 }}>
              <h3>Pickup holds</h3>
              <p className="muted" style={{ margin: 0 }}>
                Verified adults can hold an order for {settings.holdHours} hours. Bring photo ID that matches the name on the hold, and pay at the counter.
              </p>
            </div>
          )}
          {settings.ageGateMode !== "info_only" && (
            <p className={s.more}>
              <Link className="btn hot" href="/verify">
                Get verified to order
              </Link>
            </p>
          )}
        </div>
      </section>
    </>
  );
}
