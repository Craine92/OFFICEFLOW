import { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { BookingTable } from '../components/BookingTable';
import { Button } from '../components/ui/button';
import { useOfficeStore } from '../store/useOfficeStore';
import { formatDate } from '../domain/booking';

export function BookingsPage({ notify }: { notify: (message: string) => void }) {
  const { data, date } = useOfficeStore();
  const [search, setSearch] = useState('');
  const [room, setRoom] = useState('all');
  const [allDates, setAllDates] = useState(false);
  if (!data) return null;
  const bookings = data.bookings
    .filter(
      (b) =>
        (allDates || b.date === date) &&
        (room === 'all' || b.roomId === room) &&
        `${data.employees.find((e) => e.id === b.employeeId)?.name} ${data.rooms.flatMap((r) => r.objects).find((o) => o.id === b.objectId)?.name}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  function download() {
    const escape = (v: string) => `"${v.replaceAll('"', '""')}"`;
    const rows = [
      ['Mitarbeiter', 'Abteilung', 'Büro', 'Arbeitsplatz', 'Datum', 'Von', 'Bis', 'Anwesend'],
      ...bookings.map((b) => {
        const person = data!.employees.find((e) => e.id === b.employeeId)!;
        const r = data!.rooms.find((r) => r.id === b.roomId)!;
        return [
          person.name,
          person.department,
          r.name,
          r.objects.find((o) => o.id === b.objectId)!.name,
          b.date,
          b.start,
          b.end,
          b.checkedIn ? 'Ja' : 'Nein',
        ];
      }),
    ];
    const url = URL.createObjectURL(
      new Blob(['\ufeff' + rows.map((row) => row.map(escape).join(';')).join('\r\n')], {
        type: 'text/csv;charset=utf-8;',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `officeflow-buchungen-${date}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`${bookings.length} Buchungen als CSV exportiert.`);
  }
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>
            Alle Buchungen<span className="heading-count">{bookings.length}</span>
          </h2>
          <p className="muted">
            {allDates ? 'Alle gespeicherten Termine' : formatDate(date)} · Reservierungen und Anwesenheit
            verwalten
          </p>
        </div>
        <Button variant="outline" onClick={download}>
          <Download size={15} />
          CSV exportieren
        </Button>
      </div>
      <div className="list-toolbar">
        <label className="search-field">
          <Search size={16} />
          <input
            placeholder="Mitarbeiter oder Arbeitsplatz suchen …"
            aria-label="Buchungen suchen"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Buchungen nach Büro filtern"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
        >
          <option value="all">Alle Bürobereiche</option>
          {data.rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <label className="checkbox-label">
          <input type="checkbox" checked={allDates} onChange={(e) => setAllDates(e.target.checked)} />
          Alle Termine
        </label>
      </div>
      <BookingTable bookings={bookings} notify={notify} />
    </section>
  );
}
