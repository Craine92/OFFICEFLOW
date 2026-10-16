import { describe, expect, it, vi } from 'vitest';
import { ExchangeAvailabilityGateway } from './availability';

describe('Getrennte Exchange-Verfügbarkeit', () => {
  it('fordert Calendars.ReadBasic separat an und liefert Raumpläne ohne OFFICEFLOW-Buchungen zu verändern', async () => {
    const tokens = { getAccessToken: vi.fn(async () => 'calendar-token') };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ value: [{ scheduleId: 'raum@example.test', availabilityView: '02', scheduleItems: [] }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const result = await new ExchangeAvailabilityGateway(tokens, fetcher).readRoomAvailability(
      ['raum@example.test'],
      { start: '2026-10-16T09:00:00', end: '2026-10-16T18:00:00', timeZone: 'Europe/Berlin' },
    );
    expect(result).toHaveLength(1);
    expect(tokens.getAccessToken).toHaveBeenCalledWith(['Calendars.ReadBasic']);
    expect(fetcher.mock.calls[0][1]?.method).toBe('POST');
  });
});
