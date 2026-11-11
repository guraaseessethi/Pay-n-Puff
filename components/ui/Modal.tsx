"use client";

import { useEffect, useId, useRef } from "react";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal: role=dialog, aria-modal, labelled by its title, traps focus,
 * Escape closes (unless `locked`), and focus returns to whatever opened it.
 */
export function Modal({
  title,
  onClose,
  children,
  locked = false,
  initialFocus,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  locked?: boolean;
  initialFocus?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const box = ref.current!;
    const first = (initialFocus ? box.querySelector<HTMLElement>(initialFocus) : null) ?? box.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? box).focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !locked) {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [locked, initialFocus]);

  return (
    <div
      className="mbg"
      onMouseDown={(e) => {
        if (!locked && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
