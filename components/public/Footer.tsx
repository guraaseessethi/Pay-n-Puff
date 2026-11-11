import Link from "next/link";
import { STORE } from "@/lib/content/store";
import styles from "./Chrome.module.css";

export function Footer({ minAge }: { minAge: number }) {
  return (
    <footer className={styles.foot}>
      <div className={`wrap ${styles.footIn}`}>
        <span className="wm" aria-hidden="true">
          PAY <i>n&apos;</i> PUFF
        </span>
        <div>
          <p style={{ margin: 0 }}>
            {STORE.street}, {STORE.city} · {minAge}+ only · Prices shown to verified adults include tax · Concept by Kooht Studio
          </p>
          <p className={styles.footLinks} style={{ margin: "6px 0 0" }}>
            <a href={`mailto:${STORE.email}`}>{STORE.email}</a>
            <a href={STORE.quitUrl} rel="noopener">
              Quit support (Health Canada)
            </a>
            <Link href="/admin">Staff login</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
