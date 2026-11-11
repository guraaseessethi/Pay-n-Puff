"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { confirmAgeForm } from "@/app/actions/public";
import { STORE } from "@/lib/content/store";

/**
 * Yes/no age pop-up for the info pages (every mode). It's a courtesy gate, not age verification.
 * "Yes" is a real form posting to a server action, so it works even before JavaScript loads.
 */
export function AgePrompt({ minAge }: { minAge: number }) {
  const [said, setSaid] = useState<"no" | null>(null);
  const path = usePathname();

  // When the pop-up goes away, start keyboard focus at the page content.
  useEffect(() => () => void requestAnimationFrame(() => document.getElementById("main")?.focus()), []);

  return (
    <Modal title={said === "no" ? "Sorry, adults only" : `Are you ${minAge} or older?`} onClose={() => {}} locked>
      {said === "no" ? (
        <>
          <p>This site is for adults {minAge} and older. Ontario law doesn&apos;t let us show it to anyone younger.</p>
          <p>If you&apos;re thinking about quitting, free help is available by phone, text and online.</p>
          <div className="bnav">
            <button className="btn line" type="button" onClick={() => setSaid(null)}>
              Go back
            </button>
            <a className="btn" href={STORE.quitUrl} rel="noopener">
              Health Canada quit support
            </a>
          </div>
        </>
      ) : (
        <form action={confirmAgeForm}>
          <p>Pay N&apos; Puff is a specialty vape store. You must be {minAge}+ to enter, buy or receive a delivery.</p>
          <input type="hidden" name="back" value={path} />
          <div className="bnav">
            <button className="btn line" type="button" onClick={() => setSaid("no")}>
              No
            </button>
            <button className="btn hot" type="submit">
              Yes, I&apos;m {minAge} or older
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
