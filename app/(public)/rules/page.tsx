import type { Metadata } from "next";
import { PageHead, RulesBlock, sectionStyles as s } from "@/components/public/Sections";
import { getSettings } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Store rules", description: "Ontario rules we follow at Pay N' Puff: 19+ only, photo ID, testing rules, and the 20 mg/mL nicotine cap." };

export default async function RulesPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHead label="Before you board" title="Store rules">
        Ontario law sets these. We follow every one, in the store and at your door.
      </PageHead>
      <section className={s.s}>
        <div className="wrap">
          <RulesBlock minAge={settings.minAge} />
        </div>
      </section>
    </>
  );
}
