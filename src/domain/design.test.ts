import { describe, it, expect } from 'vitest';
import { createSeed } from '../data/seed';
import { DemoDataProvider, STORAGE_KEY, V2_BACKUP_KEY } from '../data/provider';
import {
  emptyDesign,
  wallSolidSegments,
  clampOpening,
  openingPosition,
  orthogonalEnd,
  snapPoint,
  formatLength,
  planArea,
  isElementEditable,
  expandGroups,
  setElementGroup,
  translateElements,
  updateGeometry,
  removeElements,
  reorderElements,
} from './design';
import { addCatalogItem, CATALOG } from './catalog';
import { duplicateElements, alignElements, designIssues, connectWallEndpoint, pasteElements } from './editor';
import { resizeRoom, validateRoom } from './layout';
import { migrateOfficeData } from '../data/migration';
import type { OfficeRoom, WallOpening, WallSegment } from './types';
const room = (): OfficeRoom => ({
  ...createSeed().rooms[0],
  ...emptyDesign(),
  width: 1000,
  height: 800,
  objects: [],
  layout: 'custom',
});
const wall: WallSegment = {
  id: 'w',
  name: 'Wand',
  start: { x: 100, y: 100 },
  end: { x: 700, y: 100 },
  thickness: 12,
  material: 'solid',
};
const door: WallOpening = {
  id: 'd',
  name: 'Tür',
  wallId: 'w',
  kind: 'door',
  offset: 200,
  width: 80,
  hinge: 'left',
  swing: 'inward',
};
it('übernimmt alte Demo-Pläne ohne Layoutfeld und repariert solche bereits migrierten Bestände idempotent', () => {
  const original = createSeed();
  const legacy = {
    ...original,
    version: 2,
    rooms: original.rooms.map((r) => {
      const { layout, walls, openings, ...rest } = r;
      void layout;
      void walls;
      void openings;
      return rest;
    }),
  };
  const upgraded = migrateOfficeData(legacy).data;
  expect(upgraded.rooms[0].layout).toBe('demo');
  expect(upgraded.rooms[0].walls).toHaveLength(4);
  expect(upgraded.bookings).toEqual(original.bookings);
  expect(upgraded.rooms[0].objects).toEqual(original.rooms[0].objects);
  const partial = structuredClone(original);
  delete partial.rooms[0].layout;
  partial.rooms[0].walls = [];
  partial.rooms[0].openings = [];
  const repaired = migrateOfficeData(partial);
  expect(repaired.migrated).toBe(true);
  expect(repaired.data.rooms[0].walls).toHaveLength(4);
  expect(repaired.data.rooms[0].furniture).toEqual(partial.rooms[0].furniture);
  expect(migrateOfficeData(repaired.data).migrated).toBe(false);
});
describe('Architektur und Geometrie', () => {
  it('meldet sich kreuzende Wände und erlaubt gemeinsame Ecken', () => {
    const base = {
      ...room(),
      walls: [wall, { ...wall, id: 'second', start: { x: 400, y: 50 }, end: { x: 400, y: 400 } }],
    };
    expect(designIssues(base).some((i) => i.message.includes('Wandsegmente'))).toBe(true);
    base.walls[1] = { ...base.walls[1], start: wall.end, end: { x: 700, y: 500 } };
    expect(designIssues(base).some((i) => i.message.includes('Wandsegmente'))).toBe(false);
  });
  it('schneidet Öffnungen wirklich aus der Wand und vereinigt überlappende Lücken', () => {
    expect(wallSolidSegments(wall, [door])).toEqual([
      [0, 160],
      [240, 600],
    ]);
    expect(wallSolidSegments(wall, [door, { ...door, id: 'd2', offset: 230 }])).toEqual([
      [0, 160],
      [270, 600],
    ]);
  });
  it('positioniert Öffnungen auch an gedrehten Wänden und begrenzt sie', () => {
    expect(openingPosition({ ...wall, end: { x: 100, y: 700 } }, door)).toEqual({ x: 100, y: 300 });
    expect(clampOpening({ ...door, offset: 900 }, wall).offset).toBe(558);
  });
  it('zeichnet orthogonal und fängt bestehende Wandenden', () => {
    expect(orthogonalEnd({ x: 0, y: 0 }, { x: 250, y: 70 })).toEqual({ x: 250, y: 0 });
    expect(snapPoint({ x: 104, y: 102 }, { ...room(), walls: [wall] })).toEqual({ x: 100, y: 100 });
  });
  it('bewegt verbundene Wandenden zusammen und erhält Öffnungskennungen', () => {
    const r = {
      ...room(),
      walls: [wall, { ...wall, id: 'w2', start: wall.end, end: { x: 700, y: 500 } }],
      openings: [door],
    };
    const next = connectWallEndpoint(r, 'w', 'end', { x: 650, y: 130 });
    expect(next.walls[1].start).toEqual(next.walls[0].end);
    expect(next.openings[0].id).toBe('d');
  });
  it('zeigt reale Maße nur nach Kalibrierung und verwirft sie nach Verzerrung', () => {
    const r = room();
    expect(formatLength(300, r)).toBe('300 PE');
    expect(planArea(r)).toContain('nicht kalibriert');
    r.calibration = { start: { x: 100, y: 100 }, end: { x: 400, y: 100 }, meters: 3 };
    expect(formatLength(300, r)).toBe('3 m');
    expect(planArea(r)).toBe('80 m²');
    expect(resizeRoom(r, 1500, 1000).calibration).toBeUndefined();
  });
  it('skaliert Architekturpositionen zusammen mit dem Plan ohne Ressourcenkennungen zu ändern', () => {
    const r = { ...room(), walls: [wall], openings: [door] };
    const next = resizeRoom(r, 2000, 1600);
    expect(next.walls[0].end).toEqual({ x: 1400, y: 200 });
    expect(next.openings[0]).toMatchObject({ id: 'd', offset: 400, width: 80 });
  });
  it('ignoriert beabsichtigte Zonencontainments und erkennt Möbel- und Wandkollisionen', () => {
    let r = addCatalogItem(
      room(),
      CATALOG.find((c) => c.id === 'desk')!,
      [],
      { x: 300, y: 300 },
    ).room;
    r = addCatalogItem(
      r,
      CATALOG.find((c) => c.id === 'zone-office')!,
      [],
      { x: 300, y: 300 },
    ).room;
    expect(designIssues(r)).toEqual([]);
    r = addCatalogItem(
      r,
      CATALOG.find((c) => c.id === 'cabinet')!,
      [],
      { x: 300, y: 300 },
    ).room;
    expect(designIssues(r).some((i) => i.severity === 'warning')).toBe(true);
    r.walls = [{ ...wall, start: { x: 100, y: 300 }, end: { x: 700, y: 300 } }];
    expect(designIssues(r).some((i) => i.message.includes('Wand'))).toBe(true);
  });
  it('blockiert ungültige Planbegrenzungen, losgelöste Öffnungen und ungültige Wandstärken', () => {
    const r = { ...room(), walls: [{ ...wall, thickness: -1 }], openings: [{ ...door, wallId: 'missing' }] };
    expect(validateRoom(r)).toBeTruthy();
  });
});
describe('Auswahl, Ressourcen und Ebenen', () => {
  it('erzeugt einzeln buchbare Arbeitsplätze mit eindeutigen Nummern in Gruppen', () => {
    const { room: r, ids } = addCatalogItem(
      room(),
      CATALOG.find((c) => c.id === 'cluster-6')!,
    );
    expect(r.objects).toHaveLength(6);
    expect(new Set(r.objects.map((o) => o.name)).size).toBe(6);
    expect(expandGroups(r, [ids[0]])).toHaveLength(6);
    expect(r.objects.every((o) => o.kind === 'desk')).toBe(true);
  });
  it('verschiebt eine Auswahl ohne Positionsdrift und hebt Gruppen auf', () => {
    let { room: r, ids } = addCatalogItem(
      room(),
      CATALOG.find((c) => c.id === 'cluster-4')!,
    );
    const x = r.objects[0].x;
    r = translateElements(r, ids, 25, 40);
    expect(r.objects[0].x).toBe(x + 25);
    r = setElementGroup(r, ids);
    expect(expandGroups(r, [ids[0]])).toHaveLength(1);
  });
  it('dupliziert ganze Wände samt Öffnungen mit neuen IDs und aktualisierten Verweisen', () => {
    const r = { ...room(), walls: [wall], openings: [door] };
    const next = duplicateElements(r, ['w']).room;
    expect(next.walls).toHaveLength(2);
    expect(next.openings[1].wallId).toBe(next.walls[1].id);
    expect(next.openings[1].id).not.toBe('d');
    expect(next.openings[1].offset).toBe(200);
    expect(removeElements(next, ['w']).openings).toHaveLength(1);
  });
  it('kopiert Ressourcen in einen anderen Plan, vergibt neue Namen und erhält Buchbarkeit', () => {
    const source = addCatalogItem(room(), CATALOG[0]).room;
    const result = pasteElements(room(), source, [source.objects[0].id], source.objects);
    expect(result.room.objects[0].name).not.toBe(source.objects[0].name);
    expect(result.room.objects[0].id).not.toBe(source.objects[0].id);
  });
  it('richtet mehrere Elemente aus und verteilt sie gleichmäßig', () => {
    let r = addCatalogItem(
      room(),
      CATALOG.find((c) => c.id === 'cluster-6')!,
    ).room;
    r = setElementGroup(
      r,
      r.objects.map((o) => o.id),
    );
    const ids = r.objects.slice(0, 3).map((o) => o.id);
    r = updateGeometry(r, ids[1], { x: 430 });
    r = alignElements(r, ids, 'distribute-x');
    const xs = r.objects
      .slice(0, 3)
      .map((o) => o.x)
      .sort((a, b) => a - b);
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1]);
    r = alignElements(r, ids, 'top');
    expect(new Set(r.objects.slice(0, 3).map((o) => o.y)).size).toBe(1);
  });
  it('sperrt und verbirgt Ebenen unabhängig voneinander und ändert die Reihenfolge innerhalb einer Ebene', () => {
    const r = addCatalogItem(
      room(),
      CATALOG.find((c) => c.id === 'cluster-4')!,
    ).room;
    const id = r.objects[0].id;
    r.layers.resources.locked = true;
    expect(isElementEditable(r, id)).toBe(false);
    r.layers.resources.locked = false;
    r.layers.resources.visible = false;
    expect(isElementEditable(r, id)).toBe(false);
    expect(reorderElements(r, [id], true).objects.at(-1)!.id).toBe(id);
  });
  it('liefert vier vollständige, konfliktfreie Präsentationspläne mit stabilen Buchungsreferenzen', () => {
    const data = createSeed();
    expect(data.rooms.map((r) => r.objects.filter((o) => o.kind === 'desk').length)).toEqual([24, 6, 12, 64]);
    expect(data.rooms[2].fixtures.map((o) => o.kind)).toContain('elevator');
    expect(data.rooms[2].fixtures.map((o) => o.kind)).toContain('stairs');
    for (const r of data.rooms) expect(validateRoom(r)).toBeNull();
    for (const b of data.bookings)
      expect(data.rooms.find((r) => r.id === b.roomId)?.objects.some((o) => o.id === b.objectId)).toBe(true);
  });
});
it('migriert echte Schema-2-Struktur samt Dekoration, UUIDs, Hintergrund und Buchungen verlustfrei', async () => {
  const seed = createSeed();
  const { rooms, ...base } = seed;
  const legacy = {
    ...base,
    version: 2,
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      subtitle: r.subtitle,
      area: r.area,
      width: r.width,
      height: r.height,
      layout: 'custom',
      objects: [
        ...r.objects,
        { id: 'legacy-plant', kind: 'plant', name: 'Grün', x: 60, y: 60, width: 30, height: 30, rotation: 0 },
      ],
      background: {
        assetId: 'original-idb-id',
        name: 'Grundriss.pdf',
        mime: 'application/pdf',
        page: 2,
        x: 600,
        y: 400,
        width: 1000,
        height: 700,
        rotation: 90,
        opacity: 0.8,
      },
    })),
  };
  const values = new Map([[STORAGE_KEY, JSON.stringify(legacy)]]);
  const p = new DemoDataProvider({
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v);
    },
  });
  const migrated = await p.load();
  expect(migrated.version).toBe(3);
  expect(migrated.bookings).toEqual(legacy.bookings);
  expect(migrated.rooms[0].objects).toEqual(rooms[0].objects);
  expect(migrated.rooms[0].furniture[0]).toMatchObject({
    id: 'legacy-plant',
    kind: 'plant-large',
    name: 'Grün',
  });
  expect(migrated.rooms[0].background).toEqual(legacy.rooms[0].background);
  expect(values.get(V2_BACKUP_KEY)).toBe(JSON.stringify(legacy));
  expect(await p.load()).toEqual(migrated);
});
