import type { OfficeRoom, PlanBackground, PlanObject } from './types';
import { designIssues } from './validation';
import { objectCorners } from './geometry';
export { objectCorners, objectsOverlap, collisions } from './geometry';

type Dimensions = Pick<OfficeRoom, 'width' | 'height' | 'layout'>;
const demo: Dimensions = { width: 900, height: 570, layout: 'demo' };
export function planBounds(room: Dimensions = demo) {
  return room.layout === 'custom'
    ? { left: 8, top: 8, right: room.width - 8, bottom: room.height - 8 }
    : {
        left: (room.width * 48) / 900,
        top: (room.height * 50) / 570,
        right: (room.width * 852) / 900,
        bottom: (room.height * 516) / 570,
      };
}
export function constrainObject(object: PlanObject, room: Dimensions = demo): PlanObject {
  const bounds = planBounds(room);
  const radians = (object.rotation * Math.PI) / 180;
  const width = Math.abs(object.width * Math.cos(radians)) + Math.abs(object.height * Math.sin(radians));
  const height = Math.abs(object.width * Math.sin(radians)) + Math.abs(object.height * Math.cos(radians));
  return {
    ...object,
    x: Math.max(bounds.left + width / 2, Math.min(bounds.right - width / 2, object.x)),
    y: Math.max(bounds.top + height / 2, Math.min(bounds.bottom - height / 2, object.y)),
  };
}
export function objectFits(object: PlanObject, room: Dimensions) {
  const next = constrainObject(object, room),
    bounds = planBounds(room);
  return (
    Math.abs(next.x - object.x) < 0.01 &&
    Math.abs(next.y - object.y) < 0.01 &&
    objectCorners(next).every(
      (p) =>
        p.x >= bounds.left - 0.01 &&
        p.x <= bounds.right + 0.01 &&
        p.y >= bounds.top - 0.01 &&
        p.y <= bounds.bottom + 0.01,
    )
  );
}
export function nextObjectName(kind: PlanObject['kind'], objects: PlanObject[]) {
  const prefix = kind === 'desk' ? 'AP-' : 'Meetingraum ';
  const names = new Set(objects.map((o) => o.name.toLocaleLowerCase('de-DE')));
  let n = 1;
  while (names.has(`${prefix}${kind === 'desk' ? String(n).padStart(2, '0') : n}`.toLocaleLowerCase('de-DE')))
    n++;
  return `${prefix}${kind === 'desk' ? String(n).padStart(2, '0') : n}`;
}
export function fitBackground(
  image: { width: number; height: number },
  room: Dimensions,
  rotation = 0,
): Pick<PlanBackground, 'x' | 'y' | 'width' | 'height' | 'rotation'> {
  const swap = rotation % 180 !== 0;
  const scale = Math.min(
    room.width / (swap ? image.height : image.width),
    room.height / (swap ? image.width : image.height),
  );
  return {
    x: room.width / 2,
    y: room.height / 2,
    width: image.width * scale,
    height: image.height * scale,
    rotation,
  };
}
export function resizeRoom(room: OfficeRoom, width: number, height: number): OfficeRoom {
  const sx = width / room.width,
    sy = height / room.height,
    next = { ...room, width, height };
  return {
    ...next,
    walls: room.walls.map((w) => ({
      ...w,
      start: { x: w.start.x * sx, y: w.start.y * sy },
      end: { x: w.end.x * sx, y: w.end.y * sy },
    })),
    openings: room.openings.map((o) => {
      const w = room.walls.find((w) => w.id === o.wallId);
      const factor = w
        ? Math.hypot((w.end.x - w.start.x) * sx, (w.end.y - w.start.y) * sy) /
          Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y)
        : 1;
      return { ...o, offset: o.offset * factor };
    }),
    zones: room.zones.map((o) => ({
      ...o,
      x: o.x * sx,
      y: o.y * sy,
      width: o.width * sx,
      height: o.height * sy,
    })),
    furniture: room.furniture.map((o) => ({ ...o, x: o.x * sx, y: o.y * sy })),
    fixtures: room.fixtures.map((o) => ({ ...o, x: o.x * sx, y: o.y * sy })),
    annotations: room.annotations.map((o) => ({ ...o, x: o.x * sx, y: o.y * sy })),
    calibration: undefined,
    objects: room.objects.map((o) => constrainObject({ ...o, x: o.x * sx, y: o.y * sy }, next)),
    background: room.background
      ? {
          ...room.background,
          x: room.background.x * sx,
          y: room.background.y * sy,
          width: room.background.width * Math.min(sx, sy),
          height: room.background.height * Math.min(sx, sy),
        }
      : undefined,
  };
}
export function validateRoom(room: OfficeRoom, rooms: OfficeRoom[] = []): string | null {
  if (!room.name.trim()) return 'Bitte geben Sie dem Bürobereich einen Namen.';
  if (![room.width, room.height].every((n) => Number.isFinite(n) && n >= 160 && n <= 6000))
    return 'Planabmessungen müssen zwischen 160 und 6000 Planeinheiten liegen.';
  if (
    room.objects.some(
      (o) =>
        !o.name.trim() ||
        o.name.length > 50 ||
        ![o.x, o.y, o.rotation, o.width, o.height].every(Number.isFinite) ||
        o.width < 12 ||
        o.height < 12 ||
        !objectFits(o, { ...room, layout: 'custom' }),
    )
  )
    return 'Bitte prüfen Sie Bezeichnungen, Größen und Raumgrenzen aller Objekte.';
  if (
    room.objects.some(
      (o) => o.kind === 'meeting' && (!Number.isInteger(o.capacity) || o.capacity! < 1 || o.capacity! > 100),
    )
  )
    return 'Meetingräume benötigen eine Kapazität zwischen 1 und 100 Personen.';
  const names = room.objects
    .filter((o) => ['desk', 'meeting'].includes(o.kind))
    .map((o) => o.name.trim().toLocaleLowerCase('de-DE'));
  if (new Set(names).size !== names.length) return 'Buchbare Objekte benötigen eindeutige Bezeichnungen.';
  const foreignNames = new Set(
    rooms
      .filter((r) => r.id !== room.id)
      .flatMap((r) =>
        r.objects
          .filter((o) => ['desk', 'meeting'].includes(o.kind))
          .map((o) => o.name.trim().toLocaleLowerCase('de-DE')),
      ),
  );
  const previous = rooms.find((r) => r.id === room.id);
  if (
    room.objects.some(
      (o) =>
        ['desk', 'meeting'].includes(o.kind) &&
        foreignNames.has(o.name.trim().toLocaleLowerCase('de-DE')) &&
        !previous?.objects.some(
          (old) =>
            old.id === o.id &&
            old.name.trim().toLocaleLowerCase('de-DE') === o.name.trim().toLocaleLowerCase('de-DE'),
        ),
    )
  )
    return 'Diese Bezeichnung wird bereits in einem anderen Bürobereich verwendet. Bitte vergeben Sie eine eindeutige Arbeitsplatznummer.';
  return designIssues(room).find((i) => i.severity === 'error')?.message ?? null;
}
