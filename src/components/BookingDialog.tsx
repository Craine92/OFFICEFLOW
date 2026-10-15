import { useEffect, useState } from 'react';
import { Armchair, ArrowRight, CalendarDays, Check, Monitor, Users } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { useOfficeStore } from '../store/useOfficeStore';
import { formatDate, today } from '../domain/booking';
import type { PlanObject } from '../domain/types';

export interface BookingTarget {
  roomId: string;
  objectId: string;
}
export function BookingDialog({
  target,
  onClose,
  onSuccess,
}: {
  target: BookingTarget | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const { data, date, book } = useOfficeStore();
  const [bookingDate, setBookingDate] = useState(date);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('18:00');
  const [employee, setEmployee] = useState('e1');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [objectId, setObjectId] = useState('');
  const [roomId, setRoomId] = useState('open');
  useEffect(() => {
    if (target) {
      setObjectId(target.objectId);
      setRoomId(target.roomId);
      setBookingDate(date);
      setError('');
      setStart('09:00');
      setEnd('18:00');
    }
  }, [target, date]);
  const room = data?.rooms.find((r) => r.id === roomId);
  const object: PlanObject | undefined = room?.objects.find((o) => o.id === objectId);
  const existing =
    data?.bookings
      .filter((b) => b.objectId === objectId && b.date === bookingDate)
      .sort((a, b) => a.start.localeCompare(b.start)) ?? [];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await book({ objectId, roomId, employeeId: employee, date: bookingDate, start, end });
      onSuccess(`${object?.name ?? 'Arbeitsplatz'} wurde erfolgreich gebucht.`);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open={!!target}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
      title="Ihr Platz für gute Arbeit"
      description="Wählen Sie einen Arbeitsplatz oder Meetingraum und reservieren Sie Ihre Zeit."
    >
      <form onSubmit={submit} className="booking-form">
        <div className="booking-resource">
          <div className="resource-icon">
            {object?.kind === 'meeting' ? <Users size={25} /> : <Armchair size={25} />}
          </div>
          <div>
            <strong>{object?.name || 'Arbeitsplatz auswählen'}</strong>
            <span>{room?.name} · Berlin Mitte</span>
          </div>
          <span className="badge badge-neutral">
            {object?.kind === 'meeting' ? `${object.capacity} Personen` : 'Arbeitsplatz'}
          </span>
        </div>
        <div className="form-grid">
          <label>
            Büro
            <select
              aria-label="Büro"
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value);
                setObjectId('');
              }}
            >
              {data?.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Arbeitsplatz / Raum
            <select
              aria-label="Arbeitsplatz / Raum"
              required
              value={objectId}
              onChange={(e) => setObjectId(e.target.value)}
            >
              <option value="" disabled>
                Bitte auswählen
              </option>
              {room?.objects
                .filter((o) => ['desk', 'meeting'].includes(o.kind))
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <label>
          <span>
            <CalendarDays size={14} /> Datum
          </span>
          <input
            type="date"
            required
            min={today()}
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Von
            <input
              type="time"
              required
              min="07:00"
              max="21:59"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Bis
            <input
              type="time"
              required
              min="07:01"
              max="22:00"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <label>
          Mitarbeiter
          <select aria-label="Mitarbeiter" value={employee} onChange={(e) => setEmployee(e.target.value)}>
            {data?.employees.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.department}
              </option>
            ))}
          </select>
        </label>
        {object?.equipment && (
          <div className="equipment">
            {object.equipment.map((item) => (
              <span key={item}>
                <Monitor size={12} />
                {item}
              </span>
            ))}
          </div>
        )}
        {existing.length > 0 && (
          <div className="existing-bookings">
            <strong>
              Bereits gebucht am {formatDate(bookingDate, { day: '2-digit', month: '2-digit' })}
            </strong>
            {existing.map((b) => (
              <span key={b.id}>
                {b.start}–{b.end} Uhr · {data?.employees.find((e) => e.id === b.employeeId)?.name}
              </span>
            ))}
          </div>
        )}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-footer">
          <span>
            <Check size={13} /> Lokal in dieser Demo gespeichert
          </span>
          <Button type="submit" disabled={saving || !objectId}>
            {saving ? 'Wird gebucht …' : 'Verbindlich buchen'}
            <ArrowRight size={15} />
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
