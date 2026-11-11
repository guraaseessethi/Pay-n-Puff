"use client";

import { useAdmin } from "../AdminContext";
import { dateTime, Kpi, Loading, PageHeader, time } from "../ui";
import { CHECKLIST } from "./checklist";
import { flags } from "@/lib/compliance/flags";
import { sellable } from "@/lib/compliance/sellable";
import { MODE_INFO } from "@/lib/compliance/ageGate";
import type { IdCheck } from "@/lib/domain/types";

function csv(rows: IdCheck[]): string {
  const head = ["time", "where", "staff", "id_type", "age", "name_matches", "order", "result", "reason"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [head.join(","), ...rows.map((r) => [r.at, r.where, r.staff, r.idType, r.age ?? "", r.nameMatches ?? "", r.orderCode ?? "", r.result, r.reason ?? ""].map(esc).join(","))].join("\n");
}

export function Compliance() {
  const { state, repo, settings } = useAdmin();
  if (!state) return <Loading />;
  const refused = state.idChecks.filter((c) => c.result === "Refused").length;
  const open = CHECKLIST.filter((c) => !state.checklist[c.key]).length;
  const blocked = state.products.filter((p) => !sellable(p));
  const log = [...state.idChecks].reverse();

  const exportLog = () => {
    const blob = new Blob([csv(state.idChecks)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pay-n-puff-id-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader
        title="Compliance"
        sub="Your record for health unit visits. Counter and door checks in one log. ID numbers and birth dates are never stored."
        actions={
          <button className="btn sm" type="button" onClick={exportLog}>
            Export for health unit (CSV)
          </button>
        }
      />
      <div className="g g4">
        <Kpi k="ID checks" v={state.idChecks.length} d="counter + door" />
        <Kpi k="Refusals" v={refused} d="logged with reason" />
        <Kpi k="Checklist" v={`${CHECKLIST.length - open}/${CHECKLIST.length}`} d="done today" tone={open ? "bad" : "up"} />
        <Kpi k="Blocked stock" v={blocked.length} d="pulled from sale" tone={blocked.length ? "bad" : ""} />
      </div>
      <div className="g g2 mt">
        <section className="pn" aria-labelledby="log-h">
          <div className="ph">
            <h2 id="log-h">ID check &amp; refusal log</h2>
            <span className="pill p-mute">No ID numbers or birth dates</span>
          </div>
          <div className="tw" tabIndex={0} role="region" aria-label="ID check log">
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Where</th>
                  <th scope="col">Staff</th>
                  <th scope="col">ID type</th>
                  <th scope="col">Age</th>
                  <th scope="col">Order</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {log.map((x) => (
                  <tr key={x.id}>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>{time(x.at)}</td>
                    <td>
                      <span className={`pill ${x.where === "door" ? "p-cy" : "p-mute"}`}>{x.where === "door" ? "Door" : "Counter"}</span>
                    </td>
                    <td>{x.staff}</td>
                    <td>{x.idType}</td>
                    <td>{x.age ?? "—"}</td>
                    <td className="small-mono">{x.orderCode ?? ""}</td>
                    <td>
                      <span className={`pill ${x.result === "Pass" ? "p-ok" : "p-bad"}`}>{x.result}</span>
                      {x.reason && <div className="small-mono">{x.reason}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="pn" style={{ alignSelf: "start" }} aria-labelledby="ck-h">
          <div className="ph">
            <h2 id="ck-h">Opening &amp; closing checklist</h2>
          </div>
          {CHECKLIST.map((c) => (
            <label className="chk" key={c.key} htmlFor={`ck-${c.key}`}>
              <span>{c.label}</span>
              <input type="checkbox" id={`ck-${c.key}`} checked={!!state.checklist[c.key]} onChange={(e) => void repo.setChecklistItem(c.key, e.target.checked)} />
            </label>
          ))}
        </section>
      </div>

      <div className="g g2 mt">
        <section className="pn" aria-labelledby="bl-h">
          <div className="ph">
            <h2 id="bl-h">Blocked stock</h2>
          </div>
          <div className="ls">
            {blocked.map((p) => (
              <div className="it" key={p.sku}>
                <span>
                  {p.brand} {p.name}
                  <small>{flags(p).join(" · ")}</small>
                </span>
                <span className="pill p-bad">{p.stock} on hand</span>
              </div>
            ))}
          </div>
          <div className="ph" style={{ marginTop: 18 }}>
            <h2>Fix before launch</h2>
            <span className="pill p-hot">From the current pages</span>
          </div>
          <div className="fix">
            <b>Website shows products with no age check</b>
            <span>paynpuffvapes.com lists devices, photos and prices to anyone. This site puts them behind a real ID check.</span>
          </div>
          <div className="fix">
            <b>&quot;Younginz&quot; wording on Facebook</b>
            <span>Reads as youth appeal. Worth taking down.</span>
          </div>
          <div className="fix">
            <b>Loyalty deals (6th purchase, sticker credit)</b>
            <span>Promotions are switched off here until the health unit confirms what&apos;s allowed.</span>
          </div>
          <div className="fix">
            <b>&quot;Luxury vape destination&quot;</b>
            <span>Lifestyle wording in promotion is restricted. Keep copy factual.</span>
          </div>
          <div className="fix">
            <b>Logo still says &quot;Newmarket&apos;s Fastest Vape Delivery&quot;</b>
            <span>Speed claims for vape delivery are risky, and the store is in Barrie now.</span>
          </div>
          <div className="fix">
            <b>Two prices for the 30K</b>
            <span>Instagram says $35.99, the website says $45. Pick one.</span>
          </div>
          <div className="fix" style={{ marginBottom: 0 }}>
            <b>&quot;vapecave.ca&quot; leftover and an empty wholesale page</b>
            <span>Removed in this build. Redirect old URLs at launch (docs/MIGRATION.md).</span>
          </div>
        </section>
        <section className="pn" style={{ alignSelf: "start" }} aria-labelledby="gr-h">
          <div className="ph">
            <h2 id="gr-h">Website guardrails</h2>
          </div>
          <div className="ls">
            <div className="it">
              <span>
                Age gate
                <small>{MODE_INFO[settings.ageGateMode].label}</small>
              </span>
              <span className={`pill ${settings.ageGateMode === "self_declare" ? "p-bad" : "p-ok"}`}>{settings.ageGateMode === "self_declare" ? "High risk" : "On"}</span>
            </div>
            <div className="it">
              <span>Health warning on every verified page</span>
              <span className="pill p-ok">On</span>
            </div>
            <div className="it">
              <span>No reviews, testimonials, people or flavour imagery</span>
              <span className="pill p-ok">On</span>
            </div>
            <div className="it">
              <span>Blocked stock hidden from shop, till and quotes</span>
              <span className="pill p-ok">On</span>
            </div>
            <div className="it">
              <span>Door ID check on every delivery</span>
              <span className="pill p-ok">Always</span>
            </div>
            <div className="it">
              <span>Promotions &amp; loyalty</span>
              <span className="pill p-mute">Off</span>
            </div>
          </div>
          {state.audit.length > 0 && (
            <>
              <div className="ph" style={{ marginTop: 18 }}>
                <h2>Audit log</h2>
              </div>
              <div className="ls">
                {state.audit.slice(0, 12).map((a) => (
                  <div className="it" key={a.id}>
                    <span>
                      {a.what}
                      <small>
                        {a.who} · {dateTime(a.at)}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="ph" style={{ marginTop: 18 }}>
            <h2>Demo outbox</h2>
          </div>
          {state.outbox.length ? (
            <div className="ls">
              {state.outbox.slice(0, 10).map((m) => (
                <div className="it" key={m.id}>
                  <span>
                    {m.subject}
                    <small>
                      {m.channel.toUpperCase()} to {m.to} · {time(m.at)} · would send in the full build
                    </small>
                  </span>
                  {m.demoLink && (
                    <a className="btn sm line" href={m.demoLink}>
                      Open link
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              Nothing sent yet.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
