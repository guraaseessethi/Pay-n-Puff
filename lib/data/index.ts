import type { DataRepository } from "./repository";
import { MemoryKV, MockRepository, type KV } from "./mock/MockRepository";

/**
 * getRepository() picks the data source from NEXT_PUBLIC_DATA_SOURCE.
 *  - "mock" (Phase 1): sample data + this browser's localStorage.
 *  - "supabase" (Phase 2): not built yet. See docs/MIGRATION.md.
 */
export type DataSource = "mock" | "supabase";

export function dataSource(): DataSource {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" ? "supabase" : "mock";
}

let singleton: MockRepository | null = null;

function browserKV(): KV {
  try {
    const t = "__pnp";
    window.localStorage.setItem(t, t);
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch {
    return new MemoryKV();
  }
}

/** Browser-side repository. In Phase 1 this is the demo store; it's never used on the server. */
export function getRepository(): DataRepository & MockRepository {
  if (dataSource() === "supabase") {
    throw new Error("Supabase repository is Phase 2. Set NEXT_PUBLIC_DATA_SOURCE=mock.");
  }
  if (typeof window === "undefined") {
    // Server render: a throwaway in-memory store so components can render an empty shell.
    return new MockRepository(new MemoryKV());
  }
  if (!singleton) {
    singleton = new MockRepository(browserKV());
    window.addEventListener("storage", (e) => {
      if (e.key === null || e.key.startsWith("pnp-demo")) singleton?.reload();
    });
  }
  return singleton;
}
