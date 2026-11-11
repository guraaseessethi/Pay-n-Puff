import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", timezoneId: "America/Toronto", locale: "en-CA" },
  projects: [
    { name: "e2e", use: { ...devices["Desktop Chrome"] }, testIgnore: /screenshots\.spec/ },
    { name: "screenshots", use: { ...devices["Desktop Chrome"] }, testMatch: /screenshots\.spec/ },
  ],
  webServer: {
    // Run against a production build: `pnpm build` first (CI does).
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/visit`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { VERIFY_COOKIE_SECRET: process.env.VERIFY_COOKIE_SECRET ?? "e2e-only-secret-e2e-only-secret-e2e-only-0001" },
  },
});
