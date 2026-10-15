import { useEffect, useState } from 'react';
import {
  Armchair,
  Check,
  Leaf,
  MousePointer2,
  Plus,
  RotateCw,
  Save,
  Sofa,
  Trash2,
  Undo2,
  Redo2,
  Users,
  FileUp,
  Grid2X2,
  AlertTriangle,
  Scan,
} from 'lucide-react';
import { FloorPlan } from '../components/FloorPlan';
import { ImportWizard } from '../components/ImportWizard';
import { Button } from '../components/ui/button';
import { useOfficeStore } from '../store/useOfficeStore';
import type { ObjectKind, OfficeRoom, PlanObject } from '../domain/types';
import {
  collisions,
  constrainObject,
  fitBackground,
  nextObjectName,
  objectFits,
  objectsOverlap,
  planBounds,
  resizeRoom,
  validateRoom,
} from '../domain/layout';
import { useEditorHistory } from '../hooks/useEditorHistory';
import { planAssets } from '../data/assets';

export function EditorPage({
  notify,
  onDirty,
}: {
  notify: (message: string) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const { data, roomId, setRoom, saveRoom, date, timeStart, timeEnd } = useOfficeStore();
  const { draft, dirty, reset, apply, undo, redo, canUndo, canRedo } = useEditorHistory();
  const [selected, setSelected] = useState<string>();
  const [saving, setSaving] = useState(false),
    [importOpen, setImportOpen] = useState(false);
  const [grid, setGrid] = useState(true),
    [snap, setSnap] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 900, height: 570 });
  useEffect(() => {
    if (draft) setDimensions({ width: draft.width, height: draft.height });
  }, [draft?.width, draft?.height]);
  useEffect(() => {
    const room = useOfficeStore.getState().data?.rooms.find((r) => r.id === roomId);
    if (room) {
      reset(room);
      setDimensions({ width: room.width, height: room.height });
      setSelected(undefined);
    }
  }, [roomId, reset]);
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        saving ||
        importOpen ||
        (e.target instanceof HTMLElement &&
          (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable))
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [undo, redo, importOpen, saving]);
  if (!data || !draft) return null;
  const object = draft.objects.find((o) => o.id === selected);
  const overlapping = collisions(draft.objects),
    collisionIds = [...new Set(overlapping.flat())];
  const invalid = validateRoom(draft, data.rooms);
  function update(patch: Partial<PlanObject>) {
    apply((d) => ({
      ...d,
      objects: d.objects.map((o) => (o.id === selected ? constrainObject({ ...o, ...patch }, d) : o)),
    }));
  }
  function move(id: string, x: number, y: number) {
    apply((d) => ({
      ...d,
      objects: d.objects.map((o) => (o.id === id ? constrainObject({ ...o, x, y }, d) : o)),
    }));
    setSelected(id);
  }
  function add(kind: ObjectKind) {
    const bounds = planBounds(draft!);
    const original =
      kind === 'meeting'
        ? [190, 150]
        : kind === 'lounge'
          ? [180, 64]
          : kind === 'plant'
            ? [28, 28]
            : [76, 44];
    const factor = Math.min(
      1,
      (bounds.right - bounds.left - 12) / original[0],
      (bounds.bottom - bounds.top - 12) / original[1],
    );
    const width = Math.round(original[0] * factor),
      height = Math.round(original[1] * factor);
    const allObjects = [
      ...data!.rooms.filter((r) => r.id !== draft!.id).flatMap((r) => r.objects),
      ...draft!.objects,
    ];
    const candidate: PlanObject = {
      id: crypto.randomUUID(),
      kind,
      name: nextObjectName(kind, allObjects),
      x: 0,
      y: 0,
      width,
      height,
      rotation: 0,
      ...(kind === 'meeting'
        ? { capacity: 4, equipment: ['Bildschirm'] }
        : kind === 'desk'
          ? { equipment: ['Monitor', 'Dockingstation'] }
          : {}),
    };
    let position: PlanObject | undefined;
    search: for (let y = bounds.top + height / 2 + 5; y <= bounds.bottom - height / 2; y += 10)
      for (let x = bounds.left + width / 2 + 5; x <= bounds.right - width / 2; x += 10) {
        const next = { ...candidate, x, y };
        if (
          objectFits(next, draft!) &&
          draft!.objects.every(
            (o) => !objectsOverlap({ ...next, width: next.width + 8, height: next.height + 8 }, o),
          )
        ) {
          position = next;
          break search;
        }
      }
    if (!position) {
      notify(
        'Für dieses Objekt ist kein freier Bereich vorhanden. Verschieben oder verkleinern Sie zunächst bestehende Objekte.',
      );
      return;
    }
    apply((d) => ({ ...d, objects: [...d.objects, position!] }));
    setSelected(candidate.id);
  }
  async function save() {
    if (!draft) return;
    const error = validateRoom(draft, data!.rooms);
    if (error) {
      notify(error);
      return;
    }
    if (
      overlapping.length &&
      !window.confirm(
        `${overlapping.length} Objektüberschneidung(en) erkannt. Möchten Sie diese Anordnung bewusst speichern?`,
      )
    )
      return;
    setSaving(true);
    try {
      const room = {
        ...draft,
        name: draft.name.trim(),
        objects: draft.objects.map((o) => ({
          ...o,
          name: o.name.trim(),
          equipment: o.equipment?.map((v) => v.trim()).filter(Boolean),
        })),
      };
      await saveRoom(room);
      reset(room);
      notify('Der Grundriss wurde lokal gespeichert.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  function discard() {
    if (dirty && !window.confirm('Alle ungespeicherten Änderungen an diesem Grundriss verwerfen?')) return;
    const persisted = data!.rooms.find((r) => r.id === roomId)!;
    reset(persisted);
    setDimensions({ width: persisted.width, height: persisted.height });
    setSelected(undefined);
  }
  function remove() {
    if (data!.bookings.some((b) => b.objectId === selected)) {
      notify('Dieses Objekt hat Buchungen. Stornieren Sie diese zuerst unter „Buchungen“.');
      return;
    }
    apply((d) => ({ ...d, objects: d.objects.filter((o) => o.id !== selected) }));
    setSelected(undefined);
  }
  async function fitImage() {
    if (!draft?.background) return;
    try {
      const asset = await planAssets.get(draft.background.assetId);
      if (!asset) throw new Error('Die Hintergrunddatei fehlt. Bitte importieren Sie sie erneut.');
      const placement = fitBackground(asset, draft, draft.background.rotation);
      apply((d) => ({ ...d, background: { ...d.background!, ...placement } }));
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <div className="editor-notice">
        <span>
          <MousePointer2 size={18} />
          <strong>Ihr Büro, Ihre Möglichkeiten.</strong> Plan importieren, Arbeitsplätze einrichten und
          gemeinsam nutzen.
        </span>
        <span className={`badge ${dirty ? 'badge-reserved' : 'badge-available'}`}>
          <i />
          {dirty ? 'Ungespeicherte Änderungen' : 'Alle Änderungen gespeichert'}
        </span>
      </div>
      <fieldset className="editor-grid editor-fieldset" disabled={saving}>
        <section className="panel editor-plan">
          <div className="editor-toolbar">
            <select
              aria-label="Grundriss zum Bearbeiten auswählen"
              value={roomId}
              onChange={(e) => {
                if (
                  !dirty ||
                  window.confirm('Ungespeicherte Änderungen verwerfen und den Bürobereich wechseln?')
                )
                  setRoom(e.target.value);
              }}
            >
              {data.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <div>
              <Button
                variant="outline"
                onClick={() => {
                  if (dirty) {
                    notify('Bitte speichern oder verwerfen Sie zuerst Ihre Änderungen.');
                    return;
                  }
                  setImportOpen(true);
                }}
              >
                <FileUp size={15} />
                Grundriss importieren
              </Button>
              <Button variant="ghost" disabled={!dirty} onClick={discard}>
                Verwerfen
              </Button>
              <Button disabled={!dirty || !!invalid} onClick={() => void save()}>
                <Save size={15} />
                {saving ? 'Speichern …' : 'Grundriss speichern'}
              </Button>
            </div>
          </div>
          <div className="editor-tools">
            <div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Änderung rückgängig machen"
                title="Rückgängig (Strg+Z)"
                disabled={!canUndo}
                onClick={undo}
              >
                <Undo2 size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Änderung wiederholen"
                title="Wiederholen (Strg+Umschalt+Z)"
                disabled={!canRedo}
                onClick={redo}
              >
                <Redo2 size={16} />
              </Button>
              <span className="muted">
                {draft.width} × {draft.height} Einheiten
              </span>
            </div>
            <div>
              <label className="checkbox-label">
                <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} />
                <Grid2X2 size={13} />
                Raster
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
                Einrasten
              </label>
            </div>
          </div>
          <FloorPlan
            room={draft}
            bookings={data.bookings}
            date={date}
            timeStart={timeStart}
            timeEnd={timeEnd}
            editor
            selectedId={selected}
            onSelect={(o) => setSelected(o.id)}
            onMove={move}
            grid={grid}
            snap={snap}
            collisionIds={collisionIds}
          />
          {overlapping.length > 0 && (
            <div className="collision-notice" role="status">
              <AlertTriangle size={16} />
              <div>
                <strong>{overlapping.length} Objektüberschneidung(en)</strong>
                <span>
                  {overlapping
                    .slice(0, 3)
                    .map((pair) => pair.map((id) => draft.objects.find((o) => o.id === id)?.name).join(' / '))
                    .join(' · ')}
                  {overlapping.length > 3 ? ' …' : ''}
                </span>
              </div>
            </div>
          )}
          {invalid && (
            <p className="form-error" role="alert">
              {invalid}
            </p>
          )}
          <div className="editor-plan-foot">
            <Check size={14} />
            {dirty ? 'Ihr Entwurf ist noch nicht gespeichert.' : 'Dieser Stand ist lokal gespeichert.'}{' '}
            Buchungen bleiben beim Bearbeiten erhalten.
          </div>
        </section>
        <aside className="editor-aside">
          <section className="panel">
            <h3>Raum gestalten</h3>
            <p className="muted">Möbel über Ihrem Grundriss platzieren.</p>
            <div className="object-palette">
              {(
                [
                  { kind: 'desk', label: 'Arbeitsplatz', Icon: Armchair },
                  { kind: 'meeting', label: 'Meetingraum', Icon: Users },
                  { kind: 'lounge', label: 'Lounge', Icon: Sofa },
                  { kind: 'plant', label: 'Pflanze', Icon: Leaf },
                ] as const
              ).map(({ kind, label, Icon }) => (
                <button key={kind} onClick={() => add(kind)}>
                  <Icon size={24} />
                  <span>{label}</span>
                  <Plus size={13} />
                </button>
              ))}
            </div>
          </section>
          <section className="panel object-properties">
            <h3>{object ? 'Objekteigenschaften' : 'Ihre Auswahl'}</h3>
            <label>
              Objekt auswählen
              <select
                aria-label="Objekt zum Bearbeiten auswählen"
                value={object?.id ?? ''}
                onChange={(e) => setSelected(e.target.value || undefined)}
              >
                <option value="">Im Grundriss auswählen …</option>
                {draft.objects.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            {object ? (
              <>
                <label>
                  Bezeichnung
                  <input
                    maxLength={50}
                    value={object.name}
                    onChange={(e) => update({ name: e.target.value })}
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Position X
                    <input
                      type="number"
                      min={0}
                      max={draft.width}
                      step={snap ? 5 : 1}
                      value={Math.round(object.x * 100) / 100}
                      onChange={(e) => update({ x: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    Position Y
                    <input
                      type="number"
                      min={0}
                      max={draft.height}
                      step={snap ? 5 : 1}
                      value={Math.round(object.y * 100) / 100}
                      onChange={(e) => update({ y: Number(e.target.value) })}
                    />
                  </label>
                </div>
                <div className="form-grid">
                  <label>
                    Objektbreite
                    <input
                      type="number"
                      min={12}
                      max={draft.width - 16}
                      value={object.width}
                      onChange={(e) =>
                        update({ width: Math.max(12, Math.min(draft.width - 16, Number(e.target.value))) })
                      }
                    />
                  </label>
                  <label>
                    Objekthöhe
                    <input
                      type="number"
                      min={12}
                      max={draft.height - 16}
                      value={object.height}
                      onChange={(e) =>
                        update({ height: Math.max(12, Math.min(draft.height - 16, Number(e.target.value))) })
                      }
                    />
                  </label>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => update({ rotation: (object.rotation + 90) % 360 })}
                >
                  <RotateCw size={15} />
                  Um 90° drehen<span className="muted">{object.rotation}°</span>
                </Button>
                {object.kind === 'meeting' && (
                  <label>
                    Kapazität (Personen)
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={object.capacity ?? 4}
                      onChange={(e) =>
                        update({ capacity: Math.max(1, Math.min(100, Number(e.target.value))) })
                      }
                    />
                  </label>
                )}
                {['desk', 'meeting'].includes(object.kind) && (
                  <label>
                    Ausstattung<span className="muted field-hint">Mit Komma trennen</span>
                    <input
                      value={(object.equipment ?? []).join(',')}
                      onChange={(e) => update({ equipment: e.target.value.split(',') })}
                    />
                  </label>
                )}
                <Button variant="ghost" className="delete-object" onClick={remove}>
                  <Trash2 size={15} />
                  Objekt entfernen
                </Button>
              </>
            ) : (
              <div className="property-empty">
                <MousePointer2 size={28} />
                <p>Wählen Sie ein Objekt im Grundriss aus, um es zu bearbeiten.</p>
              </div>
            )}
          </section>
          <section className="panel object-properties">
            <h3>Plan & Hintergrund</h3>
            <label>
              Bürobereich benennen
              <input
                aria-label="Bürobereich benennen"
                maxLength={50}
                value={draft.name}
                onChange={(e) => apply((d) => ({ ...d, name: e.target.value }))}
              />
            </label>
            <div className="form-grid">
              <label>
                Planbreite
                <input
                  aria-label="Planbreite"
                  type="number"
                  min={160}
                  max={6000}
                  value={dimensions.width}
                  onChange={(e) => setDimensions((d) => ({ ...d, width: Number(e.target.value) }))}
                />
              </label>
              <label>
                Planhöhe
                <input
                  aria-label="Planhöhe"
                  type="number"
                  min={160}
                  max={6000}
                  value={dimensions.height}
                  onChange={(e) => setDimensions((d) => ({ ...d, height: Number(e.target.value) }))}
                />
              </label>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (![dimensions.width, dimensions.height].every((n) => n >= 160 && n <= 6000)) {
                  notify('Planabmessungen müssen zwischen 160 und 6000 Einheiten liegen.');
                  return;
                }
                const next = resizeRoom(draft, dimensions.width, dimensions.height);
                const error = validateRoom(next);
                if (error) {
                  notify(error);
                  return;
                }
                apply(() => next);
              }}
            >
              <Scan size={15} />
              Planabmessungen übernehmen
            </Button>
            <p className="muted">
              Positionen werden proportional angepasst. Möbel behalten ihre Größe in Planeinheiten.
            </p>
            {draft.background && (
              <>
                <div className="background-file-label">
                  <FileUp size={15} />
                  <span>
                    {draft.background.name}
                    {draft.background.page ? ` · Seite ${draft.background.page}` : ''}
                  </span>
                </div>
                <Button variant="outline" onClick={() => void fitImage()}>
                  <Scan size={15} />
                  Hintergrund einpassen
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    apply((d) => ({
                      ...d,
                      background: { ...d.background!, rotation: (d.background!.rotation + 90) % 360 },
                    }))
                  }
                >
                  <RotateCw size={15} />
                  Hintergrund 90° drehen
                </Button>
                <div className="form-grid">
                  <label>
                    Hintergrund X
                    <input
                      type="number"
                      value={Math.round(draft.background.x)}
                      onChange={(e) =>
                        apply((d) => ({ ...d, background: { ...d.background!, x: Number(e.target.value) } }))
                      }
                    />
                  </label>
                  <label>
                    Hintergrund Y
                    <input
                      type="number"
                      value={Math.round(draft.background.y)}
                      onChange={(e) =>
                        apply((d) => ({ ...d, background: { ...d.background!, y: Number(e.target.value) } }))
                      }
                    />
                  </label>
                </div>
                <label>
                  Deckkraft: {Math.round(draft.background.opacity * 100)} %
                  <input
                    aria-label="Hintergrund-Deckkraft"
                    type="range"
                    min={10}
                    max={100}
                    value={Math.round(draft.background.opacity * 100)}
                    onChange={(e) =>
                      apply((d) => ({
                        ...d,
                        background: { ...d.background!, opacity: Number(e.target.value) / 100 },
                      }))
                    }
                  />
                </label>
                <Button
                  variant="ghost"
                  className="delete-object"
                  onClick={() => apply((d) => ({ ...d, background: undefined }))}
                >
                  Hintergrund ausblenden
                </Button>
              </>
            )}
          </section>
        </aside>
      </fieldset>
      <ImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        currentRoom={data.rooms.find((r) => r.id === roomId)!}
        onImported={(room: OfficeRoom) => {
          reset(room);
          setRoom(room.id);
          setDimensions({ width: room.width, height: room.height });
          setSelected(undefined);
          notify('Ihr Grundriss wurde importiert und lokal gespeichert.');
        }}
      />
    </>
  );
}
