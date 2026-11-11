"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { getRepository } from "@/lib/data";
import type { DemoSeed, DemoState } from "@/lib/data/mock/MockRepository";
import type { StaffRole } from "@/lib/domain/types";
import type { Settings } from "@/lib/settings/schema";

interface Ctx {
  staff: { role: StaffRole; name: string };
  settings: Settings;
  seed: DemoSeed;
}

const C = createContext<Ctx | null>(null);

export function AdminProvider({ children, ...ctx }: Ctx & { children: React.ReactNode }) {
  // Seed once, synchronously, so the first client render already has data.
  useState(() => {
    getRepository().merge(ctx.seed);
    return true;
  });
  return <C.Provider value={ctx}>{children}</C.Provider>;
}

/** Staff, settings, the repository and a live snapshot of demo state (null during server render). */
export function useAdmin() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useAdmin outside AdminProvider");
  const repo = getRepository();
  const state = useSyncExternalStore<DemoState | null>(repo.subscribe, repo.getSnapshot, () => null);
  return { ...ctx, repo, state, isOwner: ctx.staff.role === "owner" };
}
