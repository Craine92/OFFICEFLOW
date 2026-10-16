import { beforeEach, describe, expect, it } from 'vitest';
import { DemoDataProvider, STORAGE_KEY, MIGRATION_BACKUP_KEY } from './provider';
import { createSeed } from './seed';
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
  it('lädt einen lokalen 0.4-Datenbestand unverändert und ergänzt keine Showcase-Vorlagen', async () => {
    const local = storage();
    const previous = createSeed();
    previous.rooms = previous.rooms.filter((room) => room.id !== 'demo-showcase-hq');
    const raw = JSON.stringify(previous);
    local.setItem(STORAGE_KEY, raw);

    const loaded = await new DemoDataProvider(local).load();

    expect(loaded.rooms).toHaveLength(3);
    expect(loaded).toEqual(previous);
    expect(local.getItem(STORAGE_KEY)).toBe(raw);
  });
  it('migriert Version 1 verlustfrei und behält eine unveränderte Sicherung', async () => {
    const local = storage(),
      original = { ...createSeed(), version: 1 };
    const raw = JSON.stringify(original);
    local.setItem(STORAGE_KEY, raw);
    const provider = new DemoDataProvider(local),
      data = await provider.load();
    expect(data.version).toBe(3);
    expect(data.bookings).toEqual(original.bookings);
    expect(data.rooms[0].objects).toEqual(original.rooms[0].objects);
    expect(local.getItem(MIGRATION_BACKUP_KEY)).toBe(raw);
    expect(await provider.load()).toEqual(data);
  });
  it('überschreibt alte Daten bei fehlgeschlagener Migration nicht', async () => {
    const local = storage(),
      raw = JSON.stringify({ ...createSeed(), version: 1 });
    local.setItem(STORAGE_KEY, raw);
    local.setItem = () => {
      throw new Error('quota');
    };
    await expect(new DemoDataProvider(local).load()).rejects.toThrow('Datenmigration');
    expect(local.getItem(STORAGE_KEY)).toBe(raw);
  });
  it('hält Buchungen beim Anlegen und Ersetzen eines importierten Plans unverändert', async () => {
    configureDataProvider(new DemoDataProvider(storage()));
    await useOfficeStore.getState().initialize();
    const before = structuredClone(useOfficeStore.getState().data!.bookings);
    const room = {
      ...structuredClone(useOfficeStore.getState().data!.rooms[0]),
      id: 'custom',
      layout: 'custom' as const,
      objects: [],
    };
    await useOfficeStore.getState().addRoom(room);
    const existing = structuredClone(useOfficeStore.getState().data!.rooms[0]);
    existing.layout = 'custom';
    existing.background = {
      assetId: 'asset',
      name: 'Büro.png',
      mime: 'image/png',
      x: 450,
      y: 285,
      width: 900,
      height: 570,
      rotation: 0,
      opacity: 1,
    };
    await useOfficeStore.getState().saveRoom(existing);
    expect(useOfficeStore.getState().data!.bookings).toEqual(before);
  });
  beforeEach(() => useOfficeStore.setState({ data: null, error: null }));
  it('behält Buchungen über das erneute Laden bei und setzt sie vollständig zurück', async () => {
    const provider = new DemoDataProvider(storage());
    configureDataProvider(provider);
    await useOfficeStore.getState().initialize();
    const initialCount = useOfficeStore.getState().data!.bookings.length;
    await useOfficeStore.getState().book({
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
    expect((await provider.load()).rooms).toHaveLength(4);
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
      useOfficeStore.getState().book({
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
