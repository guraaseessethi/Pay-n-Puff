import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { DepartureBoard } from "@/components/public/DepartureBoard";
import { StoreJsonLd } from "@/components/public/StoreJsonLd";
import { RulesBlock, SectionHead, sectionStyles as s, TwoWays, VerifyCta, VisitBlock, WholesaleServices } from "@/components/public/Sections";
import { getSettings } from "@/lib/auth/session";

export default async function Home() {
  const settings = await getSettings();
  return (
    <>
      <StoreJsonLd hours={settings.hours} />
      <div className={s.hero}>
        <svg className={s.trail} viewBox="0 0 1200 520" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-20 430 C 260 380, 380 120, 700 170 S 1100 60, 1240 40" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="14 12" strokeLinecap="round" opacity=".9" />
        </svg>
        <div className={`wrap ${s.heroIn}`}>
          <div>
            <Logo className={s.logo} />
            <h1>
              Downtown Barrie&apos;s <em>late-night</em> vape store.
            </h1>
            <p>
              On Dunlop St East, beside 5 Points Barber. Open till 1 am Friday and Saturday
              {settings.deliveryEnabled ? ", and we deliver to verified adults with an ID check at the door." : "."}
            </p>
            <div className={s.ctas}>
              {settings.ageGateMode !== "info_only" && (
                <Link className="btn hot" href="/verify">
                  Verified adults: shop &amp; order
                </Link>
              )}
              <Link className="btn line" href="/visit">
                Hours &amp; directions
              </Link>
            </div>
          </div>
          <DepartureBoard hours={settings.hours} nowIso={new Date().toISOString()} />
        </div>
      </div>

      <section className={s.s} aria-labelledby="ways-h">
        <div className="wrap">
          <SectionHeadId id="ways-h" label="Two ways to fly" title="Walk in, or we fly to you">
            Pay N&apos; Puff started as a delivery service. Now there&apos;s a counter on Dunlop too.
          </SectionHeadId>
          <TwoWays settings={settings} />
          <p className={s.more}>
            <Link href="/delivery">Delivery rules in full →</Link>
          </p>
        </div>
      </section>

      <section className={`${s.s} ${s.alt}`} aria-labelledby="rules-h">
        <div className="wrap">
          <SectionHeadId id="rules-h" label="Before you board" title="Store rules">
            Ontario law sets these. We follow every one, in the store and at your door.
          </SectionHeadId>
          <RulesBlock minAge={settings.minAge} />
        </div>
      </section>

      <section className={s.s} aria-labelledby="whole-h">
        <div className="wrap">
          <SectionHeadId id="whole-h" label="For retailers" title="Wholesale consultation">
            For registered stores only. Pricing always depends on brand and quantity.
          </SectionHeadId>
          <WholesaleServices />
          <p className={s.more}>
            <Link className="btn line" href="/wholesale">
              Request a consultation
            </Link>
          </p>
        </div>
      </section>

      <section className={`${s.s} ${s.alt}`} aria-labelledby="visit-h">
        <div className="wrap">
          <SectionHeadId id="visit-h" label="Visit" title="Downtown on Dunlop">
            A few minutes up from the waterfront, on Dunlop East&apos;s late-night strip.
          </SectionHeadId>
          <VisitBlock hours={settings.hours} />
        </div>
      </section>

      <section className={s.s} aria-label="Shop">
        <div className="wrap">
          <VerifyCta settings={settings} />
        </div>
      </section>
    </>
  );
}

function SectionHeadId({ id, ...p }: { id: string; label: string; title: string; children?: React.ReactNode }) {
  return (
    <div id={id}>
      <SectionHead {...p} />
    </div>
  );
}
