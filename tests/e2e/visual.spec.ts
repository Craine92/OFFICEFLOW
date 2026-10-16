import { test, expect } from '@playwright/test';
for (const [route, name] of [
  ['/', 'dashboard'],
  ['/#/raumplanung', 'raumplanung'],
  ['/#/editor', 'editor'],
  ['/#/showcase', 'showcase'],
  ['/#/praesentation', 'praesentation'],
] as const)
  test(`Visuelle Referenz ${name}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.clock.setFixedTime(new Date('2026-10-15T08:00:00Z'));
    await page.goto(route);
    await page.locator('canvas').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      animations: 'disabled',
      mask: [page.locator('.date-controls'), page.locator('input[type="time"]')],
      maxDiffPixelRatio: 0.02,
      threshold: 0.25,
    });
  });
