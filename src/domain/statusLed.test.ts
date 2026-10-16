import { describe, expect, it } from 'vitest';
import {
  STATUS_LED_COLORS,
  STATUS_LED_DIAMETER,
  statusLedInverseScale,
  statusLedPosition,
  statusLedVisual,
} from './statusLed';
import type { PlanObject } from './types';

describe('visuelle Arbeitsplatzampel', () => {
  it('zeigt freie Arbeitsplätze grün mit Häkchen', () => {
    expect(statusLedVisual('available')).toEqual({
      color: STATUS_LED_COLORS.available,
      label: 'Frei',
      symbol: 'check',
      unavailable: false,
    });
    expect(STATUS_LED_COLORS.available).toBe('#16A34A');
  });

  it.each(['reserved', 'occupied'] as const)(
    'zeigt %s rot, behält aber den fachlichen Statusnamen',
    (status) => {
      const visual = statusLedVisual(status);
      expect(visual.color).toBe('#DC2626');
      expect(visual.symbol).toBe('cross');
      expect(visual.label).toBe(status === 'reserved' ? 'Reserviert' : 'Belegt');
    },
  );

  it('bleibt bei kleinen Möbeln und allen Zoomstufen 18 Bildschirmpixel groß', () => {
    for (const scale of [0.12, 0.4, 1, 2.5, 8]) {
      expect(STATUS_LED_DIAMETER * scale * statusLedInverseScale(scale)).toBeCloseTo(18);
    }
  });

  it('positioniert die LED unabhängig von der Möbeldrehung rechts oben', () => {
    const object = {
      id: 'desk',
      name: 'Kleiner Platz',
      kind: 'desk',
      x: 100,
      y: 100,
      width: 30,
      height: 20,
      rotation: 90,
    } as PlanObject;
    expect(statusLedPosition(object, 1)).toEqual({ x: 105, y: 110 });
  });
});
