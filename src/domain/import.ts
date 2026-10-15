export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;
export type ImportFormat = 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf';
export function detectImportFormat(bytes: Uint8Array): ImportFormat | null {
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  )
    return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  const text = new TextDecoder().decode(bytes);
  if (text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP') return 'image/webp';
  if (text.startsWith('%PDF-')) return 'application/pdf';
  return null;
}
export async function validateImportFile(file: File): Promise<ImportFormat> {
  if (!file.size) throw new Error('Die Datei ist leer. Bitte wählen Sie einen gültigen Grundriss.');
  if (file.size > MAX_IMPORT_BYTES) throw new Error('Die Datei ist zu groß. Zulässig sind höchstens 25 MB.');
  const format = detectImportFormat(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  const extensions: Record<ImportFormat, RegExp> = {
    'image/png': /\.png$/i,
    'image/jpeg': /\.jpe?g$/i,
    'image/webp': /\.webp$/i,
    'application/pdf': /\.pdf$/i,
  };
  if (!format || !extensions[format].test(file.name) || (file.type && file.type !== format))
    throw new Error(
      'Dateiformat und Dateiinhalt passen nicht zusammen. Bitte verwenden Sie PNG, JPG, WebP oder PDF.',
    );
  return format;
}
