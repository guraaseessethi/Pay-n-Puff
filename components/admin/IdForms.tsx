"use client";

import { useId, useState, useTransition } from "react";
import { issueMagicLink } from "@/app/actions/verify";
import { bornOnOrBefore } from "@/lib/compliance/ageGate";
import { PHOTO_ID_TYPES } from "@/lib/compliance/idCheck";
import { STAFF_REVERIFY_MONTHS } from "@/lib/compliance/policy";
import type { DataRepository } from "@/lib/data/repository";
import type { IdType } from "@/lib/domain/types";
import { toast } from "@/components/ui/Toast";

export function cutoffText(minAge: number) {
  return bornOnOrBefore(minAge, new Date()).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

/** Age field + the "born on or before" prompt. Staff read the age off the ID; we never take the birth date. */
export function AgeField({ id, minAge, value, onChange, big }: { id: string; minAge: number; value: string; onChange: (v: string) => void; big?: boolean }) {
  return (
    <div className="fld">
      <label htmlFor={id}>Age on the ID (years)</label>
      <input
        id={id}
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
        aria-describedby={`${id}-hint`}
        style={big ? { fontSize: 22, minHeight: 56 } : undefined}
      />
      <span className="hint" id={`${id}-hint`}>
        {minAge}+ means born on or before <b>{cutoffText(minAge)}</b>. Don&apos;t type the ID number or birth date.
      </span>
    </div>
  );
}

export function IdTypeSelect({ id, value, onChange, big }: { id: string; value: IdType; onChange: (v: IdType) => void; big?: boolean }) {
  return (
    <div className="fld">
      <label htmlFor={id}>ID type</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as IdType)} style={big ? { fontSize: 18, minHeight: 56 } : undefined}>
        {PHOTO_ID_TYPES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}

/**
 * staff_verified mode: after a passing in-person ID check, staff can verify the customer for online
 * ordering and send a sign-in link. Stores name + contact + "ID checked", never the ID number.
 */
export function VerifyCustomer({
  repo,
  where,
  defaultName = "",
  defaultContact = "",
  big,
  onDone,
  minAge,
}: {
  minAge: number;
  repo: DataRepository;
  where: "counter" | "door";
  defaultName?: string;
  defaultContact?: string;
  big?: boolean;
  onDone?: () => void;
}) {
  const uid = useId();
  const [name, setName] = useState(defaultName);
  const [contact, setContact] = useState(defaultContact);
  const [checked, setChecked] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="okbox" role="status">
        Verified for online ordering for {STAFF_REVERIFY_MONTHS} months. Sign-in link: <b>would send in the full build</b> (in the demo outbox).{" "}
        <a href={done}>Demo: open the link</a>
      </div>
    );
  }

  return (
    <div className="idbox" style={{ marginTop: 0 }}>
      <h3>Verify customer for online ordering</h3>
      <div className="fg">
        <div className="fld">
          <label htmlFor={`${uid}-n`}>Name on the ID</label>
          <input id={`${uid}-n`} value={name} onChange={(e) => setName(e.target.value)} style={big ? { minHeight: 52 } : undefined} />
        </div>
        <div className="fld">
          <label htmlFor={`${uid}-c`}>Email or mobile for the link</label>
          <input id={`${uid}-c`} value={contact} onChange={(e) => setContact(e.target.value)} style={big ? { minHeight: 52 } : undefined} />
        </div>
      </div>
      <label className="check">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>I checked their photo ID in person and they&apos;re old enough. No ID number recorded.</span>
      </label>
      {err && (
        <p role="alert" style={{ color: "var(--bad)", fontWeight: 600, margin: 0 }}>
          {err}
        </p>
      )}
      <button
        className={`btn ${big ? "" : "sm"}`}
        type="button"
        disabled={pending || !checked}
        onClick={() =>
          start(async () => {
            const r = await issueMagicLink({ name, contact, where });
            if (!r.ok) {
              setErr(r.error);
              return;
            }
            await repo.addVerifiedCustomer({ name: name.trim(), contact: contact.trim(), verifiedMinAge: minAge, verifiedAt: new Date().toISOString(), expiresAt: r.expiresAt, method: where, verificationRef: r.ref });
            await repo.send({
              channel: contact.includes("@") ? "email" : "sms",
              to: contact.trim(),
              subject: "Your Pay N' Puff sign-in link",
              body: `Your ID was checked ${where === "door" ? "at the door" : "at the counter"}. Tap to sign in and see the shelf. Re-check in ${STAFF_REVERIFY_MONTHS} months.`,
              demoLink: r.link,
            });
            setDone(r.link);
            toast("Customer verified. Would send the link in the full build.");
            onDone?.();
          })
        }
      >
        Verify &amp; send sign-in link
      </button>
    </div>
  );
}
