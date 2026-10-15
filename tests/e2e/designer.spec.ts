import { expect, test } from '@playwright/test';
import { clickPlan, planPoint } from './helpers';
test.beforeEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept());
});
async function blank(page: import('@playwright/test').Page) {
  await page.goto('/#/editor');
  await page.getByRole('button', { name: 'Leerer Plan', exact: true }).click();
  await page.getByLabel('Name der neuen Etage').fill('Entwurf');
  await page.getByRole('button', { name: 'Etage anlegen', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Grundriss zum Bearbeiten auswählen' })).toContainText(
    'Entwurf',
  );
}
async function saved(page: import('@playwright/test').Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('officeflow.demo.v1')!));
}
test('Wände, verbundene Punkte, Tür, Fenster, Undo/Redo, Ebenen und persistenter Maßstab', async ({
  page,
}) => {
  await blank(page);
  await page.getByRole('button', { name: 'Wand zeichnen', exact: true }).click();
  await clickPlan(page, 100, 100);
  await clickPlan(page, 800, 100);
  await clickPlan(page, 800, 100);
  await clickPlan(page, 800, 600);
  await page.getByRole('button', { name: 'Tür einsetzen', exact: true }).click();
  await clickPlan(page, 300, 100);
  await expect(page.getByLabel('Öffnungsposition')).toHaveValue('200');
  await page.getByRole('button', { name: 'Fenster einsetzen', exact: true }).click();
  await clickPlan(page, 600, 100);
  await page.getByRole('button', { name: 'Änderung rückgängig machen', exact: true }).click();
  await page.getByRole('button', { name: 'Änderung wiederholen', exact: true }).click();
  await page.getByRole('button', { name: 'Maßstab kalibrieren', exact: true }).click();
  await clickPlan(page, 100, 300);
  await clickPlan(page, 600, 300);
  await page.getByLabel('Bekannte Länge in Metern').fill('5');
  await page.getByRole('button', { name: 'Maßstab übernehmen' }).click();
  await page.getByRole('button', { name: 'Ebenen anzeigen' }).click();
  await page.getByRole('button', { name: 'Architektur sperren', exact: true }).click();
  await expect(
    page
      .getByRole('combobox', { name: 'Objekt zum Bearbeiten auswählen' })
      .locator('option')
      .filter({ hasText: 'Wand' })
      .first(),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Architektur ausblenden', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Architektur einblenden', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Architektur einblenden', exact: true }).click();
  await page.getByRole('button', { name: 'Architektur entsperren', exact: true }).click();
  await page.getByRole('button', { name: 'Grundriss speichern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('lokal gespeichert');
  const before = await saved(page),
    r = before.rooms.find((r: { name: string }) => r.name === 'Entwurf');
  expect(r.walls).toHaveLength(2);
  expect(r.openings).toHaveLength(2);
  expect(r.walls[0].end).toEqual(r.walls[1].start);
  expect(r.calibration.meters).toBe(5);
  expect(before.bookings).toHaveLength(19);
  await page.reload();
  await page.getByRole('combobox', { name: 'Grundriss zum Bearbeiten auswählen' }).selectOption(r.id);
  const after = await saved(page);
  expect(after.rooms.find((v: { id: string }) => v.id === r.id)).toEqual(r);
});
test('Gebäudeelemente, Möbelgruppen, Kopieren, Drehen, Größen und Buchbarkeit', async ({ page }) => {
  await blank(page);
  for (const name of ['Aufzug', 'Treppe']) {
    await page.getByRole('button', { name: 'Möbelkatalog', exact: true }).click();
    await page.getByLabel('Objektkatalog durchsuchen').fill(name);
    await page.getByRole('button', { name: `${name} hinzufügen`, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Möbelkatalog', exact: true }).click();
  await page.getByLabel('Objektkatalog durchsuchen').fill('Vierer');
  await page.getByLabel('Objektkatalog durchsuchen').fill('4er');
  await page.getByRole('button', { name: '4er-Arbeitsplatzgruppe hinzufügen', exact: true }).click();
  await expect(page.getByRole('heading', { name: '4 Elemente', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gruppierung aufheben', exact: true }).click();
  await page.getByRole('button', { name: 'Gruppieren', exact: true }).click();
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await expect(page.getByRole('heading', { name: '4 Elemente', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Grundriss speichern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('lokal gespeichert');
  let data = await saved(page),
    room = data.rooms.find((r: { name: string }) => r.name === 'Entwurf');
  expect(room.fixtures.map((f: { kind: string }) => f.kind)).toEqual(['elevator', 'stairs']);
  expect(room.objects).toHaveLength(8);
  expect(new Set(room.objects.map((o: { name: string }) => o.name)).size).toBe(8);
  const id = room.objects[0].id;
  await page.getByRole('combobox', { name: 'Objekt zum Bearbeiten auswählen' }).selectOption(id);
  await page.getByLabel('Position X', { exact: true }).fill('1000');
  await page.getByLabel('Position Y', { exact: true }).fill('650');
  await page.getByLabel('Objektbreite', { exact: true }).fill('100');
  await page.getByLabel('Drehung', { exact: true }).fill('37');
  await page.getByRole('button', { name: '15° drehen', exact: true }).click();
  await expect(page.getByLabel('Drehung', { exact: true })).toHaveValue('52');
  await page.getByRole('button', { name: 'Grundriss speichern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('lokal gespeichert');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click();
  await page.getByRole('button', { name: 'Plan einpassen', exact: true }).click();
  await page.reload();
  await page.getByRole('combobox', { name: 'Grundriss zum Bearbeiten auswählen' }).selectOption(room.id);
  await page.getByRole('combobox', { name: 'Objekt zum Bearbeiten auswählen' }).selectOption(id);
  await expect(page.getByLabel('Position X', { exact: true })).toHaveValue('1000');
  await expect(page.getByLabel('Drehung', { exact: true })).toHaveValue('52');
  if (await page.getByRole('button', { name: 'Navigation öffnen' }).isVisible())
    await page.getByRole('button', { name: 'Navigation öffnen' }).click();
  await page.getByRole('link', { name: 'Raumplanung', exact: true }).click();
  await page.getByRole('button', { name: 'Neue Buchung', exact: true }).click();
  await page.getByLabel('Arbeitsplatz / Raum', { exact: true }).selectOption(id);
  await page.getByLabel('Mitarbeiter', { exact: true }).selectOption('e22');
  await page.getByRole('button', { name: 'Verbindlich buchen' }).click();
  await expect(page.getByRole('status')).toContainText('erfolgreich gebucht');
  data = await saved(page);
  expect(data.bookings.some((b: { objectId: string }) => b.objectId === id)).toBe(true);
});
test('Auswahlrahmen, Kontextmenü und Cursorzoom erhalten Weltkoordinaten', async ({ page }) => {
  await blank(page);
  await page.getByRole('button', { name: 'Einzelarbeitsplatz hinzufügen', exact: true }).click();
  await page.getByLabel('Position X', { exact: true }).fill('500');
  await page.getByLabel('Position Y', { exact: true }).fill('400');
  await page.getByRole('button', { name: 'Grundriss speichern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('lokal gespeichert');
  const p = await planPoint(page, 500, 400);
  await page.mouse.click(p.x, p.y, { button: 'right' });
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('menu').getByRole('button', { name: 'Duplizieren', exact: true }).click();
  await expect(page.getByText('Ungespeicherte Änderungen', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Änderung rückgängig machen', exact: true }).click();
  await page.mouse.move(p.x, p.y);
  await page.mouse.wheel(0, -300);
  await page.getByRole('button', { name: 'Plan einpassen', exact: true }).click();
  const r = (await saved(page)).rooms.find((r: { name: string }) => r.name === 'Entwurf');
  expect(r.objects[0]).toMatchObject({ x: 500, y: 400 });
  const a = await planPoint(page, 400, 300),
    b = await planPoint(page, 600, 500);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByLabel('Bezeichnung', { exact: true })).toHaveValue(r.objects[0].name);
});
test('Präsentationsmodus zeigt Raumwechsel und zeitgenaue Verfügbarkeit ohne Editorwerkzeuge', async ({
  page,
}) => {
  await page.goto('/#/praesentation');
  await expect(page.getByRole('button', { name: 'Wand zeichnen', exact: true })).toHaveCount(0);
  await expect(page.locator('.sidebar')).toBeHidden();
  await page.getByRole('button', { name: 'Hybrid Office', exact: false }).click();
  await page.getByLabel('Verfügbarkeit von', { exact: true }).fill('19:00');
  await page.getByLabel('Verfügbarkeit bis', { exact: true }).fill('20:00');
  await expect(page.locator('.count-pill')).toHaveText('12 frei');
  await page.getByRole('link', { name: 'Präsentation beenden' }).click();
  await expect(page.locator('.sidebar')).toBeVisible();
});
