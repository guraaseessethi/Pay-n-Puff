import type { Metadata } from "next";
import { Toaster } from "@/components/ui/Toast";

export const metadata: Metadata = { title: { default: "Back office", template: "%s · Back office" }, robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      {children}
      <Toaster />
    </>
  );
}
