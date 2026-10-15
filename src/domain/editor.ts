import type { OfficeRoom, Point, WallOpening } from './types';
import {
  elementGeometry,
  removeElements,
  updateGeometry,
  clampOpening,
  isElementEditable,
  distance,
} from './design';
import { nextObjectName } from './layout';
export { designIssues, type PlanIssue } from './validation';
export function duplicateElements(room: OfficeRoom, ids: string[], foreign: OfficeRoom['objects'] = []) {
  const next = structuredClone(room),
    mapping = new Map<string, string>(),
    groups = new Map<string, string>();
  const included = new Set([...ids, ...room.openings.filter((o) => ids.includes(o.wallId)).map((o) => o.id)]);
  for (const id of included) mapping.set(id, crypto.randomUUID());
  for (const key of [
    'objects',
    'furniture',
    'fixtures',
    'zones',
    'walls',
    'openings',
    'annotations',
  ] as const)
    for (const item of room[key].filter((o) => included.has(o.id))) {
      const copy = structuredClone(item) as unknown as Record<string, unknown>;
      copy.id = mapping.get(item.id)!;
      if (item.groupId) {
        if (!groups.has(item.groupId)) groups.set(item.groupId, crypto.randomUUID());
        copy.groupId = groups.get(item.groupId);
      }
      if (key === 'walls') {
        copy.start = {
          x: (item as OfficeRoom['walls'][number]).start.x + 25,
          y: (item as OfficeRoom['walls'][number]).start.y + 25,
        };
        copy.end = {
          x: (item as OfficeRoom['walls'][number]).end.x + 25,
          y: (item as OfficeRoom['walls'][number]).end.y + 25,
        };
      } else if (key === 'openings') {
        const o = item as WallOpening;
        copy.wallId = mapping.get(o.wallId) ?? o.wallId;
        if (!mapping.has(o.wallId)) copy.offset = o.offset + 25;
      } else {
        const g = elementGeometry(room, item.id)!;
        copy.x = g.x + 25;
        copy.y = g.y + 25;
      }
      if (key === 'objects') {
        const kind = (item as OfficeRoom['objects'][number]).kind;
        copy.name = nextObjectName(kind, [...foreign, ...next.objects]);
        const zone = (item as OfficeRoom['objects'][number]).zoneId;
        if (zone) copy.zoneId = mapping.get(zone) ?? zone;
      }
      (next[key] as unknown[]).push(copy);
    }
  return { room: next, ids: ids.map((id) => mapping.get(id)!) };
}
export function pasteElements(
  room: OfficeRoom,
  clipboard: OfficeRoom,
  ids: string[],
  foreign: OfficeRoom['objects'] = [],
) {
  const copy = duplicateElements(clipboard, ids, [...foreign, ...room.objects]);
  const additions = new Set(copy.ids);
  for (const o of copy.room.openings) if (additions.has(o.wallId)) additions.add(o.id);
  const next = structuredClone(room);
  for (const key of [
    'objects',
    'furniture',
    'fixtures',
    'zones',
    'walls',
    'openings',
    'annotations',
  ] as const)
    (next[key] as unknown[]).push(...copy.room[key].filter((o) => additions.has(o.id)));
  return { room: next, ids: copy.ids };
}
export function alignElements(
  room: OfficeRoom,
  ids: string[],
  mode: 'left' | 'center' | 'top' | 'distribute-x' | 'distribute-y',
) {
  const values = ids.map((id) => elementGeometry(room, id)).filter((v) => !!v);
  if (values.length < 2) return room;
  let next = room;
  if (mode.startsWith('distribute')) {
    const axis = mode === 'distribute-x' ? 'x' : 'y';
    values.sort((a, b) => a[axis] - b[axis]);
    const first = values[0][axis],
      gap = (values.at(-1)![axis] - first) / (values.length - 1);
    values.forEach((v, i) => (next = updateGeometry(next, v.id, { [axis]: first + gap * i })));
  } else {
    const first = values[0];
    for (const v of values.slice(1))
      next = updateGeometry(
        next,
        v.id,
        mode === 'top'
          ? { y: first.y - first.height / 2 + v.height / 2 }
          : mode === 'left'
            ? { x: first.x - first.width / 2 + v.width / 2 }
            : { x: first.x },
      );
  }
  return next;
}
export function connectWallEndpoint(
  room: OfficeRoom,
  id: string,
  end: 'start' | 'end',
  point: Point,
): OfficeRoom {
  const wall = room.walls.find((w) => w.id === id);
  if (!wall) return room;
  const old = wall[end];
  const next = {
    ...room,
    walls: room.walls.map((w) => ({
      ...w,
      start: distance(w.start, old) < 0.1 ? point : w.start,
      end: distance(w.end, old) < 0.1 ? point : w.end,
    })),
  };
  return {
    ...next,
    openings: next.openings.map((o) => {
      const w = next.walls.find((w) => w.id === o.wallId)!;
      return clampOpening(o, w);
    }),
  };
}
export function deletableSelection(room: OfficeRoom, ids: string[], bookedIds: string[]) {
  return removeElements(
    room,
    ids.filter((id) => isElementEditable(room, id) && !bookedIds.includes(id)),
  );
}
