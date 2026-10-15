import { expect, it } from 'vitest';
import {
  constrainObject,
  objectsOverlap,
  collisions,
  nextObjectName,
  fitBackground,
  resizeRoom,
  validateRoom,
} from './layout';
import { createSeed } from '../data/seed';
it('hält auch gedrehte Meetingräume innerhalb der Außenwände', () => {
  const room = createSeed().rooms[2].objects.find((o) => o.kind === 'meeting')!;
  expect(constrainObject({ ...room, x: 900, y: 900 })).toMatchObject({ x: 747, y: 436 });
  expect(constrainObject({ ...room, x: 0, y: 0, rotation: 90 }).x).toBeCloseTo(128);
  expect(constrainObject({ ...room, x: 0, y: 0, rotation: 90 }).y).toBeCloseTo(155);
});

it('begrenzt Objekte in dynamischen Hoch- und Querformaten', () => {
  const desk = createSeed().rooms[0].objects[0];
  const portrait = { width: 600, height: 1400, layout: 'custom' as const };
  const wide = { width: 2000, height: 500, layout: 'custom' as const };
  expect(constrainObject({ ...desk, x: 1900, y: 1300 }, portrait).x).toBeCloseTo(554);
  expect(constrainObject({ ...desk, x: 1700, y: 900 }, wide).x).toBe(1700);
  expect(constrainObject({ ...desk, x: 1700, y: 900 }, wide).y).toBeCloseTo(470);
});
it('erkennt gedrehte Überschneidungen und erlaubt aneinanderliegende Objekte', () => {
  const desk = { ...createSeed().rooms[0].objects[0], rotation: 0, x: 200, y: 200 };
  expect(objectsOverlap(desk, { ...desk, id: '2', x: 220, rotation: 45 })).toBe(true);
  expect(objectsOverlap(desk, { ...desk, id: '2', x: 500, rotation: 45 })).toBe(false);
  expect(objectsOverlap(desk, { ...desk, id: '2', x: 276 })).toBe(false);
  expect(collisions([desk, { ...desk, id: '2', x: 220, rotation: 45 }])).toEqual([[desk.id, '2']]);
});
it('vergibt auch nach Löschungen eindeutige Arbeitsplatznummern', () => {
  const desk = createSeed().rooms[0].objects[0];
  expect(
    nextObjectName('desk', [
      { ...desk, name: 'AP-01' },
      { ...desk, name: 'AP-03' },
    ]),
  ).toBe('AP-02');
  expect(nextObjectName('desk', [{ ...desk, name: 'ap-01' }])).toBe('AP-02');
});
it('verhindert neue doppelte Namen über Bürobereiche hinweg und erhält unveränderte Altdaten', () => {
  const rooms = createSeed().rooms,
    room = structuredClone(rooms[1]);
  room.objects[0].name = 'OS-01';
  expect(validateRoom(room, rooms)).toContain('anderen Bürobereich');
  const legacy = structuredClone(rooms);
  legacy[1].objects[0].name = 'OS-01';
  expect(validateRoom(legacy[1], legacy)).toBeNull();
});
it('passt gedrehte Bilder ohne Verzerrung ein', () => {
  expect(fitBackground({ width: 1200, height: 800 }, { width: 600, height: 900 }, 90)).toMatchObject({
    width: 900,
    height: 600,
    x: 300,
    y: 450,
    rotation: 90,
  });
});
it('skaliert Positionen bei einer Planänderung und erhält Objekt- und Buchungskennungen', () => {
  const room = { ...createSeed().rooms[0], layout: 'custom' as const };
  const resized = resizeRoom(room, room.width * 2, room.height * 2);
  expect(resized.objects[0]).toMatchObject({
    id: room.objects[0].id,
    x: room.objects[0].x * 2,
    y: room.objects[0].y * 2,
    width: room.objects[0].width,
  });
  expect(validateRoom(resized)).toBeNull();
});
