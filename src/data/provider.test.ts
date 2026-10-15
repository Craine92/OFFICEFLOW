import { beforeEach, describe, expect, it } from 'vitest';
import { DemoDataProvider, STORAGE_KEY } from './provider';
import { configureDataProvider, useOfficeStore } from '../store/useOfficeStore';
import { today } from '../domain/booking';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
describe('Demo-Datenanbieter und Zustand', () => {
  beforeEach(() => useOfficeStore.setState({ data: null, error: null }));
  it('behält Buchungen über das erneute Laden bei und setzt sie vollständig zurück', async () => {
    const provider = new DemoDataProvider(storage());
    configureDataProvider(provider);
    await useOfficeStore.getState().initialize();
    const initialCount = useOfficeStore.getState().data!.bookings.length;
    await useOfficeStore
      .getState()
      .book({
        roomId: 'open',
        objectId: 'OS-24',
        employeeId: 'e22',
        date: today(),
        start: '10:00',
        end: '11:00',
      });
    expect((await provider.load()).bookings).toHaveLength(initialCount + 1);
    await useOfficeStore.getState().initialize();
    expect(useOfficeStore.getState().data!.bookings).toHaveLength(initialCount + 1);
    await useOfficeStore.getState().reset();
    expect((await provider.load()).bookings).toHaveLength(initialCount);
  });
  it('verhindert auch zwei unmittelbar gleichzeitig ausgelöste Buchungen', async () => {
    configureDataProvider(new DemoDataProvider(storage()));
    await useOfficeStore.getState().initialize();
    const input = {
      roomId: 'open',
      objectId: 'OS-24',
      employeeId: 'e22',
      date: today(),
      start: '10:00',
      end: '11:00',
    };
    const results = await Promise.allSettled([
      useOfficeStore.getState().book(input),
      useOfficeStore.getState().book({ ...input, employeeId: 'e21' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
  });
  it('storniert eine Buchung persistent und gibt ihren Arbeitsplatz frei', async () => {
    const provider = new DemoDataProvider(storage());
    configureDataProvider(provider);
    await useOfficeStore.getState().initialize();
    await useOfficeStore.getState().cancel('seed-0');
    expect((await provider.load()).bookings.some((b) => b.id === 'seed-0')).toBe(false);
  });
  it('verhindert das Löschen eines gebuchten Objekts', async () => {
    configureDataProvider(new DemoDataProvider(storage()));
    await useOfficeStore.getState().initialize();
    const room = structuredClone(useOfficeStore.getState().data!.rooms[0]);
    room.objects = room.objects.filter((o) => o.id !== 'OS-1');
    await expect(useOfficeStore.getState().saveRoom(room)).rejects.toThrow('Gebuchte Objekte');
  });
  it('meldet defekte Daten, ohne sie still zu überschreiben', async () => {
    const local = storage();
    local.setItem(STORAGE_KEY, '{broken');
    const provider = new DemoDataProvider(local);
    await expect(provider.load()).rejects.toThrow('beschädigt');
    expect(local.getItem(STORAGE_KEY)).toBe('{broken');
    await provider.reset();
    expect((await provider.load()).rooms).toHaveLength(3);
  });
  it('meldet Speicherausfälle und zeigt keine ungespeicherte Buchung als erfolgreich', async () => {
    const local = storage();
    const provider = new DemoDataProvider(local);
    configureDataProvider(provider);
    await useOfficeStore.getState().initialize();
    const count = useOfficeStore.getState().data!.bookings.length;
    local.setItem = () => {
      throw new Error('quota');
    };
    await expect(
      useOfficeStore
        .getState()
        .book({
          roomId: 'open',
          objectId: 'OS-24',
          employeeId: 'e22',
          date: today(),
          start: '10:00',
          end: '11:00',
        }),
    ).rejects.toThrow('nicht lokal gespeichert');
    expect(useOfficeStore.getState().data!.bookings).toHaveLength(count);
  });
});
