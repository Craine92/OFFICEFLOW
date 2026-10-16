import { expect, test } from '@playwright/test';
import { planPoint, clickPlan } from './helpers';

test.beforeEach(async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
});

test('Buchung, Konfliktprüfung, Neuladen und Stornierung', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Gute Arbeit beginnt hier.' })).toBeVisible();
  await page.getByRole('link', { name: 'Raumplanung', exact: true }).click();
  const os24 = page.locator('[data-resource-id="OS-24"]');
  await expect(os24).toHaveAttribute('data-resource-status', 'available');
  await expect(os24).toHaveAttribute('data-led-color', '#16A34A');
  await page.getByRole('button', { name: 'Neue Buchung' }).click();
  await page.getByLabel('Arbeitsplatz / Raum', { exact: true }).selectOption('OS-24');
  await page.getByLabel('Mitarbeiter', { exact: true }).selectOption('e22');
  await page.getByRole('button', { name: 'Verbindlich buchen' }).click();
  await expect(page.getByRole('status')).toContainText('erfolgreich gebucht');
  await expect(os24).toHaveAttribute('data-resource-status', 'reserved');
  await expect(os24).toHaveAttribute('data-led-color', '#DC2626');
  await page.getByRole('button', { name: 'Neue Buchung' }).click();
  await page.getByLabel('Arbeitsplatz / Raum', { exact: true }).selectOption('OS-24');
  await page.getByLabel('Mitarbeiter', { exact: true }).selectOption('e21');
  await page.getByRole('button', { name: 'Verbindlich buchen' }).click();
  await expect(page.getByRole('alert')).toContainText('bereits gebucht');
  await page.getByRole('button', { name: 'Dialog schließen' }).click();
  await page.reload();
  await page.getByRole('link', { name: 'Buchungen', exact: false }).first().click();
  await page.getByRole('textbox', { name: 'Buchungen suchen' }).fill('Tom Albrecht');
  await expect(page.getByRole('cell', { name: 'OS-24 Open Space' })).toBeVisible();
  await page.getByRole('button', { name: 'Buchung von Tom Albrecht stornieren' }).click();
  await page.getByRole('button', { name: 'Buchung stornieren', exact: true }).click();
  await expect(page.getByText('Hier ist noch alles offen.')).toBeVisible();
  await page.getByRole('link', { name: 'Raumplanung', exact: true }).click();
  await expect(page.locator('[data-resource-id="OS-24"]')).toHaveAttribute(
    'data-resource-status',
    'available',
  );
  await page.getByRole('link', { name: 'Buchungen', exact: false }).first().click();
  await page.reload();
  await page.getByRole('textbox', { name: 'Buchungen suchen' }).fill('Tom Albrecht');
  await expect(page.getByText('Hier ist noch alles offen.')).toBeVisible();
});

test('Arbeitsplatzampel unterscheidet Frei, Reserviert und bestätigte Anwesenheit zeitgenau', async ({
  page,
}) => {
  await page.goto('/#/raumplanung');
  const floorplan = page.locator('.plan-panel .floorplan');
  const status = (id: string) => floorplan.locator(`[data-resource-id="${id}"]`);

  await expect(floorplan).toHaveAttribute('data-status-led', 'visible');
  await expect(status('OS-24')).toHaveAttribute('data-resource-status', 'available');
  await expect(status('OS-24')).toHaveAttribute('data-led-color', '#16A34A');
  await expect(status('OS-12')).toHaveAttribute('data-resource-status', 'reserved');
  await expect(status('OS-12')).toHaveAttribute('data-led-color', '#DC2626');
  await expect(status('OS-1')).toHaveAttribute('data-resource-status', 'occupied');
  await expect(status('OS-1')).toHaveAttribute('data-led-color', '#DC2626');

  const occupied = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('officeflow.demo.v1')!);
    const object = data.rooms
      .find((room: { id: string }) => room.id === 'open')
      .objects.find((entry: { id: string }) => entry.id === 'OS-1');
    return { x: object.x, y: object.y };
  });
  await clickPlan(page, occupied.x, occupied.y);
  await expect(page.locator('.resource-detail-card')).toContainText('Belegt · Anwesenheit bestätigt');
  await expect(page.locator('.resource-detail-card')).toContainText(
    '09:00–13:00 Uhr · Anwesenheit bestätigt',
  );

  await page.getByLabel('Verfügbarkeit von').fill('13:00');
  await page.getByLabel('Verfügbarkeit bis').fill('14:00');
  await expect(status('OS-1')).toHaveAttribute('data-resource-status', 'available');
  await expect(status('OS-12')).toHaveAttribute('data-resource-status', 'reserved');
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click();
  await expect(status('OS-12')).toHaveAttribute('data-resource-status', 'reserved');
  await expect(page.getByText('Grün – Frei', { exact: true })).toBeVisible();
  await expect(page.getByText('Rot – Reserviert oder belegt', { exact: true })).toBeVisible();
});

