import type { Microsoft365Config, SharePointListIds } from './types';

export const MICROSOFT_CONFIG_KEY = 'officeflow.microsoft.config.v1';

const env = import.meta.env;

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function envConfig(): Microsoft365Config {
  const defaultRedirect =
    typeof window === 'undefined' ? 'http://localhost/' : `${window.location.origin}${window.location.pathname}`;
  return {
    tenantId: text(env.VITE_MS_TENANT_ID),
    clientId: text(env.VITE_MS_CLIENT_ID),
    redirectUri: text(env.VITE_MS_REDIRECT_URI) || defaultRedirect,
    siteId: text(env.VITE_MS_SITE_ID),
    lists: {
      locations: text(env.VITE_MS_LIST_LOCATIONS_ID) || undefined,
      floors: text(env.VITE_MS_LIST_FLOORS_ID),
      workspaces: text(env.VITE_MS_LIST_WORKSPACES_ID),
      meetingRooms: text(env.VITE_MS_LIST_MEETING_ROOMS_ID) || undefined,
      departments: text(env.VITE_MS_LIST_DEPARTMENTS_ID) || undefined,
      assignments: text(env.VITE_MS_LIST_ASSIGNMENTS_ID) || undefined,
      bookings: text(env.VITE_MS_LIST_BOOKINGS_ID) || undefined,
    },
  };
}

export function readMicrosoftConfig(storage?: Pick<Storage, 'getItem'>) {
  const defaults = envConfig();
  try {
    storage ??= typeof window === 'undefined' ? undefined : window.localStorage;
    if (!storage) return defaults;
    const raw = storage.getItem(MICROSOFT_CONFIG_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<Microsoft365Config> & { lists?: Partial<SharePointListIds> };
    return {
      ...defaults,
      tenantId: text(saved.tenantId) || defaults.tenantId,
      clientId: text(saved.clientId) || defaults.clientId,
      redirectUri: text(saved.redirectUri) || defaults.redirectUri,
      siteId: text(saved.siteId) || defaults.siteId,
      lists: { ...defaults.lists, ...saved.lists },
    };
  } catch {
    return defaults;
  }
}

export function saveMicrosoftConfig(
  config: Microsoft365Config,
  storage?: Pick<Storage, 'setItem'>,
) {
  // Enthält ausschließlich öffentliche App- und Ressourcenkennungen, niemals Token oder Secrets.
  storage ??= typeof window === 'undefined' ? undefined : window.localStorage;
  storage?.setItem(MICROSOFT_CONFIG_KEY, JSON.stringify(config));
}

export function validateAuthConfig(config: Microsoft365Config): string[] {
  const errors: string[] = [];
  if (!/^(organizations|[0-9a-f-]{36})$/i.test(config.tenantId))
    errors.push('Tenant-ID fehlt oder ist ungültig.');
  if (!/^[0-9a-f-]{36}$/i.test(config.clientId)) errors.push('Client-ID fehlt oder ist ungültig.');
  try {
    const redirect = new URL(config.redirectUri, typeof window === 'undefined' ? 'http://localhost/' : window.location.href);
    if (!['http:', 'https:'].includes(redirect.protocol)) throw new Error();
  } catch {
    errors.push('Redirect-URI ist ungültig.');
  }
  return errors;
}

export function validateDataConfig(config: Microsoft365Config): string[] {
  const errors = validateAuthConfig(config);
  if (!config.siteId) errors.push('SharePoint-Site-ID fehlt.');
  if (!config.lists.floors) errors.push('Listen-ID für Etagen fehlt.');
  if (!config.lists.workspaces) errors.push('Listen-ID für Arbeitsplätze fehlt.');
  return errors;
}

export const microsoftScopes = ['User.Read', 'Sites.Read.All'];
