import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, sectionStyles as s } from "@/components/public/Sections";
import { DemoIdCheck, SelfDeclare, SignOut, StaffVerifiedSignIn } from "@/components/public/VerifyFlows";
import styles from "@/components/public/Verify.module.css";
import { getCustomerSession, getSettings } from "@/lib/auth/session";
import { canViewShelf, MODE_INFO } from "@/lib/compliance/ageGate";
import { ADDRESS_ONE_LINE } from "@/lib/content/store";

export const metadata: Metadata = { title: "Verify your age", robots: { index: false, follow: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const [settings, session, sp] = await Promise.all([getSettings(), getCustomerSession(), searchParams]);
  const mode = settings.ageGateMode;
  const verified = canViewShelf(mode, session, settings.minAge);

  return (
    <>
      <PageHead label="Verified adults only" title={mode === "staff_verified" ? "Sign in to shop" : "Verify your age"}>
        Canadian law only lets vape products be shown online to people whose age and identity have been verified. A checkbox or a birthday isn&apos;t enough.
      </PageHead>
      <section className={s.s}>
        <div className="wrap">
          {sp.link === "expired" && (
            <p className="warnbox" role="alert" style={{ marginBottom: 16 }}>
              That sign-in link has expired or isn&apos;t valid. Ask staff for a new one.
            </p>
          )}
          {verified ? (
            <div className="okbox" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span>
                You&apos;re verified as <b>{session!.name}</b>.
              </span>
              <Link className="btn hot sm" href="/shelf">
                Go to the shelf
              </Link>
              <SignOut />
            </div>
          ) : mode === "info_only" ? (
            <div className={styles.panel}>
              <h3>No online shelf</h3>
              <p>We don&apos;t show products or take orders online. Visit us at {ADDRESS_ONE_LINE} with photo ID, or email us.</p>
            </div>
          ) : (
            <div className={styles.cols}>
              <div>
                {mode === "staff_verified" && <StaffVerifiedSignIn />}
                {mode === "id_provider" && <DemoIdCheck minAge={settings.minAge} />}
                {mode === "self_declare" && <SelfDeclare minAge={settings.minAge} />}
              </div>
              <aside className={styles.flow} aria-label="Other ways to verify">
                {mode === "staff_verified" && (
                  <div className={styles.panel}>
                    <h3>Or check ID online</h3>
                    <p className="muted">Preview of the online ID + selfie check (used if the owner picks that mode).</p>
                    <DemoIdCheck minAge={settings.minAge} />
                  </div>
                )}
                <div className={styles.panel}>
                  <h3>Verify in store</h3>
                  <p className="muted">
                    Can&apos;t use a camera, or prefer not to? Bring photo ID to the counter at {ADDRESS_ONE_LINE}. Staff check it in person and never record the ID number.
                  </p>
                </div>
                <p className="small-mono">Current mode: {MODE_INFO[mode].label}</p>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
