import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { acceptAge, PRODUCT_PATTERN } from "./helpers";

const PUBLIC = ["/", "/visit", "/rules", "/delivery", "/wholesale", "/verify"];

test.describe("public pages", () => {
  for (const path of PUBLIC) {
    test(`${path} loads, has one h1, no serious/critical axe issues, no products`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      // The 19+ pop-up is itself checked by axe before it's dismissed.
      await expect(page.getByRole("dialog")).toBeVisible();
      const withDialog = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(withDialog.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
      await acceptAge(page);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByRole("main")).toBeVisible();
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const bad = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad, JSON.stringify(bad.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), null, 2)).toEqual([]);
      expect(await page.content()).not.toMatch(PRODUCT_PATTERN);
    });
  }

  test("skip link and security headers", async ({ page }) => {
    const res = await page.goto("/");
    const h = res!.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toMatch(/nonce-/);
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["strict-transport-security"]).toContain("max-age");
    expect(h["permissions-policy"]).toContain("camera=()");
    const v = await page.request.get("/verify");
    expect(v.headers()["permissions-policy"]).toContain("camera=(self)");
    await acceptAge(page);
    await expect(page.locator("#main")).toBeFocused(); // focus lands on content after the pop-up
    await page.reload(); // cookie set: no pop-up now
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });

  test("Store JSON-LD has address and hours only, no products or offers", async ({ page }) => {
    await page.goto("/");
    const json = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(json["@type"]).toBe("Store");
    expect(json.address.streetAddress).toBe("15 Dunlop St E");
    expect(json.openingHoursSpecification.length).toBeGreaterThan(0);
    expect(json).not.toHaveProperty("makesOffer");
    expect(json).not.toHaveProperty("hasOfferCatalog");
  });

  test("sitemap lists public routes only; private areas are noindex", async ({ request }) => {
    const sm = await (await request.get("/sitemap.xml")).text();
    expect(sm).toContain("/visit");
    expect(sm).not.toMatch(/\/shelf|\/admin|\/driver/);
    const admin = await request.get("/admin");
    expect(admin.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("hours past midnight: 12:30 am Saturday shows open until 1 am", async ({ page }) => {
    // 2026-11-14 00:30 in Toronto (EST, UTC-5) is a Saturday.
    await page.clock.setFixedTime(new Date("2026-11-14T05:30:00Z"));
    await page.goto("/");
    await acceptAge(page);
    await expect(page.getByText("Open now, until 1 am.").first()).toBeVisible();
  });

  test("review mode shows [verify] tags", async ({ page }) => {
    await page.goto("/visit?review=1");
    await acceptAge(page);
    await expect(page.locator(".verify-tag").first()).toBeVisible();
    await page.goto("/visit?review=0");
    await expect(page.locator(".verify-tag")).toHaveCount(0);
  });

  test("wholesale form validates on the server and needs the registration checkbox", async ({ page }) => {
    await page.goto("/wholesale");
    await acceptAge(page);
    await page.getByLabel("Store name").fill("Test Store");
    await page.getByLabel("Your name").fill("Tess Tester");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("City").fill("Barrie");
    await page.getByRole("button", { name: "Request a consultation" }).click();
    await expect(page.getByText("Please confirm this is a registered retail business.")).toBeVisible();
    await page.getByLabel(/I confirm this is a registered retail business/).check();
    await page.getByRole("button", { name: "Request a consultation" }).click();
    await expect(page.getByText("Request received.")).toBeVisible();
  });
});
