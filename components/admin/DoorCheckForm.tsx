"use client";

import { useId, useState, useTransition } from "react";
import type { IdCheckInput, IdType, Order } from "@/lib/domain/types";
import { formatCents } from "@/lib/money";
import { AgeField, IdTypeSelect } from "./IdForms";

export type DoorOutcome = { result: "Pass" | "Refused"; reason?: string } | { queued: true };

const NO_HANDOFF = ["No ID at door", "Recipient not there", "Wrong person / name doesn't match", "Looked intoxicated", "Customer cancelled at door"];

/**
 * Door ID check. Same rules as the counter, plus: photo ID always, and the name must match the order.
 * Fields: ID type, age in years, name matches yes/no. Never the ID number or birth date.
 */
export function DoorCheckForm({
  order,
  minAge,
  staffName,
  big,
  onSubmit,
  after,
}: {
  order: Order;
  minAge: number;
  staffName: string;
  big?: boolean;
  onSubmit: (input: IdCheckInput) => Promise<DoorOutcome>;
  after?: (o: DoorOutcome) => void;
}) {
  const uid = useId();
  const [idType, setIdType] = useState<IdType>("Driver's licence");
  const [age, setAge] = useState("");
  const [match, setMatch] = useState<"yes" | "no" | "">("");
  const [noReason, setNoReason] = useState(NO_HANDOFF[0]);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const btn = big ? { minHeight: 56, fontSize: 17 } : undefined;

  const send = (input: IdCheckInput) =>
    start(async () => {
      try {
        const o = await onSubmit(input);
        after?.(o);
      } catch (e) {
        setErr((e as Error).message);
      }
    });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="idnote">
        Hand over only to <b>{order.recipientShort}</b> after checking photo ID. The name on the ID must match the order. {formatCents(order.totalCents)} ·{" "}
        {order.paymentMethod === "etransfer" ? "e-Transfer" : order.paymentMethod === "cash" ? "Cash" : "Card"}.
      </div>
      <div className="fg">
        <IdTypeSelect id={`${uid}-t`} value={idType} onChange={setIdType} big={big} />
        <AgeField id={`${uid}-a`} minAge={minAge} value={age} onChange={setAge} big={big} />
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="fld" style={{ fontSize: 13, fontWeight: 600, color: "var(--gray)", marginBottom: 6 }}>
          Name on the ID matches {order.recipientShort}?
        </legend>
        <div style={{ display: "flex", gap: 10 }}>
          {(["yes", "no"] as const).map((v) => (
            <label key={v} className="check" style={{ border: "1.5px solid #b9b4c6", borderRadius: 10, padding: big ? "14px 18px" : "8px 12px", flex: 1, minHeight: big ? 56 : 44, alignItems: "center" }}>
              <input type="radio" name={`${uid}-m`} value={v} checked={match === v} onChange={() => setMatch(v)} />
              <span style={{ fontWeight: 700 }}>{v === "yes" ? "Yes, matches" : "No"}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {err && (
        <p role="alert" style={{ color: "var(--bad)", fontWeight: 600, margin: 0 }}>
          {err}
        </p>
      )}
      <button
        type="button"
        className="btn hot block"
        style={btn}
        disabled={pending}
        onClick={() => {
          const n = Number.parseInt(age, 10);
          if (!Number.isFinite(n)) {
            setErr("Enter the age from the ID.");
            document.getElementById(`${uid}-a`)?.focus();
            return;
          }
          if (!match) {
            setErr("Say whether the name matches the order.");
            return;
          }
          setErr("");
          send({ where: "door", staff: staffName, idType, age: n, nameMatches: match === "yes", orderCode: order.code });
        }}
      >
        ID checked · hand over
      </button>
      <div style={{ display: "grid", gap: 8, borderTop: "1px solid var(--soft)", paddingTop: 12 }}>
        <div className="fld">
          <label htmlFor={`${uid}-r`}>No handoff: reason</label>
          <select id={`${uid}-r`} value={noReason} onChange={(e) => setNoReason(e.target.value)} style={big ? { minHeight: 52 } : undefined}>
            {NO_HANDOFF.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn danger block"
          style={btn}
          disabled={pending}
          onClick={() =>
            send({
              where: "door",
              staff: staffName,
              idType: noReason === "No ID at door" ? "No ID" : idType,
              age: noReason === "No ID at door" ? null : Number.parseInt(age, 10) || null,
              nameMatches: noReason.startsWith("Wrong person") ? false : null,
              orderCode: order.code,
              reason: noReason,
              refusedByStaff: true,
            })
          }
        >
          Don&apos;t hand over · bring it back
        </button>
      </div>
    </div>
  );
}
