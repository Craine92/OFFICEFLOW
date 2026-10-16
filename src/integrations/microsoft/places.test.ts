import { describe, expect, it, vi } from 'vitest';
import { MicrosoftPlacesGateway } from './places';

describe('Optionale Microsoft-Places-Datenquelle', () => {
  it('fordert Place.Read.All getrennt an und liest stabile Places-IDs', async () => {
    const tokens = { getAccessToken: vi.fn(async () => 'places-token') };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ value: [{ id: 'building-1', placeId: 'building-1', displayName: 'Berlin' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const places = await new MicrosoftPlacesGateway(tokens, fetcher).list('building');
    expect(places[0].id).toBe('building-1');
    expect(tokens.getAccessToken).toHaveBeenCalledWith(['Place.Read.All']);
  });
});
