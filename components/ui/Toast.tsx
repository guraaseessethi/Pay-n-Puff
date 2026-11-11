"use client";

import { useEffect, useRef, useState } from "react";

const EVT = "pnp-toast";

/** Show a short message. Announced politely to screen readers. */
export function toast(message: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVT, { detail: message }));
}

export function Toaster() {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      setShow(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setShow(false), 3200);
    };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);

  return (
    <div className={`toast${show ? " show" : ""}`} role="status" aria-live="polite" aria-atomic="true">
      {msg}
    </div>
  );
}
