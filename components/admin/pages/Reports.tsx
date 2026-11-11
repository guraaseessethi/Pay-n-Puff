"use client";

import { useAdmin } from "../AdminContext";
import { Kpi, Loading, PageHeader } from "../ui";
import { formatCents } from "@/lib/money";

const WEEKS = [281000, 312000, 339000, 354000, 370000, 398000, 415000]; // sample cents, weeks 1–7
const HOURS: [string, number][] = [
  ["12–3 pm", 14],
  ["3–6 pm", 20],
  ["6–9 pm", 30],
  ["9 pm–12 am", 26],
  ["12–1 am", 10],
];

export function Reports() {
  const { state } = useAdmin();
  if (!state) return <Loading />;
  const thisWeek = 400000 + state.sales.reduce((s, x) => s + x.totalCents, 0);
  const w = [...WEEKS, thisWeek];
  const max = 500000;
  const W = 620,
    H = 220,
    pd = 44,
    bw = (W - pd - 8) / w.length;
  const delivery = state.sales.filter((s) => s.channel === "delivery");
  const counter = state.sales.filter((s) => s.channel === "counter");
  const doorChecks = state.idChecks.filter((c) => c.where === "door");
  const doorRefused = doorChecks.filter((c) => c.result === "Refused").length;
  const counterRefused = state.idChecks.filter((c) => c.where === "counter" && c.result === "Refused").length;
  const sum = (xs: { totalCents: number }[]) => xs.reduce((s, x) => s + x.totalCents, 0);
  const totalSales = sum(state.sales) || 1;

  return (
    <>
      <PageHeader title="Reports" sub="Eight weeks of sales, late-night share, delivery vs counter, and refusals. Weeks 1–7 are sample figures; this week includes demo sales." />
      <div className="g g4">
        <Kpi k="Sales · 8 weeks" v={formatCents(w.reduce((a, b) => a + b, 0))} d={<span className="sample">mostly sample</span>} />
        <Kpi k="Delivery share" v={`${Math.round((sum(delivery) / totalSales) * 100)}%`} d="of tonight's sales" />
        <Kpi k="Door refusals" v={doorChecks.length ? `${Math.round((doorRefused / doorChecks.length) * 100)}%` : "—"} d={`${doorRefused} of ${doorChecks.length} door checks`} tone={doorRefused ? "bad" : ""} />
        <Kpi k="Counter refusals" v={counterRefused} d="logged tonight" />
      </div>
      <div className="g g2 mt">
        <section className="pn" aria-labelledby="ws-h">
          <div className="ph">
            <h2 id="ws-h">Weekly sales, tax in</h2>
            <span className="sample">Sample figures</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label={`Weekly sales for 8 weeks, from ${formatCents(w[0])} to ${formatCents(w[w.length - 1])}.`}>
            {[0, 250000, 500000].map((v) => {
              const y = H - 24 - (v / max) * (H - 40);
              return (
                <g key={v}>
                  <line x1={pd} x2={W - 4} y1={y} y2={y} stroke="#e3e0ea" />
                  <text x={pd - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#5f5a6e" style={{ fontFamily: "var(--mono)" }}>
                    {v ? `$${v / 100000}k` : "0"}
                  </text>
                </g>
              );
            })}
            {w.map((v, i) => {
              const x = pd + 8 + i * bw;
              const h = (Math.min(v, max) / max) * (H - 40);
              const last = i === w.length - 1;
              return (
                <g key={i}>
                  <rect x={x} y={H - 24 - h} width={bw - 14} height={h} fill={last ? "#c4207f" : "#2d2142"} rx="3" />
                  {last && (
                    <text x={x + (bw - 14) / 2} y={H - 30 - h} textAnchor="middle" fontSize="11.5" fontWeight="500" fill="#231a33" style={{ fontFamily: "var(--mono)" }}>
                      ${(v / 100000).toFixed(1)}k
                    </text>
                  )}
                  <text x={x + (bw - 14) / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#5f5a6e" style={{ fontFamily: "var(--mono)" }}>
                    W{i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </section>
        <section className="pn" aria-labelledby="hr-h">
          <div className="ph">
            <h2 id="hr-h">Fri &amp; Sat, sales by hour</h2>
            <span className="sample">Sample</span>
          </div>
          {HOURS.map(([label, pct]) => (
            <div className="hb" key={label}>
              <span>{label}</span>
              <span className="tr" aria-hidden="true">
                <i style={{ width: `${(pct / 30) * 100}%`, background: label === "12–1 am" ? "var(--hot-ink)" : undefined }} />
              </span>
              <span className="n">{pct}%</span>
            </div>
          ))}
          <p style={{ fontSize: 12.5, color: "var(--gray)", margin: "10px 0 0" }}>Late-night share (after 9 pm): 36%. Shows whether staying open till 1 am pays for the extra shift.</p>
        </section>
      </div>
      <div className="g g2 mt">
        <section className="pn" aria-labelledby="dc-h">
          <div className="ph">
            <h2 id="dc-h">Delivery vs counter (tonight, demo)</h2>
          </div>
          {[
            ["Counter", counter],
            ["Delivery", delivery],
          ].map(([label, xs]) => (
            <div className="hb" key={label as string}>
              <span>{label as string}</span>
              <span className="tr" aria-hidden="true">
                <i style={{ width: `${(sum(xs as typeof delivery) / totalSales) * 100}%` }} />
              </span>
              <span className="n">{formatCents(sum(xs as typeof delivery))}</span>
            </div>
          ))}
        </section>
        <section className="pn" aria-labelledby="rf-h">
          <div className="ph">
            <h2 id="rf-h">Refusals by reason</h2>
          </div>
          <div className="ls">
            {Object.entries(
              state.idChecks
                .filter((c) => c.result === "Refused")
                .reduce<Record<string, number>>((m, c) => {
                  const k = `${c.where === "door" ? "Door" : "Counter"}: ${c.reason ?? "Refused"}`;
                  m[k] = (m[k] ?? 0) + 1;
                  return m;
                }, {}),
            ).map(([k, n]) => (
              <div className="it" key={k}>
                <span>{k}</span>
                <b style={{ fontFamily: "var(--mono)" }}>{n}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
