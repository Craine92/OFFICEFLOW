import { useEffect, useState, useRef } from 'react';
import {
  MousePointer2,
  Hand,
  Square,
  DoorOpen,
  PanelTop,
  Type,
  Ruler,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Save,
  FileUp,
  Layers,
  Grid2X2,
  Magnet,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Armchair,
  Building2,
  Group as GroupIcon,
  Ungroup,
  ArrowUpToLine,
  ArrowDownToLine,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  RotateCw,
  Check,
  Plus,
  Scan,
  CircleHelp,
  ArrowRight,
} from 'lucide-react';
import { CatalogPanel } from '../components/editor/CatalogPanel';
import { FloorPlan } from '../components/FloorPlan';
import { ImportWizard } from '../components/ImportWizard';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { useOfficeStore } from '../store/useOfficeStore';
import { useEditorHistory } from '../hooks/useEditorHistory';
import { CATALOG, addCatalogItem, type CatalogItem } from '../domain/catalog';
import {
  LAYER_IDS,
  LAYER_NAMES,
  elementGeometry,
  getElement,
  selectedElement,
  expandGroups,
  updateGeometry,
  translateElements,
  removeElements,
  setElementGroup,
  reorderElements,
  orthogonalEnd,
  findWall,
  clampOpening,
  elementLayer,
  isElementEditable,
  formatLength,
  distance,
  emptyDesign,
} from '../domain/design';
import {
  duplicateElements,
  pasteElements,
  alignElements,
  designIssues,
  connectWallEndpoint,
} from '../domain/editor';
import { fitBackground, resizeRoom, validateRoom } from '../domain/layout';
import type { EditorTool, ElementGeometry, OfficeRoom, Point, WallOpening } from '../domain/types';
import { planAssets } from '../data/assets';
const TOOLS: { id: EditorTool; name: string; Icon: typeof MousePointer2 }[] = [
  { id: 'select', name: 'Auswahl', Icon: MousePointer2 },
  { id: 'pan', name: 'Verschieben', Icon: Hand },
  { id: 'wall', name: 'Wand zeichnen', Icon: PanelTop },
  { id: 'zone', name: 'Raumzone zeichnen', Icon: Square },
  { id: 'door', name: 'Tür einsetzen', Icon: DoorOpen },
  { id: 'double-door', name: 'Doppeltür einsetzen', Icon: DoorOpen },
  { id: 'sliding-door', name: 'Schiebetür einsetzen', Icon: DoorOpen },
  { id: 'window', name: 'Fenster einsetzen', Icon: PanelTop },
  { id: 'label', name: 'Beschriftung', Icon: Type },
  { id: 'measure', name: 'Maßband', Icon: Ruler },
  { id: 'calibrate', name: 'Maßstab kalibrieren', Icon: Scan },
];
const HELP: Record<EditorTool, string> = {
  select: 'Auswählen oder einen Auswahlrahmen ziehen. Umschalt ergänzt die Auswahl.',
  pan: 'Ziehen Sie den Plan. Auch mit gedrückter Leertaste möglich.',
  wall: 'Start- und Endpunkt anklicken. Die Wand wird rechtwinklig gezeichnet.',
  zone: 'Zwei gegenüberliegende Ecken der Raumfläche anklicken.',
  door: 'Auf eine Wand klicken, um eine Tür einzusetzen.',
  'double-door': 'Auf eine Wand klicken, um eine Doppeltür einzusetzen.',
  'sliding-door': 'Auf eine Wand klicken, um eine Schiebetür einzusetzen.',
  window: 'Auf eine Wand klicken, um ein Fenster einzusetzen.',
  label: 'Auf den Plan klicken. Den Text anschließend rechts bearbeiten.',
  measure: 'Zwei Punkte anklicken, um eine Maßlinie zu erstellen.',
  calibrate: 'Die beiden Endpunkte einer bekannten Strecke anklicken.',
};
export function EditorPage({
  notify,
  onDirty,
}: {
  notify: (s: string) => void;
  onDirty: (v: boolean) => void;
}) {
  const { data, roomId, setRoom, saveRoom, addRoom, date, timeStart, timeEnd } = useOfficeStore();
  const { draft, dirty, reset, apply, undo, redo, canUndo, canRedo } = useEditorHistory();
  const [selected, setSelected] = useState<string[]>([]),
    [tool, setTool] = useState<EditorTool>('select'),
    [start, setStart] = useState<Point>(),
    [grid, setGrid] = useState(true),
    [snap, setSnap] = useState(true),
    [saving, setSaving] = useState(false),
    [importOpen, setImportOpen] = useState(false),
    [preview, setPreview] = useState(false),
    [tab, setTab] = useState<'catalog' | 'properties' | 'layers' | 'plan'>('properties'),
    [category, setCategory] = useState('Alle'),
    [context, setContext] = useState(false),
    [calibration, setCalibration] = useState<{ start: Point; end: Point }>(),
    [meters, setMeters] = useState('5'),
    [newOpen, setNewOpen] = useState(false),
    [newName, setNewName] = useState('Neue Büroetage'),
    [tourOpen, setTourOpen] = useState(false);
  const clipboard = useRef<{ room: OfficeRoom; ids: string[] } | undefined>(undefined);
  useEffect(() => {
    const r = useOfficeStore.getState().data?.rooms.find((r) => r.id === roomId);
    if (r) {
      reset(r);
      setSelected([]);
      setStart(undefined);
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
  function select(ids: string[], add = false) {
    if (!draft) return;
    const expanded = expandGroups(draft, ids).filter((id) => isElementEditable(draft, id));
    setSelected(add ? [...new Set([...selected, ...expanded])] : expanded);
    if (expanded.length) setTab('properties');
  }
  function changeGeometry(id: string, patch: Partial<ElementGeometry>) {
    apply((d) => updateGeometry(d, id, patch));
  }
  function move(id: string, x: number, y: number) {
    if (!draft) return;
    const g = elementGeometry(draft, id)!;
    const ids = selected.includes(id) ? selected : [id];
    apply((d) => translateElements(d, ids, x - g.x, y - g.y));
    setSelected(ids);
  }
  function remove() {
    if (data?.bookings.some((b) => selected.includes(b.objectId))) {
      notify('Dieses Objekt hat Buchungen. Stornieren Sie diese zuerst unter „Buchungen“.');
      return;
    }
    apply((d) => removeElements(d, selected));
    setSelected([]);
    setContext(false);
  }
  const foreign = data?.rooms.filter((r) => r.id !== roomId).flatMap((r) => r.objects) ?? [];
  function duplicate() {
    if (!draft || !selected.length) return;
    const result = duplicateElements(draft, selected, foreign);
    apply(() => result.room);
    setSelected(result.ids);
    setContext(false);
  }
  function paste() {
    if (!draft || !clipboard.current) return;
    const result = pasteElements(draft, clipboard.current.room, clipboard.current.ids, foreign);
    apply(() => result.room);
    setSelected(result.ids);
  }
  function add(item: CatalogItem) {
    if (!draft) return;
    const layer = item.type === 'cluster' ? 'resources' : elementLayer(item.type);
    if (!draft.layers[layer].visible || draft.layers[layer].locked) {
      notify('Blenden Sie die zugehörige Ebene ein und entsperren Sie sie zuerst.');
      return;
    }
    const result = addCatalogItem(draft, item, foreign);
    apply(() => result.room);
    setSelected(result.ids);
    setTab('properties');
    setTool('select');
  }
  async function save() {
    if (!draft || !data) return;
    const invalid = validateRoom(draft, data.rooms),
      issues = designIssues(draft);
    if (invalid || issues.some((i) => i.severity === 'error')) {
      notify(invalid ?? issues.find((i) => i.severity === 'error')!.message);
      return;
    }
    if (
      issues.length &&
      !window.confirm(`${issues.length} mögliche Überschneidung(en). Diese Anordnung bewusst speichern?`)
    )
      return;
    setSaving(true);
    try {
      await saveRoom(draft);
      reset(draft);
      notify('Der Grundriss wurde lokal gespeichert.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  function discard() {
    if (!dirty || window.confirm('Alle ungespeicherten Änderungen an diesem Grundriss verwerfen?')) {
      reset(data!.rooms.find((r) => r.id === roomId)!);
      setSelected([]);
      setStart(undefined);
    }
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        saving ||
        importOpen ||
        calibration ||
        newOpen ||
        preview ||
        (e.target instanceof HTMLElement &&
          (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable))
      )
        return;
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (ctrl && ['z', 'y', 'd', 'c', 'v', 's', 'a'].includes(k)) {
        e.preventDefault();
        if (k === 'z') e.shiftKey ? redo() : undo();
        if (k === 'y') redo();
        if (k === 'd') duplicate();
        if (k === 'c' && draft) clipboard.current = { room: structuredClone(draft), ids: selected };
        if (k === 'v') paste();
        if (k === 's') void save();
        if (k === 'a' && draft)
          select([...draft.objects, ...draft.furniture, ...draft.fixtures, ...draft.zones].map((o) => o.id));
      }
      if (e.key === 'Delete' || e.key === 'Backspace') remove();
      if (e.key === 'Escape') {
        setStart(undefined);
        setTool('select');
        setContext(false);
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selected.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        apply((d) =>
          translateElements(
            d,
            selected,
            e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0,
            e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0,
          ),
        );
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  function point(p: Point) {
    if (!draft) return;
    const layer = tool === 'label' || tool === 'measure' ? 'annotations' : 'architecture';
    if (draft.layers[layer].locked || !draft.layers[layer].visible) {
      notify('Die Ebene ist ausgeblendet oder gesperrt.');
      return;
    }
    const id = crypto.randomUUID();
    if (['wall', 'zone', 'measure', 'calibrate'].includes(tool)) {
      if (!start) {
        setStart(p);
        return;
      }
      const a = start;
      setStart(undefined);
      if (distance(a, p) < 12) {
        notify('Bitte wählen Sie zwei Punkte mit mindestens 12 Planeinheiten Abstand.');
        return;
      }
      if (tool === 'calibrate') {
        setCalibration({ start: a, end: p });
        return;
      }
      if (tool === 'wall') {
        const end = orthogonalEnd(a, p);
        apply((d) => ({
          ...d,
          walls: [...d.walls, { id, name: 'Wand', start: a, end, thickness: 12, material: 'solid' }],
        }));
      }
      if (tool === 'zone')
        apply((d) => ({
          ...d,
          zones: [
            ...d.zones,
            {
              id,
              name: 'Neue Raumzone',
              kind: 'office',
              x: (a.x + p.x) / 2,
              y: (a.y + p.y) / 2,
              width: Math.abs(p.x - a.x),
              height: Math.abs(p.y - a.y),
              rotation: 0,
              showLabel: true,
            },
          ],
        }));
      if (tool === 'measure')
        apply((d) => ({
          ...d,
          annotations: [
            ...d.annotations,
            {
              id,
              name: 'Maßlinie',
              kind: 'measure',
              text: '',
              fontSize: 12,
              x: (a.x + p.x) / 2,
              y: (a.y + p.y) / 2,
              width: distance(a, p),
              height: 12,
              rotation: (Math.atan2(p.y - a.y, p.x - a.x) * 180) / Math.PI,
            },
          ],
        }));
      setSelected([id]);
      setTab('properties');
      return;
    }
    if (['door', 'double-door', 'sliding-door', 'window'].includes(tool)) {
      const hit = findWall(p, draft.walls, 40);
      if (!hit) {
        notify('Bitte klicken Sie direkt auf eine Wand.');
        return;
      }
      const o: WallOpening = clampOpening(
        {
          id,
          name: tool === 'window' ? 'Fenster' : 'Tür',
          kind: tool as WallOpening['kind'],
          wallId: hit.wall.id,
          offset: hit.offset,
          width: tool === 'double-door' ? 100 : tool === 'window' ? 100 : 70,
          hinge: 'left',
          swing: 'inward',
        },
        hit.wall,
      );
      apply((d) => ({ ...d, openings: [...d.openings, o] }));
      setSelected([id]);
      setTab('properties');
      return;
    }
    if (tool === 'label') {
      apply((d) => ({
        ...d,
        annotations: [
          ...d.annotations,
          {
            id,
            name: 'Beschriftung',
            kind: 'label',
            text: 'Neue Beschriftung',
            fontSize: 18,
            x: p.x,
            y: p.y,
            width: 180,
            height: 30,
            rotation: 0,
          },
        ],
      }));
      setSelected([id]);
      setTab('properties');
    }
  }
  if (!data || !draft) return null;
  const geometry = selected.length === 1 ? elementGeometry(draft, selected[0]) : undefined,
    ref = selected.length === 1 ? selectedElement(draft, selected[0]) : undefined,
    element = selected.length === 1 ? getElement(draft, selected[0]) : undefined;
  const issues = designIssues(draft),
    wall = draft.walls.find((w) => w.id === selected[0]),
    opening = draft.openings.find((o) => o.id === selected[0]),
    resource = draft.objects.find((o) => o.id === selected[0]),
    annotation = draft.annotations.find((o) => o.id === selected[0]),
    zone = draft.zones.find((o) => o.id === selected[0]);
  const editArray = (
    key: 'objects' | 'walls' | 'openings' | 'annotations' | 'zones',
    patch: Record<string, unknown>,
  ) => apply((d) => ({ ...d, [key]: d[key].map((o) => (o.id === selected[0] ? { ...o, ...patch } : o)) }));
  return (
    <>
      <div className="designer-title">
        <div>
          <span className="eyebrow">ETAGENENTWURF</span>
          <h2>Ihre Fläche. Ihr Entwurf.</h2>
        </div>
        <span className={`badge ${dirty ? 'badge-reserved' : 'badge-available'}`}>
          <i />
          {dirty ? 'Ungespeicherte Änderungen' : 'Alle Änderungen gespeichert'}
        </span>
        <Button variant="ghost" onClick={() => setTourOpen(true)}>
          <CircleHelp size={16} />
          Kurztour
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (dirty) {
              notify('Bitte speichern oder verwerfen Sie zunächst Ihre Änderungen.');
              return;
            }
            setImportOpen(true);
          }}
        >
          <FileUp size={16} />
          Grundriss importieren
        </Button>
        <Button variant="outline" onClick={() => setNewOpen(true)}>
          <Plus size={16} />
          Leerer Plan
        </Button>
      </div>
      <fieldset className="designer" disabled={saving}>
        <div className="designer-bar">
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
          <select
            className="element-select"
            aria-label="Objekt zum Bearbeiten auswählen"
            value={selected.length === 1 ? selected[0] : ''}
            onChange={(e) => {
              setSelected(e.target.value ? [e.target.value] : []);
              setTab('properties');
            }}
          >
            <option value="">Element auswählen</option>
            {[
              ...draft.objects,
              ...draft.furniture,
              ...draft.fixtures,
              ...draft.zones,
              ...draft.walls,
              ...draft.openings,
              ...draft.annotations,
            ].map((o) => (
              <option key={o.id} value={o.id} disabled={!isElementEditable(draft, o.id)}>
                {o.name}
              </option>
            ))}
          </select>
          <div className="tool-group">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Änderung rückgängig machen"
              disabled={!canUndo}
              onClick={undo}
            >
              <Undo2 size={17} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Änderung wiederholen"
              disabled={!canRedo}
              onClick={redo}
            >
              <Redo2 size={17} />
            </Button>
          </div>
          <div className="tool-group">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Auswahl duplizieren"
              disabled={!selected.length}
              onClick={duplicate}
            >
              <Copy size={17} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Objekt löschen"
              disabled={!selected.length}
              onClick={remove}
            >
              <Trash2 size={17} />
            </Button>
          </div>
          <div className="tool-group">
            <Button
              variant={grid ? 'outline' : 'ghost'}
              size="icon"
              aria-label="Raster"
              aria-pressed={grid}
              onClick={() => setGrid((v) => !v)}
            >
              <Grid2X2 size={17} />
            </Button>
            <Button
              variant={snap ? 'outline' : 'ghost'}
              size="icon"
              aria-label="Einrasten"
              aria-pressed={snap}
              onClick={() => setSnap((v) => !v)}
            >
              <Magnet size={17} />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Ebenen anzeigen" onClick={() => setTab('layers')}>
              <Layers size={17} />
            </Button>
          </div>
          <span className="toolbar-spacer" />
          <Button variant="ghost" onClick={() => setPreview((v) => !v)}>
            <Eye size={16} />
            {preview ? 'Bearbeiten' : 'Vorschau'}
          </Button>
          <Button variant="outline" disabled={!dirty} onClick={discard}>
            Verwerfen
          </Button>
          <Button disabled={!dirty || saving} onClick={() => void save()}>
            <Save size={16} />
            {saving ? 'Wird gespeichert …' : 'Grundriss speichern'}
          </Button>
        </div>
        <div className="designer-body">
          <nav className="designer-tools" aria-label="Zeichenwerkzeuge">
            {TOOLS.map(({ id, name, Icon }) => (
              <button
                key={id}
                title={name}
                aria-label={name}
                aria-pressed={tool === id}
                onClick={() => {
                  setTool(id);
                  setStart(undefined);
                  setPreview(false);
                }}
                className={tool === id ? 'active' : ''}
              >
                <Icon size={19} />
              </button>
            ))}
            <span />
            <button title="Möbelkatalog" aria-label="Möbelkatalog" onClick={() => setCategory('Alle')}>
              <Armchair size={20} />
            </button>
            <button
              title="Architekturbauteile"
              aria-label="Architekturbauteile"
              onClick={() => {
                setCategory('Gebäude');
              }}
            >
              <Building2 size={20} />
            </button>
          </nav>
          <aside className="designer-catalog-rail">
            <CatalogPanel onAdd={add} initialCategory={category} notify={notify} />
          </aside>
          <section className="designer-canvas">
            <FloorPlan
              room={draft}
              bookings={data.bookings}
              date={date}
              timeStart={timeStart}
              timeEnd={timeEnd}
              editor={!preview}
              grid={grid && !preview}
              snap={snap}
              collisionIds={issues.flatMap((i) => i.ids)}
              onSelect={(o) => {
                if (preview) notify(`${o.name} · ${o.equipment?.join(', ') ?? 'Buchbare Ressource'}`);
              }}
              designer={
                preview
                  ? undefined
                  : {
                      selected,
                      tool,
                      start,
                      onSelect: select,
                      onMove: move,
                      onGeometry: changeGeometry,
                      onPoint: point,
                      onWallEnd: (id, end, p) => apply((d) => connectWallEndpoint(d, id, end, p)),
                      onContext: (id) => {
                        select([id]);
                        setContext(true);
                      },
                    }
              }
            />
            {context && (
              <div className="designer-context" role="menu">
                <strong>Auswahl bearbeiten</strong>
                <button onClick={duplicate}>Duplizieren</button>
                <button
                  onClick={() => {
                    clipboard.current = { room: structuredClone(draft), ids: selected };
                    setContext(false);
                  }}
                >
                  Kopieren
                </button>
                <button
                  onClick={() => {
                    apply((d) => reorderElements(d, selected, true));
                    setContext(false);
                  }}
                >
                  In den Vordergrund
                </button>
                <button onClick={remove}>Löschen</button>
                <button onClick={() => setContext(false)}>Schließen</button>
              </div>
            )}
            <div className="designer-status">
              <span>{preview ? 'Benutzeransicht · Vorschau' : HELP[tool]}</span>
              <span>
                {selected.length} ausgewählt · {formatLength(draft.width, draft)} ×{' '}
                {formatLength(draft.height, draft)}
              </span>
            </div>
          </section>
          <aside className="designer-inspector">
            <div className="inspector-tabs">
              {(['properties', 'layers', 'plan'] as const).map((id, i) => (
                <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
                  {['Eigenschaften', 'Ebenen', 'Plan'][i]}
                </button>
              ))}
            </div>
            {tab === 'properties' && (
              <div className="inspector-section">
                <div className="inspector-heading">
                  <h3>
                    {selected.length > 1 ? `${selected.length} Elemente` : (element?.name ?? 'Keine Auswahl')}
                  </h3>
                  <span className="eyebrow">{ref ? LAYER_NAMES[elementLayer(ref.type)] : ''}</span>
                </div>
                {!selected.length && (
                  <div className="small-empty">
                    <MousePointer2 size={28} />
                    <p>Wählen Sie ein Element im Grundriss aus.</p>
                    <p>Umschalt ergänzt die Auswahl. Ziehen Sie einen Rahmen für mehrere Möbel.</p>
                  </div>
                )}
                {selected.length > 1 && (
                  <>
                    <p className="muted">Ausrichtung am zuerst ausgewählten Element</p>
                    <div className="selection-actions">
                      {(
                        [
                          { mode: 'left', label: 'Links ausrichten', Icon: AlignHorizontalJustifyStart },
                          { mode: 'center', label: 'Mittig ausrichten', Icon: AlignHorizontalJustifyCenter },
                          { mode: 'top', label: 'Oben ausrichten', Icon: AlignVerticalJustifyStart },
                          {
                            mode: 'distribute-x',
                            label: 'Horizontal verteilen',
                            Icon: AlignHorizontalDistributeCenter,
                          },
                          {
                            mode: 'distribute-y',
                            label: 'Vertikal verteilen',
                            Icon: AlignVerticalDistributeCenter,
                          },
                        ] as const
                      ).map(({ mode, label, Icon }) => (
                        <Button
                          key={mode}
                          variant="outline"
                          size="icon"
                          aria-label={label}
                          onClick={() => apply((d) => alignElements(d, selected, mode))}
                        >
                          <Icon size={16} />
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => apply((d) => setElementGroup(d, selected, crypto.randomUUID()))}
                    >
                      <GroupIcon size={16} />
                      Gruppieren
                    </Button>
                    <Button variant="outline" onClick={() => apply((d) => setElementGroup(d, selected))}>
                      <Ungroup size={16} />
                      Gruppierung aufheben
                    </Button>
                  </>
                )}
                {geometry && (
                  <>
                    <label>
                      Bezeichnung
                      <input
                        aria-label="Bezeichnung"
                        maxLength={50}
                        value={geometry.name}
                        onChange={(e) => changeGeometry(geometry.id, { name: e.target.value })}
                      />
                    </label>
                    <div className="field-grid">
                      {(['x', 'y', 'width', 'height', 'rotation'] as const)
                        .filter((key) => !opening || !['height', 'rotation'].includes(key))
                        .map((key, i) => (
                          <label key={key}>
                            {['Position X', 'Position Y', 'Breite', 'Höhe / Stärke', 'Drehung'][i]}
                            <input
                              aria-label={
                                ['Position X', 'Position Y', 'Objektbreite', 'Objekthöhe', 'Drehung'][i]
                              }
                              type="number"
                              step={key === 'rotation' ? 1 : 5}
                              min={key === 'width' || key === 'height' ? 2 : undefined}
                              value={Math.round(geometry[key] * 10) / 10}
                              onChange={(e) => changeGeometry(geometry.id, { [key]: Number(e.target.value) })}
                            />
                          </label>
                        ))}
                      {!opening && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            changeGeometry(geometry.id, { rotation: (geometry.rotation + 15) % 360 })
                          }
                        >
                          <RotateCw size={15} />
                          15° drehen
                        </Button>
                      )}
                    </div>
                    <p className="field-hint">
                      {formatLength(geometry.width, draft)} × {formatLength(geometry.height, draft)} ·{' '}
                      {draft.calibration ? 'Kalibrierter Maßstab' : 'PE = Planeinheiten'}
                    </p>
                    {wall && (
                      <>
                        <label>
                          Wandtyp
                          <select
                            value={wall.material}
                            onChange={(e) => editArray('walls', { material: e.target.value })}
                          >
                            <option value="solid">Massivwand</option>
                            <option value="glass">Glaswand</option>
                          </select>
                        </label>
                        <div className="field-grid">
                          {(['start', 'end'] as const).flatMap((end) =>
                            (['x', 'y'] as const).map((axis) => (
                              <label key={end + axis}>
                                {end === 'start' ? 'Start' : 'Ende'} {axis.toUpperCase()}
                                <input
                                  type="number"
                                  aria-label={`${end === 'start' ? 'Wandstart' : 'Wandende'} ${axis.toUpperCase()}`}
                                  value={wall[end][axis]}
                                  onChange={(e) =>
                                    apply((d) =>
                                      connectWallEndpoint(d, wall.id, end, {
                                        ...wall[end],
                                        [axis]: Number(e.target.value),
                                      }),
                                    )
                                  }
                                />
                              </label>
                            )),
                          )}
                        </div>
                      </>
                    )}
                    {opening && (
                      <>
                        <label>
                          Öffnungstyp
                          <select
                            value={opening.kind}
                            onChange={(e) => editArray('openings', { kind: e.target.value })}
                          >
                            <option value="door">Tür</option>
                            <option value="double-door">Doppeltür</option>
                            <option value="sliding-door">Schiebetür</option>
                            <option value="window">Fenster</option>
                          </select>
                        </label>
                        <label>
                          Position an Wand
                          <input
                            aria-label="Öffnungsposition"
                            type="number"
                            value={opening.offset}
                            onChange={(e) => editArray('openings', { offset: Number(e.target.value) })}
                          />
                        </label>
                        <label>
                          Anschlag
                          <select
                            value={opening.hinge}
                            onChange={(e) => editArray('openings', { hinge: e.target.value })}
                          >
                            <option value="left">Links</option>
                            <option value="right">Rechts</option>
                          </select>
                        </label>
                        <label>
                          Öffnungsrichtung
                          <select
                            value={opening.swing}
                            onChange={(e) => editArray('openings', { swing: e.target.value })}
                          >
                            <option value="inward">Nach innen</option>
                            <option value="outward">Nach außen</option>
                          </select>
                        </label>
                      </>
                    )}
                    {zone && (
                      <>
                        <label>
                          Zonentyp
                          <select
                            value={zone.kind}
                            onChange={(e) => editArray('zones', { kind: e.target.value })}
                          >
                            {CATALOG.filter((c) => c.type === 'zone').map((c) => (
                              <option key={c.kind} value={c.kind}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={zone.showLabel}
                            onChange={(e) => editArray('zones', { showLabel: e.target.checked })}
                          />
                          Raumbezeichnung anzeigen
                        </label>
                        <p className="field-hint">
                          Bauliche Raumzone. Buchbare Meetingräume werden separat angelegt.
                        </p>
                      </>
                    )}
                    {resource && (
                      <>
                        <div className="inspector-divider" />
                        <h4>Ressource</h4>
                        {resource.kind === 'meeting' && (
                          <>
                            <label>
                              Kapazität
                              <input
                                aria-label="Kapazität (Personen)"
                                type="number"
                                min={1}
                                max={100}
                                value={resource.capacity ?? 4}
                                onChange={(e) => editArray('objects', { capacity: Number(e.target.value) })}
                              />
                            </label>
                            <label>
                              Raumzone
                              <select
                                aria-label="Zugeordnete Raumzone"
                                value={resource.zoneId ?? ''}
                                onChange={(e) =>
                                  editArray('objects', { zoneId: e.target.value || undefined })
                                }
                              >
                                <option value="">Ohne Zuordnung</option>
                                {draft.zones.map((z) => (
                                  <option key={z.id} value={z.id}>
                                    {z.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </>
                        )}
                        <label>
                          Ausstattung
                          <input
                            aria-label="Ausstattung"
                            value={resource.equipment?.join(', ') ?? ''}
                            onChange={(e) =>
                              editArray('objects', {
                                equipment: e.target.value.split(',').map((v) => v.trim()),
                              })
                            }
                          />
                        </label>
                      </>
                    )}
                    {annotation?.kind === 'label' && (
                      <>
                        <label>
                          Beschriftung
                          <textarea
                            aria-label="Beschriftungstext"
                            value={annotation.text}
                            onChange={(e) => editArray('annotations', { text: e.target.value })}
                          />
                        </label>
                        <label>
                          Schriftgröße
                          <input
                            type="number"
                            min={8}
                            max={120}
                            value={annotation.fontSize}
                            onChange={(e) => editArray('annotations', { fontSize: Number(e.target.value) })}
                          />
                        </label>
                      </>
                    )}
                    {(wall ||
                      zone ||
                      resource ||
                      annotation?.kind === 'label' ||
                      (ref?.type === 'furniture' &&
                        element &&
                        'kind' in element &&
                        [
                          'sofa',
                          'armchair',
                          'conference-table',
                          'round-table',
                          'coffee-table',
                          'cabinet',
                          'shelf',
                          'pedestal',
                          'divider',
                          'kitchen',
                          'reception',
                          'rug',
                        ].includes(element.kind))) && (
                      <label>
                        Elementfarbe
                        <input
                          aria-label="Elementfarbe"
                          type="color"
                          value={element && 'color' in element && element.color ? element.color : '#75958d'}
                          onChange={(e) => changeGeometry(geometry.id, { color: e.target.value })}
                        />
                      </label>
                    )}
                  </>
                )}
                {!!selected.length && (
                  <>
                    <div className="inspector-divider" />
                    <div className="selection-actions">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="In den Vordergrund"
                        onClick={() => apply((d) => reorderElements(d, selected, true))}
                      >
                        <ArrowUpToLine size={17} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="In den Hintergrund"
                        onClick={() => apply((d) => reorderElements(d, selected, false))}
                      >
                        <ArrowDownToLine size={17} />
                      </Button>
                      <Button variant="outline" onClick={duplicate}>
                        <Copy size={15} />
                        Duplizieren
                      </Button>
                      <Button variant="ghost" onClick={remove}>
                        <Trash2 size={16} />
                        Löschen
                      </Button>
                    </div>
                    {selected.length === 1 && element?.groupId && (
                      <Button
                        variant="outline"
                        onClick={() => apply((d) => setElementGroup(d, expandGroups(d, selected)))}
                      >
                        <Ungroup size={16} />
                        Gruppierung aufheben
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
            {tab === 'layers' && (
              <div className="inspector-section">
                <h3>Ebenen</h3>
                <p className="muted">Sperren schützt vor Auswahl und Änderungen.</p>
                {LAYER_IDS.map((id) => (
                  <div className="layer-row" key={id}>
                    <span>
                      <Layers size={16} />
                      {LAYER_NAMES[id]}
                    </span>
                    <button
                      aria-label={`${LAYER_NAMES[id]} ${draft.layers[id].visible ? 'ausblenden' : 'einblenden'}`}
                      onClick={() => {
                        apply((d) => ({
                          ...d,
                          layers: { ...d.layers, [id]: { ...d.layers[id], visible: !d.layers[id].visible } },
                        }));
                        setSelected([]);
                      }}
                    >
                      {draft.layers[id].visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      aria-label={`${LAYER_NAMES[id]} ${draft.layers[id].locked ? 'entsperren' : 'sperren'}`}
                      onClick={() => {
                        apply((d) => ({
                          ...d,
                          layers: { ...d.layers, [id]: { ...d.layers[id], locked: !d.layers[id].locked } },
                        }));
                        setSelected([]);
                      }}
                    >
                      {draft.layers[id].locked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                  </div>
                ))}
                <div className="inspector-divider" />
                <h4>Planinhalt</h4>
                <div className="element-list">
                  {[
                    ...draft.walls,
                    ...draft.openings,
                    ...draft.zones,
                    ...draft.fixtures,
                    ...draft.furniture,
                    ...draft.objects,
                    ...draft.annotations,
                  ].map((o) => (
                    <button
                      key={o.id}
                      disabled={!isElementEditable(draft, o.id)}
                      onClick={() => select([o.id])}
                    >
                      {o.name}
                      <small>{selectedElement(draft, o.id)?.type === 'resource' ? 'Buchbar' : ''}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tab === 'plan' && (
              <div className="inspector-section">
                <h3>Planeinstellungen</h3>
                <label>
                  Bürobereich
                  <input
                    aria-label="Name des Bürobereichs"
                    value={draft.name}
                    onChange={(e) => apply((d) => ({ ...d, name: e.target.value }))}
                  />
                </label>
                <div className="field-grid">
                  {(['width', 'height'] as const).map((k, i) => (
                    <label key={k}>
                      {i ? 'Planhöhe' : 'Planbreite'}
                      <input
                        aria-label={i ? 'Planhöhe' : 'Planbreite'}
                        type="number"
                        min={160}
                        max={6000}
                        value={draft[k]}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (v >= 160 && v <= 6000)
                            apply((d) =>
                              resizeRoom(d, k === 'width' ? v : d.width, k === 'height' ? v : d.height),
                            );
                        }}
                      />
                    </label>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTool('calibrate');
                    setStart(undefined);
                  }}
                >
                  <Ruler size={16} />
                  Maßstab kalibrieren
                </Button>
                <p className="field-hint">
                  {draft.calibration
                    ? `Bekannte Strecke: ${draft.calibration.meters} m`
                    : 'Keine reale Maßeinheit festgelegt. Kalibrieren Sie eine bekannte Strecke mit zwei Punkten.'}
                </p>
                {draft.calibration && (
                  <Button variant="ghost" onClick={() => apply((d) => ({ ...d, calibration: undefined }))}>
                    Kalibrierung entfernen
                  </Button>
                )}
                {draft.background && (
                  <>
                    <div className="inspector-divider" />
                    <h4>Importierter Hintergrund</h4>
                    <p className="field-hint">{draft.background.name}</p>
                    <div className="field-grid">
                      {(['x', 'y', 'rotation', 'width', 'height'] as const).map((k) => (
                        <label key={k}>
                          {
                            {
                              x: 'Hintergrund X',
                              y: 'Hintergrund Y',
                              rotation: 'Bilddrehung',
                              width: 'Bildbreite',
                              height: 'Bildhöhe',
                            }[k]
                          }
                          <input
                            type="number"
                            aria-label={`Hintergrund ${k}`}
                            value={Math.round(draft.background![k])}
                            onChange={(e) =>
                              apply((d) => ({
                                ...d,
                                background: { ...d.background!, [k]: Number(e.target.value) },
                              }))
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        void planAssets
                          .get(draft.background!.assetId)
                          .then((asset) => {
                            if (asset)
                              apply((d) => ({
                                ...d,
                                background: {
                                  ...d.background!,
                                  ...fitBackground(asset, d, d.background!.rotation),
                                },
                              }));
                            else notify('Die Hintergrunddatei fehlt. Bitte erneut importieren.');
                          })
                          .catch((e) => notify(e.message))
                      }
                    >
                      <Scan size={15} />
                      Bild einpassen
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
                      Bild drehen
                    </Button>
                    <label>
                      Deckkraft
                      <input
                        aria-label="Hintergrund-Deckkraft"
                        type="range"
                        min={10}
                        max={100}
                        value={draft.background.opacity * 100}
                        onChange={(e) =>
                          apply((d) => ({
                            ...d,
                            background: { ...d.background!, opacity: Number(e.target.value) / 100 },
                          }))
                        }
                      />
                    </label>
                    <Button variant="ghost" onClick={() => apply((d) => ({ ...d, background: undefined }))}>
                      Hintergrund ausblenden
                    </Button>
                  </>
                )}
                <div className="inspector-divider" />
                <h4>Geometrieprüfung</h4>
                <p className="field-hint">
                  Raumzonen dürfen Einrichtung enthalten. Hinweise lassen sich bewusst übernehmen.
                </p>
                {issues.length ? (
                  issues.slice(0, 15).map((issue, i) => (
                    <button
                      className={`geometry-issue ${issue.severity}`}
                      key={i}
                      onClick={() => select(issue.ids)}
                    >
                      {issue.message}
                    </button>
                  ))
                ) : (
                  <p className="validation-success">
                    <Check size={16} />
                    Keine Konflikte erkannt
                  </p>
                )}
                {issues.length > 15 && (
                  <p className="field-hint">Weitere {issues.length - 15} Hinweise im Plan markiert.</p>
                )}
              </div>
            )}
          </aside>
        </div>
      </fieldset>
      <Dialog
        open={tourOpen}
        onOpenChange={setTourOpen}
        title="In fünf Schritten zum fertigen Grundriss"
        description="Eine kurze Orientierung für den OFFICEFLOW Raumeditor. Sie können jederzeit schließen und direkt weiterarbeiten."
      >
        <div className="editor-tour">
          {[
            [
              '01',
              'Grundriss wählen oder importieren',
              'Starten Sie mit einer vorhandenen Etage, einer Bild-/PDF-Datei oder einem leeren Plan.',
            ],
            [
              '02',
              'Wände und Räume gestalten',
              'Zeichenwerkzeuge links, Raster und intelligente Fangpunkte sorgen für saubere Geometrie.',
            ],
            [
              '03',
              'Arbeitsplätze hinzufügen',
              'Ziehen Sie passende Objekte aus der Bibliothek in Ihre Arbeitswelt oder fügen Sie sie per Klick ein.',
            ],
            [
              '04',
              'Ressourcen konfigurieren',
              'Auswahl anklicken und rechts Name, Ausstattung, Kapazität und Raumzuordnung pflegen.',
            ],
            [
              '05',
              'Speichern und präsentieren',
              'Prüfen Sie die Benutzeransicht, speichern Sie bewusst und öffnen Sie den Präsentationsmodus.',
            ],
          ].map(([number, title, copy]) => (
            <div key={number}>
              <span>{number}</span>
              <div>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
            </div>
          ))}
        </div>
        <Button className="w-full" onClick={() => setTourOpen(false)}>
          Editor erkunden
          <ArrowRight size={16} />
        </Button>
      </Dialog>
      <ImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        currentRoom={data.rooms.find((r) => r.id === roomId)!}
        onImported={(room) => {
          reset(room);
          setRoom(room.id);
          setSelected([]);
          notify('Ihr Grundriss wurde importiert und lokal gespeichert.');
        }}
      />
      <Dialog
        open={!!calibration}
        onOpenChange={(v) => {
          if (!v) setCalibration(undefined);
        }}
        title="Maßstab festlegen"
        description="Geben Sie die reale Länge der markierten Strecke in Metern an."
      >
        <label>
          Bekannte Länge in Metern
          <input
            aria-label="Bekannte Länge in Metern"
            type="number"
            min={0.01}
            max={10000}
            step={0.1}
            value={meters}
            onChange={(e) => setMeters(e.target.value)}
          />
        </label>
        <Button
          disabled={!Number.isFinite(Number(meters)) || Number(meters) <= 0}
          onClick={() => {
            if (calibration) {
              apply((d) => ({ ...d, calibration: { ...calibration, meters: Number(meters) } }));
              setCalibration(undefined);
              setTool('select');
            }
          }}
        >
          Maßstab übernehmen
        </Button>
      </Dialog>
      <Dialog
        open={newOpen}
        onOpenChange={setNewOpen}
        title="Neue Büroetage"
        description="Beginnen Sie mit einer leeren Zeichenfläche. Bestehende Pläne und Buchungen bleiben erhalten."
      >
        <label>
          Name
          <input
            aria-label="Name der neuen Etage"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </label>
        <Button
          disabled={!newName.trim() || dirty}
          onClick={() => {
            const room: OfficeRoom = {
              ...emptyDesign(),
              id: crypto.randomUUID(),
              name: newName.trim(),
              subtitle: 'Eigener Etagenentwurf',
              area: 0,
              width: 1400,
              height: 900,
              layout: 'custom',
              objects: [],
            };
            void addRoom(room)
              .then(() => {
                setRoom(room.id);
                reset(room);
                setNewOpen(false);
                notify('Die neue Etage wurde angelegt.');
              })
              .catch((e) => notify(e.message));
          }}
        >
          Etage anlegen
        </Button>
        {dirty && <p role="alert">Bitte speichern oder verwerfen Sie zunächst Ihren aktuellen Entwurf.</p>}
      </Dialog>
    </>
  );
}
