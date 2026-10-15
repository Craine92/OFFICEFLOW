import type { Booking, BookingInput, OfficeData, WorkspaceStatus } from './types';

export const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
export const formatDate = (date: string, options?: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(
    'de-DE',
    options ?? { day: '2-digit', month: 'long', year: 'numeric' },
  );
export const overlaps = (a: Pick<Booking, 'start' | 'end'>, b: Pick<Booking, 'start' | 'end'>) =>
  a.start < b.end && b.start < a.end;

export function validateBooking(data: OfficeData, input: BookingInput): string | null {
  const room = data.rooms.find((r) => r.id === input.roomId);
  const object = room?.objects.find((o) => o.id === input.objectId);
  if (!object || !['desk', 'meeting'].includes(object.kind))
    return 'Bitte wählen Sie einen buchbaren Arbeitsplatz oder Meetingraum.';
  if (!data.employees.some((e) => e.id === input.employeeId)) return 'Bitte wählen Sie einen Mitarbeiter.';
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    Number.isNaN(Date.parse(input.date)) ||
    new Date(`${input.date}T12:00:00Z`).toISOString().slice(0, 10) !== input.date
  )
    return 'Bitte wählen Sie ein gültiges Datum.';
  if (input.date < today()) return 'Buchungen in der Vergangenheit sind nicht möglich.';
  if (![input.start, input.end].every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)))
    return 'Bitte geben Sie gültige Uhrzeiten ein.';
  if (input.start >= input.end) return 'Die Endzeit muss nach der Startzeit liegen.';
  if (input.start < '07:00' || input.end > '22:00')
    return 'Buchungen sind zwischen 07:00 und 22:00 Uhr möglich.';
  const sameDay = data.bookings.filter((b) => b.date === input.date && overlaps(b, input));
  if (sameDay.some((b) => b.objectId === input.objectId))
    return 'Dieser Platz ist im gewählten Zeitraum bereits gebucht. Bitte wählen Sie eine andere Zeit.';
  if (sameDay.some((b) => b.employeeId === input.employeeId))
    return 'Für diesen Mitarbeiter besteht in diesem Zeitraum bereits eine Buchung.';
  return null;
}

export function statusFor(
  bookings: Booking[],
  objectId: string,
  date: string,
  start = '07:00',
  end = '22:00',
): WorkspaceStatus {
  const matches = bookings.filter(
    (b) => b.objectId === objectId && b.date === date && overlaps(b, { start, end }),
  );
  return matches.some((b) => b.checkedIn && date === today())
    ? 'occupied'
    : matches.length
      ? 'reserved'
      : 'available';
}
export const statusLabels: Record<WorkspaceStatus, string> = {
  available: 'Verfügbar',
  reserved: 'Reserviert',
  occupied: 'Belegt',
};
