import http from 'node:http';
import path from 'node:path';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// Bewusst statisch: Dieser Prüfserver ist kein Bestandteil der Anwendung.
const root = path.resolve('dist');
const prefix = process.env.PRODUCTION_PREFIX || '/officeflow/';
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};
const server = http.createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (!pathname.startsWith(prefix)) {
    res.writeHead(404).end();
    return;
  }
  const file = path.resolve(root, pathname.slice(prefix.length) || 'index.html');
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
let browser;
try {
  browser = await chromium.launch(process.platform === 'win32' ? { channel: 'msedge' } : {});
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  const url = `http://127.0.0.1:${port}${prefix}`;
  await page.goto(`${url}#/buchungen`);
  await page.getByRole('heading', { name: 'Platz für einen guten Tag.' }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name: 'Platz für einen guten Tag.' }).waitFor();
  await page.getByRole('link', { name: 'Übersicht', exact: true }).click();
  await page.locator('canvas').waitFor();
  await page.getByRole('button', { name: 'Neue Buchung' }).click();
  await page.getByLabel('Arbeitsplatz / Raum', { exact: true }).selectOption('OS-24');
  await page.getByLabel('Mitarbeiter', { exact: true }).selectOption('e22');
  await page.getByRole('button', { name: 'Verbindlich buchen' }).click();
  await page.getByRole('status').filter({ hasText: 'erfolgreich gebucht' }).waitFor();
  await page.reload();
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem('officeflow.demo.v1')).bookings.length),
    20,
  );
  // Ausgangsdaten für die dokumentierten Bildschirmfotos.
  await page.evaluate(() => localStorage.removeItem('officeflow.demo.v1'));
  await page.reload();
  await page.locator('canvas').waitFor();
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/desktop.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Dunkelmodus aktivieren' }).click();
  await page.screenshot({ path: 'docs/screenshots/dunkelmodus.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Hellmodus aktivieren' }).click();
  await page.setViewportSize({ width: 768, height: 1024 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'docs/screenshots/tablet.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'docs/screenshots/mobil.png', fullPage: true, animations: 'disabled' });
  assert.deepEqual(errors, [], 'Browser- oder Asset-Fehler im Produktions-Build');
  console.log(
    `Produktionsprüfung erfolgreich: ${prefix}, direkter Aufruf, Neuladen, Assets, Buchung, Persistenz und responsive Ansichten.`,
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
