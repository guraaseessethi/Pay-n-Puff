import Link from "next/link";
import { VerifyTag } from "@/components/ui/VerifyTag";
import { ADDRESS_ONE_LINE, DELIVERY_RULES, STORE, STORE_RULES, WHOLESALE_SERVICES } from "@/lib/content/store";
import { DAY_NAMES, formatDay, torontoParts, WEEK_ORDER, type WeekHours } from "@/lib/hours/hours";
import type { Settings } from "@/lib/settings/schema";
import { formatCents } from "@/lib/money";
import s from "./Sections.module.css";

export { s as sectionStyles };

export function PageHead({ label, title, children }: { label: string; title: string; children?: React.ReactNode }) {
  return (
    <div className={s.pageHead}>
      <div className="wrap">
        <div className="lab">{label}</div>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
    </div>
  );
}

export function SectionHead({ label, title, children, as = "h2" }: { label: string; title: string; children?: React.ReactNode; as?: "h1" | "h2" }) {
  const H = as;
  return (
    <div className={s.sh}>
      <div>
        <div className="lab">{label}</div>
        <H>{title}</H>
      </div>
      {children && <p>{children}</p>}
    </div>
  );
}

export function TwoWays({ settings }: { settings: Settings }) {
  const minAge = settings.minAge;
  return (
    <div className={s.passes}>
      <div className={s.pass}>
        <div className={s.pm}>
          <div className="lab">In store</div>
          <h3>{STORE.street}</h3>
          <p>Come in, ask questions, and see what&apos;s in stock. Staff can walk you through devices and nicotine strengths.</p>
          <ul>
            <li>Open till 1 am Friday &amp; Saturday</li>
            {settings.reservationsEnabled && <li>Verified adults can hold an order online and pick it up with ID</li>}
            <li>
              Device and battery drop-off for recycling <VerifyTag note="Confirm the store takes devices/batteries for recycling" />
            </li>
          </ul>
        </div>
        <div className={s.stub} aria-hidden="true">
          <span>Gate</span>
          <b>15</b>
          <span>Dunlop E</span>
        </div>
      </div>
      <div className={`${s.pass} ${s.del}`}>
        <div className={s.pm}>
          <div className="lab">Delivery</div>
          <h3>We&apos;ll fly to you</h3>
          {settings.deliveryEnabled ? (
            <>
              <p>Order after your age and ID are verified. The driver checks photo ID at the door before handing anything over.</p>
              <ul>
                <li>Recipient must be {minAge}+ and named on the order</li>
                <li>No ID, no handoff. The order comes back to the store</li>
                <li>Bags are labelled &quot;Must be received by a person {minAge}+&quot;</li>
              </ul>
            </>
          ) : (
            <p>Delivery is paused. Visit us on Dunlop St.</p>
          )}
        </div>
        <div className={s.stub} aria-hidden="true">
          <span>Flight</span>
          <b>PNP</b>
          <span>To your door</span>
        </div>
      </div>
    </div>
  );
}

export function RulesBlock({ minAge }: { minAge: number }) {
  return (
    <div className={s.rules}>
      <div className={s.rulebox}>
        <ol>
          {STORE_RULES(minAge).map((r) => (
            <li key={r.b}>
              <b>{r.b}</b> {r.t}
            </li>
          ))}
        </ol>
      </div>
      <QuitBox />
    </div>
  );
}

export function QuitBox() {
  return (
    <div className={s.quit}>
      <div className="lab">Thinking about quitting?</div>
      <h3>Free help is available.</h3>
      <p>Health Canada lists free quit-smoking and quit-vaping support, including coaching by phone, text and online.</p>
      <a className="btn line sm" href={STORE.quitUrl} rel="noopener">
        Health Canada resources
      </a>
    </div>
  );
}

export function DeliveryRules({ settings }: { settings: Settings }) {
  const pay = [settings.delivery.payment.cash && "cash", settings.delivery.payment.etransfer && "e-Transfer"].filter(Boolean).join(" or ");
  return (
    <div className={s.rules}>
      <div className={s.rulebox}>
        <ol>
          {DELIVERY_RULES(settings.minAge)
            .map((r) => (r.startsWith("Pay on delivery") ? `Pay on delivery by ${pay}. No card payments online.` : r))
            .map((r) => (
              <li key={r}>{r}</li>
            ))}
        </ol>
      </div>
      <div className={s.card}>
        <h3>
          Area, fee and minimum <VerifyTag note="Confirm delivery zone, fee, minimum order and delivery hours" />
        </h3>
        <p className="muted" style={{ margin: 0 }}>
          We deliver to postal codes starting with <b>{settings.delivery.fsas.join(", ")}</b>. Delivery fee {formatCents(settings.delivery.feeCents)}, minimum order{" "}
          {formatCents(settings.delivery.minimumCents)} before the fee.
        </p>
        <p className="muted" style={{ margin: "10px 0 0" }}>
          Delivery windows: {settings.delivery.windows.join(", ")}. During store hours only.
        </p>
      </div>
    </div>
  );
}

export function WholesaleServices() {
  return (
    <ul className={s.svc}>
      {WHOLESALE_SERVICES.map((w) => (
        <li key={w.b}>
          <b>{w.b}</b>
          <span>{w.t}</span>
        </li>
      ))}
    </ul>
  );
}

