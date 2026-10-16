import { describe, expect, it } from 'vitest';
import { validateRoom } from '../domain/layout';
import { cloneShowcaseFloor, showcaseFloors } from './showcaseFloors';

describe('OFFICEFLOW Showcase-Etagen', () => {
  it('liefert drei detaillierte, valide und buchbare Präsentationswelten', () => {
    const floors = showcaseFloors();
    expect(floors).toHaveLength(3);
    expect(floors.map(({ room }) => room.objects.filter((object) => object.kind === 'desk').length)).toEqual([
      64, 40, 36,
    ]);
    expect(
      floors.map(({ room }) => room.objects.filter((object) => object.kind === 'meeting').length),
    ).toEqual([3, 2, 2]);
    for (const { room } of floors) {
      const graphicalElements =
        room.objects.length +
        room.walls.length +
        room.openings.length +
        room.zones.length +
        room.furniture.length +
        room.fixtures.length +
        room.annotations.length;
      expect(graphicalElements).toBeGreaterThan(80);
      expect(validateRoom(room)).toBeNull();
    }
  });

  it('kopiert jeden Plan vollständig mit isolierten IDs und intakten Referenzen', () => {
    const source = showcaseFloors()[0].room;
    const copy = cloneShowcaseFloor(source);
    const sourceIds = new Set([
      source.id,
      ...source.objects.map(({ id }) => id),
      ...source.walls.map(({ id }) => id),
      ...source.openings.map(({ id }) => id),
      ...source.zones.map(({ id }) => id),
      ...source.furniture.map(({ id }) => id),
      ...source.fixtures.map(({ id }) => id),
      ...source.annotations.map(({ id }) => id),
    ]);
    const copyIds = [
      copy.id,
      ...copy.objects.map(({ id }) => id),
      ...copy.walls.map(({ id }) => id),
      ...copy.openings.map(({ id }) => id),
      ...copy.zones.map(({ id }) => id),
      ...copy.furniture.map(({ id }) => id),
      ...copy.fixtures.map(({ id }) => id),
      ...copy.annotations.map(({ id }) => id),
    ];

    expect(copyIds.every((id) => !sourceIds.has(id))).toBe(true);
    expect(new Set(copyIds).size).toBe(copyIds.length);
    expect(copy.openings.every(({ wallId }) => copy.walls.some(({ id }) => id === wallId))).toBe(true);
    expect(copy.objects.every(({ zoneId }) => !zoneId || copy.zones.some(({ id }) => id === zoneId))).toBe(
      true,
    );
    expect(copy.objects).toHaveLength(source.objects.length);
    expect(validateRoom(copy)).toBeNull();
    expect(source.name).toBe('Nordlicht Headquarters');
  });
});
