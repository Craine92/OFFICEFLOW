import { type Page } from '@playwright/test';
export async function planPoint(page: Page, x: number, y: number) {
  const canvas = page.locator('.designer-canvas canvas, .plan-panel canvas').first();
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const dims = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('officeflow.demo.v1')!);
    const editor = document.querySelector<HTMLSelectElement>(
      '[aria-label="Grundriss zum Bearbeiten auswählen"]',
    );
    const room = editor
      ? d.rooms.find((r: { id: string }) => r.id === editor.value)
      : d.rooms.find(
          (r: { name: string }) =>
            r.name === document.querySelector('.room-tabs .active')?.textContent?.replace(/\d+$/, '').trim(),
        );
    return { width: room?.width ?? d.rooms[0].width, height: room?.height ?? d.rooms[0].height };
  });
  const scale = Math.min(box.width / dims.width, box.height / dims.height) * 0.92;
  return {
    x: box.x + (box.width - dims.width * scale) / 2 + x * scale,
    y: box.y + (box.height - dims.height * scale) / 2 + y * scale,
    scale,
  };
}
export async function clickPlan(page: Page, x: number, y: number) {
  const p = await planPoint(page, x, y);
  await page.mouse.click(p.x, p.y);
}
