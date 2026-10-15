import { MAX_IMAGE_PIXELS, validateImportFile } from '../domain/import';
export interface ImportSession {
  name: string;
  mime: string;
  source: File;
  pageCount: number;
  render: (page: number) => Promise<{ image: Blob; width: number; height: number }>;
  destroy: () => void;
}
function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Die Grundrissvorschau konnte nicht erzeugt werden.')),
      'image/png',
    ),
  );
}
export async function openImport(file: File): Promise<ImportSession> {
  const mime = await validateImportFile(file);
  if (mime === 'application/pdf') {
    const pdfjs = await import('pdfjs-dist');
    const { default: worker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker;
    const base = new URL(import.meta.env.BASE_URL, document.baseURI);
    const loading = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      useSystemFonts: true,
      cMapUrl: new URL('pdfjs/cmaps/', base).href,
      cMapPacked: true,
      standardFontDataUrl: new URL('pdfjs/standard_fonts/', base).href,
      wasmUrl: new URL('pdfjs/wasm/', base).href,
    });
    let pdf: Awaited<typeof loading.promise>;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      pdf = await Promise.race([
        loading.promise,
        new Promise<never>((_, reject) => {
          watchdog = setTimeout(() => reject(new Error('timeout')), 30000);
        }),
      ]);
    } catch (e) {
      void loading.destroy().catch(() => {});
      throw new Error(
        (e as Error).message === 'timeout'
          ? 'Die PDF-Verarbeitung dauert zu lange. Bitte exportieren Sie die gewünschte Seite separat und versuchen Sie es erneut.'
          : (e as Error).name === 'PasswordException'
            ? 'Diese PDF ist passwortgeschützt. Bitte exportieren Sie eine ungeschützte Kopie.'
            : 'Die PDF konnte nicht gelesen werden. Bitte wählen Sie eine vollständige, unbeschädigte Datei.',
      );
    } finally {
      clearTimeout(watchdog);
    }
    if (pdf.numPages > 500) {
      await loading.destroy();
      throw new Error(
        'Diese PDF enthält mehr als 500 Seiten. Bitte exportieren Sie den benötigten Bereich separat.',
      );
    }
    return {
      name: file.name,
      mime,
      source: file,
      pageCount: pdf.numPages,
      render: async (n) => {
        if (!Number.isInteger(n) || n < 1 || n > pdf.numPages)
          throw new Error('Diese PDF-Seite existiert nicht.');
        const page = await pdf.getPage(n),
          original = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({
          scale: Math.min(2, 2400 / Math.max(original.width, original.height)),
        });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        try {
          await page.render({ canvas, viewport }).promise;
          const image = await toBlob(canvas);
          return { image, width: canvas.width, height: canvas.height };
        } finally {
          canvas.width = 0;
          canvas.height = 0;
          page.cleanup();
        }
      },
      destroy: () => {
        void loading.destroy().catch(() => {});
      },
    };
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      'Das Bild ist beschädigt oder kann nicht gelesen werden. Bitte exportieren Sie es erneut.',
    );
  }
  if (bitmap.width * bitmap.height > MAX_IMAGE_PIXELS || bitmap.width < 32 || bitmap.height < 32) {
    bitmap.close();
    throw new Error(
      'Der Grundriss muss mindestens 32 × 32 Pixel groß sein und darf höchstens 40 Megapixel haben.',
    );
  }
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Die Bildverarbeitung wird von diesem Browser nicht unterstützt.');
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const rendered = { image: await toBlob(canvas), width: canvas.width, height: canvas.height };
  canvas.width = 0;
  canvas.height = 0;
  return {
    name: file.name,
    mime,
    source: file,
    pageCount: 1,
    render: async () => rendered,
    destroy: () => {},
  };
}
