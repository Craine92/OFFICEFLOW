import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileImage,
  FileUp,
  HardDrive,
  LoaderCircle,
  RotateCw,
  Scan,
  ShieldCheck,
} from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { openImport, type ImportSession } from '../data/importer';
import { planAssets } from '../data/assets';
import { fitBackground } from '../domain/layout';
import { emptyDesign } from '../domain/design';
import type { OfficeRoom, PlanBackground, PlanAsset } from '../domain/types';
import { useOfficeStore } from '../store/useOfficeStore';

type Preview = { image: Blob; width: number; height: number };
export function ImportWizard({
  open,
  onClose,
  currentRoom,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  currentRoom: OfficeRoom;
  onImported: (room: OfficeRoom) => void;
}) {
  const { addRoom, saveRoom } = useOfficeStore();
  const session = useRef<ImportSession | null>(null),
    generation = useRef(0),
    input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1),
    [preview, setPreview] = useState<Preview | null>(null),
    [url, setUrl] = useState('');
  const [fileName, setFileName] = useState(''),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(1);
  const [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const [destination, setDestination] = useState('new'),
    [name, setName] = useState('Mein Büro');
  const [rotation, setRotation] = useState(0),
    [scale, setScale] = useState(100),
    [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (!open) {
      generation.current++;
      session.current?.destroy();
      session.current = null;
      setPreview(null);
      setStep(1);
      setError('');
      setBusy(false);
      setDestination('new');
      setRotation(0);
      setScale(100);
      setOffset({ x: 0, y: 0 });
    }
  }, [open]);
  useEffect(
    () => () => {
      generation.current++;
      session.current?.destroy();
    },
    [],
  );
  useEffect(() => {
    if (!preview) {
      setUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(preview.image);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [preview]);
  async function readFile(file?: File) {
    if (!file) return;
    const token = ++generation.current;
    session.current?.destroy();
    session.current = null;
    setBusy(true);
    setPreview(null);
    setError('');
    setFileName(file.name);
    setStep(1);
    setPage(1);
    setPages(1);
    setRotation(0);
    setScale(100);
    setOffset({ x: 0, y: 0 });
    try {
      const next = await openImport(file);
      if (token !== generation.current) {
        next.destroy();
        return;
      }
      session.current = next;
      setPages(next.pageCount);
      const rendered = await next.render(1);
      if (token === generation.current) {
        setPreview(rendered);
        setName(file.name.replace(/\.[^.]+$/, '').slice(0, 45) || 'Mein Büro');
      }
    } catch (e) {
      if (token === generation.current) setError((e as Error).message);
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  async function changePage(n: number) {
    if (!session.current) return;
    const token = ++generation.current;
    setPage(n);
    setBusy(true);
    setError('');
    setPreview(null);
    try {
      const result = await session.current.render(n);
      if (token === generation.current) setPreview(result);
    } catch {
      if (token === generation.current)
        setError(
          'Diese PDF-Seite konnte nicht gerendert werden. Bitte wählen Sie eine andere Seite oder exportieren Sie sie als Bild.',
        );
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  const swap = rotation % 180 !== 0;
  const sourceWidth = preview ? (swap ? preview.height : preview.width) : 1400;
  const sourceHeight = preview ? (swap ? preview.width : preview.height) : 900;
  const factor = 1400 / Math.max(sourceWidth, sourceHeight);
  const dimensions =
    destination === 'replace'
      ? currentRoom
      : {
          ...emptyDesign(),
          width: Math.max(160, Math.round(sourceWidth * factor)),
          height: Math.max(160, Math.round(sourceHeight * factor)),
        };
  const fitted = preview
    ? fitBackground(preview, dimensions, rotation)
    : { x: 0, y: 0, width: 0, height: 0, rotation };
  const placement = {
    ...fitted,
    x: fitted.x + offset.x,
    y: fitted.y + offset.y,
    width: (fitted.width * scale) / 100,
    height: (fitted.height * scale) / 100,
  };
  function fit() {
    setScale(100);
    setOffset({ x: 0, y: 0 });
  }
  async function finish() {
    if (!preview || !session.current || !name.trim()) return;
    setSaving(true);
    setError('');
    const id = crypto.randomUUID();
    try {
      const asset: PlanAsset = {
        id,
        name: fileName,
        mime: session.current.mime,
        source: session.current.source,
        ...preview,
        ...(session.current.mime === 'application/pdf' ? { page, pageCount: pages } : {}),
      };
      await planAssets.put(asset);
      const background: PlanBackground = {
        assetId: id,
        name: fileName,
        mime: asset.mime,
        page: asset.page,
        ...placement,
        opacity: 1,
      };
      const room: OfficeRoom =
        destination === 'replace'
          ? { ...currentRoom, layout: 'custom', background }
          : {
              id: crypto.randomUUID(),
              name: name.trim(),
              subtitle: 'Ihr eigener Bürogrundriss',
              area: 0,
              ...dimensions,
              layout: 'custom',
              objects: [],
              background,
            };
      if (destination === 'replace') await saveRoom(room);
      else await addRoom(room);
      onImported(room);
      onClose();
    } catch (e) {
      await planAssets.remove(id).catch(() => {});
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !saving) onClose();
      }}
      wide
      title="Ihre Arbeitswelt beginnt mit Ihrem Grundriss."
      description="Bild oder PDF auswählen, ausrichten und lokal speichern. Ihre Datei verlässt diesen Browser nicht."
    >
      <div className="import-steps" aria-label="Importfortschritt">
        {['Datei auswählen', 'Grundriss ausrichten', 'Import bestätigen'].map((label, i) => (
          <span key={label} className={step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}>
            <i>{step > i + 1 ? <Check size={12} /> : i + 1}</i>
            {label}
          </span>
        ))}
      </div>
      {step === 1 && (
        <>
          <div
            className={`import-dropzone ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void readFile(e.dataTransfer.files[0]);
            }}
          >
            <span className="import-upload-icon">
              <FileUp size={27} />
            </span>
            <strong>Platz für Ihren echten Bürogrundriss.</strong>
            <p>PNG, JPG, WebP oder mehrseitige PDF · bis 25 MB</p>
            <Button variant="outline" onClick={() => input.current?.click()} disabled={busy}>
              Datei auswählen
            </Button>
            <span>oder eine Datei hierher ziehen</span>
            <input
              ref={input}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf"
              aria-label="Grundrissdatei"
              className="sr-only"
              onChange={(e) => {
                void readFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          {fileName && (
            <div className="import-file">
              <FileImage size={20} />
              <div>
                <strong>{fileName}</strong>
                <span>{pages > 1 ? `${pages} Seiten · ` : ''}Ausschließlich lokal verarbeitet</span>
              </div>
              {busy && <LoaderCircle className="spin" size={18} />}
            </div>
          )}
          {pages > 1 && (
            <label className="pdf-page-select">
              PDF-Seite
              <select
                aria-label="PDF-Seite"
                value={page}
                disabled={busy}
                onChange={(e) => void changePage(Number(e.target.value))}
              >
                {Array.from({ length: pages }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Seite {i + 1} von {pages}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}
      {step === 2 && (
        <div className="import-options">
          <label>
            Importziel
            <select
              aria-label="Importziel"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                fit();
              }}
            >
              <option value="new">Neuen Bürobereich anlegen</option>
              <option value="replace">Hintergrund von „{currentRoom.name}“ ersetzen</option>
            </select>
          </label>
          {destination === 'new' && (
            <label>
              Name des Bürobereichs
              <input
                aria-label="Name des Bürobereichs"
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}
          <div className="import-align-tools">
            <Button
              variant="outline"
              onClick={() => {
                setRotation((r) => (r + 90) % 360);
                fit();
              }}
            >
              <RotateCw size={15} />
              90° drehen
            </Button>
            <Button variant="outline" onClick={fit}>
              <Scan size={15} />
              Bild einpassen
            </Button>
            <label>
              Ausrichtung
              <select
                aria-label="Hintergrund ausrichten"
                value=""
                onChange={(e) => {
                  const ext = swap ? placement.height : placement.width;
                  setOffset((o) => ({
                    ...o,
                    x:
                      e.target.value === 'left'
                        ? (ext - dimensions.width) / 2
                        : e.target.value === 'right'
                          ? (dimensions.width - ext) / 2
                          : 0,
                    y: 0,
                  }));
                }}
              >
                <option value="" disabled>
                  Ausrichten …
                </option>
                <option value="left">Linksbündig</option>
                <option value="center">Zentriert</option>
                <option value="right">Rechtsbündig</option>
              </select>
            </label>
          </div>
          <label>
            Bildgröße: {scale} %
            <input
              type="range"
              aria-label="Bildgröße"
              min={25}
              max={200}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
            />
          </label>
          <p className="muted">
            {destination === 'replace'
              ? 'Alle Arbeitsplätze, Positionen und Buchungen bleiben erhalten. Die vorhandenen Planabmessungen werden übernommen.'
              : 'Der neue Bürobereich startet ohne Möbel. Arbeitsplätze und Räume fügen Sie anschließend im Editor hinzu.'}{' '}
            Den Hintergrund können Sie in der Vorschau auch mit der Maus ausrichten.
          </p>
        </div>
      )}
      {preview && !busy && (
        <div className="import-preview" aria-label="Grundrissvorschau">
          <div
            className="import-preview-surface"
            style={{
              aspectRatio: `${dimensions.width}/${dimensions.height}`,
              width: `min(100%, ${(dimensions.width / dimensions.height) * 300}px)`,
            }}
            onPointerDown={(e) => {
              if (step !== 2) return;
              const element = e.currentTarget;
              element.setPointerCapture(e.pointerId);
              const bounds = element.getBoundingClientRect();
              const initial = { clientX: e.clientX, clientY: e.clientY, ...offset };
              const move = (event: PointerEvent) =>
                setOffset({
                  x: initial.x + ((event.clientX - initial.clientX) / bounds.width) * dimensions.width,
                  y: initial.y + ((event.clientY - initial.clientY) / bounds.height) * dimensions.height,
                });
              const end = () => {
                element.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', end);
              };
              element.addEventListener('pointermove', move);
              window.addEventListener('pointerup', end, { once: true });
            }}
          >
            <img
              alt={`Vorschau ${fileName}${pages > 1 ? `, Seite ${page}` : ''}`}
              src={url}
              draggable={false}
              style={{
                position: 'absolute',
                left: `${(placement.x / dimensions.width) * 100}%`,
                top: `${(placement.y / dimensions.height) * 100}%`,
                width: `${(placement.width / dimensions.width) * 100}%`,
                height: `${(placement.height / dimensions.height) * 100}%`,
                maxWidth: 'none',
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              }}
            />
          </div>
          <span>
            {preview.width} × {preview.height} Pixel{pages > 1 ? ` · Seite ${page}` : ''} · {rotation}°
          </span>
        </div>
      )}
      {step === 3 && (
        <div className="import-confirm">
          <span>
            <ShieldCheck size={25} />
          </span>
          <div>
            <strong>{destination === 'new' ? name : currentRoom.name}</strong>
            <p>
              {destination === 'new'
                ? 'Ein neuer Bürobereich wird angelegt.'
                : 'Nur der Hintergrund wird ersetzt. Alle Buchungen und Objekte bleiben erhalten.'}
            </p>
            <p>
              {Math.round(dimensions.width)} × {Math.round(dimensions.height)} Planeinheiten · {rotation}° ·{' '}
              {scale} %
            </p>
          </div>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="import-footer">
        <span>
          <HardDrive size={14} />
          Lokale Verarbeitung & Speicherung
        </span>
        <div>
          <Button
            variant="ghost"
            disabled={saving}
            onClick={() => (step === 1 ? onClose() : setStep((s) => s - 1))}
          >
            {step === 1 ? (
              'Abbrechen'
            ) : (
              <>
                <ArrowLeft size={14} />
                Zurück
              </>
            )}
          </Button>
          {step < 3 ? (
            <Button
              disabled={busy || !preview || !name.trim()}
              onClick={() => {
                setError('');
                setStep((s) => s + 1);
              }}
            >
              Weiter
              <ArrowRight size={14} />
            </Button>
          ) : (
            <Button disabled={saving} onClick={() => void finish()}>
              {saving ? (
                <>
                  <LoaderCircle size={14} className="spin" />
                  Speichern …
                </>
              ) : (
                <>
                  <Check size={14} />
                  Importieren und speichern
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
