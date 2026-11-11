"use client";

import Link from "next/link";
import { useAdmin } from "../AdminContext";
import { Kpi, Loading, PageHeader, time } from "../ui";
import { sellable } from "@/lib/compliance/sellable";
import { isLive } from "@/lib/delivery/status";
import { DAY_NAMES, describeOpenState, formatDay, openState, torontoParts } from "@/lib/hours/hours";
import { formatCents } from "@/lib/money";
import { CHECKLIST } from "./checklist";

export function Today() {
  const { state, settings } = useAdmin();
  if (!state) return <Loading />;
  const now = new Date();
  const { day } = torontoParts(now);
  const open = openState(settings.hours, now);
  const salesTotal = state.sales.reduce((s, x) => s + x.totalCents, 0);
  const counter = state.sales.filter((s) => s.channel === "counter").length;
  const delivered = state.sales.filter((s) => s.channel === "delivery").length;
  const refused = state.idChecks.filter((c) => c.result === "Refused").length;
  const blocked = state.products.filter((p) => !sellable(p) && p.stock > 0);
  const low = state.products.filter((p) => sellable(p) && p.par > 0 && p.stock <= p.par);
  const openTasks = CHECKLIST.filter((c) => !state.checklist[c.key]);
  const booked = state.orders.filter((o) => o.status === "Booked");
  const holds = state.holds.filter((h) => h.status === "Held");

  return (
    <>
      <PageHeader
        title="Today"
        sub={`${DAY_NAMES[day]} · ${formatDay(settings.hours[day])}`}
        actions={
          <>
            <Link className="btn sm hot" href="/admin/checkout">
              New sale
            </Link>
            <Link className="btn sm line" href="/admin/flights">
              Deliveries
            </Link>
          </>
        }
      />
      <div className="g g4">
        <Kpi k="Sales, tax in" v={formatCents(salesTotal)} d={`${counter} counter · ${delivered} delivered`} tone="up" />
        <Kpi k="Deliveries live" v={state.orders.filter((o) => isLive(o.status)).length} d="booked to at the door" />
        <Kpi k="ID checks" v={state.idChecks.length} d={`${refused} refused (counter + door)`} />
        <Kpi k="Blocked stock" v={blocked.length} d="can't be sold" tone={blocked.length ? "bad" : ""} />
      </div>
      <div className="g g2 mt">
        <section className="pn" aria-labelledby="needs-h">
          <div className="ph">
            <h2 id="needs-h">Needs you</h2>
          </div>
          <div className="ls">
            {booked.map((o) => (
              <div className="it" key={o.code}>
                <span>
                  <b>New delivery {o.code}</b>
                  <small>
                    {o.address} · {formatCents(o.totalCents)} · assign a driver
                  </small>
                </span>
                <Link className="btn sm hot" href="/admin/flights">
                  Dispatch
                </Link>
              </div>
            ))}
            {blocked.length > 0 && (
              <div className="it">
                <span>
                  <b>{blocked.length} products blocked from sale</b>
                  <small>Over 20 mg/mL or missing the Ontario stamp. Pulled from the till, the website and delivery.</small>
                </span>
                <Link className="btn sm line" href="/admin/inventory">
                  Review
                </Link>
              </div>
            )}
            {openTasks.length > 0 && (
              <div className="it">
                <span>
                  <b>{openTasks.length} compliance items open</b>
                  <small>Including: {openTasks[0].label.toLowerCase()}</small>
                </span>
                <Link className="btn sm line" href="/admin/compliance">
                  Finish
                </Link>
              </div>
            )}
            {low.length > 0 && (
              <div className="it">
                <span>
                  <b>{low.length} products at or below par</b>
                  <small>Before the Friday late shift</small>
                </span>
                <Link className="btn sm line" href="/admin/inventory">
                  Reorder
                </Link>
              </div>
            )}
            {holds.map((h) => (
              <div className="it" key={h.id}>
                <span>
                  <b>
                    Pickup hold {h.code} · {h.name}
                  </b>
                  <small>
                    {h.lines.map((l) => `${l.qty} × ${l.label}`).join(", ")} · check ID matches the name
                  </small>
                </span>
                <Link className="btn sm line" href={`/admin/checkout?hold=${h.id}`}>
                  Ring up
                </Link>
              </div>
            ))}
          </div>
        </section>
        <section className="pn" aria-labelledby="tonight-h">
          <div className="ph">
            <h2 id="tonight-h">Tonight</h2>
            <span className={`pill ${open.open ? "p-ok" : "p-mute"}`}>{open.open ? "Open now" : "Closed"}</span>
          </div>
          <p className="muted" style={{ margin: "0 0 6px", fontSize: 14 }}>
            {describeOpenState(open)}
          </p>
          <div className="ls">
            {[...state.sales]
              .reverse()
              .slice(0, 8)
              .map((x) => (
                <div className="it" key={x.id}>
                  <span>
                    {time(x.at)} · {x.lines.reduce((s, l) => s + l.qty, 0)} item(s) · {x.channel === "delivery" ? "Delivery" : "Counter"} ·{" "}
                    {x.paymentMethod === "etransfer" ? "e-Transfer" : x.paymentMethod === "cash" ? "Cash" : "Card"}
                    <small>{x.idSummary}</small>
                  </span>
                  <b style={{ fontFamily: "var(--mono)" }}>{formatCents(x.totalCents)}</b>
                </div>
              ))}
          </div>
        </section>
      </div>
    </>
  );
}
