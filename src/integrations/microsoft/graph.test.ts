import { describe, expect, it, vi } from 'vitest';
import { GraphClient, GraphRequestError, mapBookings, mapEmployees, mapRooms } from './graph';

const tokens = { getAccessToken: vi.fn(async () => 'access-token') };
const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

describe('Microsoft-Graph-Adapter', () => {
  it('liest alle Seiten und sendet den Token nur im Authorization-Header', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ value: [{ id: '1' }], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/next' }))
      .mockResolvedValueOnce(json({ value: [{ id: '2' }] }));
    const client = new GraphClient(tokens, fetcher);
    await expect(client.getAll<{ id: string }>('/items')).resolves.toEqual([{ id: '1' }, { id: '2' }]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1]?.headers).toEqual({ Authorization: 'Bearer access-token', Accept: 'application/json' });
  });

  it('beachtet Graph-Throttling und wiederholt kontrolliert', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(json({ error: { code: 'TooManyRequests' } }, 429, { 'Retry-After': '1' })).mockResolvedValueOnce(json({ value: [] }));
    const pause = vi.fn(async () => undefined);
    await expect(new GraphClient(tokens, fetcher, pause).getAll('/items')).resolves.toEqual([]);
    expect(pause).toHaveBeenCalledWith(1000);
  });

  it('übersetzt Berechtigungs- und Netzwerkfehler verständlich', async () => {
    const forbidden = new GraphClient(tokens, vi.fn<typeof fetch>().mockResolvedValue(json({ error: { code: 'accessDenied' } }, 403)));
    await expect(forbidden.get('/sites')).rejects.toMatchObject({ status: 403 });
    await expect(forbidden.get('/sites')).rejects.toThrow('Leseberechtigung');
    const offline = new GraphClient(tokens, vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')));
    await expect(offline.get('/sites')).rejects.toBeInstanceOf(GraphRequestError);
  });

  it('ordnet stabile SharePoint-IDs zu und verwirft verwaiste Buchungen', () => {
    const floors = [{ id: '10', fields: { OfficeflowId: 'floor-a', Title: 'Etage A' } }];
    const resources = [{ id: '20', fields: { OfficeflowId: 'desk-a', FloorId: 'floor-a', Title: 'Platz A', X: 100, Y: 120 } }];
    const people = [{ id: '30', fields: { OfficeflowId: 'person-a', DisplayName: 'Alex Beispiel' } }];
    const rooms = mapRooms(floors, resources);
    const employees = mapEmployees(people);
    expect(rooms[0].objects[0].id).toBe('desk-a');
    expect(mapBookings([{ id: '40', fields: { OfficeflowId: 'booking-a', WorkspaceId: 'desk-a', EmployeeId: 'person-a', BookingDate: '2026-10-16', StartTime: '09:00', EndTime: '10:00' } }], rooms, employees)).toHaveLength(1);
    expect(mapBookings([{ id: '41', fields: { WorkspaceId: 'missing', EmployeeId: 'person-a', BookingDate: '2026-10-16' } }], rooms, employees)).toEqual([]);
  });
});
