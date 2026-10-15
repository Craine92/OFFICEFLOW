import type { OfficeRoom, FurnitureKind, FixtureKind, ZoneKind, ElementType } from './types';
import { nextObjectName, objectsOverlap } from './layout';
export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  type: ElementType | 'cluster';
  kind: string;
  width: number;
  height: number;
  count?: number;
}
const furniture: [FurnitureKind, string, number, number][] = [
  ['office-chair', 'Bürostuhl', 34, 36],
  ['visitor-chair', 'Besucherstuhl', 30, 32],
  ['conference-chair', 'Konferenzstuhl', 30, 32],
  ['pedestal', 'Rollcontainer', 28, 34],
  ['cabinet', 'Aktenschrank', 90, 32],
  ['shelf', 'Regal', 100, 30],
  ['printer', 'Drucker', 45, 42],
  ['monitor', 'Monitor & Dock', 36, 20],
  ['whiteboard', 'Whiteboard', 100, 16],
  ['conference-table', 'Konferenztisch', 160, 75],
  ['round-table', 'Runder Besprechungstisch', 90, 90],
  ['sofa', 'Sofa', 130, 52],
  ['armchair', 'Sessel', 55, 55],
  ['coffee-table', 'Couchtisch', 65, 45],
  ['kitchen', 'Küchenzeile', 190, 48],
  ['sink', 'Spüle', 55, 48],
  ['coffee-machine', 'Kaffeemaschine', 30, 28],
  ['reception', 'Empfangstresen', 160, 65],
  ['coat-rack', 'Garderobe', 70, 24],
  ['toilet', 'Toilette', 34, 52],
  ['washbasin', 'Waschbecken', 45, 32],
  ['accessible-wc', 'Barrierefreies WC · Symbol', 90, 90],
  ['plant-small', 'Kleine Zimmerpflanze', 26, 26],
  ['plant-large', 'Große Zimmerpflanze', 44, 44],
  ['planter', 'Pflanzkübel', 100, 30],
  ['rug', 'Teppich', 180, 110],
  ['divider', 'Raumteiler', 120, 18],
  ['lamp', 'Dekorative Leuchte', 32, 32],
];
export const CATALOG: CatalogItem[] = [
  {
    id: 'desk',
    name: 'Einzelarbeitsplatz',
    category: 'Arbeitsplätze',
    type: 'resource',
    kind: 'desk',
    width: 76,
    height: 44,
  },
  {
    id: 'corner',
    name: 'Eckschreibtisch',
    category: 'Arbeitsplätze',
    type: 'resource',
    kind: 'corner',
    width: 95,
    height: 80,
  },
  ...[2, 4, 6].map((count) => ({
    id: `cluster-${count}`,
    name: `${count}er-Arbeitsplatzgruppe`,
    category: 'Arbeitsplätze',
    type: 'cluster' as const,
    kind: 'desk',
    width: count === 2 ? 160 : count === 4 ? 160 : 244,
    height: 110,
    count,
  })),
  {
    id: 'meeting',
    name: 'Buchbarer Meetingraum',
    category: 'Arbeitsplätze',
    type: 'resource',
    kind: 'meeting',
    width: 210,
    height: 160,
  },
  ...(['elevator', 'stairs', 'entrance', 'column'] as FixtureKind[]).map((kind, i) => ({
    id: kind,
    name: ['Aufzug', 'Treppe', 'Eingang', 'Gebäudestütze'][i],
    category: 'Gebäude',
    type: 'fixture' as const,
    kind,
    width: [110, 120, 100, 30][i],
    height: [120, 150, 55, 30][i],
  })),
  ...(
    ['office', 'meeting', 'corridor', 'lounge', 'kitchen', 'sanitary', 'technical', 'storage'] as ZoneKind[]
  ).map((kind, i) => ({
    id: `zone-${kind}`,
    name: [
      'Bürozone',
      'Besprechungszone',
      'Flur',
      'Loungezone',
      'Küchenzone',
      'Sanitärbereich',
      'Technikraum',
      'Abstellraum',
    ][i],
    category: 'Raumzonen',
    type: 'zone' as const,
    kind,
    width: 200,
    height: 160,
  })),
  ...furniture.map(([kind, name, width, height]) => ({
    id: kind,
    name,
    category: ['toilet', 'washbasin', 'accessible-wc'].includes(kind)
      ? 'Sanitär'
      : kind.includes('plant') || ['rug', 'divider', 'lamp'].includes(kind)
        ? 'Pflanzen & Dekoration'
        : [
              'sofa',
              'armchair',
              'coffee-table',
              'kitchen',
              'sink',
              'coffee-machine',
              'reception',
              'coat-rack',
              'conference-table',
              'round-table',
            ].includes(kind)
          ? 'Gemeinschaft'
          : 'Büroausstattung',
    type: 'furniture' as const,
    kind,
    width,
    height,
  })),
];
export function addCatalogItem(
  room: OfficeRoom,
  item: CatalogItem,
  foreign: OfficeRoom['objects'] = [],
  point?: { x: number; y: number },
): { room: OfficeRoom; ids: string[] } {
  const next = structuredClone(room),
    ids: string[] = [];
  const groupId = item.type === 'cluster' ? crypto.randomUUID() : undefined;
  let x = point?.x ?? room.width / 2,
    y = point?.y ?? room.height / 2;
  if (!point) {
    search: for (
      let py = Math.max(80, item.height / 2 + 20);
      py < room.height - item.height / 2 - 12;
      py += 25
    )
      for (let px = Math.max(80, item.width / 2 + 20); px < room.width - item.width / 2 - 12; px += 25) {
        if (
          [...room.objects, ...room.furniture, ...room.fixtures].every(
            (o) =>
              !objectsOverlap(
                {
                  id: '',
                  name: '',
                  x: px,
                  y: py,
                  width: item.width + 16,
                  height: item.height + 16,
                  rotation: 0,
                },
                o,
              ),
          )
        ) {
          x = px;
          y = py;
          break search;
        }
      }
  }
  const count = item.count ?? 1;
  for (let n = 0; n < count; n++) {
    const id = crypto.randomUUID();
    ids.push(id);
    const columns = count === 2 ? 2 : count / 2;
    const g = {
      id,
      name: item.name,
      x: x + (count > 1 ? ((n % columns) - (columns - 1) / 2) * 84 : 0),
      y: y + (count > 2 ? (n < columns ? -29 : 29) : 0),
      width: count > 1 ? 76 : item.width,
      height: count > 1 ? 44 : item.height,
      rotation: count > 2 && n < columns ? 180 : 0,
      groupId,
    };
    if (item.type === 'resource' || item.type === 'cluster') {
      const kind = item.kind === 'meeting' ? 'meeting' : 'desk';
      next.objects.push({
        ...g,
        kind,
        name: nextObjectName(kind, [...foreign, ...next.objects]),
        variant: item.kind === 'corner' ? 'corner' : 'standard',
        capacity: kind === 'meeting' ? 6 : undefined,
        equipment: ['Monitor', 'Dockingstation', 'Ergonomischer Stuhl'],
      });
    } else if (item.type === 'fixture') next.fixtures.push({ ...g, kind: item.kind as FixtureKind });
    else if (item.type === 'zone') next.zones.push({ ...g, kind: item.kind as ZoneKind, showLabel: true });
    else next.furniture.push({ ...g, kind: item.kind as FurnitureKind });
  }
  return { room: next, ids };
}
