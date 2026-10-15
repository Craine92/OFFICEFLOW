import { expect, test, type Page } from '@playwright/test';
import { imageFile, samplePdf } from '../fixtures/plans';

async function data(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('officeflow.demo.v1')!));
}
async function openWizard(page: Page) {
  await page.getByRole('button', { name: 'Grundriss importieren', exact: true }).click();
}
async function finishImport(page: Page, name: string) {
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name des Bürobereichs', exact: true }).fill(name);
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByRole('button', { name: 'Importieren und speichern', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.floorplan')).toHaveAttribute('data-background-state', 'ready');
}

test('Vorhandene Version-1-Daten werden im Browser ohne Verlust migriert', async ({ page }) => {
  await page.goto('/#/editor');
  const legacy = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('officeflow.demo.v1')!);
    saved.version = 1;
    saved.rooms[0].objects[0].name = 'Migrationplatz';
    saved.bookings.push({
      ...saved.bookings[0],
      id: 'migration-booking',
      objectId: 'OS-24',
      employeeId: 'e22',
      start: '18:00',
      end: '19:00',
    });
    for (const room of saved.rooms) delete room.layout;
    const raw = JSON.stringify(saved);
    localStorage.setItem('officeflow.demo.v1', raw);
    return raw;
  });
  await page.reload();
  await page.getByRole('combobox', { name: 'Objekt zum Bearbeiten auswählen' }).selectOption('OS-1');
  await expect(page.getByLabel('Bezeichnung', { exact: true })).toHaveValue('Migrationplatz');
  const migrated = await data(page);
  expect(migrated.version).toBe(2);
  expect(migrated.bookings).toHaveLength(20);
  expect(await page.evaluate(() => localStorage.getItem('officeflow.demo.backup.v1'))).toBe(legacy);
});

