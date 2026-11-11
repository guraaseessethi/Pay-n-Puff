"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { Loading } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { STATUS_TONE } from "@/lib/delivery/status";
import type { Order } from "@/lib/domain/types";
import { formatCents } from "@/lib/money";
import styles from "./Driver.module.css";

export function mapsUrl(o: Order) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address}, ${o.postalCode}, ON`)}`;
}

export function OrderCard({ o, children }: { o: Order; children?: React.ReactNode }) {
  return (
    <article className={styles.card} aria-labelledby={`run-${o.code}`}>
      <div className={styles.cardTop}>
        <h2 id={`run-${o.code}`} className={styles.code}>
          {o.code}
        </h2>
        <span className={`pill p-${STATUS_TONE[o.status]}`}>{o.status}</span>
      </div>
      <p className={styles.who}>{o.recipientShort}</p>
      <a className={styles.addr} href={mapsUrl(o)} rel="noopener">
        {o.address}, {o.postalCode}
        <span> · Open in maps</span>
      </a>
      <ul className={styles.items}>
        {o.lines.map((l) => (
          <li key={l.sku}>
            {l.qty} × {l.label}
          </li>
        ))}
      </ul>
      <p className={styles.pay}>
        Collect <b>{formatCents(o.totalCents)}</b> · {o.paymentMethod === "etransfer" ? "e-Transfer" : "Cash"}
      </p>
      {children}
    </article>
  );
}

export function RunList() {
  const { state, repo, staff } = useAdmin();
  const [pending, start] = useTransition();
  if (!state) return <Loading />;
  const mine = state.orders.filter((o) => o.driver === staff.name);
  const live = mine.filter((o) => o.status === "Boarding" || o.status === "In flight" || o.status === "At the door");
  const done = mine.filter((o) => o.status === "Landed" || o.status === "Returned");

  return (
    <>
      <h1 className={styles.h1}>My runs</h1>
      {live.length === 0 && <p className={styles.empty}>No runs assigned. The store assigns them from the Deliveries board.</p>}
      <div className={styles.list}>
        {live.map((o) => (
          <OrderCard o={o} key={o.code}>
            {o.status === "Boarding" && (
              <button
                className={`btn block ${styles.big}`}
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await repo.takeOff(o.code);
                    toast(`${o.code} in flight`);
                  })
                }
              >
                Take off
              </button>
            )}
            {(o.status === "In flight" || o.status === "At the door") && (
              <Link
                className={`btn hot block ${styles.big}`}
                href={`/driver/${o.code}`}
                onClick={() => {
                  if (o.status === "In flight") void repo.arriveAtDoor(o.code);
                }}
              >
                At the door · check ID
              </Link>
            )}
          </OrderCard>
        ))}
      </div>
      {done.length > 0 && (
        <details className={styles.done}>
          <summary>Done tonight ({done.length})</summary>
          <ul>
            {done.map((o) => (
              <li key={o.code}>
                <b>{o.code}</b> {o.status} · {o.outcome}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
