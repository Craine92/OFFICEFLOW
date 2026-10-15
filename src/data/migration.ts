import type { OfficeData } from '../domain/types';
export function migrateOfficeData(value: unknown): { data: OfficeData; migrated: boolean } {
  if (!value || typeof value !== 'object') throw new Error('Die gespeicherten Demo-Daten sind ungültig.');
  const input = value as Omit<OfficeData, 'version'> & { version: number };
  if (![1, 2].includes(input.version))
    throw new Error(
      'Diese Datenversion wird nicht unterstützt. Bitte verwenden Sie eine passende OFFICEFLOW-Version.',
    );
  const data: OfficeData = { ...structuredClone(input), version: 2 };
  if (input.version === 1) data.rooms = data.rooms.map((room) => ({ ...room, layout: 'demo' }));
  return { data, migrated: input.version === 1 };
}
