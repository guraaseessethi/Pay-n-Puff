"use client";

import { useState, useTransition } from "react";
import { priceQuote } from "@/app/actions/staff";
import { useAdmin } from "../AdminContext";
import { dateTime, Loading, PageHeader } from "../ui";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { quoteBlocks, wholesaleUnitCents } from "@/lib/compliance/wholesaleRules";
import type { WholesaleRequest } from "@/lib/domain/types";
import { formatCents } from "@/lib/money";

const TYPE_LABEL = { specialty: "Specialty vape store", convenience: "Convenience store", other: "Other retailer" } as const;
const METHODS = [
  "Saw health unit specialty vape store registration",
  "Called Simcoe Muskoka District Health Unit",
  "Checked Ontario tobacco/vapour retail registration",
  "Saw business licence + HST number",
];

export function Wholesale() {
  const { state, repo, staff } = useAdmin();
  const [checking, setChecking] = useState<WholesaleRequest | null>(null);
  const [reqId, setReqId] = useState<string>("");
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState(50);
  const [margin, setMargin] = useState(18);
  const [lines, setLines] = useState<{ sku: string; qty: number }[]>([]);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  if (!state) return <Loading />;

  const req = state.wholesale.find((w) => w.id === reqId) ?? state.wholesale.find((w) => w.retailer.registrationStatus === "Verified" && w.quoteStatus !== "Sent") ?? null;
  const retailer = req?.retailer;
  const options = state.products.map((p) => ({ p, blocks: retailer ? quoteBlocks(retailer, p) : ["Pick a request"] }));
  const allowed = options.filter((o) => o.blocks.length === 0);
  const current = allowed.find((o) => o.p.sku === sku)?.p ?? allowed[0]?.p;
  const priced = lines.map((l) => {
    const p = state.products.find((x) => x.sku === l.sku)!;
    return { ...l, label: `${p.brand} ${p.name}`, unit: wholesaleUnitCents(p.costCents, margin), retail: p.priceCents };
  });
  const total = priced.reduce((s, l) => s + l.unit * l.qty, 0);

  return (
    <>
      <PageHeader title="Wholesale" sub="Consultations and quotes for other retailers. Check registration before you quote. Convenience stores can only be quoted tobacco, mint and menthol." />
      <div className="g g2">
        <section className="pn" aria-labelledby="wr-h">
          <div className="ph">
            <h2 id="wr-h">Requests</h2>
            <span className="sample">Sample stores</span>
          </div>
          <div className="tw" tabIndex={0} role="region" aria-label="Wholesale requests">
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">Store</th>
                  <th scope="col">Type</th>
                  <th scope="col">Asking for</th>
                  <th scope="col">Registration</th>
                  <th scope="col">Quote</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.wholesale.map((w) => (
                  <tr key={w.id}>
                    <td style={{ minWidth: 150 }}>
                      <b>{w.retailer.business}</b>
                      <div className="small-mono">{w.retailer.city}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{TYPE_LABEL[w.retailer.type]}</td>
                    <td style={{ fontSize: 13 }}>{w.asking}</td>
                    <td>
                      <span className={`pill ${w.retailer.registrationStatus === "Verified" ? "p-ok" : w.retailer.registrationStatus === "Failed" ? "p-bad" : "p-warn"}`}>{w.retailer.registrationStatus}</span>
                      {w.retailer.registrationCheck && <div className="small-mono" style={{ maxWidth: 200 }}>{w.retailer.registrationCheck.method}</div>}
                    </td>
                    <td>
                      <span className={`pill ${w.quoteStatus === "Sent" ? "p-ok" : w.quoteStatus === "New" ? "p-hot" : "p-mute"}`}>{w.quoteStatus}</span>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {w.retailer.registrationStatus !== "Verified" ? (
                        <button className="btn sm line" type="button" onClick={() => setChecking(w)}>
                          Check registration
                        </button>
                      ) : w.quoteStatus !== "Sent" ? (
                        <button className="btn sm" type="button" onClick={() => setReqId(w.id)}>
                          Quote
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.quotes.length > 0 && (
            <>
              <h3 className="small-mono" style={{ marginTop: 16, textTransform: "uppercase", letterSpacing: ".1em" }}>
                Quotes sent
              </h3>
              <div className="ls">
                {state.quotes.map((q) => (
                  <div className="it" key={q.id}>
                    <span>
                      {q.lines.map((l) => `${l.qty} × ${l.label}`).join(", ")}
                      <small>
                        {TYPE_LABEL[q.retailerType]} · registration: {q.registrationCheck.method} ({q.registrationCheck.by}, {dateTime(q.registrationCheck.checkedAt)}) · margin {q.marginPct}%
                      </small>
                    </span>
                    <b style={{ fontFamily: "var(--mono)" }}>{formatCents(q.totalCents)}</b>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="pn" style={{ alignSelf: "start" }} aria-labelledby="qb-h">
          <div className="ph">
            <h2 id="qb-h">Quote builder</h2>
          </div>
          {!req ? (
            <p className="muted" style={{ margin: 0 }}>
              Verify a retailer&apos;s registration first. Then you can quote them.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="fld">
                <label htmlFor="q-req">For</label>
                <select
                  id="q-req"
                  value={req.id}
                  onChange={(e) => {
                    setReqId(e.target.value);
                    setLines([]);
                  }}
                >
                  {state.wholesale
                    .filter((w) => w.retailer.registrationStatus === "Verified")
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.retailer.business} · {TYPE_LABEL[w.retailer.type]}
                      </option>
                    ))}
                </select>
              </div>
              <div className="fg">
                <div className="fld full">
                  <label htmlFor="q-sku">Product (only what this buyer can legally sell)</label>
                  <select id="q-sku" value={current?.sku ?? ""} onChange={(e) => setSku(e.target.value)}>
                    {allowed.map(({ p }) => (
                      <option key={p.sku} value={p.sku}>
                        {p.brand} {p.name} · {p.flavourFamily}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fld">
                  <label htmlFor="q-qty">Units</label>
                  <input id="q-qty" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
                </div>
                <div className="fld">
                  <label htmlFor="q-mg">Margin over cost: {margin}%</label>
                  <input id="q-mg" type="range" min={0} max={40} step={1} value={margin} onChange={(e) => setMargin(Number(e.target.value))} style={{ padding: 0, minHeight: 32 }} />
                </div>
              </div>
              <button
                className="btn sm line"
                type="button"
                style={{ justifySelf: "start" }}
                disabled={!current}
                onClick={() => current && setLines((ls) => [...ls.filter((l) => l.sku !== current.sku), { sku: current.sku, qty }])}
              >
                Add line
              </button>
              {priced.length > 0 && (
                <div style={{ borderTop: "1.5px solid var(--ink)", paddingTop: 10 }}>
                  {priced.map((l) => (
                    <div key={l.sku} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14 }}>
                      <span>
                        {l.qty} × {l.label} @ {formatCents(l.unit)}{" "}
                        <small className="muted">({Math.round((1 - l.unit / l.retail) * 100)}% under retail)</small>
                      </span>
                      <b style={{ fontFamily: "var(--mono)" }}>{formatCents(l.unit * l.qty)}</b>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontWeight: 700 }}>
                    <span>Total (before tax)</span>
                    <span style={{ fontFamily: "var(--mono)" }}>{formatCents(total)}</span>
                  </div>
                </div>
              )}
              {err && (
                <p role="alert" style={{ color: "var(--bad)", fontWeight: 600, margin: 0 }}>
                  {err}
                </p>
              )}
              <button
                className="btn"
                type="button"
                disabled={!lines.length || pending}
                onClick={() =>
                  start(async () => {
                    const r = await priceQuote({ retailer: { type: req.retailer.type, registrationStatus: req.retailer.registrationStatus, registrationCheck: req.retailer.registrationCheck }, marginPct: margin, lines });
                    if (!r.ok) {
                      setErr(r.error);
                      return;
                    }
                    await repo.saveQuote({ requestId: req.id, retailerType: req.retailer.type, registrationCheck: req.retailer.registrationCheck!, marginPct: margin, lines: r.lines, totalCents: r.totalCents });
                    await repo.send({ channel: "email", to: req.retailer.email, subject: "Your wholesale quote", body: r.lines.map((l) => `${l.qty} × ${l.label} @ ${formatCents(l.unitCents)}`).join("\n") });
                    setLines([]);
                    setErr("");
                    toast("Quote saved. Would send in the full build.");
                  })
                }
              >
                Send quote
              </button>
              <details>
                <summary style={{ cursor: "pointer", fontSize: 13.5 }}>Why some products aren&apos;t listed ({options.length - allowed.length})</summary>
                <ul style={{ fontSize: 13, color: "var(--gray)", paddingLeft: 18 }}>
                  {options
                    .filter((o) => o.blocks.length)
                    .map((o) => (
                      <li key={o.p.sku}>
                        {o.p.brand} {o.p.name}: {o.blocks.join("; ")}
                      </li>
                    ))}
                </ul>
              </details>
            </div>
          )}
        </section>
      </div>

      {checking && (
        <RegistrationCheck
          req={checking}
          onClose={() => setChecking(null)}
          save={async (method, passed, note) => {
            await repo.recordRegistrationCheck(checking.id, { method, checkedAt: new Date().toISOString(), by: staff.name, note }, passed);
            toast(passed ? "Registration verified and recorded" : "Marked as failed. No quote.");
            setChecking(null);
          }}
        />
      )}
    </>
  );
}

function RegistrationCheck({ req, onClose, save }: { req: WholesaleRequest; onClose: () => void; save: (method: string, passed: boolean, note: string) => Promise<void> }) {
  const [method, setMethod] = useState(METHODS[0]);
  const [note, setNote] = useState("");
  return (
    <Modal title="Check registration" onClose={onClose}>
      <p>
        {req.retailer.business} ({TYPE_LABEL[req.retailer.type]}, {req.retailer.city}). Every quote records how the registration was checked.
      </p>
      <div className="fg">
        <div className="fld full">
          <label htmlFor="rg-m">How did you check?</label>
          <select id="rg-m" value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="fld full">
          <label htmlFor="rg-n">Note (registration reference, who you spoke to)</label>
          <input id="rg-n" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <div className="bnav">
        <button className="btn danger" type="button" onClick={() => save(method, false, note)}>
          Couldn&apos;t verify
        </button>
        <button className="btn" type="button" onClick={() => save(method, true, note)}>
          Verified
        </button>
      </div>
    </Modal>
  );
}
