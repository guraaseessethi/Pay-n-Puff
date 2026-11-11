"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeDemoVerification, demoStaffVerifiedSignIn, signOutCustomer, startDemoVerification } from "@/app/actions/verify";
import { confirmAge } from "@/app/actions/public";
import { getRepository } from "@/lib/data";
import { toast } from "@/components/ui/Toast";
import styles from "./Verify.module.css";

/** DemoProvider: 3 steps (ID photo, selfie, done). Nothing is captured. Labelled as a demo throughout. */
export function DemoIdCheck({ minAge }: { minAge: number }) {
  const [step, setStep] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const steps = ["Photo of your ID", "Selfie to match", "Done"];

  return (
    <div className={styles.flow}>
      <p className={styles.demoLabel} role="note">
        Demo: no real check runs. No photo is taken, sent or stored.
      </p>
      <ol className={styles.stepper} aria-label="Verification steps">
        {steps.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className={i < step ? styles.doneStep : i === step ? styles.curStep : ""}>
            <b>{i + 1}</b> {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className={styles.panel}>
          <h3>Photo of your government ID</h3>
          <p className="muted">Driver&apos;s licence, Ontario Photo Card or passport. On the live site an ID service reads the photo, checks it&apos;s genuine, and tells us only that you&apos;re {minAge}+.</p>
          <div className={styles.frame} aria-hidden="true">
            <span>ID card frame</span>
          </div>
          <div className="fld">
            <label htmlFor="v-name">Name as shown on your ID (demo only)</label>
            <input id="v-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-describedby="v-name-hint" />
            <span className="hint" id="v-name-hint">
              The real service reads this from the ID. Deliveries can only go to this name.
            </span>
          </div>
          {err && (
            <p className="err" role="alert" style={{ color: "var(--bad)", fontWeight: 600 }}>
              {err}
            </p>
          )}
          <button
            className="btn hot"
            type="button"
            disabled={pending}
            onClick={() => {
              if (name.trim().length < 2) {
                setErr("Enter the name on the ID.");
                document.getElementById("v-name")?.focus();
                return;
              }
              setErr("");
              start(async () => {
                const r = await startDemoVerification();
                setSessionId(r.sessionId);
                setStep(1);
              });
            }}
          >
            Demo: use a sample ID photo
          </button>
        </div>
      )}

      {step === 1 && (
        <div className={styles.panel}>
          <h3>Quick selfie</h3>
          <p className="muted">The service matches your face to the ID photo and checks it&apos;s a live person. We never see or keep the images.</p>
          <div className={`${styles.frame} ${styles.round}`} aria-hidden="true">
            <span>Face frame</span>
          </div>
          <button className="btn hot" type="button" onClick={() => setStep(2)}>
            Demo: use a sample selfie
          </button>
        </div>
      )}

      {step === 2 && (
        <div className={styles.panel}>
          <h3>Done</h3>
          <p className="muted">
            Verified {minAge}+ for 30 days on this device. We keep only: verified yes, age band, time, a reference number and the expiry. Never your ID number or birth
            date.
          </p>
          {err && (
            <p role="alert" style={{ color: "var(--bad)", fontWeight: 600 }}>
              {err}
            </p>
          )}
          <button
            className="btn hot"
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await completeDemoVerification(sessionId!, name);
                if (!r.ok) {
                  setErr(r.error);
                  return;
                }
                toast("Verified. Opening the shelf.");
                router.push("/shelf");
                router.refresh();
              })
            }
          >
            See the shelf
          </button>
        </div>
      )}
    </div>
  );
}

/** staff_verified mode: sign in with the link staff sent, plus a clearly-labelled demo shortcut. */
export function StaffVerifiedSignIn() {
  const [contact, setContact] = useState("");
  const [result, setResult] = useState<null | { found: boolean; link?: string }>(null);
  const [demoName, setDemoName] = useState("Demo Customer");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className={styles.flow}>
      <div className={styles.panel}>
        <h3>Already verified in store or at the door?</h3>
        <p className="muted">Enter the email or mobile number you gave staff. We&apos;ll send you a sign-in link.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const customers = await getRepository().listCustomers();
              const c = customers.find((x) => x.contact.toLowerCase() === contact.trim().toLowerCase());
              const msg = c ? (await getRepository().listOutbox()).find((m) => m.to === c.contact && m.demoLink) : undefined;
              setResult({ found: !!c, link: msg?.demoLink });
            });
          }}
        >
          <div className="fld">
            <label htmlFor="si-contact">Email or mobile number</label>
            <input id="si-contact" value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="email" required />
          </div>
          <button className="btn" type="submit" disabled={pending} style={{ marginTop: 10 }}>
            Send my sign-in link
          </button>
        </form>
        <div aria-live="polite">
          {result && (
            <p className={result.found ? "okbox" : "warnbox"} style={{ marginTop: 12 }}>
              {result.found ? (
                <>
                  Would send in the full build.{" "}
                  {result.link && (
                    <a href={result.link}>
                      <b>Demo: open the link</b>
                    </a>
                  )}
                </>
              ) : (
                <>We don&apos;t have that yet. Show photo ID at the counter, or to the driver on your first delivery (order by phone or in store).</>
              )}
            </p>
          )}
        </div>
      </div>

      <div className={styles.panel}>
        <h3>Not verified yet?</h3>
        <ol className="muted" style={{ paddingLeft: 20, margin: 0, display: "grid", gap: 6 }}>
          <li>Visit the counter on Dunlop with photo ID, or order your first delivery by phone and show ID to the driver.</li>
          <li>Staff record that your ID was checked (never the ID number) and send you a sign-in link.</li>
          <li>Sign in here to see the shelf and order. Re-check once a year.</li>
        </ol>
      </div>

      <div className={`${styles.panel} ${styles.demoPanel}`}>
        <h3>Demo shortcut</h3>
        <p className="muted">Skip the counter visit and continue as a customer staff have already verified. Not in the real site.</p>
        <div className="fld">
          <label htmlFor="demo-name">Customer name</label>
          <input id="demo-name" value={demoName} onChange={(e) => setDemoName(e.target.value)} />
        </div>
        <button
          className="btn hot"
          type="button"
          disabled={pending}
          style={{ marginTop: 10 }}
          onClick={() =>
            start(async () => {
              const r = await demoStaffVerifiedSignIn(demoName);
              if (!r.ok) {
                toast(r.error);
                return;
              }
              router.push("/shelf");
              router.refresh();
            })
          }
        >
          Demo: continue as a verified adult
        </button>
      </div>
    </div>
  );
}

export function SelfDeclare({ minAge }: { minAge: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className={styles.panel}>
      <h3>Are you {minAge} or older?</h3>
      <button
        className="btn hot"
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await confirmAge();
            router.push("/shelf");
            router.refresh();
          })
        }
      >
        Yes, show the shelf
      </button>
    </div>
  );
}

export function SignOut() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className="btn line sm"
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await signOutCustomer();
          router.refresh();
        })
      }
    >
      Sign out
    </button>
  );
}
