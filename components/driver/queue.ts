"use client";

import { judgeIdCheck } from "@/app/actions/staff";
import type { DataRepository } from "@/lib/data/repository";
import type { IdCheckInput } from "@/lib/domain/types";

/**
 * Offline-ish door checks. If the phone has no signal, the check is saved on the phone
 * and synced (validated by the server, then applied) when it's back online.
 */
const KEY = "pnp-door-queue";

export interface Queued {
  code: string;
  input: IdCheckInput;
  at: string;
}

export function readQueue(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Queued[];
  } catch {
    return [];
  }
}

function writeQueue(q: Queued[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new Event("pnp-queue"));
}

export function enqueue(item: Queued) {
  writeQueue([...readQueue(), item]);
}

/** Validate on the server, then record. Throws on network failure so the caller can queue. */
export async function submitDoorCheck(repo: DataRepository, code: string, input: IdCheckInput, minAge: number) {
  const j = await judgeIdCheck(input);
  if (!j.ok) throw Object.assign(new Error(j.error), { rejected: true });
  return repo.recordDoorCheck(code, input, minAge);
}

export async function flushQueue(repo: DataRepository, minAge: number): Promise<number> {
  const q = readQueue();
  if (!q.length || !navigator.onLine) return 0;
  const left: Queued[] = [];
  let done = 0;
  for (const item of q) {
    try {
      await submitDoorCheck(repo, item.code, item.input, minAge);
      done++;
    } catch (e) {
      // Rejected by the server = drop it (it would never pass); network error = keep for later.
      if (!(e as { rejected?: boolean }).rejected) left.push(item);
    }
  }
  writeQueue(left);
  return done;
}
