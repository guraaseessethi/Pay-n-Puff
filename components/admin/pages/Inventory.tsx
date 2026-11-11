"use client";

import { useState } from "react";
import { useAdmin } from "../AdminContext";
import { Kpi, Loading, PageHeader } from "../ui";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { flag, flags } from "@/lib/compliance/flags";
import { sellable } from "@/lib/compliance/sellable";
import type { Product } from "@/lib/domain/types";
import { formatCents } from "@/lib/money";

const FILTERS = ["All", "Disposables", "Pods", "Devices", "House", "Low", "Blocked"] as const;

export function Inventory() {
  const { state, repo, isOwner, staff } = useAdmin();
  const [f, setF] = useState<(typeof FILTERS)[number]>("All");
  const [q, setQ] = useState("");
  const [rcv, setRcv] = useState(false);
  const [ordered, setOrdered] = useState<Record<string, boolean>>({});
  if (!state) return <Loading />;
  const P = state.products;
  const low = (p: Product) => sellable(p) && p.par > 0 && p.stock <= p.par;
  const list = P.filter(
    (p) =>
      (f === "All" || (f === "Blocked" ? !sellable(p) : f === "Low" ? low(p) : f === "House" ? p.house : p.category === f)) &&
      (!q || `${p.brand} ${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase())),
  );
  const blocked = P.filter((p) => !sellable(p) && p.stock > 0).length;
  const value = P.reduce((s, p) => s + p.costCents * p.stock, 0);
  const po: Record<string, Product[]> = {};
  P.filter(low).forEach((p) => (po[p.supplier] ??= []).push(p));
  const house = P.find((p) => p.house);

  return (
    <>
      <PageHeader
        title="Inventory"
        sub="Nicotine and Ontario stamp checks on every product. Anything that fails is pulled from the counter, the website and delivery."
        actions={
          <button className="btn sm" type="button" onClick={() => setRcv(true)}>
            Receive shipment
          </button>
        }
      />
      <div className="g g4">
        {isOwner ? <Kpi k="Stock at cost" v={formatCents(value)} d={`${P.length} SKUs · sample costs`} /> : <Kpi k="SKUs" v={P.length} d="on the list" />}
        <Kpi k="Blocked" v={blocked} d="over cap or unstamped" tone={blocked ? "bad" : ""} />
        <Kpi k="Low stock" v={P.filter(low).length} d="at or below par" />
        <Kpi k="House brand" v={house?.stock ?? 0} d={house ? `${house.brand} ${house.name} on hand` : ""} />
      </div>
      <div className="g g2 mt">
        <section className="pn" aria-label="Products">
          <div className="ph">
            <div className="seg" role="group" aria-label="Filter">
              {FILTERS.map((x) => (
                <button key={x} type="button" aria-pressed={f === x} onClick={() => setF(x)}>
                  {x}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="inv-q">
              Search inventory
            </label>
            <input id="inv-q" className="inp" style={{ maxWidth: 220 }} type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="tw" tabIndex={0} role="region" aria-label="Inventory table">
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">mg/mL</th>
                  <th scope="col">Stamp</th>
                  <th scope="col" className="num">
                    Stock / par
                  </th>
                  {isOwner && (
                    <th scope="col" className="num">
                      Cost
                    </th>
                  )}
                  <th scope="col" className="num">
                    Price
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const fl = flag(p);
                  return (
                    <tr key={p.sku} className={fl ? "block" : undefined}>
                      <td style={{ minWidth: 190 }}>
                        <b>{p.brand}</b> {p.name} {p.house && <span className="pill p-hot">House</span>}
                        <div className="small-mono">
                          {p.sku} · {p.category} · {p.flavourFamily}
                          {isOwner ? ` · ${p.supplier}` : ""}
                        </div>
                      </td>
                      <td style={p.nicotineMgMl > 20 ? { color: "var(--bad)", fontWeight: 700 } : undefined}>{p.nicotineMgMl || "—"}</td>
                      <td>
                        {p.stamp === "ON" ? (
                          <span className="pill p-ok">Ontario</span>
                        ) : p.stamp === "n/a" ? (
                          <span className="pill p-mute">n/a</span>
                        ) : p.stamp === "CA" ? (
                          <span className="pill p-bad">Canada only</span>
                        ) : (
                          <span className="pill p-bad">None</span>
                        )}
                      </td>
                      <td className="num">
                        {p.stock}
                        {p.par ? ` / ${p.par}` : ""}
                      </td>
                      {isOwner && <td className="num">{formatCents(p.costCents)}</td>}
                      <td className="num">{formatCents(p.priceCents)}</td>
                      <td>
                        {fl ? (
                          <span className="pill p-bad">{fl}</span>
                        ) : p.stock <= 0 ? (
                          <span className="pill p-bad">Out</span>
                        ) : low(p) ? (
                          <span className="pill p-warn">Low</span>
                        ) : (
                          <span className="pill p-ok">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="pn" style={{ alignSelf: "start" }} aria-labelledby="po-h">
          <div className="ph">
            <h2 id="po-h">Reorder by supplier</h2>
          </div>
          {Object.keys(po).length ? (
            Object.entries(po).map(([s, items]) => (
              <div key={s} style={{ border: "1px solid var(--soft)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div className="small-mono" style={{ textTransform: "uppercase", letterSpacing: ".08em" }}>
                  {isOwner ? s : "Supplier"}
                </div>
                {items.map((p) => (
                  <div key={p.sku} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, marginTop: 4 }}>
                    <span>
                      {p.brand} {p.name}
                    </span>
                    <span style={{ fontFamily: "var(--mono)" }}>× {p.par * 2 - p.stock}</span>
                  </div>
                ))}
                <button
                  className="btn sm line"
                  type="button"
                  style={{ marginTop: 10 }}
                  disabled={ordered[s]}
                  onClick={() => {
                    setOrdered((o) => ({ ...o, [s]: true }));
                    void repo.send({ channel: "email", to: s, subject: "Purchase order", body: items.map((p) => `${p.par * 2 - p.stock} × ${p.brand} ${p.name}`).join("\n") });
                    toast("Would send in the full build. Logged to the demo outbox.");
                  }}
                >
                  {ordered[s] ? "Ordered ✓" : "Mark ordered"}
                </button>
              </div>
            ))
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              All stocked.
            </p>
          )}
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--gray)", borderTop: "1px solid var(--soft)", paddingTop: 10 }}>
            Blocked items go back to the supplier. Federal law caps nicotine at 20 mg/mL, and since October 2024 vaping products sold in Ontario need the Ontario excise stamp. Nicotine strengths and
            stamps here are placeholders until we load the real stock list.
          </p>
        </section>
      </div>
      {rcv && <Receive onClose={() => setRcv(false)} products={P} by={staff.name} receive={(sku, n) => repo.receiveStock(sku, n, staff.name)} />}
    </>
  );
}

function Receive({ onClose, products, receive, by }: { onClose: () => void; products: Product[]; receive: (sku: string, n: number) => Promise<void>; by: string }) {
  const [sku, setSku] = useState(products[0]?.sku ?? "");
  const [n, setN] = useState(10);
  const p = products.find((x) => x.sku === sku);
  const problems = p ? flags(p) : [];
  return (
    <Modal title="Receive shipment" onClose={onClose}>
      <p>Every product is checked for nicotine strength and the Ontario stamp as it comes in.</p>
      <div className="fg">
        <div className="fld full">
          <label htmlFor="rc-sku">Product</label>
          <select id="rc-sku" value={sku} onChange={(e) => setSku(e.target.value)}>
            {products.map((x) => (
              <option key={x.sku} value={x.sku}>
                {x.brand} {x.name}
              </option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label htmlFor="rc-q">Quantity</label>
          <input id="rc-q" type="number" min={1} value={n} onChange={(e) => setN(Math.max(1, Number(e.target.value) || 1))} />
        </div>
      </div>
      {problems.length > 0 && (
        <p className="warnbox" role="alert" style={{ marginTop: 12 }}>
          <b>Don&apos;t shelve this.</b> {problems.join(". ")}. It stays blocked from the till, the website and delivery.
        </p>
      )}
      <div className="bnav">
        <button className="btn line" type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn"
          type="button"
          onClick={async () => {
            await receive(sku, n);
            toast(`Received ${n} × ${p?.brand} ${p?.name} (${by})`);
            onClose();
          }}
        >
          Receive
        </button>
      </div>
    </Modal>
  );
}
