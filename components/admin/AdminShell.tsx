"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutStaff } from "@/app/actions/staff";
import { sellable } from "@/lib/compliance/sellable";
import { isLive } from "@/lib/delivery/status";
import { useAdmin } from "./AdminContext";
import styles from "./Admin.module.css";
import "./admin.css";

const IC: Record<string, React.ReactNode> = {
  today: <path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z" />,
  checkout: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  flights: (
    <>
      <path d="M2 16l20-8-6 12-3-5z" />
      <path d="M13 15l-2 5" />
    </>
  ),
  inventory: (
    <>
      <path d="M21 8l-9-5-9 5 9 5z" />
      <path d="M3 8v8l9 5 9-5V8M12 13v8" />
    </>
  ),
  wholesale: (
    <>
      <path d="M3 21V9l9-6 9 6v12" />
      <path d="M9 21v-7h6v7" />
    </>
  ),
  compliance: (
    <>
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  staff: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  reports: <path d="M3 21h18M6 17V9M11 17V5M16 17v-6M21 17v-3" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
};

export const PAGES: { key: string; label: string; ownerOnly?: boolean }[] = [
  { key: "today", label: "Today" },
  { key: "checkout", label: "Checkout" },
  { key: "flights", label: "Deliveries" },
  { key: "inventory", label: "Inventory" },
  { key: "wholesale", label: "Wholesale", ownerOnly: true },
  { key: "compliance", label: "Compliance" },
  { key: "staff", label: "Late shifts" },
  { key: "reports", label: "Reports", ownerOnly: true },
  { key: "settings", label: "Settings", ownerOnly: true },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { staff, state, isOwner, settings } = useAdmin();
  const pages = PAGES.filter((p) => isOwner || !p.ownerOnly);

  const badges: Record<string, number> = {};
  if (state) {
    badges.flights = state.orders.filter((o) => isLive(o.status)).length;
    badges.inventory = state.products.filter((p) => (!sellable(p) && p.stock > 0) || (sellable(p) && p.par > 0 && p.stock <= p.par)).length;
    badges.wholesale = state.wholesale.filter((w) => w.quoteStatus === "New" || w.retailer.registrationStatus === "Unchecked").length;
    badges.compliance = Object.values(state.checklist).filter((v) => !v).length;
  }
  if (settings.ageGateMode === "self_declare") badges.settings = 1;

  return (
    <div className={styles.adm}>
      <aside className={styles.side} aria-label="Back office">
        <Link className={`wm ${styles.sideWm}`} href="/admin/today" aria-label="Back office home">
          PAY <i>n&apos;</i> PUFF
        </Link>
        <nav aria-label="Back office sections" className={styles.sideNav}>
          {pages.map((p) => (
            <Link key={p.key} className={styles.nv} href={`/admin/${p.key}`} aria-current={path === `/admin/${p.key}` ? "page" : undefined}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                {IC[p.key]}
              </svg>
              {p.label}
              {badges[p.key] ? (
                <span className={styles.badge}>
                  {badges[p.key]}
                  <span className="sr-only"> need attention</span>
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className={styles.grow} />
        <div className={styles.me}>
          Signed in · {staff.name}
          <br />
          <Link href="/">View website →</Link>
          <br />
          <Link href="/driver">Driver view →</Link>
          <form action={signOutStaff}>
            <button type="submit" className={styles.linkBtn}>
              Switch role
            </button>
          </form>
        </div>
      </aside>
      <div style={{ minWidth: 0 }}>
        <nav className={styles.mnav} aria-label="Back office sections (mobile)">
          <Link href="/">Site</Link>
          {pages.map((p) => (
            <Link key={p.key} href={`/admin/${p.key}`} aria-current={path === `/admin/${p.key}` ? "page" : undefined}>
              {p.label}
              {badges[p.key] ? ` · ${badges[p.key]}` : ""}
            </Link>
          ))}
          <Link href="/driver">Driver</Link>
          <Link href="/admin">Switch role</Link>
        </nav>
        <main id="main" tabIndex={-1} className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
