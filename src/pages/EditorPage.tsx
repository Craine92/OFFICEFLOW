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
  Users,
} from 'lucide-react';
import { FloorPlan } from '../components/FloorPlan';
import { Button } from '../components/ui/button';
import { useOfficeStore } from '../store/useOfficeStore';
import type { ObjectKind, OfficeRoom, PlanObject } from '../domain/types';
import { constrainObject } from '../domain/layout';

export function EditorPage({
  notify,
  onDirty,
}: {
  notify: (message: string) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const { data, roomId, setRoom, saveRoom, date } = useOfficeStore();
  const [draft, setDraft] = useState<OfficeRoom | null>(null);
  const [selected, setSelected] = useState<string>();
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const room = useOfficeStore.getState().data?.rooms.find((r) => r.id === roomId);
    if (room) {
      setDraft(structuredClone(room));
      setSelected(undefined);
      setDirty(false);
    }
  }, [roomId]);
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
  if (!data || !draft) return null;
  const object = draft.objects.find((o) => o.id === selected);
  function update(patch: Partial<PlanObject>) {
    setDraft((d) =>
      d
        ? {
            ...d,
            objects: d.objects.map((o) => (o.id === selected ? constrainObject({ ...o, ...patch }) : o)),
          }
        : d,
    );
    setDirty(true);
  }
  function move(id: string, x: number, y: number) {
    setDraft((d) =>
      d ? { ...d, objects: d.objects.map((o) => (o.id === id ? constrainObject({ ...o, x, y }) : o)) } : d,
    );
    setDirty(true);
  }
  function add(kind: ObjectKind) {
    if (!draft) return;
    const dimensions =
      kind === 'meeting'
        ? [190, 150]
        : kind === 'lounge'
          ? [180, 64]
          : kind === 'plant'
            ? [28, 28]
            : [76, 44];
    const positions = [];
    for (let y = 50 + dimensions[1] / 2; y <= 516 - dimensions[1] / 2; y += 10) {
      for (let x = 48 + dimensions[0] / 2; x <= 852 - dimensions[0] / 2; x += 10) positions.push({ x, y });
    }
    const position = positions.find((p) =>
      draft.objects.every(
        (o) =>
          Math.abs(o.x - p.x) >= (o.width + dimensions[0]) / 2 + 10 ||
          Math.abs(o.y - p.y) >= (o.height + dimensions[1]) / 2 + 22,
      ),
    );
    if (!position) {
      notify(
        'Für dieses Objekt ist kein freier Bereich vorhanden. Verschieben Sie zunächst bestehende Objekte.',
      );
      return;
    }
    const id = crypto.randomUUID();
    const count = draft.objects.filter((o) => o.kind === kind).length + 1;
    const name =
      kind === 'desk'
        ? `AP-${String(count).padStart(2, '0')}`
        : kind === 'meeting'
          ? `Meetingraum ${count}`
          : kind === 'lounge'
            ? 'Lounge'
            : 'Pflanze';
    setDraft({
      ...draft,
      objects: [
        ...draft.objects,
        {
          id,
          kind,
          name,
          ...position,
          width: dimensions[0],
          height: dimensions[1],
          rotation: 0,
          ...(kind === 'meeting'
            ? { capacity: 4, equipment: ['Bildschirm'] }
            : kind === 'desk'
              ? { equipment: ['Monitor', 'Dockingstation'] }
              : {}),
        },
      ],
    });
    setSelected(id);
    setDirty(true);
  }
  async function save() {
    if (!draft) return;
    if (draft.objects.some((o) => !o.name.trim())) {
      notify('Bitte geben Sie allen Objekten eine Bezeichnung.');
      return;
    }
    const labels = draft.objects
      .filter((o) => ['desk', 'meeting'].includes(o.kind))
      .map((o) => o.name.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) {
      notify('Buchbare Objekte benötigen eindeutige Bezeichnungen.');
      return;
    }
    setSaving(true);
    try {
      await saveRoom({ ...draft, objects: draft.objects.map((o) => ({ ...o, name: o.name.trim() })) });
      setDirty(false);
      notify('Der Grundriss wurde lokal gespeichert.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  function discard() {
    if (dirty && !window.confirm('Alle ungespeicherten Änderungen an diesem Grundriss verwerfen?')) return;
    setDraft(structuredClone(data!.rooms.find((r) => r.id === roomId)!));
    setDirty(false);
    setSelected(undefined);
  }
  function remove() {
    if (data!.bookings.some((b) => b.objectId === selected)) {
      notify('Dieses Objekt hat Buchungen. Stornieren Sie diese zuerst unter „Buchungen“.');
      return;
    }
    setDraft((d) => (d ? { ...d, objects: d.objects.filter((o) => o.id !== selected) } : d));
    setSelected(undefined);
    setDirty(true);
  }
  return (
    <>
      <div className="editor-notice">
        <span>
          <MousePointer2 size={18} />
          <strong>Sie sind im Raumeditor.</strong> Objekte verschieben, drehen und an Ihre Arbeitswelt
          anpassen.
        </span>
        <span className={`badge ${dirty ? 'badge-reserved' : 'badge-available'}`}>
          <i />
          {dirty ? 'Ungespeicherte Änderungen' : 'Alle Änderungen gespeichert'}
        </span>
      </div>
      <div className="editor-grid">
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
              <Button variant="ghost" disabled={!dirty || saving} onClick={discard}>
                <Undo2 size={15} />
                Verwerfen
              </Button>
              <Button disabled={!dirty || saving} onClick={() => void save()}>
                <Save size={15} />
                {saving ? 'Speichern …' : 'Grundriss speichern'}
              </Button>
            </div>
          </div>
          <FloorPlan
            room={draft}
            bookings={data.bookings}
            date={date}
            editor
            selectedId={selected}
            onSelect={(o) => setSelected(o.id)}
            onMove={move}
          />
          <div className="editor-plan-foot">
            <Check size={14} />
            Änderungen werden erst nach dem Speichern in der Benutzeransicht angezeigt.
          </div>
        </section>
        <aside className="editor-aside">
          <section className="panel">
            <h3>Raum gestalten</h3>
            <p className="muted">Fügen Sie Ihrem Grundriss Objekte hinzu.</p>
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
                value={selected ?? ''}
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
                    maxLength={32}
                    value={object.name}
                    onChange={(e) => update({ name: e.target.value })}
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Position X
                    <input
                      type="number"
                      min={90}
                      max={810}
                      step={5}
                      value={object.x}
                      onChange={(e) => update({ x: Math.max(90, Math.min(810, Number(e.target.value))) })}
                    />
                  </label>
                  <label>
                    Position Y
                    <input
                      type="number"
                      min={85}
                      max={475}
                      step={5}
                      value={object.y}
                      onChange={(e) => update({ y: Math.max(85, Math.min(475, Number(e.target.value))) })}
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
                      max={30}
                      value={object.capacity ?? 4}
                      onChange={(e) =>
                        update({ capacity: Math.max(1, Math.min(30, Number(e.target.value))) })
                      }
                    />
                  </label>
                )}
                {['desk', 'meeting'].includes(object.kind) && (
                  <label>
                    Ausstattung<span className="muted field-hint">Mit Komma trennen</span>
                    <input
                      value={(object.equipment ?? []).join(', ')}
                      onChange={(e) =>
                        update({ equipment: e.target.value.split(',').map((v) => v.trimStart()) })
                      }
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
        </aside>
      </div>
    </>
  );
}
