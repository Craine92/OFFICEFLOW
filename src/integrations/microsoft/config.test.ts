import { describe, expect, it } from 'vitest';
import { MICROSOFT_CONFIG_KEY, readMicrosoftConfig, saveMicrosoftConfig, validateDataConfig } from './config';
import type { Microsoft365Config } from './types';

const valid: Microsoft365Config = {
  tenantId: '11111111-1111-1111-1111-111111111111',
  clientId: '22222222-2222-2222-2222-222222222222',
  redirectUri: 'https://example.test/officeflow/',
  siteId: 'contoso.sharepoint.com,site-collection,site',
  lists: { floors: 'floors-id', workspaces: 'workspaces-id' },
};

describe('Microsoft-365-Konfiguration', () => {
  it('aktiviert den Datenmodus nur mit vollständiger Konfiguration', () => {
    expect(validateDataConfig(valid)).toEqual([]);
    expect(validateDataConfig({ ...valid, clientId: '', siteId: '' })).toEqual(
      expect.arrayContaining(['Client-ID fehlt oder ist ungültig.', 'SharePoint-Site-ID fehlt.']),
    );
  });

  it('speichert nur die öffentliche Konfiguration', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    saveMicrosoftConfig(valid, storage);
    expect(readMicrosoftConfig(storage)).toEqual(valid);
    expect(values.get(MICROSOFT_CONFIG_KEY)).not.toContain('token');
    expect(values.get(MICROSOFT_CONFIG_KEY)).not.toContain('secret');
  });
});
