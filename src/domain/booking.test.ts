import { describe, expect, it } from 'vitest';
import { overlaps, statusFor, today, validateBooking } from './booking';
import { createSeed } from '../data/seed';
import type { BookingInput } from './types';

const input = (): BookingInput => ({
  roomId: 'open',
  objectId: 'OS-24',
  employeeId: 'e22',
  date: today(),
  start: '10:00',
  end: '11:00',
});
describe('Buchungsregeln', () => {
  it('erstellt 106 Arbeitsplätze und fünf buchbare Meetingräume', () => {
    const objects = createSeed().rooms.flatMap((r) => r.objects);
    expect(objects.filter((o) => o.kind === 'desk')).toHaveLength(106);
    expect(objects.filter((o) => o.kind === 'meeting')).toHaveLength(5);
  });
  it('akzeptiert einen freien Arbeitsplatz', () => expect(validateBooking(createSeed(), input())).toBeNull());
  it('verhindert Überschneidungen eines Arbeitsplatzes', () =>
    expect(validateBooking(createSeed(), { ...input(), objectId: 'OS-1' })).toContain('bereits gebucht'));
  it('verhindert Doppelbuchungen eines Mitarbeiters über Bürobereiche hinweg', () =>
    expect(validateBooking(createSeed(), { ...input(), employeeId: 'e1' })).toContain('Mitarbeiter'));
  it('prüft auch Meetingräume auf Überschneidungen', () =>
    expect(validateBooking(createSeed(), { ...input(), roomId: 'hybrid', objectId: 'meeting-1' })).toContain(
      'bereits gebucht',
    ));
  it('erlaubt direkt aufeinanderfolgende Buchungen', () => {
    expect(overlaps({ start: '09:00', end: '10:00' }, { start: '10:00', end: '11:00' })).toBe(false);
    expect(
      validateBooking(createSeed(), { ...input(), objectId: 'OS-1', start: '13:00', end: '14:00' }),
    ).toBeNull();
  });
  it('lehnt einen ungültigen Zeitraum und unzulässige Uhrzeiten ab', () => {
    expect(validateBooking(createSeed(), { ...input(), end: '09:00' })).toContain('Endzeit');
    expect(validateBooking(createSeed(), { ...input(), start: '06:00' })).toContain('07:00');
    expect(validateBooking(createSeed(), { ...input(), end: '24:00' })).toContain('gültige Uhrzeiten');
  });
  it('lehnt vergangene und nicht existierende Daten ab', () => {
    expect(validateBooking(createSeed(), { ...input(), date: '2020-01-01' })).toContain('Vergangenheit');
    expect(validateBooking(createSeed(), { ...input(), date: '2099-02-30' })).toContain('gültiges Datum');
  });
  it('lehnt unbekannte Mitarbeiter und dekorative Objekte ab', () => {
    expect(validateBooking(createSeed(), { ...input(), employeeId: 'unknown' })).toContain('Mitarbeiter');
    expect(validateBooking(createSeed(), { ...input(), objectId: 'op1' })).toContain('buchbaren');
  });
  it('berechnet den Status aus Buchungen, Datum und Anwesenheit', () => {
    const { bookings } = createSeed();
    expect(statusFor(bookings, 'OS-1', today())).toBe('occupied');
    expect(statusFor(bookings, 'OS-12', today())).toBe('reserved');
    expect(statusFor(bookings, 'OS-24', today())).toBe('available');
    expect(statusFor(bookings, 'OS-1', '2099-01-01')).toBe('available');
    expect(statusFor(bookings, 'OS-1', today(), '13:00', '14:00')).toBe('available');
  });
  it('gibt Plätze außerhalb ihrer konkreten Buchungszeit sofort frei', () => {
    const { bookings } = createSeed();
    expect(statusFor(bookings, 'OS-1', today(), '12:30', '13:00')).toBe('occupied');
    expect(statusFor(bookings, 'OS-1', today(), '13:00', '18:00')).toBe('available');
    expect(statusFor(bookings, 'OS-12', today(), '18:00', '19:00')).toBe('available');
    expect(statusFor(bookings, 'OS-12', today(), '17:59', '18:01')).toBe('reserved');
  });
});