test('PNG importieren, drehen, Arbeitsplätze einrichten, rückgängig machen und nach Neuladen buchen', async ({
  page,
}) => {
  await page.goto('/#/editor');
  await openWizard(page);
  await page.getByLabel('Grundrissdatei', { exact: true }).setInputFiles(await imageFile(page));
  await expect(page.getByAltText('Vorschau Bueroplan.png')).toBeVisible();
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByRole('button', { name: '90° drehen', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name des Bürobereichs', exact: true }).fill('Unser Büro');
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByRole('button', { name: 'Importieren und speichern', exact: true }).click();
  await expect(page.locator('.floorplan')).toHaveAttribute('data-background-state', 'ready');
  await page.getByRole('button', { name: 'Arbeitsplatz', exact: true }).click();
  await page.getByLabel('Bezeichnung', { exact: true }).fill('Importplatz');
  await page.getByLabel('Position X', { exact: true }).fill('400');
  await page.getByLabel('Position Y', { exact: true }).fill('300');
  await page.getByRole('button', { name: 'Änderung rückgängig machen', exact: true }).click();
  await expect(page.getByLabel('Position Y', { exact: true })).not.toHaveValue('300');
  await page.getByRole('button', { name: 'Änderung wiederholen', exact: true }).click();
  await expect(page.getByLabel('Position Y', { exact: true })).toHaveValue('300');
  await page.getByRole('button', { name: 'Um 90° drehen', exact: false }).click();
  await page.getByRole('button', { name: 'Grundriss speichern', exact: true }).click();
  const saved = await data(page),
    room = saved.rooms.find((r: { name: string }) => r.name === 'Unser Büro');
  expect(saved.version).toBe(2);
  expect(saved.bookings).toHaveLength(19);
  expect(room.width).toBe(933);
  expect(room.height).toBe(1400);
  expect(room.background.rotation).toBe(90);
  await page.reload();
  await page.getByRole('combobox', { name: 'Grundriss zum Bearbeiten auswählen' }).selectOption(room.id);
  await expect(page.locator('.floorplan')).toHaveAttribute('data-background-state', 'ready');
  await page
    .getByRole('combobox', { name: 'Objekt zum Bearbeiten auswählen' })
    .selectOption(room.objects[0].id);
  await expect(page.getByLabel('Position X', { exact: true })).toHaveValue('400');
  await expect(page.getByLabel('Position Y', { exact: true })).toHaveValue('300');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.getByRole('button', { name: 'Vergrößern', exact: true }).click();
  await page.getByRole('button', { name: 'Plan einpassen', exact: true }).click();
  expect((await data(page)).rooms.find((r: { id: string }) => r.id === room.id).objects[0]).toMatchObject({
    x: 400,
    y: 300,
    rotation: 90,
  });
  await page.getByRole('link', { name: 'Raumplanung', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ihr Büro. Viele Möglichkeiten.' })).toBeVisible();
  await expect(page.locator('.floorplan')).toHaveAttribute('data-background-state', 'ready');
  const canvas = page.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!,
    scale = Math.min(box.width / room.width, box.height / room.height) * 0.96;
  await page.mouse.click(
    box.x + (box.width - room.width * scale) / 2 + 400 * scale,
    box.y + (box.height - room.height * scale) / 2 + 300 * scale,
  );
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Arbeitsplatz / Raum', { exact: true })).toHaveValue(room.objects[0].id);
  await page.getByLabel('Mitarbeiter', { exact: true }).selectOption('e22');
  await page.getByRole('button', { name: 'Verbindlich buchen' }).click();
  await expect(page.getByRole('status')).toContainText('Importplatz wurde erfolgreich gebucht');
  await page.reload();
  expect((await data(page)).bookings).toHaveLength(20);
});

for (const mime of ['image/jpeg', 'image/webp'])
  test(`${mime} wird lokal importiert und gespeichert`, async ({ page }) => {
    await page.goto('/#/editor');
    await openWizard(page);
    await page.getByLabel('Grundrissdatei', { exact: true }).setInputFiles(await imageFile(page, mime));
    await expect(page.getByRole('button', { name: 'Weiter', exact: true })).toBeEnabled();
    await finishImport(page, 'Bildbüro');
    const room = (await data(page)).rooms.find((r: { name: string }) => r.name === 'Bildbüro');
    expect(room.background.mime).toBe(mime);
  });

test('Mehrseitige PDF mit lokaler Seitenauswahl und Originaldatei in IndexedDB', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (r.url().startsWith('http') && !r.url().startsWith('http://127.0.0.1:5173')) external.push(r.url());
  });
  await page.goto('/#/editor');
  await openWizard(page);
  await page.getByLabel('Grundrissdatei', { exact: true }).setInputFiles(samplePdf());
  await expect(page.getByRole('combobox', { name: 'PDF-Seite', exact: true })).toBeEnabled({
    timeout: 20000,
  });
  await page.getByRole('combobox', { name: 'PDF-Seite', exact: true }).selectOption('2');
  await expect(page.getByAltText('Vorschau Bueroplan.pdf, Seite 2')).toBeVisible();
  await finishImport(page, 'PDF-Büro');
  const room = (await data(page)).rooms.find((r: { name: string }) => r.name === 'PDF-Büro');
  expect(room.width).toBeLessThan(room.height);
  expect(room.background.page).toBe(2);
  const asset = await page.evaluate(
    async (id) =>
      new Promise<{ mime: string; sourceSize: number; page: number }>((resolve) => {
        const req = indexedDB.open('officeflow-plans', 1);
        req.onsuccess = () => {
          const get = req.result.transaction('assets').objectStore('assets').get(id);
          get.onsuccess = () =>
            resolve({
              mime: get.result.source.type,
              sourceSize: get.result.source.size,
              page: get.result.page,
            });
        };
      }),
    room.background.assetId,
  );
  expect(asset.mime).toBe('application/pdf');
  expect(asset.sourceSize).toBeGreaterThan(500);
  expect(asset.page).toBe(2);
  await page.reload();
  await page.getByRole('combobox', { name: 'Grundriss zum Bearbeiten auswählen' }).selectOption(room.id);
  await expect(page.locator('.floorplan')).toHaveAttribute('data-background-state', 'ready');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('Ungültige, leere, beschädigte und übergroße Dateien verändern keine Bestandsdaten', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/#/editor');
  const original = await data(page);
  await openWizard(page);
  const file = page.getByLabel('Grundrissdatei', { exact: true });
  await file.setInputFiles({
    name: 'plan.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('kein grundriss'),
  });
  await expect(page.getByRole('alert')).toContainText('Dateiformat');
  await file.setInputFiles({ name: 'leer.png', mimeType: 'image/png', buffer: Buffer.alloc(0) });
  await expect(page.getByRole('alert')).toContainText('leer');
  await file.setInputFiles({
    name: 'kaputt.png',
    mimeType: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  });
  await expect(page.getByRole('alert')).toContainText('beschädigt');
  await file.setInputFiles({
    name: 'kaputt.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\nkein PDF'),
  });
  await expect(page.getByRole('alert')).toContainText('PDF konnte nicht gelesen', { timeout: 20000 });
  await file.setInputFiles({
    name: 'gross.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(25 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole('alert')).toContainText('25 MB');
  await expect(page.getByRole('button', { name: 'Weiter', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Abbrechen', exact: true }).click();
  expect(await data(page)).toEqual(original);
});

test('Hintergrund ersetzen erhält gebuchte Objekte und alle Termine', async ({ page }) => {
  await page.goto('/#/editor');
  const before = await data(page);
  await openWizard(page);
  await page.getByLabel('Grundrissdatei', { exact: true }).setInputFiles(await imageFile(page));
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByRole('combobox', { name: 'Importziel', exact: true }).selectOption('replace');
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByRole('button', { name: 'Importieren und speichern', exact: true }).click();
  await expect(page.locator('.floorplan')).toHaveAttribute('data-background-state', 'ready');
  const after = await data(page);
  expect(after.rooms).toHaveLength(3);
  expect(after.bookings).toEqual(before.bookings);
  expect(after.rooms[0].objects).toEqual(before.rooms[0].objects);
});

test('Fehlender IndexedDB-Hintergrund lässt vorhandene Buchungen unberührt', async ({ page }) => {
  await page.goto('/#/editor');
  await openWizard(page);
  await page.getByLabel('Grundrissdatei', { exact: true }).setInputFiles(await imageFile(page));
  await finishImport(page, 'Lokaler Plan');
  const room = (await data(page)).rooms.find((r: { name: string }) => r.name === 'Lokaler Plan');
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const req = indexedDB.open('officeflow-plans', 1);
        req.onsuccess = () => {
          const tx = req.result.transaction('assets', 'readwrite');
          tx.objectStore('assets').clear();
          tx.oncomplete = () => resolve();
        };
      }),
  );
  await page.reload();
  await page.getByRole('combobox', { name: 'Grundriss zum Bearbeiten auswählen' }).selectOption(room.id);
  await expect(page.locator('.floorplan')).toHaveAttribute('data-background-state', 'error');
  await expect(page.getByRole('alert')).toContainText('Buchungen sind weiterhin vorhanden');
  expect((await data(page)).bookings).toHaveLength(19);
});

test('IndexedDB-Speicherfehler zeigt einen deutschen Fehler und legt keinen halben Bürobereich an', async ({
  page,
}) => {
  await page.goto('/#/editor');
  const before = await data(page);
  await openWizard(page);
  await page.getByLabel('Grundrissdatei', { exact: true }).setInputFiles(await imageFile(page));
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('quota', 'QuotaExceededError');
    };
  });
  await page.getByRole('button', { name: 'Importieren und speichern', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Browserspeicher voll');
  expect(await data(page)).toEqual(before);
});

test('Vollständiger Demo-Reset entfernt auch importierte Originaldateien aus IndexedDB', async ({ page }) => {
  await page.goto('/#/editor');
  await openWizard(page);
  await page.getByLabel('Grundrissdatei', { exact: true }).setInputFiles(await imageFile(page));
  await finishImport(page, 'Zurücksetzen');
  await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
  await page.getByRole('button', { name: 'Demo zurücksetzen', exact: true }).click();
  await page.getByRole('button', { name: 'Jetzt zurücksetzen', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('vollständig zurückgesetzt');
  const count = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open('officeflow-plans', 1);
        req.onsuccess = () => {
          const request = req.result.transaction('assets').objectStore('assets').count();
          request.onsuccess = () => resolve(request.result);
        };
      }),
  );
  expect(count).toBe(0);
  expect((await data(page)).rooms).toHaveLength(3);
});

test('Überschneidungen, Größenänderung, Raster und Undo/Redo', async ({ page }) => {
  await page.goto('/#/editor');
  await page.getByRole('combobox', { name: 'Grundriss zum Bearbeiten auswählen' }).selectOption('single');
  await page.getByRole('combobox', { name: 'Objekt zum Bearbeiten auswählen' }).selectOption('EB-3');
  await page.getByLabel('Position X', { exact: true }).fill('410');
  await expect(page.getByText('1 Objektüberschneidung(en)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Änderung rückgängig machen', exact: true }).click();
  await expect(page.getByLabel('Position X', { exact: true })).toHaveValue('610');
  await expect(page.getByText('1 Objektüberschneidung(en)', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Änderung wiederholen', exact: true }).click();
  await expect(page.getByLabel('Position X', { exact: true })).toHaveValue('410');
  await page.getByRole('button', { name: 'Änderung rückgängig machen', exact: true }).click();
  await page.getByLabel('Objektbreite', { exact: true }).fill('90');
  await page.getByRole('checkbox', { name: 'Einrasten', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'Raster', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Grundriss speichern', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('lokal gespeichert');
  await page.getByLabel('Planbreite', { exact: true }).fill('1800');
  await page.getByLabel('Planhöhe', { exact: true }).fill('1140');
  await page.getByRole('button', { name: 'Planabmessungen übernehmen', exact: true }).click();
  await expect(page.getByLabel('Position X', { exact: true })).toHaveValue('1220');
  await expect(page.getByLabel('Position Y', { exact: true })).toHaveValue('300');
});

test('Zeitfenster gibt einen vormittags belegten Platz am Nachmittag frei', async ({ page }) => {
  await page.goto('/#/raumplanung');
  await page.getByRole('button', { name: 'Einzelbüro', exact: false }).click();
  await page.getByLabel('Verfügbarkeit bis', { exact: true }).fill('14:00');
  await page.getByLabel('Verfügbarkeit von', { exact: true }).fill('13:00');
  await expect(page.getByRole('button', { name: 'EB-01', exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'EB-01', exact: false }).click();
  await expect(page.getByLabel('Von', { exact: true })).toHaveValue('13:00');
  await expect(page.getByLabel('Bis', { exact: true })).toHaveValue('14:00');
  await expect(page.getByText(/09:00–13:00 Uhr/)).toBeVisible();
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
])
  test(`Import-Assistent bedienbar bei ${viewport.width} Pixeln`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/#/editor');
    await openWizard(page);
    await page.getByLabel('Grundrissdatei', { exact: true }).setInputFiles(await imageFile(page));
    await expect(page.getByRole('button', { name: 'Weiter', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();
    await page.getByRole('button', { name: '90° drehen', exact: true }).click();
    const dialog = page.getByRole('dialog');
    expect(await dialog.evaluate((e) => e.getBoundingClientRect().right <= innerWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('textbox', { name: 'Name des Bürobereichs', exact: true }).fill('Responsive Büro');
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();
    await page.getByRole('button', { name: 'Importieren und speichern', exact: true }).click();
    await expect(page.locator('.floorplan')).toHaveAttribute('data-background-state', 'ready');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
