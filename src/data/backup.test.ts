import { describe, expect, it } from 'vitest';
import { createSeed } from './seed';
import { createBackup, inspectBackup, restoreBackup, type AssetRepository } from './backup';
import type { PlanAsset } from '../domain/types';
import { DemoDataProvider } from './provider';

function memoryAssets(initial: PlanAsset[] = []): AssetRepository {
  let values = initial;
  return { all: async () => values, replaceAll: async (next) => { values = next; } };
}

describe('Vollständige lokale Sicherung', () => {
  it('exportiert und prüft Daten sowie Binärdateien', async () => {
    const asset: PlanAsset = { id: 'asset-1', name: 'Plan.pdf', mime: 'application/pdf', source: new Blob(['pdf'], { type: 'application/pdf' }), image: new Blob(['png'], { type: 'image/png' }), width: 900, height: 570, page: 1, pageCount: 2 };
    const data = createSeed();
    data.rooms[0].background = { assetId: asset.id, name: asset.name, mime: asset.mime, page: 1, x: 0, y: 0, width: 900, height: 570, rotation: 0, opacity: 1 };
    const backup = await createBackup(data, memoryAssets([asset]));
    const inspected = await inspectBackup(JSON.stringify(backup));
    expect(inspected.preview.assets).toBe(1);
    expect(await inspected.assets[0].source.text()).toBe('pdf');
  });

  it('lehnt manipulierte Dateien vor dem Ersetzen ab', async () => {
    const backup = await createBackup(createSeed(), memoryAssets([]));
    backup.assets.push({ id: 'x', name: 'x.png', mime: 'image/png', width: 1, height: 1, source: 'eA==', sourceType: 'image/png', sourceHash: 'wrong', image: 'eA==', imageType: 'image/png', imageHash: 'wrong' });
    await expect(inspectBackup(JSON.stringify(backup))).rejects.toThrow('Integritätsprüfung');
  });

  it('stellt geprüfte Daten über den Demo-Provider wieder her', async () => {
    const values = new Map<string, string>();
    const provider = new DemoDataProvider({ getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } });
    const current = await provider.reset();
    const backup = await createBackup(current, memoryAssets([]));
    backup.data.bookings = [];
    await restoreBackup(backup, [], current, provider, memoryAssets([]));
    expect((await provider.load()).bookings).toEqual([]);
  });
});
