import type { OfficeData, OfficeRoom, BookingInput, Booking, Employee } from '../domain/types';
import { createSeed } from './seed';
import { migrateOfficeData } from './migration';
import { LAYER_IDS } from '../domain/design';

export interface WorkspaceDataProvider {
  readonly mode: 'demo' | 'microsoft-graph';
  load(): Promise<OfficeData>;
  save(data: OfficeData): Promise<void>;
  reset(): Promise<OfficeData>;
}
// Vertragsentwurf für einen späteren Graph-Adapter. Authentifizierung und serverseitige
// Konfliktkontrolle müssen vor produktiver Nutzung implementiert werden.
export interface MicrosoftGraphGateway {
  listRooms(): Promise<OfficeRoom[]>;
  listEmployees(): Promise<Employee[]>;
  listBookings(date: string): Promise<Booking[]>;
  createBooking(input: BookingInput, etag?: string): Promise<Booking>;
  cancelBooking(id: string, etag: string): Promise<void>;
  updateRoom(room: OfficeRoom, etag: string): Promise<void>;
}
export const STORAGE_KEY = 'officeflow.demo.v1';
export const MIGRATION_BACKUP_KEY = 'officeflow.demo.backup.v1';
export const V2_BACKUP_KEY = 'officeflow.demo.backup.v2';
function validData(value: unknown): value is OfficeData {
  if (!value || typeof value !== 'object') return false;
  const d = value as Omit<OfficeData, 'version'> & { version: number };
  return (
    [1, 2, 3].includes(d.version) &&
    Array.isArray(d.rooms) &&
    d.rooms.length > 0 &&
    d.rooms.every(
      (r) =>
        !!r &&
        typeof r.id === 'string' &&
        typeof r.name === 'string' &&
        Number.isFinite(r.width) &&
        r.width > 0 &&
        Number.isFinite(r.height) &&
        r.height > 0 &&
        Array.isArray(r.objects) &&
        r.objects.every(
          (o) =>
            !!o &&
            typeof o.id === 'string' &&
            typeof o.name === 'string' &&
            ['desk', 'meeting', 'lounge', 'plant'].includes(o.kind) &&
            [o.x, o.y, o.rotation, o.width, o.height].every(Number.isFinite),
        ) &&
        (d.version < 3 ||
          (['walls', 'openings', 'zones', 'furniture', 'fixtures', 'annotations'].every((key) =>
            Array.isArray((r as unknown as Record<string, unknown>)[key]),
          ) &&
            r.layers &&
            LAYER_IDS.every(
              (id) => typeof r.layers[id]?.visible === 'boolean' && typeof r.layers[id]?.locked === 'boolean',
            ) &&
            [...r.furniture, ...r.fixtures, ...r.zones, ...r.annotations].every(
              (o) =>
                o &&
                typeof o.id === 'string' &&
                typeof o.name === 'string' &&
                [o.x, o.y, o.width, o.height, o.rotation].every(Number.isFinite),
            ) &&
            r.walls.every(
              (w) =>
                w &&
                typeof w.id === 'string' &&
                typeof w.name === 'string' &&
                w.start &&
                w.end &&
                [w.start.x, w.start.y, w.end.x, w.end.y, w.thickness].every(Number.isFinite),
            ) &&
            r.openings.every(
              (o) =>
                o &&
                typeof o.id === 'string' &&
                typeof o.name === 'string' &&
                r.walls.some((w) => w.id === o.wallId) &&
                [o.offset, o.width].every(Number.isFinite),
            ))) &&
        (!r.background ||
          (typeof r.background.assetId === 'string' &&
            typeof r.background.name === 'string' &&
            typeof r.background.mime === 'string' &&
            [
              r.background.x,
              r.background.y,
              r.background.width,
              r.background.height,
              r.background.rotation,
              r.background.opacity,
            ].every(Number.isFinite) &&
            r.background.width > 0 &&
            r.background.height > 0)),
    ) &&
    Array.isArray(d.employees) &&
    d.employees.length > 0 &&
    d.employees.every(
      (e) =>
        !!e &&
        typeof e.id === 'string' &&
        typeof e.name === 'string' &&
        typeof e.initials === 'string' &&
        typeof e.department === 'string' &&
        typeof e.color === 'string',
    ) &&
    Array.isArray(d.bookings) &&
    d.bookings.every(
      (b) =>
        !!b &&
        typeof b.id === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(b.date) &&
        /^\d{2}:\d{2}$/.test(b.start) &&
        /^\d{2}:\d{2}$/.test(b.end) &&
        typeof b.checkedIn === 'boolean' &&
        d.employees.some((e) => e.id === b.employeeId) &&
        d.rooms.some((r) => r.id === b.roomId && r.objects.some((o) => o.id === b.objectId)),
    )
  );
}
export class DemoDataProvider implements WorkspaceDataProvider {
  readonly mode = 'demo' as const;
  constructor(
    private storage: Pick<Storage, 'getItem' | 'setItem'> &
      Partial<Pick<Storage, 'removeItem'>> = window.localStorage,
  ) {}
  async load(): Promise<OfficeData> {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (raw) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error('Die gespeicherten Demo-Daten sind beschädigt. Bitte setzen Sie die Demo zurück.');
      }
      if (!validData(parsed))
        throw new Error('Die gespeicherten Demo-Daten sind ungültig. Bitte setzen Sie die Demo zurück.');
      const { data, migrated } = migrateOfficeData(parsed);
      if (migrated) {
        try {
          const key = (parsed as { version: number }).version === 2 ? V2_BACKUP_KEY : MIGRATION_BACKUP_KEY;
          if (!this.storage.getItem(key)) this.storage.setItem(key, raw);
          await this.save(data);
        } catch {
          throw new Error(
            'Die Datenmigration konnte nicht gespeichert werden. Ihr bisheriger Datenbestand bleibt erhalten. Bitte schaffen Sie Platz im Browserspeicher.',
          );
        }
      }
      return data;
    }
    return this.reset();
  }
  async save(data: OfficeData) {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      throw new Error(
        'Die Daten konnten nicht lokal gespeichert werden. Bitte prüfen Sie den Browserspeicher.',
      );
    }
  }
  async reset() {
    const data = createSeed();
    await this.save(data);
    this.storage.removeItem?.(MIGRATION_BACKUP_KEY);
    this.storage.removeItem?.(V2_BACKUP_KEY);
    return data;
  }
}
