import { test, expect } from "@playwright/test";
import { acceptAge, PRODUCT_PATTERN } from "./helpers";

test("an unverified visitor never receives product names or prices (HTML, JS, RSC)", async ({ page }) => {
  const bodies: { url: string; text: string }[] = [];
  page.on("response", async (r) => {
    const ct = r.headers()["content-type"] ?? "";
    if (/html|javascript|x-component|json|text\/plain/.test(ct)) {
      try {
        bodies.push({ url: r.url(), text: await r.text() });
      } catch {
        /* redirects have no body */
      }
    }
  });
  for (const p of ["/", "/visit", "/rules", "/delivery", "/wholesale", "/verify"]) {
    await page.goto(p);
    await acceptAge(page);
  }
  // Direct hit on the shelf: redirected to /verify, no data.
  await page.goto("/shelf");
  await expect(page).toHaveURL(/\/verify$/);
  // Even with a forged cookie.
  await page.context().addCookies([{ name: "pnp_verified", value: "eyJ0eXAiOiJjdXN0b21lciJ9.forged", url: page.url() }]);
  await page.goto("/shelf");
  await expect(page).toHaveURL(/\/verify$/);

  const leaks = bodies.filter((b) => PRODUCT_PATTERN.test(b.text)).map((b) => b.url);
  expect(leaks).toEqual([]);
  expect(bodies.length).toBeGreaterThan(10);
});
