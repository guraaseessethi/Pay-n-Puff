"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, STORE } from "@/lib/content/store";
import styles from "./Chrome.module.css";

export function Header({ minAge }: { minAge: number }) {
  const path = usePathname();
  const isCurrent = (href: string) => (href === "/verify" ? path === "/verify" || path === "/shelf" : path === href);
  return (
    <header className={styles.top}>
      <div className={`wrap ${styles.topIn}`}>
        <Link className={`wm ${styles.topWm}`} href="/" aria-label="Pay N' Puff home">
          PAY <i>n&apos;</i> PUFF
        </Link>
        <nav className={styles.nav} aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isCurrent(n.href) ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className={styles.topR}>
          <span className={styles.age}>{minAge}+</span>
          <Link className={`btn sm ${styles.addrBtn}`} href="/visit">
            {STORE.street}
          </Link>
          <details className={styles.menu}>
            <summary>Menu</summary>
            <nav aria-label="Main (mobile)">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} aria-current={isCurrent(n.href) ? "page" : undefined}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
