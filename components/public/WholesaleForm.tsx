"use client";

import { useState, useTransition } from "react";
import { submitWholesale } from "@/app/actions/public";
import { getRepository } from "@/lib/data";
import { toast } from "@/components/ui/Toast";
import styles from "./WholesaleForm.module.css";

const FIELDS = ["business", "contactName", "email", "phone", "city", "storeType", "asking", "registeredConfirmed"] as const;

export function WholesaleForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className={styles.form} role="status">
        <p className="okbox" style={{ gridColumn: "1 / -1", margin: 0 }}>
          <b>Request received.</b> We check that you&apos;re a registered retailer before we quote. Demo: it&apos;s now in the back office under Wholesale.
        </p>
        <button className="btn line" type="button" onClick={() => setDone(false)}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      noValidate
      aria-describedby="w-note"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const raw = {
          business: String(f.get("business") ?? ""),
          contactName: String(f.get("contactName") ?? ""),
          email: String(f.get("email") ?? ""),
          phone: String(f.get("phone") ?? ""),
          city: String(f.get("city") ?? ""),
          storeType: String(f.get("storeType") ?? ""),
          asking: String(f.get("asking") ?? ""),
          registeredConfirmed: f.get("registeredConfirmed") === "on",
        };
        start(async () => {
          const r = await submitWholesale(raw);
          if (!r.ok) {
            setErrors(r.errors);
            const first = FIELDS.find((k) => r.errors[k]);
            if (first) document.getElementById(`w-${first}`)?.focus();
            toast("Check the highlighted fields");
            return;
          }
          await getRepository().addWholesaleRequest(r.data);
          setErrors({});
          setDone(true);
          toast("Request sent. We check registration before quoting.");
        });
      }}
    >
      <Field id="business" label="Store name" error={errors.business} autoComplete="organization" />
      <Field id="contactName" label="Your name" error={errors.contactName} autoComplete="name" />
      <Field id="email" label="Email" type="email" error={errors.email} autoComplete="email" />
      <Field id="phone" label="Phone (optional)" type="tel" error={errors.phone} autoComplete="tel" />
      <Field id="city" label="City" error={errors.city} autoComplete="address-level2" />
      <div className="fld">
        <label htmlFor="w-storeType">Store type</label>
        <select id="w-storeType" name="storeType" defaultValue="specialty" aria-invalid={!!errors.storeType}>
          <option value="specialty">Specialty vape store</option>
          <option value="convenience">Convenience store</option>
          <option value="other">Other retailer</option>
        </select>
      </div>
      <div className="fld full">
        <label htmlFor="w-asking">What you&apos;d like to talk about</label>
        <textarea id="w-asking" name="asking" placeholder="Fair-price review, a quote you want matched, or a market overview" />
      </div>
      <label className="check full" htmlFor="w-registeredConfirmed" style={{ gridColumn: "1 / -1" }}>
        <input type="checkbox" id="w-registeredConfirmed" name="registeredConfirmed" aria-invalid={!!errors.registeredConfirmed} aria-describedby="w-reg-err" />
        <span>I confirm this is a registered retail business. We check before quoting.</span>
      </label>
      {errors.registeredConfirmed && (
        <p className="fld err" id="w-reg-err" style={{ gridColumn: "1 / -1", margin: 0 }}>
          {errors.registeredConfirmed}
        </p>
      )}
      <p id="w-note" className="muted" style={{ gridColumn: "1 / -1", margin: 0, fontSize: 13 }}>
        For registered stores only. Pricing depends on brand and quantity, so we don&apos;t publish a list.
      </p>
      <button className="btn" type="submit" disabled={pending} style={{ gridColumn: "1 / -1" }}>
        {pending ? "Sending…" : "Request a consultation"}
      </button>
    </form>
  );
}

function Field({ id, label, error, type = "text", autoComplete }: { id: string; label: string; error?: string; type?: string; autoComplete?: string }) {
  return (
    <div className="fld">
      <label htmlFor={`w-${id}`}>{label}</label>
      <input id={`w-${id}`} name={id} type={type} autoComplete={autoComplete} aria-invalid={!!error} aria-describedby={error ? `w-${id}-err` : undefined} />
      {error && (
        <span className="err" id={`w-${id}-err`}>
          {error}
        </span>
      )}
    </div>
  );
}
