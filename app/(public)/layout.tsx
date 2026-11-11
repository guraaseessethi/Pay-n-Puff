import { DemoRibbon } from "@/components/ui/DemoRibbon";
import { Toaster } from "@/components/ui/Toast";
import { Header } from "@/components/public/Header";
import { Footer } from "@/components/public/Footer";
import { Notice } from "@/components/public/Notice";
import { AgePrompt } from "@/components/public/AgePrompt";
import { getSettings, hasAgeOk, isReviewMode } from "@/lib/auth/session";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, ageOk, review] = await Promise.all([getSettings(), hasAgeOk(), isReviewMode()]);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <DemoRibbon extra={review ? "review mode: [verify] tags on" : undefined} />
      <Notice minAge={settings.minAge} hours={settings.hours} />
      <Header minAge={settings.minAge} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer minAge={settings.minAge} />
      <Toaster />
      {!ageOk && <AgePrompt minAge={settings.minAge} />}
    </>
  );
}
