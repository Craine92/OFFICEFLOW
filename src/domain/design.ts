import type {
  OfficeRoom,
  FloorDesign,
  LayerId,
  ElementGeometry,
  Point,
  WallSegment,
  WallOpening,
  SelectedElement,
  ElementType,
  PlanLayers,
} from './types';

export const LAYER_NAMES: Record<LayerId, string> = {
  background: 'Importierter Hintergrund',
  architecture: 'Architektur',
  furniture: 'Gebäudeeinrichtung',
  resources: 'Buchbare Ressourcen',
  annotations: 'Beschriftungen & Maße',
};
export const LAYER_IDS = Object.keys(LAYER_NAMES) as LayerId[];
export function defaultLayers(): PlanLayers {
  return Object.fromEntries(LAYER_IDS.map((id) => [id, { visible: true, locked: false }])) as PlanLayers;
}
export function emptyDesign(): FloorDesign {
  return {
    walls: [],
    openings: [],
    zones: [],
    furniture: [],
    fixtures: [],
    annotations: [],
    layers: defaultLayers(),
  };
}
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const wallLength = (wall: WallSegment) => distance(wall.start, wall.end);
export const wallAngle = (wall: WallSegment) =>
  (Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x) * 180) / Math.PI;
export function openingPosition(wall: WallSegment, opening: Pick<WallOpening, 'offset'>): Point {
  const t = wallLength(wall) ? opening.offset / wallLength(wall) : 0;
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * t,
    y: wall.start.y + (wall.end.y - wall.start.y) * t,
  };
}
export function projectToWall(point: Point, wall: WallSegment) {
  const length = wallLength(wall),
    dx = wall.end.x - wall.start.x,
    dy = wall.end.y - wall.start.y;
  const t = Math.max(
    0,
    Math.min(1, ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / (length * length || 1)),
  );
  const position = { x: wall.start.x + dx * t, y: wall.start.y + dy * t };
  return { position, offset: t * length, distance: distance(point, position) };
}
export function findWall(point: Point, walls: WallSegment[], threshold = 60) {
  return walls
    .map((wall) => ({ wall, ...projectToWall(point, wall) }))
    .sort((a, b) => a.distance - b.distance)
    .find((v) => v.distance <= threshold);
}
export function clampOpening(opening: WallOpening, wall: WallSegment): WallOpening {
  const width = Math.max(12, Math.min(opening.width, wallLength(wall) - 4));
  return {
    ...opening,
    width,
    offset: Math.max(width / 2 + 2, Math.min(wallLength(wall) - width / 2 - 2, opening.offset)),
  };
}
/** Die Wand wird als echte Teilsegmente gezeichnet; Öffnungen sind keine übermalten Attrappen. */
export function wallSolidSegments(wall: WallSegment, openings: WallOpening[]) {
  const length = wallLength(wall);
  const gaps = openings
    .filter((o) => o.wallId === wall.id)
    .map((o) => [Math.max(0, o.offset - o.width / 2), Math.min(length, o.offset + o.width / 2)])
    .sort((a, b) => a[0] - b[0]);
  const segments: [number, number][] = [];
  let cursor = 0;
  for (const [start, end] of gaps) {
    if (start > cursor) segments.push([cursor, start]);
    cursor = Math.max(cursor, end);
  }
  if (cursor < length) segments.push([cursor, length]);
  return segments;
}
export function unitsPerMeter(room: Pick<OfficeRoom, 'calibration'>) {
  const c = room.calibration;
  return c && c.meters > 0 && distance(c.start, c.end) > 0 ? distance(c.start, c.end) / c.meters : null;
}
export function formatLength(value: number, room: Pick<OfficeRoom, 'calibration'>) {
  const scale = unitsPerMeter(room);
  return scale
    ? `${(value / scale).toLocaleString('de-DE', { maximumFractionDigits: 2 })} m`
    : `${Math.round(value)} PE`;
}
export function planArea(room: OfficeRoom) {
  const scale = unitsPerMeter(room);
  return scale
    ? `${((room.width * room.height) / (scale * scale)).toLocaleString('de-DE', { maximumFractionDigits: 1 })} m²`
    : 'Maßstab nicht kalibriert';
}
export function snapPoint(
  point: Point,
  room: OfficeRoom,
  enabled = true,
  excludeIds: string[] = [],
  threshold = 10,
): Point {
  const p = {
    x: Math.max(8, Math.min(room.width - 8, point.x)),
    y: Math.max(8, Math.min(room.height - 8, point.y)),
  };
  if (!enabled) return p;
  const xs: number[] = [],
    ys: number[] = [];
  for (const wall of room.walls.filter((w) => !excludeIds.includes(w.id))) {
    xs.push(wall.start.x, wall.end.x);
    ys.push(wall.start.y, wall.end.y);
  }
  for (const item of [...room.objects, ...room.furniture, ...room.fixtures, ...room.zones].filter(
    (o) => !excludeIds.includes(o.id),
  )) {
    xs.push(item.x, item.x - item.width / 2, item.x + item.width / 2);
    ys.push(item.y, item.y - item.height / 2, item.y + item.height / 2);
  }
  const closest = (n: number, values: number[]) => {
    const near = values.sort((a, b) => Math.abs(a - n) - Math.abs(b - n))[0];
    return near !== undefined && Math.abs(near - n) <= threshold ? near : Math.round(n / 5) * 5;
  };
  return { x: closest(p.x, xs), y: closest(p.y, ys) };
}
export function orthogonalEnd(start: Point, point: Point): Point {
  return Math.abs(point.x - start.x) >= Math.abs(point.y - start.y)
    ? { x: point.x, y: start.y }
    : { x: start.x, y: point.y };
}
export function snapElementPosition(
  room: OfficeRoom,
  id: string,
  point: Point,
  enabled: boolean,
  excluded: string[] = [],
) {
  if (!enabled) return point;
  const g = elementGeometry(room, id);
  if (!g) return snapPoint(point, room, true, excluded);
  const radians = (g.rotation * Math.PI) / 180,
    w = Math.abs(g.width * Math.cos(radians)) + Math.abs(g.height * Math.sin(radians)),
    h = Math.abs(g.width * Math.sin(radians)) + Math.abs(g.height * Math.cos(radians));
  const result = { ...point };
  for (const axis of ['x', 'y'] as const) {
    const half = (axis === 'x' ? w : h) / 2;
    let delta = Infinity;
    for (const offset of [-half, 0, half]) {
      const p = { ...point, [axis]: point[axis] + offset };
      const snapped = snapPoint(p, room, true, [...excluded, id]);
      const d = snapped[axis] - p[axis];
      if (Math.abs(d) < Math.abs(delta)) delta = d;
    }
    if (Math.abs(delta) <= 10) result[axis] += delta;
  }
  return result;
}
export const elementLayer = (type: ElementType): LayerId =>
  type === 'resource'
    ? 'resources'
    : type === 'furniture'
      ? 'furniture'
      : type === 'annotation'
        ? 'annotations'
        : 'architecture';
