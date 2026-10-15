import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  Armchair,
  CalendarCheck2,
  Users,
  Building2,
  Check,
  Clock3,
} from 'lucide-react';
import { useOfficeStore } from '../store/useOfficeStore';
import { statusFor, statusLabels, overlaps } from '../domain/booking';
import { FloorPlan } from './FloorPlan';
import { BookingTable } from './BookingTable';
import { Button } from './ui/button';
import type { BookingTarget } from './BookingDialog';
import type { WorkspaceStatus } from '../domain/types';
export function Dashboard({
  onBook,
  notify,
}: {
  onBook: (v: BookingTarget) => void;
  notify: (s: string) => void;
}) {
  const { data, date, timeStart, timeEnd, setRoom } = useOfficeStore();
  if (!data) return null;
  const desks = data.rooms.flatMap((r) => r.objects.filter((o) => o.kind === 'desk')),
    count = (s: WorkspaceStatus) =>
      desks.filter((o) => statusFor(data.bookings, o.id, date, timeStart, timeEnd) === s).length;
  const counts = { available: count('available'), reserved: count('reserved'), occupied: count('occupied') },
    total = desks.length;
  const bookings = data.bookings
    .filter((b) => b.date === date && overlaps(b, { start: timeStart, end: timeEnd }))
    .sort((a, b) => a.start.localeCompare(b.start));
  const meetings = data.rooms.flatMap((r) =>
    r.objects.filter((o) => o.kind === 'meeting').map((o) => ({ ...o, roomId: r.id })),
  );
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return (
    <div className="dashboard-v3">
      <div className="kpi-grid">
        {[
          {
            label: 'Arbeitsplätze gesamt',
            value: total,
            detail: `${data.rooms.length} Bürobereiche`,
            Icon: Armchair,
            status: 'total',
          },
          {
            label: 'Verfügbare Plätze',
            value: counts.available,
            detail: 'Bereit für Ihr Team',
            Icon: Check,
            status: 'available',
          },
          {
            label: 'Reservierte Plätze',
            value: counts.reserved,
            detail: 'Im gewählten Zeitraum',
            Icon: CalendarCheck2,
            status: 'reserved',
          },
          {
            label: 'Belegte Plätze',
            value: counts.occupied,
            detail: 'Anwesenheit bestätigt',
            Icon: Users,
            status: 'occupied',
          },
        ].map(({ label, value, detail, Icon, status }) => (
          <article className={`kpi kpi-${status}`} key={label}>
            <div className="kpi-top">
              <span>{label}</span>
              <span className="kpi-icon">
                <Icon size={20} />
              </span>
            </div>
            <div className="kpi-value">
              {value}
              <span>
                {status === 'total'
                  ? `${total} buchbare Arbeitsplätze`
                  : `${Math.round((value / Math.max(1, total)) * 100)} % aller Arbeitsplätze`}
              </span>
            </div>
            <div className="kpi-foot">
              <i className={`mini-dot ${status}`} />
              {detail}
            </div>
          </article>
        ))}
      </div>
      <div className="dashboard-overview">
        <section className="panel portfolio-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">UNSERE ARBEITSWELT</span>
              <h2>Ein guter Platz für jeden Tag.</h2>
              <p className="muted">Wählen Sie einen Bürobereich und entdecken Sie freie Plätze.</p>
            </div>
            <Building2 size={23} className="muted" />
          </div>
          <div className="floor-cards">
            {data.rooms.map((room) => {
              const resources = room.objects.filter((o) => o.kind === 'desk'),
                free = resources.filter(
                  (o) => statusFor(data.bookings, o.id, date, timeStart, timeEnd) === 'available',
                ).length;
              return (
                <Link key={room.id} to="/raumplanung" onClick={() => setRoom(room.id)} className="floor-card">
                  <FloorPlan
                    thumbnail
                    room={room}
                    bookings={data.bookings}
                    date={date}
                    timeStart={timeStart}
                    timeEnd={timeEnd}
                    onSelect={() => {}}
                  />
                  <div className="floor-card-title">
                    <div>
                      <strong>{room.name}</strong>
                      <span>
                        {resources.length} Arbeitsplätze · {free} verfügbar
                      </span>
                    </div>
                    <span className="floor-card-arrow">
                      <ArrowUpRight size={18} />
                    </span>
                  </div>
                  <div className="floor-card-meter">
                    <i style={{ width: `${(free / Math.max(1, resources.length)) * 100}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="panel occupancy-panel">
          <div className="aside-heading">
            <h3>Flächennutzung</h3>
            <Clock3 size={17} className="muted" />
          </div>
          <p className="muted">
            {timeStart}–{timeEnd} Uhr · Arbeitsplätze
          </p>
          <div className="occupancy-main">
            <div
              className="donut"
              style={{
                background: `conic-gradient(var(--status-free) 0deg ${(counts.available / Math.max(1, total)) * 360}deg,var(--status-reserved) ${(counts.available / Math.max(1, total)) * 360}deg ${((counts.available + counts.reserved) / Math.max(1, total)) * 360}deg,var(--status-occupied) ${((counts.available + counts.reserved) / Math.max(1, total)) * 360}deg 360deg)`,
              }}
            >
              <div>
                <strong>
                  {Math.round(((total - counts.available) / Math.max(1, total)) * 100)}
                  <small>%</small>
                </strong>
                <span>gebucht</span>
              </div>
            </div>
            <div className="occupancy-key">
              {(['available', 'reserved', 'occupied'] as const).map((s) => (
                <div key={s}>
                  <i className={`mini-dot ${s}`} />
                  <span>{statusLabels[s]}</span>
                  <strong>{counts[s]}</strong>
                </div>
              ))}
            </div>
          </div>
          <p className="occupancy-note">
            <Check size={14} />
            {counts.available} Plätze für Ihren nächsten Arbeitstag.
          </p>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="panel bookings-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">TEAM & TERMINE</span>
              <h2>
                Aktuelle Buchungen <span className="heading-count">{bookings.length}</span>
              </h2>
              <p className="muted">Reservierungen im ausgewählten Zeitfenster</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/buchungen">
                Alle ansehen
                <ArrowRight size={15} />
              </Link>
            </Button>
          </div>
          <BookingTable bookings={bookings.slice(0, 5)} compact notify={notify} />
        </section>
        <section className="panel meetings-overview">
          <div className="aside-heading">
            <h3>Besprechungsräume</h3>
            <Users size={19} />
          </div>
          <p className="muted">Zeit zum gemeinsamen Weiterdenken.</p>
          {meetings.map((m) => {
            const status = statusFor(data.bookings, m.id, date, timeStart, timeEnd);
            const booked = data.bookings
              .filter(
                (b) =>
                  b.objectId === m.id && b.date === date && overlaps(b, { start: timeStart, end: timeEnd }),
              )
              .reduce(
                (sum, b) =>
                  sum +
                  Math.max(
                    0,
                    Math.min(minutes(timeEnd), minutes(b.end)) -
                      Math.max(minutes(timeStart), minutes(b.start)),
                  ),
                0,
              );
            const utilization = Math.round(
              (booked / Math.max(1, minutes(timeEnd) - minutes(timeStart))) * 100,
            );
            return (
              <button
                key={m.id}
                className="meeting-utilization"
                onClick={() => onBook({ roomId: m.roomId, objectId: m.id })}
              >
                <div>
                  <span className="desk-icon">
                    <Users size={20} />
                  </span>
                  <span>
                    <strong>{m.name}</strong>
                    <small>
                      {m.capacity} Personen · {utilization} % gebucht
                    </small>
                  </span>
                  <i className={`mini-dot ${status}`} />
                </div>
                <span className="utilization-track">
                  <i style={{ width: `${utilization}%` }} />
                </span>
                <span>
                  {statusLabels[status]}
                  <ArrowUpRight size={14} />
                </span>
              </button>
            );
          })}
          {!meetings.length && <div className="small-empty">Noch keine Besprechungsräume angelegt.</div>}
          <Button variant="outline" asChild>
            <Link to="/raumplanung">
              Zur Raumplanung
              <ArrowRight size={15} />
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