test('Ampeln bleiben in Showcase und Editor verborgen, im Präsentationsmodus aber aktiv', async ({
  page,
}) => {
  await page.goto('/#/showcase');
  await expect(page.locator('.showcase-page .floorplan')).toHaveCount(4);
  for (const plan of await page.locator('.showcase-page .floorplan').all()) {
    await expect(plan).toHaveAttribute('data-status-led', 'hidden');
  }
  await expect(page.locator('.showcase-viewer-foot')).toContainText('keine Live-Belegungsstatus');

  await page.goto('/#/editor');
  await expect(page.locator('.designer-canvas .floorplan')).toHaveAttribute('data-status-led', 'hidden');

  await page.goto('/#/praesentation');
  await expect(page.locator('.floorplan').first()).toHaveAttribute('data-status-led', 'visible');
});

test('Drei Grundrisse, Zoom und direkte Navigation', async ({ page }) => {
  await page.goto('/#/raumplanung');
  await expect(page.getByRole('heading', { name: 'Ihr Büro. Viele Möglichkeiten.' })).toBeVisible();
  await page.getByRole('button', { name: 'Einzelbüro' }).click();
  await expect(page.getByText('6 Arbeitsplätze', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hybrid Office' }).click();
  await expect(page.getByText('12 Arbeitsplätze', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click();
  await expect(page.getByText('115 %', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Plan einpassen' }).click();
  await expect(page.getByText('100 %', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ihr Büro. Viele Möglichkeiten.' })).toBeVisible();
});

test('Raumeditor speichert Bezeichnung, Drehung und neues Objekt', async ({ page }) => {
  await page.goto('/#/editor');
  await page.getByRole('combobox', { name: 'Grundriss zum Bearbeiten auswählen' }).selectOption('single');
  await page.getByRole('button', { name: 'Einzelarbeitsplatz hinzufügen', exact: true }).click();
  await page.getByLabel('Bezeichnung', { exact: true }).fill('Fokusplatz');
  await page.getByLabel('Drehung', { exact: true }).fill('90');
  await page.getByRole('button', { name: 'Grundriss speichern' }).click();
  await expect(page.getByRole('status')).toContainText('lokal gespeichert');
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('officeflow.demo.v1')!));
  const object = saved.rooms
    .find((r: { id: string }) => r.id === 'single')
    .objects.find((o: { name: string }) => o.name === 'Fokusplatz');
  expect(object.rotation).toBe(90);
  await page.getByRole('link', { name: 'Raumplanung', exact: true }).click();
  await page.getByRole('button', { name: 'Einzelbüro' }).click();
  await expect(page.getByText('7 Arbeitsplätze', { exact: true })).toBeVisible();
});

test('Meetingraum konfigurieren, buchen und Demo vollständig zurücksetzen', async ({ page }) => {
  await page.goto('/#/editor');
  await page.getByRole('combobox', { name: 'Grundriss zum Bearbeiten auswählen' }).selectOption('single');
  await page.getByRole('button', { name: 'Buchbarer Meetingraum hinzufügen', exact: true }).click();
  await page.getByLabel('Bezeichnung', { exact: true }).fill('Teamraum');
  await page.getByLabel('Kapazität (Personen)', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Grundriss speichern' }).click();
  await expect(page.getByRole('status')).toContainText('lokal gespeichert');
  await page.getByRole('link', { name: 'Raumplanung', exact: true }).click();
  await page.getByRole('button', { name: 'Neue Buchung' }).click();
  await page.getByLabel('Arbeitsplatz / Raum', { exact: true }).selectOption({ label: 'Teamraum' });
  await page.getByLabel('Mitarbeiter', { exact: true }).selectOption('e22');
  await page.getByRole('button', { name: 'Verbindlich buchen' }).click();
  await expect(page.getByRole('status')).toContainText('Teamraum wurde erfolgreich gebucht');
  await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
  await page.getByRole('button', { name: 'Demo zurücksetzen', exact: true }).click();
  await page.getByRole('button', { name: 'Jetzt zurücksetzen' }).click();
  await expect(page.getByRole('status')).toContainText('vollständig zurückgesetzt');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('officeflow.demo.v1')!));
  expect(
    saved.rooms
      .flatMap((r: { objects: unknown[] }) => r.objects)
      .filter((o: { kind: string }) => o.kind === 'meeting'),
  ).toHaveLength(5);
});

test('Arbeitsplatz im Canvas auswählen, verschieben und persistent speichern', async ({ page }) => {
  await page.goto('/#/editor');
  await page.getByRole('combobox', { name: 'Grundriss zum Bearbeiten auswählen' }).selectOption('single');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: 'Einrasten', exact: true }).click();
  const p = await planPoint(page, 185, 170);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 50 * p.scale, p.y + 30 * p.scale, { steps: 12 });
  await page.mouse.up();
  await page.getByRole('combobox', { name: 'Objekt zum Bearbeiten auswählen' }).selectOption('EB-1');
  const movedX = await page.getByLabel('Position X', { exact: true }).inputValue(),
    movedY = await page.getByLabel('Position Y', { exact: true }).inputValue();
  expect(Math.abs(Number(movedX) - 235)).toBeLessThan(2);
  expect(Math.abs(Number(movedY) - 200)).toBeLessThan(2);
  await page.getByRole('button', { name: 'Grundriss speichern' }).click();
  await expect(page.getByRole('status')).toContainText('lokal gespeichert');
  await page.reload();
  await page.getByRole('combobox', { name: 'Grundriss zum Bearbeiten auswählen' }).selectOption('single');
  await page.getByRole('combobox', { name: 'Objekt zum Bearbeiten auswählen' }).selectOption('EB-1');
  await expect(page.getByLabel('Position X', { exact: true })).toHaveValue(movedX);
});

test('Klick auf einen Arbeitsplatz zeigt erst Details und öffnet dann den Buchungsdialog', async ({
  page,
}) => {
  await page.goto('/#/raumplanung');
  await page.getByRole('button', { name: 'Einzelbüro' }).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  await clickPlan(page, 805, 550);
  await expect(page.locator('.resource-detail-card').getByText('EB-06', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Zeitraum prüfen und buchen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Arbeitsplatz / Raum', { exact: true })).toHaveValue('EB-6');
});

test('Showcase-Plan wird isoliert kopiert und ist anschließend buchbar', async ({ page }) => {
  await page.goto('/#/showcase');
  await expect(page.getByRole('heading', { name: 'Arbeitswelten, die Eindruck hinterlassen.' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.getByRole('button', { name: 'Nordlicht Headquarters ansehen' }).click();
  await expect(page.locator('.showcase-viewer')).toContainText('Nordlicht Headquarters');
  await page.getByRole('button', { name: 'Als eigene Kopie übernehmen' }).click();
  await expect(page).toHaveURL(/#\/raumplanung$/);
  await expect(page.getByRole('button', { name: /Nordlicht Headquarters · Eigene Kopie/ })).toBeVisible();
  await page.getByRole('button', { name: 'Neue Buchung' }).click();
  await page.getByLabel('Mitarbeiter', { exact: true }).selectOption('e22');
  await page.getByRole('button', { name: 'Verbindlich buchen' }).click();
  await expect(page.getByRole('status')).toContainText('erfolgreich gebucht');
  const result = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('officeflow.demo.v1')!);
    const copy = data.rooms.find((room: { name: string }) => room.name.endsWith('Eigene Kopie'));
    return {
      roomCount: data.rooms.length,
      copyId: copy.id,
      hasBooking: data.bookings.some((booking: { roomId: string }) => booking.roomId === copy.id),
      sourceStillPresent: data.rooms.some((room: { id: string }) => room.id === 'demo-showcase-hq'),
    };
  });
  expect(result).toEqual({
    roomCount: 5,
    copyId: expect.any(String),
    hasBooking: true,
    sourceStillPresent: true,
  });
});

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1440, height: 1000 },
  { width: 1024, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
]) {
  test(`Bedienbare Darstellung bei ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page.locator('canvas').first()).toBeVisible();
    // Arial bildet auf Windows auch die breitere Linux-Ersatzschrift ab.
    if (viewport.width === 390)
      await page.addStyleTag({ content: ':root { font-family: Arial, sans-serif !important; }' });
    if (viewport.width === 1920)
      await page.screenshot({ path: 'test-results/officeflow-wide.png', fullPage: true });
    if (viewport.width === 1440)
      await page.screenshot({ path: 'test-results/officeflow-desktop.png', fullPage: true });
    if (viewport.width === 390)
      await page.screenshot({ path: 'test-results/officeflow-mobile.png', fullPage: true });
    const overflow = await page.evaluate(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      elements: Array.from(document.querySelectorAll('body *'))
        .map((el) => ({
          tag: el.tagName,
          className: el.getAttribute('class'),
          right: el.getBoundingClientRect().right,
        }))
        .filter((el) => el.right > window.innerWidth + 1),
    }));
    expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
    await page.getByRole('button', { name: 'Dunkelmodus aktivieren' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Neue Buchung' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(
      await page.getByRole('dialog').evaluate((el) => el.getBoundingClientRect().right <= window.innerWidth),
    ).toBe(true);
    await page.getByRole('button', { name: 'Dialog schließen' }).click();
    if (viewport.width < 801) await page.getByRole('button', { name: 'Navigation öffnen' }).click();
    await page.getByRole('link', { name: 'Mitarbeiter', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Menschen machen den Unterschied.' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
