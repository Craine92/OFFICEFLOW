import { create } from 'zustand';
import type { BookingInput, OfficeData, OfficeRoom } from '../domain/types';
import { validateBooking, today } from '../domain/booking';
import { DemoDataProvider, type WorkspaceDataProvider } from '../data/provider';

interface OfficeStore {
  data: OfficeData | null;
  error: string | null;
  date: string;
  roomId: string;
  initialize: () => Promise<void>;
  setDate: (date: string) => void;
  setRoom: (id: string) => void;
  book: (input: BookingInput) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  checkIn: (id: string) => Promise<void>;
  saveRoom: (room: OfficeRoom) => Promise<void>;
  reset: () => Promise<void>;
}
let provider: WorkspaceDataProvider;
let queue: Promise<void> = Promise.resolve();
export function configureDataProvider(next: WorkspaceDataProvider) {
  provider = next;
}
const getProvider = () => (provider ??= new DemoDataProvider());

export const useOfficeStore = create<OfficeStore>((set, get) => {
  const transaction = (modify: (data: OfficeData) => OfficeData) => {
    const task = queue.then(async () => {
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
    date: today(),
    roomId: 'open',
    initialize: async () => {
      try {
        set({ data: await getProvider().load(), error: null });
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
        const old = data.rooms.find((r) => r.id === room.id);
        if (!old) throw new Error('Dieser Grundriss existiert nicht mehr.');
        const ids = new Set(room.objects.map((o) => o.id));
        if (data.bookings.some((b) => b.roomId === room.id && !ids.has(b.objectId)))
          throw new Error('Gebuchte Objekte können erst nach Stornierung ihrer Buchungen entfernt werden.');
        data.rooms = data.rooms.map((r) => (r.id === room.id ? room : r));
        return data;
      }),
    reset: () => {
      const task = queue.then(async () => {
        const data = await getProvider().reset();
        set({ data, date: today(), roomId: 'open', error: null });
      });
      queue = task.catch(() => {});
      return task;
    },
  };
});
