import type { OfficeData } from '../domain/types';
import { emptyDesign } from '../domain/design';
export function migrateOfficeData(value: unknown): { data: OfficeData; migrated: boolean } {
  if (!value || typeof value !== 'object') throw new Error('Die gespeicherten Demo-Daten sind ungültig.');
  const input = value as Omit<OfficeData, 'version'> & { version: number };
  if (![1, 2, 3].includes(input.version))
    throw new Error(
      'Diese Datenversion wird nicht unterstützt. Bitte verwenden Sie eine passende OFFICEFLOW-Version.',
    );
  const data: OfficeData = { ...structuredClone(input), version: 3 };
  if (input.version < 3)
    data.rooms = data.rooms.map((room) => {
      const legacy = room.objects as unknown as Array<Record<string, unknown>>;
      const layout = input.version === 1 ? 'demo' : room.layout;
      const design = emptyDesign();
      if (layout === 'demo' && !room.walls?.length) {
        const left = (room.width * 40) / 900,
          right = (room.width * 860) / 900,
          top = (room.height * 42) / 570,
          bottom = (room.height * 524) / 570;
        design.walls = [
          [left, top, right, top],
          [right, top, right, bottom],
          [left, bottom, right, bottom],
          [left, top, left, bottom],
        ].map(([x1, y1, x2, y2], i) => ({
          id: `${room.id}-legacy-wall-${i}`,
          name: 'Bestandswand',
          start: { x: x1, y: y1 },
          end: { x: x2, y: y2 },
          thickness: 5,
          material: 'solid' as const,
        }));
        design.openings = [
          {
            id: `${room.id}-legacy-door`,
            name: 'Eingang',
            wallId: design.walls[2].id,
            kind: 'door',
            offset: (right - left) / 2,
            width: 70,
            hinge: 'left',
            swing: 'inward',
          },
        ];
      }
      return {
        ...design,
        ...room,
        layout,
        objects: room.objects.filter((o) => o.kind === 'desk' || o.kind === 'meeting'),
        furniture: legacy
          .filter((o) => o.kind === 'plant' || o.kind === 'lounge')
          .map((o) => ({
            ...o,
            kind: o.kind === 'plant' ? 'plant-large' : 'sofa',
          })) as OfficeData['rooms'][number]['furniture'],
      };
    });
  return { data, migrated: input.version < 3 };
}
