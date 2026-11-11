"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/components/admin/AdminContext";
import { DoorCheckForm, type DoorOutcome } from "@/components/admin/DoorCheckForm";
import { VerifyCustomer } from "@/components/admin/IdForms";
import { Loading } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { enqueue, submitDoorCheck } from "./queue";
import { OrderCard } from "./RunList";
import styles from "./Driver.module.css";

export function DoorPage({ code }: { code: string }) {
  const { state, repo, staff, settings } = useAdmin();
  const [outcome, setOutcome] = useState<DoorOutcome | null>(null);
  const [, start] = useTransition();
  const router = useRouter();
  if (!state) return <Loading />;
  const o = state.orders.find((x) => x.code === code && x.driver === staff.name);
  if (!o) {
    return (
      <>
        <p className={styles.empty}>That run isn&apos;t assigned to you.</p>
        <Link className="btn block" href="/driver">
          Back to my runs
        </Link>
      </>
    );
  }

  if (outcome) {
    const queued = "queued" in outcome;
    const pass = !queued && outcome.result === "Pass";
    return (
      <div className={styles.list}>
        <div className={queued ? "warnbox" : pass ? "okbox" : "warnbox"} role="status" style={{ fontSize: 17 }}>
          {queued ? (
            <>
              <b>Saved on this phone.</b> No signal, so the check will sync when you&apos;re back online. Don&apos;t hand over until it shows as passed.
            </>
          ) : pass ? (
            <>
              <b>Landed.</b> ID checked. Hand over the bag and collect payment.
            </>
          ) : (
            <>
              <b>Don&apos;t hand over.</b> {outcome.reason}. Bring the order back to the store; it&apos;s been logged and will be restocked.
            </>
          )}
        </div>
        {pass && o.firstOrderUnverified && settings.ageGateMode === "staff_verified" && (
          <VerifyCustomer repo={repo} where="door" minAge={settings.minAge} defaultName={o.recipientName} defaultContact={o.contact ?? ""} big />
        )}
        <Link className={`btn block ${styles.big}`} href="/driver">
          Back to my runs
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className={styles.h1}>At the door</h1>
      <div className={styles.list}>
        <OrderCard o={o} />
        <section className={styles.card} aria-label="Door ID check">
          <DoorCheckForm
            order={o}
            minAge={settings.minAge}
            staffName={staff.name}
            big
            onSubmit={async (input) => {
              if (!navigator.onLine) {
                enqueue({ code: o.code, input, at: new Date().toISOString() });
                return { queued: true };
              }
              try {
                const { check } = await submitDoorCheck(repo, o.code, input, settings.minAge);
                return { result: check.result, reason: check.reason };
              } catch (e) {
                if ((e as { rejected?: boolean }).rejected) throw e;
                enqueue({ code: o.code, input, at: new Date().toISOString() });
                return { queued: true };
              }
            }}
            after={(r) => {
              setOutcome(r);
              if ("result" in r) toast(r.result === "Pass" ? `${o.code} landed` : `${o.code} returning to store`);
              start(() => router.refresh());
            }}
          />
        </section>
      </div>
    </>
  );
}