const collections = {
  resource: 'objects',
  furniture: 'furniture',
  fixture: 'fixtures',
  zone: 'zones',
  wall: 'walls',
  opening: 'openings',
  annotation: 'annotations',
} as const;
export function selectedElement(room: OfficeRoom, id: string): SelectedElement | undefined {
  for (const [type, key] of Object.entries(collections))
    if (room[key as (typeof collections)[ElementType]]?.some((o: { id: string }) => o.id === id))
      return { type: type as ElementType, id };
  return undefined;
}
export function listElements(room: OfficeRoom) {
  return (Object.keys(collections) as ElementType[]).flatMap((type) =>
    room[collections[type]].map((item) => ({ type, id: item.id, name: item.name })),
  );
}
export function getElement(room: OfficeRoom, id: string) {
  const ref = selectedElement(room, id);
  return ref ? room[collections[ref.type]].find((o) => o.id === id) : undefined;
}
export function elementGeometry(room: OfficeRoom, id: string): ElementGeometry | undefined {
  const ref = selectedElement(room, id);
  if (!ref) return;
  if (ref.type === 'wall') {
    const w = room.walls.find((w) => w.id === id)!;
    return {
      id: w.id,
      name: w.name,
      x: (w.start.x + w.end.x) / 2,
      y: (w.start.y + w.end.y) / 2,
      width: wallLength(w),
      height: w.thickness,
      rotation: wallAngle(w),
      groupId: w.groupId,
    };
  }
  if (ref.type === 'opening') {
    const o = room.openings.find((o) => o.id === id)!,
      w = room.walls.find((w) => w.id === o.wallId);
    if (!w) return;
    return {
      id: o.id,
      name: o.name,
      ...openingPosition(w, o),
      width: o.width,
      height: w.thickness,
      rotation: wallAngle(w),
      groupId: o.groupId,
    };
  }
  return getElement(room, id) as ElementGeometry;
}
export function isElementEditable(room: OfficeRoom, id: string) {
  const ref = selectedElement(room, id);
  if (!ref) return false;
  const layer = room.layers[elementLayer(ref.type)];
  return layer.visible && !layer.locked;
}
export function expandGroups(room: OfficeRoom, ids: string[]) {
  const groups = new Set(ids.map((id) => getElement(room, id)?.groupId).filter(Boolean));
  return [
    ...new Set([
      ...ids,
      ...listElements(room)
        .filter((ref) => {
          const group = getElement(room, ref.id)?.groupId;
          return group && groups.has(group);
        })
        .map((ref) => ref.id),
    ]),
  ];
}
export function updateGeometry(room: OfficeRoom, id: string, patch: Partial<ElementGeometry>): OfficeRoom {
  const ref = selectedElement(room, id);
  if (!ref) return room;
  if (ref.type === 'wall') {
    return {
      ...room,
      walls: room.walls.map((w) => {
        if (w.id !== id) return w;
        const g = elementGeometry(room, id)!;
        const angle = ((patch.rotation ?? g.rotation) * Math.PI) / 180;
        const length = patch.width ?? g.width,
          x = patch.x ?? g.x,
          y = patch.y ?? g.y;
        return {
          ...w,
          color: patch.color ?? w.color,
          name: patch.name ?? w.name,
          thickness: patch.height ?? w.thickness,
          groupId: patch.groupId === undefined ? w.groupId : patch.groupId,
          start: { x: x - (Math.cos(angle) * length) / 2, y: y - (Math.sin(angle) * length) / 2 },
          end: { x: x + (Math.cos(angle) * length) / 2, y: y + (Math.sin(angle) * length) / 2 },
        };
      }),
    };
  }
  if (ref.type === 'opening') {
    return {
      ...room,
      openings: room.openings.map((o) => {
        if (o.id !== id) return o;
        const w = room.walls.find((w) => w.id === o.wallId)!;
        const g = elementGeometry(room, id)!;
        return clampOpening(
          {
            ...o,
            name: patch.name ?? o.name,
            width: patch.width ?? o.width,
            ...(patch.x !== undefined || patch.y !== undefined
              ? { offset: projectToWall({ x: patch.x ?? g.x, y: patch.y ?? g.y }, w).offset }
              : {}),
          },
          w,
        );
      }),
    };
  }
  const key = collections[ref.type];
  return { ...room, [key]: room[key].map((o) => (o.id === id ? { ...o, ...patch } : o)) };
}
export function translateElements(room: OfficeRoom, ids: string[], dx: number, dy: number): OfficeRoom {
  let next = room;
  for (const id of ids) {
    const ref = selectedElement(room, id);
    if (ref?.type === 'opening' && ids.includes(room.openings.find((o) => o.id === id)!.wallId)) continue;
    const g = elementGeometry(room, id);
    if (g) next = updateGeometry(next, id, { x: g.x + dx, y: g.y + dy });
  }
  return next;
}
export function removeElements(room: OfficeRoom, ids: string[]): OfficeRoom {
  const removed = new Set(ids);
  return {
    ...room,
    objects: room.objects.filter((o) => !removed.has(o.id)),
    furniture: room.furniture.filter((o) => !removed.has(o.id)),
    fixtures: room.fixtures.filter((o) => !removed.has(o.id)),
    zones: room.zones.filter((o) => !removed.has(o.id)),
    walls: room.walls.filter((o) => !removed.has(o.id)),
    openings: room.openings.filter((o) => !removed.has(o.id) && !removed.has(o.wallId)),
    annotations: room.annotations.filter((o) => !removed.has(o.id)),
  };
}
export function setElementGroup(room: OfficeRoom, ids: string[], groupId?: string): OfficeRoom {
  const next = structuredClone(room);
  for (const type of Object.keys(collections) as ElementType[])
    for (const item of next[collections[type]]) if (ids.includes(item.id)) item.groupId = groupId;
  return next;
}
export function reorderElements(room: OfficeRoom, ids: string[], front: boolean): OfficeRoom {
  const next = structuredClone(room);
  for (const key of Object.values(collections)) {
    const items = next[key];
    const selected = items.filter((o) => ids.includes(o.id)),
      others = items.filter((o) => !ids.includes(o.id));
    Object.assign(next, { [key]: front ? [...others, ...selected] : [...selected, ...others] });
  }
  return next;
}
