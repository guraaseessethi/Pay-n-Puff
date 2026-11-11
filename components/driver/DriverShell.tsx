"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { toast } from "@/components/ui/Toast";
import { flushQueue, readQueue } from "./queue";
import styles from "./Driver.module.css";

export function DriverShell({ children, previewing }: { children: React.ReactNode; previewing: boolean }) {
  const { staff, repo, settings } = useAdmin();
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    const sync = async () => {
      setOnline(navigator.onLine);
      setQueued(readQueue().length);
      if (navigator.onLine) {
        const n = await flushQueue(repo, settings.minAge);
        if (n) toast(`Synced ${n} door check${n > 1 ? "s" : ""}`);
      }
    };
    void sync();
    const onQ = () => setQueued(readQueue().length);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener("pnp-queue", onQ);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/driver" }).catch(() => {});
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.removeEventListener("pnp-queue", onQ);
    };
  }, [repo, settings.minAge]);

  return (
    <div className={styles.app}>
      <header className={styles.bar}>
        <Link href="/driver" className="wm" style={{ fontSize: 24, color: "var(--pink)" }} aria-label="My runs">
          PAY <i style={{ color: "#fff" }}>n&apos;</i> PUFF
        </Link>
        <span className={styles.me}>
          {staff.name}
          {previewing ? " (preview)" : ""}
        </span>
        <span className={`pill ${online ? "p-ok" : "p-warn"}`} role="status">
          {online ? "Online" : "Offline"}
          {queued ? ` · ${queued} to sync` : ""}
        </span>
      </header>
      <p className={styles.demo}>Concept preview · sample data</p>
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <nav className={styles.foot} aria-label="Driver">
        <Link href="/driver">My runs</Link>
        <Link href="/admin">{previewing ? "Back office" : "Switch role"}</Link>
      </nav>
    </div>
  );
}
