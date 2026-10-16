import { useState } from 'react';
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
  DoorOpen,
  Activity,
  Sparkles,
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
  const [overviewRoomId, setOverviewRoomId] = useState<string>();
  if (!data) return null;
  const overviewRoom =
    data.rooms.find((room) => room.id === overviewRoomId) ??
    data.rooms.find((room) => room.id === 'demo-showcase-hq') ??
    data.rooms[0];
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
  const freeMeetings = meetings.filter(
    (meeting) => statusFor(data.bookings, meeting.id, date, timeStart, timeEnd) === 'available',
  ).length;
  const timeline = Array.from({ length: 10 }, (_, index) => {
    const start = `${String(index + 8).padStart(2, '0')}:00`;
    const end = `${String(index + 9).padStart(2, '0')}:00`;
    return desks.filter((desk) => statusFor(data.bookings, desk.id, date, start, end) !== 'available').length;
  });
  const utilization = Math.round(((total - counts.available) / Math.max(1, total)) * 100);
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
          {
            label: 'Freie Meetingräume',
            value: freeMeetings,
            detail: `${meetings.length} Räume im Portfolio`,
            Icon: DoorOpen,
            status: 'meeting',
          },
          {
            label: 'Auslastung',
            value: `${utilization} %`,
            detail: 'Verlauf von 08 bis 18 Uhr',
            Icon: Activity,
            status: 'utilization',
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
                  : typeof value === 'number' && !['meeting'].includes(status)
                    ? `${Math.round((value / Math.max(1, total)) * 100)} % aller Arbeitsplätze`
                    : status === 'meeting'
                      ? 'Aktuell buchbar'
                      : 'Aus echten Buchungsdaten'}
              </span>
            </div>
            {status === 'utilization' && (
              <span className="kpi-sparkline" aria-label="Auslastung im Tagesverlauf">
                {timeline.map((amount, index) => (
                  <i
                    key={index}
                    style={{ height: `${Math.max(10, (amount / Math.max(1, total)) * 100)}%` }}
                  />
                ))}
              </span>
            )}
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
              <p className="muted">
                Etage wechseln, Verfügbarkeit prüfen und direkt in die Planung einsteigen.
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/showcase">
                <Sparkles size={15} />
                Showcase entdecken
              </Link>
            </Button>
          </div>
          <div className="dashboard-floor-stage">
            <div className="dashboard-floor-canvas">
              <FloorPlan
                room={overviewRoom}
                bookings={data.bookings}
                date={date}
                timeStart={timeStart}
                timeEnd={timeEnd}
                onSelect={(object) => onBook({ roomId: overviewRoom.id, objectId: object.id })}
              />
              <div className="dashboard-floor-caption">
                <span>
                  <Building2 size={14} />
                  Berlin Mitte
                </span>
                <strong>{overviewRoom.name}</strong>
                <small>
                  {overviewRoom.objects.filter((object) => object.kind === 'desk').length} Arbeitsplätze ·{' '}
                  {overviewRoom.subtitle}
                </small>
              </div>
            </div>
            <div className="floor-quick-list" aria-label="Etage für die Übersicht auswählen">
              {data.rooms.map((room) => {
                const resources = room.objects.filter((o) => o.kind === 'desk'),
                  free = resources.filter(
                    (o) => statusFor(data.bookings, o.id, date, timeStart, timeEnd) === 'available',
                  ).length;
                return (
                  <button
                    key={room.id}
                    onClick={() => setOverviewRoomId(room.id)}
                    className={overviewRoom.id === room.id ? 'active' : ''}
                  >
                    <span className="floor-quick-index">
                      {String(data.rooms.indexOf(room) + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <strong>{room.name}</strong>
                      <small>
                        {resources.length} Plätze · {free} frei
                      </small>
                      <i>
                        <b style={{ width: `${(free / Math.max(1, resources.length)) * 100}%` }} />
                      </i>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                );
              })}
              <Button variant="outline" asChild>
                <Link to="/raumplanung" onClick={() => setRoom(overviewRoom.id)}>
                  Etage vollständig öffnen
                  <ArrowRight size={15} />
                </Link>
              </Button>
            </div>
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
