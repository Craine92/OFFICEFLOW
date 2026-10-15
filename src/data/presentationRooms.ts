import type { OfficeRoom, FurnitureKind, ZoneKind, FixtureKind } from '../domain/types';
import { emptyDesign } from '../domain/design';
import { CATALOG } from '../domain/catalog';
export function presentationRooms(): OfficeRoom[] {
  const make = (id: string, name: string, subtitle: string, width: number, height: number): OfficeRoom => ({
    ...emptyDesign(),
    id,
    name,
    subtitle,
    width,
    height,
    area: 0,
    layout: 'demo',
    objects: [],
  });
  const open = make('open', 'Open Space', 'Fokus trifft Zusammenarbeit', 1200, 800),
    single = make('single', 'Einzelbüro', 'Sechs Rückzugsorte. Ein gemeinsames Büro.', 1000, 720),
    hybrid = make('hybrid', 'Hybrid Office', 'Eine Etage für jede Art zu arbeiten', 1400, 900);
  function wall(r: OfficeRoom, x1: number, y1: number, x2: number, y2: number, glass = false) {
    const id = `${r.id}-wall-${r.walls.length}`;
    r.walls.push({
      id,
      name: glass ? 'Glaswand' : 'Wand',
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: glass ? 5 : 12,
      material: glass ? 'glass' : 'solid',
    });
    return id;
  }
  function opening(
    r: OfficeRoom,
    wallId: string,
    offset: number,
    width: number,
    kind: 'door' | 'window' | 'double-door' = 'door',
  ) {
    r.openings.push({
      id: `${r.id}-opening-${r.openings.length}`,
      name: kind === 'window' ? 'Fenster' : 'Tür',
      wallId,
      kind,
      offset,
      width,
      hinge: 'left',
      swing: 'inward',
    });
  }
  function furniture(
    r: OfficeRoom,
    kind: FurnitureKind,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation = 0,
  ) {
    r.furniture.push({
      id: `${r.id}-f-${r.furniture.length}`,
      name: CATALOG.find((c) => c.kind === kind)?.name ?? 'Einrichtung',
      x,
      y,
      width,
      height,
      rotation,
      kind,
    });
  }
  function zone(
    r: OfficeRoom,
    kind: ZoneKind,
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const id = `${r.id}-zone-${r.zones.length}`;
    r.zones.push({ id, name, x, y, width, height, rotation: 0, kind, showLabel: true });
    return id;
  }
  function fixture(r: OfficeRoom, kind: FixtureKind, x: number, y: number, width: number, height: number) {
    r.fixtures.push({
      id: `${r.id}-${kind}`,
      name: { elevator: 'Aufzug', stairs: 'Treppenhaus', entrance: 'Eingang', column: 'Stütze' }[kind],
      kind,
      x,
      y,
      width,
      height,
      rotation: 0,
    });
  }
  function desks(r: OfficeRoom, prefix: string, centers: [number, number][], count: number) {
    let n = 1;
    for (const [cx, cy] of centers) {
      const groupId = `${r.id}-island-${n}`;
      for (let i = 0; i < count; i++) {
        const columns = count / 2;
        r.objects.push({
          id: `${prefix}-${n}`,
          name: `${prefix}-${String(n++).padStart(2, '0')}`,
          kind: 'desk',
          x: cx + ((i % columns) - (columns - 1) / 2) * 84,
          y: cy + (i < columns ? -29 : 29),
          width: 76,
          height: 44,
          rotation: i < columns ? 180 : 0,
          groupId,
          equipment: ['Monitor', 'Dockingstation', 'Ergonomischer Stuhl'],
        });
      }
    }
  }
  for (const r of [open, single, hybrid]) {
    const top = wall(r, 30, 30, r.width - 30, 30);
    wall(r, r.width - 30, 30, r.width - 30, r.height - 30);
    const bottom = wall(r, 30, r.height - 30, r.width - 30, r.height - 30);
    wall(r, 30, 30, 30, r.height - 30);
    for (let x = 130; x < r.width - 150; x += 230) opening(r, top, x, 135, 'window');
    opening(r, bottom, r.width / 2 - 30, 100, 'double-door');
  }
  zone(open, 'office', 'TEAMFLÄCHE', 455, 330, 840, 590);
  zone(open, 'corridor', 'ERSCHLIESSUNG', 600, 715, 1120, 100);
  desks(
    open,
    'OS',
    [
      [200, 220],
      [460, 220],
      [720, 220],
      [200, 480],
      [460, 480],
      [720, 480],
    ],
    4,
  );
  const service = wall(open, 915, 30, 915, 650, true);
  opening(open, service, 305, 85);
  zone(open, 'meeting', 'KURZBESPRECHUNG', 1040, 180, 235, 285);
  furniture(open, 'round-table', 1040, 170, 90, 90);
  for (const [x, y, a] of [
    [1040, 100, 180],
    [1040, 240, 0],
    [970, 170, 90],
    [1110, 170, 270],
  ])
    furniture(open, 'conference-chair', x, y, 30, 32, a);
  zone(open, 'lounge', 'PAUSE & AUSTAUSCH', 1040, 490, 235, 300);
  furniture(open, 'sofa', 1040, 420, 155, 55);
  furniture(open, 'coffee-table', 1040, 490, 70, 45);
  furniture(open, 'armchair', 980, 560, 50, 50);
  furniture(open, 'armchair', 1100, 560, 50, 50);
  for (const [x, y] of [
    [70, 90],
    [870, 90],
    [70, 610],
    [870, 610],
  ])
    furniture(open, 'plant-large', x, y, 42, 42);
  furniture(open, 'printer', 830, 715, 48, 44);
  furniture(open, 'cabinet', 260, 720, 150, 36);
  furniture(open, 'planter', 460, 365, 160, 28);
  zone(single, 'corridor', 'FLUR', 500, 360, 920, 100);
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 3; col++) {
      const x = 185 + col * 310,
        y = row === 0 ? 170 : 550;
      zone(single, 'office', `FOKUS ${row * 3 + col + 1}`, x, y, 295, 260);
      if (col < 2) wall(single, 340 + col * 310, row ? 410 : 30, 340 + col * 310, row ? 690 : 310);
      const w = wall(single, 30 + col * 310, row ? 410 : 310, 340 + col * 310, row ? 410 : 310, true);
      opening(single, w, 220, 70);
      const n = row * 3 + col + 1;
      single.objects.push({
        id: `EB-${n}`,
        name: `EB-${String(n).padStart(2, '0')}`,
        kind: 'desk',
        x,
        y,
        width: 76,
        height: 44,
        rotation: row ? 0 : 180,
        equipment: ['Monitor', 'Dockingstation', 'Ergonomischer Stuhl'],
      });
      furniture(single, 'cabinet', x - 80, row ? 625 : 90, 100, 30);
      furniture(single, 'plant-small', x + 100, y, 28, 28);
    }
  zone(hybrid, 'office', 'PROJEKTFLÄCHE', 425, 280, 780, 490);
  desks(
    hybrid,
    'HY',
    [
      [190, 260],
      [440, 260],
      [690, 260],
    ],
    4,
  );
  for (const x of [90, 790]) furniture(hybrid, 'plant-large', x, 90, 44, 44);
  furniture(hybrid, 'planter', 440, 430, 180, 32);
  furniture(hybrid, 'cabinet', 225, 90, 160, 34);
  furniture(hybrid, 'printer', 680, 90, 48, 44);
  wall(hybrid, 830, 310, 1370, 310);
  const corridorwall = wall(hybrid, 30, 560, 1370, 560, true);
  opening(hybrid, corridorwall, 700, 110, 'double-door');
  for (let i = 0; i < 2; i++) {
    const y = i ? 435 : 170;
    const zid = zone(hybrid, 'meeting', i ? 'IDEENWERK' : 'DENKRAUM', 1100, y, 525, 260);
    const w = wall(hybrid, 830, i ? 310 : 30, 830, i ? 560 : 310, true);
    opening(hybrid, w, 165, 80);
    hybrid.objects.push({
      id: `meeting-${i + 1}`,
      name: i ? 'Ideenwerk' : 'Denkraum',
      kind: 'meeting',
      x: 1100,
      y,
      width: 210,
      height: 160,
      rotation: 0,
      capacity: i ? 4 : 6,
      equipment: ['Bildschirm', 'Whiteboard', ...(i ? [] : ['Videokonferenz'])],
      zoneId: zid,
    });
    furniture(hybrid, 'whiteboard', 1325, y, 90, 14, 90);
  }
  zone(hybrid, 'corridor', 'VERBINDUNG', 700, 610, 1330, 85);
  const lower = wall(hybrid, 30, 660, 1370, 660);
  for (const offset of [130, 400, 680, 925, 1170]) opening(hybrid, lower, offset, 75);
  zone(hybrid, 'lounge', 'LOUNGE', 180, 765, 290, 200);
  furniture(hybrid, 'sofa', 180, 715, 150, 50);
  furniture(hybrid, 'coffee-table', 180, 775, 70, 45);
  furniture(hybrid, 'armchair', 90, 805, 50, 50, 90);
  furniture(hybrid, 'plant-small', 295, 825, 30, 30);
  zone(hybrid, 'kitchen', 'KÜCHE', 450, 765, 240, 200);
  wall(hybrid, 330, 660, 330, 870);
  wall(hybrid, 570, 660, 570, 870);
  furniture(hybrid, 'kitchen', 450, 835, 200, 45);
  furniture(hybrid, 'round-table', 450, 735, 70, 70);
  zone(hybrid, 'sanitary', 'WC', 680, 765, 210, 200);
  wall(hybrid, 790, 660, 790, 870);
  furniture(hybrid, 'toilet', 635, 820, 34, 52);
  furniture(hybrid, 'washbasin', 730, 820, 45, 32);
  furniture(hybrid, 'accessible-wc', 685, 720, 85, 85);
  fixture(hybrid, 'elevator', 890, 770, 115, 160);
  fixture(hybrid, 'stairs', 1040, 770, 125, 160);
  fixture(hybrid, 'entrance', 1190, 765, 100, 55);
  furniture(hybrid, 'reception', 1200, 705, 150, 50);
  furniture(hybrid, 'coat-rack', 1315, 830, 65, 24);
  return [open, single, hybrid];
}
