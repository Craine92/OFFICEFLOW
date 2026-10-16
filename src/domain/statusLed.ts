import type { PlanObject, WorkspaceStatus } from './types';

export const STATUS_LED_DIAMETER = 18;
export const STATUS_LED_COLORS = {
  available: '#16A34A',
  unavailable: '#DC2626',
} as const;

export function statusLedVisual(status: WorkspaceStatus) {
  const unavailable = status !== 'available';
  return unavailable
    ? {
        color: STATUS_LED_COLORS.unavailable,
        label: status === 'occupied' ? 'Belegt' : 'Reserviert',
        symbol: 'cross' as const,
        unavailable: true,
      }
    : {
        color: STATUS_LED_COLORS.available,
        label: 'Frei',
        symbol: 'check' as const,
        unavailable: false,
      };
}

export const statusLedInverseScale = (stageScale: number) => 1 / Math.max(stageScale, 0.01);

export function statusLedPosition(object: PlanObject, stageScale: number) {
  const inset = 5 * statusLedInverseScale(stageScale);
  const localX = object.width / 2 - inset;
  const localY = -object.height / 2 + inset;
  const angle = (object.rotation * Math.PI) / 180;
  return {
    x: object.x + localX * Math.cos(angle) - localY * Math.sin(angle),
    y: object.y + localX * Math.sin(angle) + localY * Math.cos(angle),
  };
}
