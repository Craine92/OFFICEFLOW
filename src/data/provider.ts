import type { OfficeData, OfficeRoom, BookingInput, Booking, Employee } from '../domain/types';
import { createSeed } from './seed';

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
function validData(value: unknown): value is OfficeData {
  if (!value || typeof value !== 'object') return false;
  const d = value as OfficeData;
  return (
    d.version === 1 &&
    Array.isArray(d.rooms) &&
    d.rooms.length > 0 &&
    d.rooms.every(
      (r) =>
        typeof r.id === 'string' &&
        typeof r.name === 'string' &&
        Number.isFinite(r.width) &&
        r.width > 0 &&
        Number.isFinite(r.height) &&
        r.height > 0 &&
        Array.isArray(r.objects) &&
        r.objects.every(
          (o) =>
            typeof o.id === 'string' &&
            typeof o.name === 'string' &&
            ['desk', 'meeting', 'lounge', 'plant'].includes(o.kind) &&
            [o.x, o.y, o.rotation, o.width, o.height].every(Number.isFinite),
        ),
    ) &&
    Array.isArray(d.employees) &&
    d.employees.length > 0 &&
    d.employees.every(
      (e) =>
        typeof e.id === 'string' &&
        typeof e.name === 'string' &&
        typeof e.initials === 'string' &&
        typeof e.department === 'string' &&
        typeof e.color === 'string',
    ) &&
    Array.isArray(d.bookings) &&
    d.bookings.every(
      (b) =>
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
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> = window.localStorage) {}
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
      return parsed;
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
    return data;
  }
}
