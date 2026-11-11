import { expect, type Page } from "@playwright/test";

/** Product names/prices that must never reach an unverified visitor. */
export const PRODUCT_PATTERN = /Geek Bar|OXBAR|Rocky Vapor|Flavour Beast|Beast Mode|STLTH|Dispo 8K|Z Pods|30K disposable|Imported disposable|9K digital|Drip.n 5K|\$45\.00|\$35\.00/;

/** Accept the 19+ pop-up if it's showing. */
export async function acceptAge(page: Page) {
  await page.waitForLoadState("networkidle");
  const yes = page.getByRole("button", { name: /Yes, I'm (19|21) or older/ });
  if (await yes.isVisible().catch(() => false)) {
    await yes.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
}

export async function signInAs(page: Page, role: "Owner" | "Counter" | "Driver 1" | "Driver 2") {
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: new RegExp(`^${role}\\b`) }).click();
  await page.waitForURL(role.startsWith("Driver") ? /\/driver/ : /\/admin\/today/);
}

/** Demo shortcut in staff_verified mode. */
export async function verifyAsCustomer(page: Page, name = "Demo Customer") {
  await page.goto("/verify");
  await acceptAge(page);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Customer name").fill(name);
  await page.getByRole("button", { name: "Demo: continue as a verified adult" }).click();
  await page.waitForURL(/\/shelf/);
}

export async function resetDemo(page: Page) {
  await page.goto("/visit");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.context().clearCookies();
}
