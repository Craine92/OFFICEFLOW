import type { OfficeData, PlanAsset } from '../domain/types';
import type { WorkspaceDataProvider } from './provider';
import { validData } from './provider';
import { migrateOfficeData } from './migration';

export const BACKUP_FORMAT = 'officeflow-backup';
export const BACKUP_VERSION = 1;

interface EncodedAsset {
  id: string;
  name: string;
  mime: string;
  width: number;
  height: number;
  page?: number;
  pageCount?: number;
  source: string;
  sourceType: string;
  sourceHash: string;
  image: string;
  imageType: string;
  imageHash: string;
}

export interface OfficeflowBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  data: OfficeData;
  assets: EncodedAsset[];
}

export interface BackupPreview {
  createdAt: string;
  rooms: number;
  employees: number;
  bookings: number;
  assets: number;
  assetBytes: number;
}

export interface AssetRepository {
  all(): Promise<PlanAsset[]>;
  replaceAll(assets: PlanAsset[]): Promise<void>;
}

export async function createBackup(data: OfficeData, repository: AssetRepository): Promise<OfficeflowBackup> {
  const assets = await repository.all();
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    data: structuredClone(data),
    assets: await Promise.all(assets.map(encodeAsset)),
  };
}

export async function inspectBackup(text: string): Promise<{
  backup: OfficeflowBackup;
  assets: PlanAsset[];
  preview: BackupPreview;
}> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Die Sicherungsdatei enthält kein gültiges JSON.');
  }
  if (!value || typeof value !== 'object') throw new Error('Die Sicherungsdatei ist ungültig.');
  const input = value as Partial<OfficeflowBackup>;
  if (input.format !== BACKUP_FORMAT || input.version !== BACKUP_VERSION)
    throw new Error('Format oder Version der Sicherungsdatei wird nicht unterstützt.');
  if (!validData(input.data)) throw new Error('Das Datenschema der Sicherung ist nicht kompatibel.');
  if (!Array.isArray(input.assets)) throw new Error('Die Dateiliste der Sicherung fehlt.');
  const assets = await Promise.all(input.assets.map(decodeAsset));
  const ids = new Set(assets.map((asset) => asset.id));
  if (ids.size !== assets.length) throw new Error('Die Sicherung enthält doppelte Datei-IDs.');
  const missing = input.data.rooms
    .map((room) => room.background?.assetId)
    .filter((id): id is string => typeof id === 'string' && !ids.has(id));
  if (missing.length) throw new Error('Mindestens eine im Grundriss referenzierte Datei fehlt in der Sicherung.');
  const createdAt = String(input.createdAt ?? '');
  if (Number.isNaN(Date.parse(createdAt))) throw new Error('Der Erstellungszeitpunkt der Sicherung ist ungültig.');
  return {
    backup: input as OfficeflowBackup,
    assets,
    preview: {
      createdAt,
      rooms: input.data.rooms.length,
      employees: input.data.employees.length,
      bookings: input.data.bookings.length,
      assets: assets.length,
      assetBytes: assets.reduce((sum, asset) => sum + asset.source.size + asset.image.size, 0),
    },
  };
}

export async function restoreBackup(
  backup: OfficeflowBackup,
  decodedAssets: PlanAsset[],
  currentData: OfficeData,
  provider: WorkspaceDataProvider,
  repository: AssetRepository,
) {
  if (provider.mode !== 'demo') throw new Error('Sicherungen können nur im lokalen Demo-Modus eingespielt werden.');
  const previousAssets = await repository.all();
  try {
    await repository.replaceAll(decodedAssets);
    await provider.save(migrateOfficeData(backup.data).data);
  } catch (error) {
    await repository.replaceAll(previousAssets).catch(() => undefined);
    await provider.save(currentData).catch(() => undefined);
    throw new Error(`Die Sicherung wurde nicht übernommen. Der bisherige Datenbestand bleibt erhalten. ${(error as Error).message}`);
  }
}

async function encodeAsset(asset: PlanAsset): Promise<EncodedAsset> {
  const sourceBytes = new Uint8Array(await asset.source.arrayBuffer());
  const imageBytes = new Uint8Array(await asset.image.arrayBuffer());
  return {
    id: asset.id,
    name: asset.name,
    mime: asset.mime,
    width: asset.width,
    height: asset.height,
    page: asset.page,
    pageCount: asset.pageCount,
    source: toBase64(sourceBytes),
    sourceType: asset.source.type,
    sourceHash: await digest(sourceBytes),
    image: toBase64(imageBytes),
    imageType: asset.image.type,
    imageHash: await digest(imageBytes),
  };
}

async function decodeAsset(value: EncodedAsset, index: number): Promise<PlanAsset> {
  if (!value || typeof value !== 'object' || !value.id || !value.name || !value.mime)
    throw new Error(`Dateieintrag ${index + 1} ist unvollständig.`);
  if (![value.width, value.height].every((part) => Number.isFinite(part) && part > 0))
    throw new Error(`Dateieintrag ${index + 1} enthält ungültige Abmessungen.`);
  let source: Uint8Array;
  let image: Uint8Array;
  try {
    source = fromBase64(value.source);
    image = fromBase64(value.image);
  } catch {
    throw new Error(`Dateieintrag ${index + 1} ist beschädigt.`);
  }
  if ((await digest(source)) !== value.sourceHash || (await digest(image)) !== value.imageHash)
    throw new Error(`Integritätsprüfung für „${value.name}“ fehlgeschlagen.`);
  return {
    id: value.id,
    name: value.name,
    mime: value.mime,
    width: Number(value.width),
    height: Number(value.height),
    page: value.page,
    pageCount: value.pageCount,
    source: new Blob([source], { type: value.sourceType || value.mime }),
    image: new Blob([image], { type: value.imageType || 'image/png' }),
  };
}

function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function digest(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((part) => part.toString(16).padStart(2, '0')).join('');
}
