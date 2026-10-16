import type { PlanAsset } from '../domain/types';
export const ASSET_DB = 'officeflow-plans';
let connection: Promise<IDBDatabase> | undefined;
function openDatabase() {
  return (connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Ihr Browser unterstützt keine lokale Grundrissspeicherung (IndexedDB).'));
      return;
    }
    const request = indexedDB.open(ASSET_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('assets', { keyPath: 'id' });
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        connection = undefined;
      };
      resolve(db);
    };
    request.onerror = () => {
      connection = undefined;
      reject(
        new Error(
          'Der lokale Grundrissspeicher ist nicht verfügbar. Bitte prüfen Sie die Browser-Einstellungen.',
        ),
      );
    };
    request.onblocked = () => {
      connection = undefined;
      reject(
        new Error(
          'Der Grundrissspeicher ist durch ein anderes Fenster blockiert. Bitte schließen Sie weitere OFFICEFLOW-Tabs.',
        ),
      );
    };
  }));
}
async function execute<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const fail = () =>
      reject(
        new Error(
          'Der Grundriss konnte nicht lokal gespeichert oder geladen werden. Möglicherweise ist der Browserspeicher voll.',
        ),
      );
    try {
      const transaction = db.transaction('assets', mode);
      transaction.onerror = transaction.onabort = fail;
      const request = action(transaction.objectStore('assets'));
      transaction.oncomplete = () => resolve(request.result);
    } catch {
      fail();
    }
  });
}
export const planAssets = {
  get: (id: string) => execute<PlanAsset | undefined>('readonly', (store) => store.get(id)),
  all: () => execute<PlanAsset[]>('readonly', (store) => store.getAll()),
  put: (asset: PlanAsset) => execute('readwrite', (store) => store.put(asset)),
  remove: (id: string) => execute('readwrite', (store) => store.delete(id)),
  clear: () => execute('readwrite', (store) => store.clear()),
  replaceAll: async (assets: PlanAsset[]) => {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('assets', 'readwrite');
      const store = transaction.objectStore('assets');
      store.clear();
      for (const asset of assets) store.put(asset);
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () =>
        reject(new Error('Die Grundrissdateien konnten nicht vollständig wiederhergestellt werden.'));
    });
  },
};
