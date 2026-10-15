import type { ElementGeometry } from './types';
export function objectCorners(object: ElementGeometry) {
  const radians = (object.rotation * Math.PI) / 180;
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, y]) => ({
    x:
      object.x + ((x * object.width) / 2) * Math.cos(radians) - ((y * object.height) / 2) * Math.sin(radians),
    y:
      object.y + ((x * object.width) / 2) * Math.sin(radians) + ((y * object.height) / 2) * Math.cos(radians),
  }));
}
// Separating-Axis-Theorem für gedrehte Objekte; Berührungen gelten nicht als Überlappung.
export function objectsOverlap(a: ElementGeometry, b: ElementGeometry) {
  const ac = objectCorners(a),
    bc = objectCorners(b);
  for (const corners of [ac, bc])
    for (let i = 0; i < 2; i++) {
      const p = corners[i],
        q = corners[i + 1],
        axis = { x: -(q.y - p.y), y: q.x - p.x };
      const pa = ac.map((v) => v.x * axis.x + v.y * axis.y),
        pb = bc.map((v) => v.x * axis.x + v.y * axis.y);
      if (Math.max(...pa) <= Math.min(...pb) + 0.001 || Math.max(...pb) <= Math.min(...pa) + 0.001)
        return false;
    }
  return true;
}
export function collisions(objects: ElementGeometry[]) {
  const result: [string, string][] = [];
  for (let i = 0; i < objects.length; i++)
    for (let j = i + 1; j < objects.length; j++)
      if (objectsOverlap(objects[i], objects[j])) result.push([objects[i].id, objects[j].id]);
  return result;
}
