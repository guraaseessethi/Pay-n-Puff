"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { placeOrder } from "@/app/actions/order";
import { getRepository } from "@/lib/data";
import type { DemoState } from "@/lib/data/mock/MockRepository";
import type { Product, ShelfProduct } from "@/lib/domain/types";
import { checkZone } from "@/lib/delivery/zones";
import { formatCents } from "@/lib/money";
import { toast } from "@/components/ui/Toast";
import styles from "./Shelf.module.css";

const CATS = ["All", "Disposables", "Pods", "Devices"] as const;

interface DeliveryCfg {
  fsas: string[];
  feeCents: number;
  minimumCents: number;
  windows: string[];
  payment: { cash: boolean; etransfer: boolean };
}

const EMPTY: DemoState | null = null;

export function Shelf({
  products,
  customerName,
  minAge,
  deliveryEnabled,
  reservationsEnabled,
  holdHours,
  delivery,
}: {
  products: ShelfProduct[];
  customerName: string;
  minAge: number;
  deliveryEnabled: boolean;
  reservationsEnabled: boolean;
  holdHours: number;
  delivery: DeliveryCfg;
}) {
  const repo = getRepository();
  useEffect(() => {
    // Seed the demo store with what the server sent (sellable products only, no cost/supplier).
    repo.merge({ products: products.map((p) => ({ ...p, costCents: 0, supplier: "" }) as Product) });
  }, [repo, products]);
  const state = useSyncExternalStore(repo.subscribe, repo.getSnapshot, () => EMPTY);

  const stockOf = (sku: string, fallback: number) => state?.products.find((p) => p.sku === sku)?.stock ?? fallback;

  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [q, setQ] = useState("");
  const [bag, setBag] = useState<Record<string, number>>({});
  const canDeliver = deliveryEnabled;
  const canHold = reservationsEnabled;
  const [mode, setMode] = useState<"pickup" | "delivery">(canHold ? "pickup" : "delivery");
  const [addr, setAddr] = useState("");
  const [postal, setPostal] = useState("");
  const [win, setWin] = useState(delivery.windows[0]);
  const payOpts = [delivery.payment.cash && "cash", delivery.payment.etransfer && "etransfer"].filter(Boolean) as ("cash" | "etransfer")[];
  const [pay, setPay] = useState<"cash" | "etransfer">(payOpts[0] ?? "cash");
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | { code: string; kind: "pickup" | "delivery" }>(null);
  const [pending, start] = useTransition();

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => (cat === "All" || p.category === cat) && (!s || `${p.brand} ${p.name} ${p.size} ${p.category}`.toLowerCase().includes(s)));
  }, [products, cat, q]);

  const lines = Object.entries(bag)
    .filter(([, n]) => n > 0)
    .map(([sku, qty]) => ({ p: products.find((x) => x.sku === sku)!, qty }));
  const subtotal = lines.reduce((s, l) => s + l.p.priceCents * l.qty, 0);
  const zone = mode === "delivery" && postal.trim().length >= 6 ? checkZone(postal, subtotal, delivery) : null;
  const fee = mode === "delivery" ? delivery.feeCents : 0;

  const add = (sku: string) => setBag((b) => ({ ...b, [sku]: (b[sku] ?? 0) + 1 }));
  const remove = (sku: string) => setBag((b) => ({ ...b, [sku]: Math.max(0, (b[sku] ?? 0) - 1) }));

  if (!canDeliver && !canHold) {
    return <p className="warnbox">Online ordering is switched off. You can still see what&apos;s in stock; buy in store with photo ID.</p>;
  }

  const submit = () => {
    setError("");
    if (!lines.length) return;
    for (const l of lines) {
      const st = stockOf(l.p.sku, l.p.stock);
      if (l.qty > st) {
        setError(`Only ${st} × ${l.p.brand} ${l.p.name} left.`);
        return;
      }
    }
    start(async () => {
      const draft =
        mode === "pickup"
          ? { kind: "pickup" as const, lines: lines.map((l) => ({ sku: l.p.sku, qty: l.qty })) }
          : { kind: "delivery" as const, lines: lines.map((l) => ({ sku: l.p.sku, qty: l.qty })), address: addr, postalCode: postal, window: win, paymentMethod: pay };
      const r = await placeOrder(draft);
      if (!r.ok) {
        setError(r.error);
        toast(r.error);
        return;
      }
      try {
        if (r.kind === "delivery") {
          const o = await repo.createDeliveryOrder(r.order);
          await repo.send({
            channel: "email",
            to: customerName,
            subject: `Order ${o.code} booked`,
            body: `Booked for ${o.window}. Have photo ID ready at the door: the driver can only hand it to ${o.recipientName}.`,
          });
          setDone({ code: o.code, kind: "delivery" });
          toast(`Booked as ${o.code}. Have photo ID ready at the door.`);
        } else {
          const h = await repo.createHold(r.hold);
          setDone({ code: h.code, kind: "pickup" });
          toast(`Held for ${holdHours} hours. Bring photo ID.`);
        }
        setBag({});
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <>
      <div className={styles.top}>
        <label className="sr-only" htmlFor="shelf-q">
          Search the shelf
        </label>
        <input className={styles.search} id="shelf-q" type="search" placeholder="Search brand, puff count, device…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips" role="group" aria-label="Category">
          {CATS.map((c) => (
            <button key={c} type="button" aria-pressed={c === cat} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.grid}>
        <div>
          <p className="sr-only" aria-live="polite">
            {list.length} products shown
          </p>
          <ul className={styles.prods}>
            {list.map((p) => {
              const inBag = bag[p.sku] ?? 0;
              const st = stockOf(p.sku, p.stock);
              return (
                <li key={p.sku} className={styles.prod}>
                  {p.house && <span className={styles.house}>House brand</span>}
                  <div className={styles.br}>
                    {p.brand} · {p.category}
                  </div>
                  <h2 className={styles.name}>{p.name}</h2>
                  <div className={styles.specs}>
                    {p.nicotineMgMl > 0 && <span>{p.nicotineMgMl} mg/mL</span>}
                    <span>{p.size}</span>
                    {p.stamp === "ON" && <span>ON stamp</span>}
                  </div>
                  <div className={styles.ft}>
                    <span className={styles.pr}>
                      {formatCents(p.priceCents)} <small>tax in</small>
                    </span>
                    <span className={st <= 0 ? styles.out : st <= 2 ? styles.low : styles.ok}>{st <= 0 ? "Sold out" : st <= 2 ? `${st} left` : "In stock"}</span>
                  </div>
                  <button
                    type="button"
                    className={`btn sm ${inBag ? "hot" : "line"}`}
                    disabled={st <= inBag}
                    onClick={() => add(p.sku)}
                    aria-label={inBag ? `Add another ${p.brand} ${p.name} (${inBag} in order)` : `Add ${p.brand} ${p.name} to order`}
                  >
                    {inBag ? `In order (${inBag}) · add another` : "Add to order"}
                  </button>
                </li>
              );
            })}
          </ul>
          {!list.length && <p className="muted">Nothing matches. Ask us in store or by email.</p>}
        </div>

        <aside className={styles.bag} aria-labelledby="bag-h">
          <div className="lab">Your order</div>
          <h2 id="bag-h" className={styles.bagH}>
            Boarding pass
          </h2>
          {done && (
            <div className="okbox" role="status" style={{ margin: "10px 0" }}>
              <b>{done.code}</b>{" "}
              {done.kind === "delivery"
                ? `is booked. Have photo ID ready: the driver can only hand it to ${customerName}.`
                : `is held for ${holdHours} hours. Bring photo ID in the name ${customerName} and pay at the counter.`}
            </div>
          )}
          {lines.length ? (
            lines.map((l) => (
              <div className={styles.ln} key={l.p.sku}>
                <span>
                  {l.qty} × {l.p.brand} {l.p.name}
                </span>
                <span>
                  {formatCents(l.p.priceCents * l.qty)}
                  <button type="button" onClick={() => remove(l.p.sku)} aria-label={`Remove one ${l.p.brand} ${l.p.name}`}>
                    ✕
                  </button>
                </span>
              </div>
            ))
          ) : (
            <p className="muted" style={{ fontSize: 14, margin: "8px 0 0" }}>
              Add something from the shelf.
            </p>
          )}
          {mode === "delivery" && lines.length > 0 && (
            <div className={styles.ln}>
              <span>Delivery fee</span>
              <span>{formatCents(fee)}</span>
            </div>
          )}
          <div className={styles.tot}>
            <span>Total, tax in</span>
            <b>{formatCents(subtotal + (lines.length ? fee : 0))}</b>
          </div>

          {canDeliver && canHold && (
            <div className={styles.mode} role="group" aria-label="Pickup or delivery">
              <button type="button" aria-pressed={mode === "pickup"} onClick={() => setMode("pickup")}>
                Pick up in store
              </button>
              <button type="button" aria-pressed={mode === "delivery"} onClick={() => setMode("delivery")}>
                Delivery
              </button>
            </div>
          )}

          {mode === "delivery" ? (
            <div className={styles.form}>
              <div className="fld">
                <span className="lbl">Recipient (must be you)</span>
                <p className={styles.locked}>{customerName}</p>
              </div>
              <div className="fld">
                <label htmlFor="b-addr">Street address</label>
                <input id="b-addr" value={addr} onChange={(e) => setAddr(e.target.value)} autoComplete="street-address" />
              </div>
              <div className="fld">
                <label htmlFor="b-postal">Postal code</label>
                <input id="b-postal" value={postal} onChange={(e) => setPostal(e.target.value)} autoComplete="postal-code" aria-describedby="b-zone" />
                <span id="b-zone" className={zone && !zone.ok ? "err" : "hint"} aria-live="polite">
                  {zone ? (zone.ok ? `${zone.fsa} is in our delivery area.` : zone.message) : `We deliver to ${delivery.fsas.join(", ")}. Minimum ${formatCents(delivery.minimumCents)}.`}
                </span>
              </div>
              <div className="fld">
                <label htmlFor="b-win">Delivery window</label>
                <select id="b-win" value={win} onChange={(e) => setWin(e.target.value)}>
                  {delivery.windows.map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div className="fld">
                <label htmlFor="b-pay">Pay on delivery</label>
                <select id="b-pay" value={pay} onChange={(e) => setPay(e.target.value as "cash" | "etransfer")}>
                  {payOpts.map((p) => (
                    <option key={p} value={p}>
                      {p === "cash" ? "Cash" : "e-Transfer"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="idnote">
                <b>ID at the door.</b> {customerName} must be there, {minAge}+, with photo ID. If not, the driver brings the order back to the store. The bag is labelled
                &quot;Must be received by a person {minAge} years of age or older&quot;.
              </div>
            </div>
          ) : (
            <div className={styles.form}>
              <div className="idnote">
                <b>Held for {holdHours} hours</b> in the name {customerName}. Bring photo ID that matches. Pay at the counter.
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="err" style={{ color: "var(--bad)", fontWeight: 600, margin: "10px 0 0" }}>
              {error}
            </p>
          )}
          <button
            type="button"
            className="btn hot block"
            style={{ marginTop: 12 }}
            disabled={!lines.length || pending || (mode === "delivery" && (!zone || !zone.ok || addr.trim().length < 5))}
            onClick={submit}
          >
            {pending ? "Sending…" : mode === "delivery" ? "Book delivery" : "Hold for pickup"}
          </button>
          <p className="small-mono" style={{ margin: "10px 0 0" }}>
            No online card payment. Demo: orders appear in the back office on this device.
          </p>
        </aside>
      </div>
    </>
  );
}
