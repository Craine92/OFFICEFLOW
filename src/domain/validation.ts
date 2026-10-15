import type { OfficeRoom, ElementGeometry } from './types';
import { collisions, objectCorners, objectsOverlap } from './geometry';
import { getElement, wallLength, wallSolidSegments, distance } from './design';
export interface PlanIssue {
  ids: string[];
  message: string;
  severity: 'error' | 'warning';
}
export function designIssues(room: OfficeRoom): PlanIssue[] {
  const result: PlanIssue[] = [];
  const wallParts: ElementGeometry[] = [];
  const solids = [
    ...room.objects.filter((o) => o.kind === 'desk'),
    ...room.furniture.filter(
      (o) =>
        ![
          'rug',
          'lamp',
          'monitor',
          'office-chair',
          'visitor-chair',
          'conference-chair',
          'whiteboard',
          'plant-small',
        ].includes(o.kind),
    ),
    ...room.fixtures,
  ];
  for (const [a, b] of collisions(solids))
    result.push({
      ids: [a, b],
      message: `${getElement(room, a)?.name} überschneidet ${getElement(room, b)?.name}.`,
      severity: 'warning',
    });
  for (const o of [
    ...room.objects,
    ...room.furniture,
    ...room.fixtures,
    ...room.zones,
    ...room.annotations,
  ]) {
    if (
      !o.name.trim() ||
      ![o.x, o.y, o.width, o.height, o.rotation].every(Number.isFinite) ||
      o.width < 2 ||
      o.height < 2
    )
      result.push({
        ids: [o.id],
        message: 'Bitte prüfen Sie Bezeichnung und Abmessungen des Elements.',
        severity: 'error',
      });
    if (objectCorners(o).some((p) => p.x < 0 || p.y < 0 || p.x > room.width || p.y > room.height))
      result.push({ ids: [o.id], message: `${o.name} liegt außerhalb der Planfläche.`, severity: 'error' });
  }
  for (const w of room.walls) {
    if (
      wallLength(w) < 12 ||
      w.thickness < 2 ||
      w.thickness > 100 ||
      ![w.start.x, w.start.y, w.end.x, w.end.y, w.thickness].every(Number.isFinite)
    )
      result.push({ ids: [w.id], message: 'Wandlänge oder Wandstärke ungültig.', severity: 'error' });
    if ([w.start, w.end].some((p) => p.x < 0 || p.y < 0 || p.x > room.width || p.y > room.height))
      result.push({ ids: [w.id], message: 'Eine Wand liegt außerhalb des Plans.', severity: 'error' });
    for (const [start, end] of wallSolidSegments(w, room.openings)) {
      const length = wallLength(w),
        dx = (w.end.x - w.start.x) / length,
        dy = (w.end.y - w.start.y) / length;
      const geometry = {
        id: w.id,
        name: w.name,
        x: w.start.x + (dx * (start + end)) / 2,
        y: w.start.y + (dy * (start + end)) / 2,
        width: end - start,
        height: w.thickness,
        rotation: (Math.atan2(dy, dx) * 180) / Math.PI,
      };
      wallParts.push(geometry);
      for (const o of solids)
        if (objectsOverlap(geometry, o))
          result.push({
            ids: [w.id, o.id],
            message: `${o.name} überschneidet eine Wand.`,
            severity: 'warning',
          });
    }
  }
  for (let i = 0; i < room.walls.length; i++)
    for (let j = i + 1; j < room.walls.length; j++) {
      const a = room.walls[i],
        b = room.walls[j];
      const shared = [a.start, a.end].some((p) => [b.start, b.end].some((q) => distance(p, q) < 0.1));
      const duplicate =
        (distance(a.start, b.start) < 0.1 && distance(a.end, b.end) < 0.1) ||
        (distance(a.start, b.end) < 0.1 && distance(a.end, b.start) < 0.1);
      if (
        (!shared || duplicate) &&
        wallParts
          .filter((p) => p.id === a.id)
          .some((p) => wallParts.filter((q) => q.id === b.id).some((q) => objectsOverlap(p, q)))
      )
        result.push({
          ids: [a.id, b.id],
          message: 'Wandsegmente kreuzen oder überlagern sich. Verbindung prüfen.',
          severity: 'warning',
        });
    }
  for (const o of room.openings) {
    const w = room.walls.find((w) => w.id === o.wallId);
    if (!w || o.width < 12 || o.offset - o.width / 2 < 0 || o.offset + o.width / 2 > wallLength(w))
      result.push({
        ids: [o.id],
        message: `${o.name}: Öffnung liegt außerhalb ihrer Wand.`,
        severity: 'error',
      });
    for (const other of room.openings)
      if (
        o.id < other.id &&
        o.wallId === other.wallId &&
        Math.abs(o.offset - other.offset) < (o.width + other.width) / 2
      )
        result.push({
          ids: [o.id, other.id],
          message: 'Zwei Wandöffnungen überlappen.',
          severity: 'warning',
        });
  }
  return result;
}