export function HoursTable({ hours, now = new Date() }: { hours: WeekHours; now?: Date }) {
  const { day } = torontoParts(now);
  return (
    <table className={s.hrs}>
      <caption className="sr-only">Store hours, Toronto time</caption>
      <tbody>
        {WEEK_ORDER.map((d) => (
          <tr key={d} className={d === day ? s.today : undefined}>
            <th scope="row">
              {DAY_NAMES[d]}
              {d === day && <span className="sr-only"> (today)</span>}
            </th>
            <td>
              {formatDay(hours[d])}
              {d === 1 && !hours[1] ? " *" : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MapSvg() {
  return (
    <svg className={s.map} viewBox="0 0 320 170" role="img" aria-label="Simplified map: Pay N' Puff at 15 Dunlop Street East in downtown Barrie, near Five Points, with Kempenfelt Bay to the south.">
      <rect width="320" height="170" fill="#eaf7fc" />
      <path d="M0 150 Q160 128 320 146 L320 170 L0 170Z" fill="#bfe9f7" />
      <text x="244" y="162" fontSize="9.5" fontWeight="700" fill="#07708c" style={{ fontFamily: "var(--body)" }}>KEMPENFELT BAY</text>
      <path d="M0 78 L320 78" stroke="#fff" strokeWidth="16" />
      <path d="M0 78 L320 78" stroke="#e3e0ea" strokeWidth="16" opacity=".5" />
      <text x="226" y="70" fontSize="10" fontWeight="700" fill="#5f5a6e" style={{ fontFamily: "var(--body)" }}>DUNLOP ST E →</text>
      <path d="M78 0 L92 170" stroke="#fff" strokeWidth="12" />
      <path d="M78 0 L92 170" stroke="#e3e0ea" strokeWidth="12" opacity=".5" />
      <circle cx="84" cy="78" r="13" fill="none" stroke="#5f5a6e" strokeWidth="1.2" strokeDasharray="3 3" />
      <text x="40" y="104" fontSize="9.5" fontWeight="700" fill="#5f5a6e" style={{ fontFamily: "var(--body)" }}>FIVE POINTS</text>
      <rect x="118" y="48" width="52" height="22" fill="#c4207f" rx="4" />
      <text x="144" y="63" textAnchor="middle" fontSize="10.5" fill="#fff" style={{ fontFamily: "var(--logo)" }}>PAY n&apos; PUFF</text>
      <rect x="172" y="52" width="34" height="18" fill="#fff" stroke="#e3e0ea" rx="3" />
      <text x="189" y="64" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#5f5a6e" style={{ fontFamily: "var(--body)" }}>5 POINTS</text>
      <circle cx="144" cy="78" r="4.5" fill="#c4207f" />
      <text x="144" y="40" textAnchor="middle" fontSize="10" fontWeight="700" fill="#231a33" style={{ fontFamily: "var(--body)" }}>15 Dunlop St E</text>
      <path d="M292 22 l8 -16 l8 16 z" fill="none" stroke="#231a33" strokeWidth="1.5" />
      <text x="300" y="34" textAnchor="middle" fontSize="9" fill="#231a33" style={{ fontFamily: "var(--body)" }}>N</text>
    </svg>
  );
}

export function VisitBlock({ hours }: { hours: WeekHours }) {
  return (
    <div className={s.visit}>
      <div className={s.card}>
        <h3>
          Hours <VerifyTag note="Confirm all hours; Monday is unconfirmed" />
        </h3>
        <HoursTable hours={hours} />
        {!hours[1] && (
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--gray)" }}>
            * Monday hours aren&apos;t confirmed yet. <span className="confirm">confirm</span>
          </p>
        )}
      </div>
      <div className={s.card}>
        <h3>Find us</h3>
        <p style={{ margin: 0, fontWeight: 700 }}>{ADDRESS_ONE_LINE}</p>
        <p className="muted" style={{ margin: "2px 0 0", fontSize: 14 }}>
          Downtown on Dunlop, {STORE.landmark}.
        </p>
        <div className={s.contact}>
          <a className="btn sm" href={STORE.mapsUrl} rel="noopener">
            Directions
          </a>
          <a className="btn sm line" href={`mailto:${STORE.email}`}>
            Email {STORE.email}
          </a>
          {STORE.phone ? (
            <a className="btn sm line" href={`tel:${STORE.phone}`}>
              Call {STORE.phone}
            </a>
          ) : (
            <VerifyTag note="No phone number on the current site. Add one for click-to-call." />
          )}
        </div>
        <MapSvg />
        <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--gray)" }}>Simplified map, not to scale.</p>
      </div>
    </div>
  );
}

export function VerifyCta({ settings }: { settings: Settings }) {
  if (settings.ageGateMode === "info_only") {
    return (
      <div className={s.gate}>
        <div>
          <div className="lab">In store and by phone</div>
          <h2>Ask us what&apos;s in stock.</h2>
          <p>We don&apos;t show products online. Visit the store or email us, and bring photo ID.</p>
        </div>
      </div>
    );
  }
  const staff = settings.ageGateMode === "staff_verified";
  return (
    <div className={s.gate}>
      <div>
        <div className="lab">Verified adults only</div>
        <h2>See the shelf, hold for pickup, or book a delivery.</h2>
        <p>
          Canadian law only lets vape products be shown online to people whose age and identity have been verified. A checkbox or a birthday isn&apos;t enough, so
          we use a real ID check.
        </p>
        <Link className="btn hot" href="/verify" style={{ marginTop: 18 }}>
          {staff ? "Sign in or get verified" : "Verify my age"}
        </Link>
      </div>
      {staff ? (
        <ol>
          <li>Show photo ID once: at the counter, or to the driver on your first delivery</li>
          <li>We send you a sign-in link by email or text</li>
          <li>Sign in to see the shelf. We never store your ID number.</li>
        </ol>
      ) : (
        <ol>
          <li>Take a photo of your government ID</li>
          <li>Take a quick selfie to match it</li>
          <li>Done in about a minute. We never store your ID number.</li>
        </ol>
      )}
    </div>
  );
}
