"use client";

import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { judgeIdCheck } from "@/app/actions/staff";
import { useAdmin } from "../AdminContext";
import { AgeField, IdTypeSelect, VerifyCustomer } from "../IdForms";
import { Loading, PageHeader } from "../ui";
import { flag } from "@/lib/compliance/flags";
import { sellable } from "@/lib/compliance/sellable";
import { summariseIdCheck } from "@/lib/compliance/idCheck";
import type { IdCheck, IdCheckInput, IdType, OrderLine, PaymentMethod } from "@/lib/domain/types";
import { formatCents, splitLines } from "@/lib/money";
import { toast } from "@/components/ui/Toast";

export function Checkout() {
  const { state, repo, staff, settings } = useAdmin();
  const params = useSearchParams();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [holdId, setHoldId] = useState<string | null>(params.get("hold"));
  const [check, setCheck] = useState<IdCheck | null>(null);
  const [idType, setIdType] = useState<IdType>("Driver's licence");
  const [age, setAge] = useState("");
  const [nameOk, setNameOk] = useState(false);
  const [pending, start] = useTransition();

  const hold = state?.holds.find((h) => h.id === holdId && h.status === "Held") ?? null;
  const lines: OrderLine[] = useMemo(() => {
    if (hold) return hold.lines;
    if (!state) return [];
    return Object.entries(cart)
      .filter(([, n]) => n > 0)
      .map(([sku, qty]) => {
        const p = state.products.find((x) => x.sku === sku)!;
        return { sku, label: `${p.brand} ${p.name}`, qty, unitCents: p.priceCents };
      });
  }, [cart, hold, state]);

  if (!state) return <Loading />;
  const split = splitLines(lines);
  const ok = lines.length > 0 && check?.result === "Pass";

  const record = (input: IdCheckInput) =>
    start(async () => {
      const j = await judgeIdCheck(input);
      if (!j.ok) {
        toast(j.error);
        return;
      }
      const c = await repo.recordCounterCheck(input, settings.minAge);
      if (c.result === "Pass") {
        setCheck(c);
        toast(`ID OK · ${summariseIdCheck(c)}`);
      } else {
        setCheck(null);
        setCart({});
        setHoldId(null);
        toast(`${c.reason}. Sale refused and logged.`);
      }
    });

  const pay = (m: PaymentMethod) =>
    start(async () => {
      try {
        const sale = await repo.completeSale(lines, m, check!.id, hold?.id);
        toast(`${m === "etransfer" ? "e-Transfer" : m === "cash" ? "Cash" : "Card"} · ${formatCents(sale.totalCents)} paid`);
        setCart({});
        setCheck(null);
        setHoldId(null);
        setAge("");
        setNameOk(false);
      } catch (e) {
        toast((e as Error).message);
      }
    });

  const openHolds = state.holds.filter((h) => h.status === "Held");

  return (
    <>
      <PageHeader title="Checkout" sub="Prices are tax-in, like the website. Every sale goes through an age check. Blocked items can't be added." />
      <div className="pos">
        <section className="pn" aria-labelledby="prod-h">
          <div className="ph">
            <h2 id="prod-h">Products</h2>
            {openHolds.length > 0 && (
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                Ring up a hold
                <select
                  className="inp"
                  style={{ width: "auto" }}
                  value={holdId ?? ""}
                  onChange={(e) => {
                    setHoldId(e.target.value || null);
                    setCheck(null);
                  }}
                >
                  <option value="">No hold</option>
                  {openHolds.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.code} · {h.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="pick">
            {state.products.map((p) => {
              const can = sellable(p) && p.stock > (cart[p.sku] ?? 0) && !hold;
              const why = !sellable(p) ? `Blocked: ${flag(p)}` : p.stock <= 0 ? "Out of stock" : `${p.stock} left`;
              return (
                <button key={p.sku} type="button" disabled={!can} onClick={() => setCart((c) => ({ ...c, [p.sku]: (c[p.sku] ?? 0) + 1 }))} aria-label={`${p.brand} ${p.name}, ${formatCents(p.priceCents)}, ${why}`}>
                  <b>
                    {p.brand} {p.name}
                  </b>
                  <span>
                    {formatCents(p.priceCents)} · {why}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="tkt" aria-labelledby="tkt-h">
          <div className="ph" style={{ marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
            <h2 id="tkt-h" style={{ fontSize: 13, fontFamily: "var(--mono)", fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase" }}>
              Ticket {hold ? `· hold ${hold.code}` : ""}
            </h2>
          </div>
          {hold && (
            <p className="idnote" style={{ margin: "0 0 8px" }}>
              Hold for <b>{hold.name}</b>. Photo ID must match this name.
            </p>
          )}
          {lines.length ? (
            lines.map((l) => (
              <div className="ln" key={l.sku}>
                <span>
                  {l.qty} × {l.label}
                </span>
                <span>
                  {formatCents(l.unitCents * l.qty)}
                  {!hold && (
                    <button type="button" aria-label={`Remove one ${l.label}`} onClick={() => setCart((c) => ({ ...c, [l.sku]: Math.max(0, (c[l.sku] ?? 0) - 1) }))}>
                      ✕
                    </button>
                  )}
                </span>
              </div>
            ))
          ) : (
            <p className="muted" style={{ fontSize: 14, margin: 0 }}>
              Tap a product to add it.
            </p>
          )}
          <div style={{ marginTop: 8 }}>
            <div className="tot">
              <span>Before tax</span>
              <span>{formatCents(split.preTaxCents)}</span>
            </div>
            <div className="tot">
              <span>HST 13% included</span>
              <span>{formatCents(split.taxCents)}</span>
            </div>
          </div>
          <div className="grand">
            <span>Total</span>
            <b>{formatCents(split.totalCents)}</b>
          </div>

          {check?.result === "Pass" ? (
            <div className="idbox ok" role="status">
              <h3>Age check passed</h3>
              <div style={{ fontSize: 14 }}>{summariseIdCheck(check)}</div>
              <button type="button" className="btn sm line" style={{ justifySelf: "start" }} onClick={() => setCheck(null)}>
                Redo check
              </button>
            </div>
          ) : (
            <div className="idbox">
              <h3>Age check required</h3>
              <div style={{ fontSize: 13.5, color: "var(--gray)" }}>Ask for ID from anyone who looks under 25. Never type the ID number.</div>
              {!hold && (
                <button
                  type="button"
                  className="btn sm line"
                  style={{ justifySelf: "start" }}
                  disabled={pending}
                  onClick={() => record({ where: "counter", staff: staff.name, idType: "Clearly 25+ (no ID asked)", age: null, nameMatches: null, orderCode: null })}
                >
                  Clearly 25+
                </button>
              )}
              <div className="fg">
                <IdTypeSelect id="co-type" value={idType} onChange={setIdType} />
                <AgeField id="co-age" minAge={settings.minAge} value={age} onChange={setAge} />
              </div>
              {hold && (
                <label className="check">
                  <input type="checkbox" checked={nameOk} onChange={(e) => setNameOk(e.target.checked)} />
                  <span>Name on the ID matches the hold ({hold.name})</span>
                </label>
              )}
              <div className="idrow">
                <button
                  type="button"
                  className="btn sm"
                  disabled={pending}
                  onClick={() => {
                    const n = Number.parseInt(age, 10);
                    if (!Number.isFinite(n)) {
                      toast("Enter the age from the ID");
                      document.getElementById("co-age")?.focus();
                      return;
                    }
                    if (hold && !nameOk) {
                      record({ where: "counter", staff: staff.name, idType, age: n, nameMatches: false, orderCode: hold.code, refusedByStaff: true, reason: "Name doesn't match the hold" });
                      return;
                    }
                    record({ where: "counter", staff: staff.name, idType, age: n, nameMatches: hold ? true : null, orderCode: hold?.code ?? null });
                  }}
                >
                  Check ID
                </button>
                <button
                  type="button"
                  className="btn sm danger"
                  disabled={pending}
                  onClick={() => record({ where: "counter", staff: staff.name, idType: "No ID", age: null, nameMatches: null, orderCode: hold?.code ?? null })}
                >
                  Refuse sale · no ID
                </button>
              </div>
            </div>
          )}

          <div className="paygrid">
            {(["card", "cash", "etransfer"] as const).map((m, i) => (
              <button key={m} type="button" className={`btn sm ${i ? "line" : "hot"}`} disabled={!ok || pending} onClick={() => pay(m)}>
                {m === "card" ? "Card" : m === "cash" ? "Cash" : "e-Transfer"}
              </button>
            ))}
          </div>
          {!ok && lines.length > 0 && (
            <p className="small-mono" style={{ margin: "8px 0 0" }}>
              Payment unlocks after a passing age check.
            </p>
          )}

          {settings.ageGateMode === "staff_verified" && check?.result === "Pass" && check.idType !== "Clearly 25+ (no ID asked)" && (
            <div style={{ marginTop: 12 }}>
              <VerifyCustomer repo={repo} where="counter" minAge={settings.minAge} defaultName={hold?.name ?? ""} />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
