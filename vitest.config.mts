import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // server-only throws outside a React Server environment; tests import server modules directly.
    alias: { "server-only": path.resolve(import.meta.dirname, "tests/unit/server-only-stub.ts") },
  },
});
