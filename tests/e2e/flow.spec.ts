import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { resetDemo, signInAs, verifyAsCustomer } from "./helpers";

async function bookDelivery(page: Page, postal: string) {
  await page.getByRole("button", { name: "Add Geek Bar 9K digital to order" }).click();
  await page.getByRole("button", { name: "Add OXBAR Rocky Vapor 10K to order" }).click();
  await page.getByRole("group", { name: "Pickup or delivery" }).getByRole("button", { name: "Delivery" }).click();
  await page.getByLabel("Street address").fill("10 Sample St");
  await page.getByLabel("Postal code").fill(postal);
}

test.describe.configure({ mode: "serial" });

test("verified → shelf → delivery → Flights → driver door check → Landed → compliance log", async ({ page }) => {
  await resetDemo(page);
  await verifyAsCustomer(page, "Jordan Sample");

  // Shelf: health warning, sellable products only, blocked products never shown.
  await expect(page.getByRole("note", { name: "Health warning" })).toContainText("WARNING");
  await expect(page.getByText("Imported disposable")).toHaveCount(0);
  await expect(page.getByText("Older pod stock")).toHaveCount(0);
  await expect(page).toHaveTitle(/shelf/i);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);

  // Outside the zone: can't book.
  await bookDelivery(page, "L3Y 1A1");
  await expect(page.getByText(/We don't deliver to L3Y/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Book delivery" })).toBeDisabled();

  // Inside the zone: recipient is the verified name, not a field.
  await page.getByLabel("Postal code").fill("L4M 1A2");
  await expect(page.getByText("L4M is in our delivery area.")).toBeVisible();
  await expect(page.getByText("Jordan Sample").first()).toBeVisible();
  await page.getByRole("button", { name: "Book delivery" }).click();
  await expect(page.getByText(/PNP-119 is booked/)).toBeVisible();

  // Back office: it's on the Flights board.
  await signInAs(page, "Owner");
  await page.goto("/admin/flights");
  const row = page.locator("li.fbr", { hasText: "PNP-119" });
  await expect(row).toContainText("Booked");
  await expect(row).toContainText("Jordan S.");
  await row.getByLabel("Assign a driver to PNP-119").selectOption("Driver 1");
  await expect(row).toContainText("Boarding");
  await row.getByRole("button", { name: "Take off" }).click();
  await expect(row).toContainText("In flight");

  // Driver phone view.
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAs(page, "Driver 1");
  const card = page.getByRole("article").filter({ hasText: "PNP-119" });
  await expect(card).toContainText("Jordan S.");
  await expect(card).not.toContainText("Jordan Sample"); // drivers see first name + initial only
  await expect(card.getByRole("link", { name: /Open in maps/ })).toHaveAttribute("href", /google\.com\/maps/);
  await card.getByRole("link", { name: /At the door/ }).click();
  await page.waitForURL(/\/driver\/PNP-119/);
  await page.getByLabel("ID type").selectOption("Driver's licence");
  await page.getByLabel("Age on the ID (years)").fill("27");
  await page.getByLabel("Yes, matches").check();
  const btn = page.getByRole("button", { name: "ID checked · hand over" });
  expect((await btn.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await btn.click();
  await expect(page.getByText("Landed.")).toBeVisible();

  // Compliance log has the door check.
  await page.setViewportSize({ width: 1280, height: 900 });
  await signInAs(page, "Owner");
  await page.goto("/admin/compliance");
  const logRow = page.locator("tr", { hasText: "PNP-119" });
  await expect(logRow).toContainText("Door");
  await expect(logRow).toContainText("Driver 1");
  await expect(logRow).toContainText("27");
  await expect(logRow).toContainText("Pass");
  await page.goto("/admin/flights");
  await expect(page.locator("li.fbr", { hasText: "PNP-119" })).toContainText("Landed");
});

test("Returned path restocks", async ({ page }) => {
  await signInAs(page, "Owner");
  await page.goto("/admin/inventory");
  const stockCell = () => page.locator("tr", { hasText: "Rocky Vapor 10K" }).locator("td.num").first();
  const before = (await stockCell().textContent())!.trim();

  await verifyAsCustomer(page, "Riley Sample");
  await bookDelivery(page, "L4N 2B3");
  await page.getByRole("button", { name: "Book delivery" }).click();
  const booked = page.getByText(/PNP-\d+ is booked/);
  await expect(booked).toBeVisible();
  const code = (await booked.textContent())!.match(/PNP-\d+/)![0];

  await signInAs(page, "Owner");
  await page.goto("/admin/inventory");
  expect((await stockCell().textContent())!.trim()).not.toBe(before);

  await page.goto("/admin/flights");
  const row = page.locator("li.fbr", { hasText: code });
  await row.getByLabel(`Assign a driver to ${code}`).selectOption("Driver 2");
  await row.getByRole("button", { name: "Take off" }).click();
  await row.getByRole("button", { name: "At the door" }).click();
  await row.getByRole("button", { name: "Door ID check" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("No handoff: reason").selectOption("No ID at door");
  await dialog.getByRole("button", { name: /Don't hand over/ }).click();
  await expect(row).toContainText("Returned");
  await expect(row).toContainText("restocked");

  await page.goto("/admin/inventory");
  expect((await stockCell().textContent())!.trim()).toBe(before);
});

test("blocked products can't be added at the till", async ({ page }) => {
  await signInAs(page, "Owner");
  await page.goto("/admin/checkout");
  await expect(page.getByRole("button", { name: /Imported disposable.*Blocked/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Older pod stock.*Blocked/ })).toBeDisabled();
  // Payment stays locked until an age check passes.
  await page.getByRole("button", { name: /Geek Bar 9K digital/ }).click();
  await expect(page.getByRole("button", { name: "Cash" })).toBeDisabled();
  await page.getByLabel("Age on the ID (years)").fill("18");
  await page.getByRole("button", { name: "Check ID" }).click();
  await expect(page.getByText("Tap a product to add it.")).toBeVisible(); // refused → ticket cleared
  await page.getByRole("button", { name: /Geek Bar 9K digital/ }).click();
  await page.getByLabel("Age on the ID (years)").fill("30");
  await page.getByRole("button", { name: "Check ID" }).click();
  await expect(page.getByText("Age check passed")).toBeVisible();
  await page.getByRole("button", { name: "Cash" }).click();
  await expect(page.getByText(/Cash · \$35\.00 paid/)).toBeVisible();
});

test("a convenience-store wholesale quote can't include flavoured stock", async ({ page }) => {
  await signInAs(page, "Owner");
  await page.goto("/admin/wholesale");
  const row = page.locator("tr", { hasText: "Sample store B" });
  await row.getByRole("button", { name: "Check registration" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Verified" }).click();
  await page.getByLabel("For").selectOption({ label: "Sample store B · Convenience store" });
  const options = await page.getByLabel(/Product \(only what this buyer can legally sell\)/).locator("option").allTextContents();
  expect(options.join("|")).not.toMatch(/Geek Bar|OXBAR|Flavour Beast|Pay N' Puff/);
  expect(options.join("|")).toMatch(/Z Pods/);
  await page.getByRole("button", { name: "Add line" }).click();
  await page.getByRole("button", { name: "Send quote" }).click();
  await expect(page.getByText(/registration: Saw health unit/)).toBeVisible();
});

test("counter role can't see reports, wholesale, settings or costs", async ({ page }) => {
  await signInAs(page, "Counter");
  await expect(page.getByRole("link", { name: "Reports" })).toHaveCount(0);
  await page.goto("/admin/reports");
  await expect(page).toHaveURL(/\/admin\/today/);
  await page.goto("/admin/inventory");
  await expect(page.getByRole("columnheader", { name: "Cost" })).toHaveCount(0);
});

test("driver role is sent to the driver view", async ({ page }) => {
  await signInAs(page, "Driver 2");
  await page.goto("/admin/today");
  await expect(page).toHaveURL(/\/driver/);
});
