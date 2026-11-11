import { test } from "@playwright/test";
import { acceptAge, signInAs, verifyAsCustomer } from "./helpers";

/** Saves screenshots at 360 / 768 / 1280 to docs/screenshots. Run: pnpm screenshots */
const WIDTHS = [360, 768, 1280];
const out = (name: string, w: number) => `docs/screenshots/${name}-${w}.png`;

test.setTimeout(180_000);

for (const w of WIDTHS) {
  test(`screens at ${w}px`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: w < 500 ? 780 : w < 1000 ? 1024 : 860 });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: out("01-age-prompt", w) });
    await acceptAge(page);
    await page.screenshot({ path: out("02-home", w), fullPage: true });
    for (const [n, p] of [["03-delivery", "/delivery"], ["04-wholesale", "/wholesale"], ["05-visit", "/visit"]] as const) {
      await page.goto(p);
      await page.screenshot({ path: out(n, w), fullPage: true });
    }

    await verifyAsCustomer(page, "Jordan Sample");
    await page.getByRole("button", { name: "Add Geek Bar 9K digital to order" }).click();
    await page.getByRole("group", { name: "Pickup or delivery" }).getByRole("button", { name: "Delivery" }).click();
    await page.getByLabel("Street address").fill("10 Sample St");
    await page.getByLabel("Postal code").fill("L4M 1A2");
    await page.screenshot({ path: out("06-shelf", w), fullPage: true });

    await signInAs(page, "Owner");
    for (const [n, p] of [["07-admin-today", "/admin/today"], ["08-admin-flights", "/admin/flights"], ["09-admin-checkout", "/admin/checkout"], ["10-admin-inventory", "/admin/inventory"], ["11-admin-wholesale", "/admin/wholesale"], ["12-admin-compliance", "/admin/compliance"], ["13-admin-settings", "/admin/settings"]] as const) {
      await page.goto(p);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: out(n, w), fullPage: true });
    }

    await signInAs(page, "Driver 1");
    await page.screenshot({ path: out("14-driver-runs", w), fullPage: true });
    const takeOff = page.getByRole("button", { name: "Take off" }).first();
    if (await takeOff.count()) await takeOff.click();
    const door = page.getByRole("link", { name: /At the door/ }).first();
    if (await door.count()) {
      await door.click();
      await page.waitForURL(/\/driver\/PNP-/);
      await page.screenshot({ path: out("15-driver-door-check", w), fullPage: true });
    }
  });
}
