// Renders the driver PWA icons (plane on plum, pink ring) to PNG. Run: node scripts/make-icons.mjs
import { chromium } from "@playwright/test";

const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2d2142"/>
  <circle cx="256" cy="256" r="170" fill="#17c4ee" stroke="#f78fcf" stroke-width="18"/>
  <path d="M90 360 C 170 420, 300 430, 420 330" fill="none" stroke="#fff" stroke-width="12" stroke-dasharray="26 20" stroke-linecap="round"/>
  <g transform="translate(150 170) scale(3.3)" fill="#fff"><path d="M4 22c0-2 2-3 5-3h16L36 3c1-2 3-2 5-2h3l-6 18h12l6-7h4l-3 12 3 12h-4l-6-7H38l6 18h-3c-2 0-4 0-5-2L25 29H9c-3 0-5-1-5-3z"/></g>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${svg(size)}</body></html>`);
  await page.screenshot({ path: `public/icons/driver-${size}.png`, omitBackground: false });
}
await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(`<html><body style="margin:0">${svg(180)}</body></html>`);
await page.screenshot({ path: "public/icons/apple-touch-icon.png" });
await browser.close();
console.log("icons written");
