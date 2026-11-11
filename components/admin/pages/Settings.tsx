"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetDemo, updateSettings } from "@/app/actions/staff";
import { useAdmin } from "../AdminContext";
import { dateTime, PageHeader } from "../ui";
import { toast } from "@/components/ui/Toast";
import { AGE_GATE_MODES, type AgeGateMode, type Settings as S } from "@/lib/settings/schema";
import { MODE_INFO, SELF_DECLARE_WARNING } from "@/lib/compliance/ageGate";
import { DAY_NAMES, WEEK_ORDER } from "@/lib/hours/hours";

export function Settings() {
  const { settings, repo, staff, seed } = useAdmin();
  const [s, setS] = useState<S>(settings);
  const [fsas, setFsas] = useState(settings.delivery.fsas.join(", "));
  const [windows, setWindows] = useState(settings.delivery.windows.join("\n"));
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = <K extends keyof S>(k: K, v: S[K]) => setS((x) => ({ ...x, [k]: v }));
  const setDel = <K extends keyof S["delivery"]>(k: K, v: S["delivery"][K]) => setS((x) => ({ ...x, delivery: { ...x.delivery, [k]: v } }));

  const save = () =>
    start(async () => {
      const next: S = {
        ...s,
        delivery: {
          ...s.delivery,
          fsas: fsas
            .split(/[\s,]+/)
            .map((x) => x.trim().toUpperCase())
            .filter(Boolean),
          windows: windows
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
        },
      };
      const r = await updateSettings(next);
      if (!r.ok) {
        setErr(r.error);
        toast("Not saved. Check the highlighted setting.");
        return;
      }
      setErr("");
      for (const n of r.notes) await repo.audit(staff.name, n);
      toast("Settings saved");
      router.refresh();
    });

  return (
    <>
      <PageHeader
        title="Settings"
        sub="Owner only. Changes apply to this demo browser straight away; in the full build they apply to everyone."
        actions={
          <button className="btn sm hot" type="button" disabled={pending} onClick={save}>
            Save settings
          </button>
        }
      />
      {settings.ageGateMode === "self_declare" && (
        <div className="warnbox" role="alert" style={{ marginBottom: 16 }}>
          <b>Self-declare is on.</b> {SELF_DECLARE_WARNING}
          {settings.selfDeclareAck && (
            <div className="small-mono" style={{ marginTop: 6 }}>
              Turned on by {settings.selfDeclareAck.by}, {dateTime(settings.selfDeclareAck.at)}
            </div>
          )}
        </div>
      )}
      {err && (
        <p className="warnbox" role="alert">
          {err}
        </p>
      )}

      <div className="g g2">
        <section className="pn" aria-labelledby="gate-h">
          <div className="ph">
            <h2 id="gate-h">Age gate</h2>
          </div>
          <fieldset style={{ border: 0, margin: 0, padding: 0, display: "grid", gap: 10 }}>
            <legend className="sr-only">Age gate mode</legend>
            {AGE_GATE_MODES.map((m: AgeGateMode) => {
              const info = MODE_INFO[m];
              return (
                <label className="modecard" key={m}>
                  <input type="radio" name="mode" value={m} checked={s.ageGateMode === m} onChange={() => set("ageGateMode", m)} />
                  <span>
                    <b>{info.label}</b>
                    <small>{info.visitor}</small>
                    <small>
                      <b>Public sees:</b> {info.publicSees} · <b>Cost:</b> {info.cost}
                    </small>
                    <small className={info.risk === "high" ? "risk-high" : undefined}>
                      <b>Risk:</b> {info.riskNote}
                    </small>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <p className="small-mono" style={{ marginTop: 10 }}>
            In every mode: the counter check on every sale and the door ID check on every delivery still happen.
          </p>
        </section>

        <section className="pn" style={{ alignSelf: "start" }} aria-labelledby="flags-h">
          <div className="ph">
            <h2 id="flags-h">Compliance switches</h2>
          </div>
          <div className="fld">
            <label htmlFor="st-age">Minimum age</label>
            <select id="st-age" value={s.minAge} onChange={(e) => set("minAge", Number(e.target.value) as 19 | 21)}>
              <option value={19}>19 (Ontario today)</option>
              <option value={21}>21 (if Bill 125 passes)</option>
            </select>
          </div>
          <label className="chk">
            <span>
              Delivery
              <small className="muted" style={{ display: "block", fontSize: 12.5 }}>
                Off if Ontario bans online/remote sales (Bill 125).
              </small>
            </span>
            <input type="checkbox" checked={s.deliveryEnabled} onChange={(e) => set("deliveryEnabled", e.target.checked)} />
          </label>
          <label className="chk">
            <span>
              Online holds for pickup
              <small className="muted" style={{ display: "block", fontSize: 12.5 }}>
                Bill 125 as introduced would also ban &quot;offering to sell&quot; online.
              </small>
            </span>
            <input type="checkbox" checked={s.reservationsEnabled} onChange={(e) => set("reservationsEnabled", e.target.checked)} />
          </label>
          <label className="chk" style={{ cursor: "not-allowed" }}>
            <span>
              Promotions &amp; loyalty
              <small className="muted" style={{ display: "block", fontSize: 12.5 }}>
                Locked off until the owner confirms with Simcoe Muskoka District Health Unit what&apos;s allowed. See docs/COMPLIANCE.md.
              </small>
            </span>
            <input type="checkbox" checked={false} disabled aria-describedby="promo-note" />
          </label>
          <span id="promo-note" className="sr-only">
            Locked off
          </span>
          <div className="fld" style={{ marginTop: 10 }}>
            <label htmlFor="st-hold">Hold length (hours)</label>
            <input id="st-hold" type="number" min={1} max={72} value={s.holdHours} onChange={(e) => set("holdHours", Math.max(1, Math.min(72, Number(e.target.value) || 24)))} />
          </div>
        </section>
      </div>

      <div className="g g2 mt">
        <section className="pn" aria-labelledby="hrs-h">
          <div className="ph">
            <h2 id="hrs-h">Store hours</h2>
            <span className="small-mono">Past midnight: use 25:00 for 1 am</span>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {WEEK_ORDER.map((d) => {
              const h = s.hours[d];
              const update = (v: { open: string; close: string } | null) => {
                const hours = [...s.hours] as S["hours"];
                hours[d] = v;
                set("hours", hours);
              };
              return (
                <div key={d} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr auto", gap: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>{DAY_NAMES[d]}</span>
                  <input className="inp" aria-label={`${DAY_NAMES[d]} opens`} value={h?.open ?? ""} disabled={!h} onChange={(e) => update({ open: e.target.value, close: h!.close })} />
                  <input className="inp" aria-label={`${DAY_NAMES[d]} closes`} value={h?.close ?? ""} disabled={!h} onChange={(e) => update({ open: h!.open, close: e.target.value })} />
                  <label className="check" style={{ fontSize: 13 }}>
                    <input type="checkbox" checked={!h} onChange={(e) => update(e.target.checked ? null : { open: "12:00", close: "21:00" })} />
                    Closed
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        <section className="pn" aria-labelledby="dz-h">
          <div className="ph">
            <h2 id="dz-h">Delivery zone</h2>
            <span className="sample">Sample values</span>
          </div>
          <div className="fg">
            <div className="fld full">
              <label htmlFor="st-fsa">Postal-code areas (first 3 characters)</label>
              <input id="st-fsa" value={fsas} onChange={(e) => setFsas(e.target.value)} aria-describedby="st-fsa-h" />
              <span className="hint" id="st-fsa-h">
                Comma-separated, e.g. L4M, L4N. Anything else can&apos;t book delivery.
              </span>
            </div>
            <div className="fld">
              <label htmlFor="st-fee">Delivery fee ($)</label>
              <input id="st-fee" type="number" min={0} step="0.5" value={s.delivery.feeCents / 100} onChange={(e) => setDel("feeCents", Math.round((Number(e.target.value) || 0) * 100))} />
            </div>
            <div className="fld">
              <label htmlFor="st-min">Minimum order ($)</label>
              <input id="st-min" type="number" min={0} step="1" value={s.delivery.minimumCents / 100} onChange={(e) => setDel("minimumCents", Math.round((Number(e.target.value) || 0) * 100))} />
            </div>
            <div className="fld full">
              <label htmlFor="st-win">Delivery windows (one per line)</label>
              <textarea id="st-win" value={windows} onChange={(e) => setWindows(e.target.value)} />
            </div>
          </div>
          <label className="chk">
            <span>Cash on delivery</span>
            <input type="checkbox" checked={s.delivery.payment.cash} onChange={(e) => setDel("payment", { ...s.delivery.payment, cash: e.target.checked })} />
          </label>
          <label className="chk">
            <span>e-Transfer on delivery</span>
            <input type="checkbox" checked={s.delivery.payment.etransfer} onChange={(e) => setDel("payment", { ...s.delivery.payment, etransfer: e.target.checked })} />
          </label>
          <p className="small-mono" style={{ margin: "8px 0 0" }}>
            No online card payment: processors treat vape as restricted.
          </p>
        </section>
      </div>

      <section className="pn mt" aria-labelledby="demo-h">
        <div className="ph">
          <h2 id="demo-h">Demo</h2>
        </div>
        <p className="muted" style={{ margin: "0 0 10px", fontSize: 14 }}>
          Puts every order, check, hold and setting back to the sample data on this device, and signs out the demo customer.
        </p>
        <button
          className="btn danger sm"
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await resetDemo();
              repo.reset(seed);
              toast("Demo data reset");
              router.refresh();
            })
          }
        >
          Reset demo data
        </button>
      </section>
    </>
  );
}
