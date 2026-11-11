import Link from "next/link";
import { pickRole } from "@/app/actions/staff";
import { DemoRibbon } from "@/components/ui/DemoRibbon";
import styles from "@/components/admin/Admin.module.css";

export default function RolePicker() {
  return (
    <>
      <DemoRibbon />
      <main id="main" className={styles.picker}>
        <div className={styles.pickerBox}>
          <span className="wm" style={{ fontSize: 36, color: "var(--magenta)" }} aria-hidden="true">
            PAY <i>n&apos;</i> PUFF
          </span>
          <h1>Staff sign-in</h1>
          <p className="sample" role="note" style={{ fontSize: 12.5 }}>
            Demo. Real staff login comes in the full build.
          </p>
          <p className="muted">Pick a role to see what that person sees.</p>
          <div className={styles.roles}>
            <form action={pickRole.bind(null, "owner", "Owner")}>
              <button className={styles.role} type="submit">
                <b>Owner</b>
                <span>Everything: costs, wholesale, reports, settings</span>
              </button>
            </form>
            <form action={pickRole.bind(null, "counter", "Counter 2")}>
              <button className={styles.role} type="submit">
                <b>Counter</b>
                <span>Checkout, holds, deliveries board, stock counts, checklist. No costs, reports or wholesale.</span>
              </button>
            </form>
            <form action={pickRole.bind(null, "driver", "Driver 1")}>
              <button className={styles.role} type="submit">
                <b>Driver 1</b>
                <span>Phone view: assigned runs and the door ID check only</span>
              </button>
            </form>
            <form action={pickRole.bind(null, "driver", "Driver 2")}>
              <button className={styles.role} type="submit">
                <b>Driver 2</b>
                <span>Same as Driver 1, different runs</span>
              </button>
            </form>
          </div>
          <p style={{ marginTop: 18 }}>
            <Link href="/">← Back to the website</Link>
          </p>
        </div>
      </main>
    </>
  );
}
