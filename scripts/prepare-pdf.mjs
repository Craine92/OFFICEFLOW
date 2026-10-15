import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
for (const folder of ['cmaps', 'standard_fonts', 'wasm']) {
  const target = path.resolve('public/pdfjs', folder);
  await mkdir(target, { recursive: true });
  await cp(path.resolve('node_modules/pdfjs-dist', folder), target, { recursive: true });
}
console.log('Lokale PDF-Schriften, Zeichentabellen und Decoder vorbereitet.');
await cp(path.resolve('node_modules/pdfjs-dist/LICENSE'), path.resolve('public/pdfjs/LICENSE'));
