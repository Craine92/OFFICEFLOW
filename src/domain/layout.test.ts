import { expect, it } from 'vitest';
import { constrainObject } from './layout';
import { createSeed } from '../data/seed';
it('hält auch gedrehte Meetingräume innerhalb der Außenwände', () => {
  const room = createSeed().rooms[2].objects.find((o) => o.kind === 'meeting')!;
  expect(constrainObject({ ...room, x: 900, y: 900 })).toMatchObject({ x: 747, y: 436 });
  expect(constrainObject({ ...room, x: 0, y: 0, rotation: 90 }).x).toBeCloseTo(128);
  expect(constrainObject({ ...room, x: 0, y: 0, rotation: 90 }).y).toBeCloseTo(155);
});
