import { create } from 'zustand';
import type { BookingInput, OfficeData, OfficeRoom } from '../domain/types';
import { validateBooking, today } from '../domain/booking';
import { DemoDataProvider, type WorkspaceDataProvider } from '../data/provider';
import { validateRoom } from '../domain/layout';
import { planAssets } from '../data/assets';

interface OfficeStore {
  data: OfficeData | null;
  error: string | null;
  providerMode: WorkspaceDataProvider['mode'];
  date: string;
  roomId: string;
  timeStart: string;
  timeEnd: string;
  setTimeWindow: (start: string, end: string) => void;
  initialize: () => Promise<void>;
  setDate: (date: string) => void;
  setRoom: (id: string) => void;
  book: (input: BookingInput) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  checkIn: (id: string) => Promise<void>;
  saveRoom: (room: OfficeRoom) => Promise<void>;
  addRoom: (room: OfficeRoom) => Promise<void>;
  reset: () => Promise<void>;
}
let provider: WorkspaceDataProvider;
let queue: Promise<void> = Promise.resolve();
export function configureDataProvider(next: WorkspaceDataProvider) {
  provider = next;
}
const getProvider = () => (provider ??= new DemoDataProvider());
export function getConfiguredDataProvider() {
  return getProvider();
}

export const useOfficeStore = create<OfficeStore>((set, get) => {
  const transaction = (modify: (data: OfficeData) => OfficeData) => {
    const task = queue.then(async () => {
      if (getProvider().readOnly)
        throw new Error(
          'Microsoft 365 ist derzeit schreibgeschützt. Sichere Mehrbenutzerbuchungen sind noch nicht freigegeben.',
        );
      const current = get().data;
      if (!current) throw new Error('Die Daten werden noch geladen.');
      const next = modify(structuredClone(current));
      await getProvider().save(next);
      set({ data: next, error: null });
    });
    queue = task.catch(() => {});
    return task;
  };
  return {
    data: null,
    error: null,
    providerMode: 'demo',
    date: today(),
    roomId: 'open',
    timeStart: '09:00',
    timeEnd: '18:00',
    setTimeWindow: (timeStart, timeEnd) => {
      if (
        /^([01]\d|2[0-3]):[0-5]\d$/.test(timeStart) &&
        /^([01]\d|2[0-3]):[0-5]\d$/.test(timeEnd) &&
        timeStart < timeEnd
      )
        set({ timeStart, timeEnd });
    },
    initialize: async () => {
      try {
        const active = getProvider();
        set({ data: await active.load(), error: null, providerMode: active.mode });
      } catch (e) {
        set({ error: (e as Error).message });
      }
    },
    setDate: (date) => set({ date }),
    setRoom: (roomId) => set({ roomId }),
    book: (input) =>
      transaction((data) => {
        const error = validateBooking(data, input);
        if (error) throw new Error(error);
        data.bookings.push({
          ...input,
          id: crypto.randomUUID(),
          checkedIn: false,
          createdAt: new Date().toISOString(),
        });
        return data;
      }),
    cancel: (id) =>
      transaction((data) => {
        data.bookings = data.bookings.filter((b) => b.id !== id);
        return data;
      }),
    checkIn: (id) =>
      transaction((data) => {
        const booking = data.bookings.find((b) => b.id === id);
        if (!booking || booking.date !== today())
          throw new Error('Die Anwesenheit kann nur für heutige Buchungen bestätigt werden.');
        booking.checkedIn = !booking.checkedIn;
        return data;
      }),
    saveRoom: (room) =>
      transaction((data) => {
        const error = validateRoom(room, data.rooms);
        if (error) throw new Error(error);
        const old = data.rooms.find((r) => r.id === room.id);
        if (!old) throw new Error('Dieser Grundriss existiert nicht mehr.');
        const ids = new Set(room.objects.map((o) => o.id));
        if (data.bookings.some((b) => b.roomId === room.id && !ids.has(b.objectId)))
          throw new Error('Gebuchte Objekte können erst nach Stornierung ihrer Buchungen entfernt werden.');
        data.rooms = data.rooms.map((r) => (r.id === room.id ? room : r));
        return data;
      }),
    addRoom: (room) =>
      transaction((data) => {
        const error = validateRoom(room, data.rooms);
        if (error) throw new Error(error);
        if (data.rooms.some((r) => r.id === room.id))
          throw new Error('Dieser Bürobereich existiert bereits.');
        data.rooms.push(room);
        return data;
      }),
    reset: () => {
      const task = queue.then(async () => {
        const data = await getProvider().reset();
        set({ data, date: today(), roomId: 'open', error: null });
        if (getProvider().mode === 'demo' && typeof indexedDB !== 'undefined') await planAssets.clear();
      });
      queue = task.catch(() => {});
      return task;
    },
  };
});
