"use client";

import { useEffect, useState } from "react";
import { HEALTH_WARNINGS } from "@/lib/compliance/policy";

/** Health Canada warning, on every verified-only page. Rotates between the two concept warnings. */
export function HealthWarning() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % HEALTH_WARNINGS.length), 7000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="healthwarn" role="note" aria-label="Health warning">
      <b>{HEALTH_WARNINGS[i]}</b>
      <span>Health Canada</span>
    </div>
  );
}
