import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { useOfficeStore } from '../store/useOfficeStore';
import { Avatar } from '../components/BookingTable';
import { Dialog } from '../components/ui/dialog';

export function EmployeesPage() {
  const { data, date } = useOfficeStore();
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  if (!data) return null;
  const departments = [...new Set(data.employees.map((e) => e.department))];
  const people = data.employees.filter(
    (e) =>
      (department === 'all' || e.department === department) &&
      `${e.name} ${e.department}`.toLowerCase().includes(query.toLowerCase()),
  );
  const employee = data.employees.find((e) => e.id === selected);
  return (
    <>
      <section className="panel people-panel">
        <div className="panel-heading">
          <div>
            <h2>
              Gute Arbeit ist Teamsache<span className="heading-count">{data.employees.length}</span>
            </h2>
            <p className="muted">Fiktive Mitarbeiter und Abteilungen für Ihre Demo.</p>
          </div>
          <Users size={23} className="muted" />
        </div>
        <div className="list-toolbar">
          <label className="search-field">
            <Search size={16} />
            <input
              placeholder="Mitarbeiter suchen …"
              aria-label="Mitarbeiter suchen"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Abteilung filtern"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="all">Alle Abteilungen</option>
            {departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="people-grid">
          {people.map((e) => {
            const booking = data.bookings.find((b) => b.employeeId === e.id && b.date === date);
            const object = data.rooms.flatMap((r) => r.objects).find((o) => o.id === booking?.objectId);
            return (
              <button className="person-card" key={e.id} onClick={() => setSelected(e.id)}>
                <Avatar {...e} />
                <strong>{e.name}</strong>
                <span>{e.department}</span>
                <div className={`person-location ${booking ? 'has-booking' : ''}`}>
                  <i
                    className={`mini-dot ${booking?.checkedIn ? 'occupied' : booking ? 'reserved' : 'neutral'}`}
                  />
                  {booking
                    ? `${object?.name} · ${booking.start}–${booking.end}`
                    : 'Keine Buchung am gewählten Tag'}
                </div>
              </button>
            );
          })}
          {!people.length && <div className="empty-state">Keine Mitarbeiter für diese Suche gefunden.</div>}
        </div>
      </section>
      <Dialog
        open={!!employee}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={employee?.name ?? 'Mitarbeiter'}
        description={employee?.department ?? ''}
      >
        {employee && (
          <>
            <div className="employee-detail">
              <Avatar {...employee} />
              <p>Fiktives Demo-Profil · {employee.department}</p>
            </div>
            <h3>Gespeicherte Buchungen</h3>
            <div className="employee-bookings">
              {data.bookings
                .filter((b) => b.employeeId === employee.id)
                .map((b) => (
                  <div key={b.id}>
                    <strong>
                      {data.rooms.flatMap((r) => r.objects).find((o) => o.id === b.objectId)?.name}
                    </strong>
                    <span>
                      {new Date(`${b.date}T12:00:00`).toLocaleDateString('de-DE')} · {b.start}–{b.end} Uhr
                    </span>
                  </div>
                ))}
              {!data.bookings.some((b) => b.employeeId === employee.id) && (
                <p className="muted">Noch keine Buchungen vorhanden.</p>
              )}
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
