import { describe, expect, it } from 'vitest';
import { detectImportFormat, MAX_IMPORT_BYTES, validateImportFile } from './import';
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
describe('Lokale Dateiüberprüfung', () => {
  it('erkennt PNG, JPG, WebP und PDF anhand ihres Inhalts', () => {
    expect(detectImportFormat(png)).toBe('image/png');
    expect(detectImportFormat(new Uint8Array([255, 216, 255, 224]))).toBe('image/jpeg');
    expect(detectImportFormat(new TextEncoder().encode('RIFF0000WEBP'))).toBe('image/webp');
    expect(detectImportFormat(new TextEncoder().encode('%PDF-1.7'))).toBe('application/pdf');
    expect(detectImportFormat(new TextEncoder().encode('<svg>'))).toBeNull();
  });
  it('prüft Endung, MIME-Typ und Inhalt gemeinsam', async () => {
    await expect(validateImportFile(new File([png], 'plan.PNG', { type: 'image/png' }))).resolves.toBe(
      'image/png',
    );
    await expect(validateImportFile(new File([png], 'plan.jpg', { type: 'image/jpeg' }))).rejects.toThrow(
      'passen nicht zusammen',
    );
    await expect(validateImportFile(new File([png], 'plan.png', { type: 'text/html' }))).rejects.toThrow(
      'passen nicht zusammen',
    );
  });
  it('lehnt leere und übergroße Dateien vor der Verarbeitung ab', async () => {
    await expect(validateImportFile(new File([], 'leer.png'))).rejects.toThrow('leer');
    await expect(
      validateImportFile(new File([new Uint8Array(MAX_IMPORT_BYTES + 1)], 'gross.pdf')),
    ).rejects.toThrow('25 MB');
  });
});
