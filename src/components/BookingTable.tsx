import { useState } from 'react';
import { Check, LogIn, Trash2 } from 'lucide-react';
import { useOfficeStore } from '../store/useOfficeStore';
import { formatDate, today } from '../domain/booking';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import type { Booking } from '../domain/types';

export function Avatar({
  name,
  initials,
  color,
  small = false,
}: {
  name: string;
  initials: string;
  color: string;
  small?: boolean;
}) {
  return (
    <span className={`avatar ${small ? 'avatar-small' : ''}`} style={{ background: color }} title={name}>
      {initials}
    </span>
  );
}
export function BookingTable({
  bookings,
  compact = false,
  notify,
}: {
  bookings: Booking[];
  compact?: boolean;
  notify: (message: string) => void;
}) {
  const { data, cancel, checkIn } = useOfficeStore();
  const [pending, setPending] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!data) return null;
  const act = async (action: () => Promise<void>, message: string) => {
    try {
      await action();
      notify(message);
    } catch (e) {
      notify((e as Error).message);
    }
  };
  return (
    <>
      <div className="table-scroll">
        <table className="booking-table">
          <thead>
            <tr>
              <th>Mitarbeiter</th>
              <th>Arbeitsplatz / Raum</th>
              {!compact && <th>Datum</th>}
              <th>Zeitraum</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Aktionen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const employee = data.employees.find((e) => e.id === b.employeeId)!;
              const room = data.rooms.find((r) => r.id === b.roomId);
              const object = room?.objects.find((o) => o.id === b.objectId);
              return (
                <tr key={b.id}>
                  <td>
                    <div className="person-cell">
                      <Avatar {...employee} small />
                      <div>
                        <strong>{employee.name}</strong>
                        <span>{employee.department}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{object?.name}</strong>
                    <span className="table-sub">{room?.name}</span>
                  </td>
                  {!compact && (
                    <td>{formatDate(b.date, { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  )}
                  <td className="time-cell">
                    {b.start} – {b.end}
                  </td>
                  <td>
                    <span
                      className={`badge ${b.checkedIn && b.date === today() ? 'badge-occupied' : 'badge-reserved'}`}
                    >
                      <i />
                      {b.checkedIn && b.date === today() ? 'Anwesend' : 'Reserviert'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {b.date === today() && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={b.checkedIn ? 'Anwesenheit aufheben' : 'Anwesenheit bestätigen'}
                          aria-label={`${b.checkedIn ? 'Anwesenheit aufheben' : 'Anwesenheit bestätigen'}: ${employee.name}`}
                          onClick={() =>
                            void act(
                              () => checkIn(b.id),
                              b.checkedIn ? 'Anwesenheit aufgehoben.' : 'Anwesenheit bestätigt.',
                            )
                          }
                        >
                          {b.checkedIn ? <Check size={16} /> : <LogIn size={16} />}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Buchung stornieren"
                        aria-label={`Buchung von ${employee.name} stornieren`}
                        onClick={() => {
                          setPending(b);
                          setError('');
                        }}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!bookings.length && (
              <tr>
                <td colSpan={compact ? 5 : 6}>
                  <div className="empty-state">
                    <Check size={24} />
                    <strong>Hier ist noch alles offen.</strong>
                    <span>
                      Für diese Auswahl gibt es keine Buchungen. Finden Sie Ihren Lieblingsplatz im Grundriss.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open && !busy) setPending(null);
        }}
        title="Buchung stornieren?"
        description="Der Arbeitsplatz wird für diesen Zeitraum wieder zur Buchung freigegeben."
      >
        {pending && (
          <p className="confirm-copy">
            {data.employees.find((e) => e.id === pending.employeeId)?.name} · {formatDate(pending.date)} ·{' '}
            {pending.start}–{pending.end} Uhr
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button variant="outline" disabled={busy} onClick={() => setPending(null)}>
            Buchung behalten
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              if (!pending) return;
              setBusy(true);
              try {
                await cancel(pending.id);
                setPending(null);
                notify('Die Buchung wurde storniert.');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Buchung stornieren
          </Button>
        </div>
      </Dialog>
    </>
  );
}
