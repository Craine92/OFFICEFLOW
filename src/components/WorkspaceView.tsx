import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Armchair,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Layers3,
  Monitor,
  Plus,
  Users,
} from 'lucide-react';
import { useOfficeStore } from '../store/useOfficeStore';
import { statusFor, statusLabels, today } from '../domain/booking';
import type { BookingTarget } from './BookingDialog';
import type { WorkspaceStatus } from '../domain/types';
import { FloorPlan } from './FloorPlan';
import { Button } from './ui/button';
import { BookingTable, Avatar } from './BookingTable';

export function WorkspaceView({
  full = false,
  onBook,
  notify,
}: {
  full?: boolean;
  onBook: (target: BookingTarget) => void;
  notify: (message: string) => void;
}) {
  const { data, date, roomId, setRoom } = useOfficeStore();
  const [filter, setFilter] = useState<WorkspaceStatus | 'all'>('all');
  const [selected, setSelected] = useState<string>();
  if (!data) return null;
  const room = data.rooms.find((r) => r.id === roomId) ?? data.rooms[0];
  const desks = data.rooms.flatMap((r) => r.objects.filter((o) => o.kind === 'desk'));
  const counts = (status: WorkspaceStatus) =>
    desks.filter((o) => statusFor(data.bookings, o.id, date) === status).length;
  const available = counts('available'),
    occupied = counts('occupied'),
    reserved = counts('reserved');
  const roomDesks = room.objects.filter((o) => o.kind === 'desk');
  const availableDesks = roomDesks.filter((o) => statusFor(data.bookings, o.id, date) === 'available');
  const meetings = data.rooms.flatMap((r) =>
    r.objects.filter((o) => o.kind === 'meeting').map((o) => ({ ...o, roomId: r.id })),
  );
  const bookingDay = data.bookings
    .filter((b) => b.date === date)
    .sort((a, b) => a.start.localeCompare(b.start));
  const selectedObject = room.objects.find((o) => o.id === selected);
  const displayObjects =
    selectedObject && ['desk', 'meeting'].includes(selectedObject.kind)
      ? [selectedObject]
      : availableDesks.slice(0, full ? 5 : 3);
  return (
    <>
      {!full && (
        <div className="kpi-grid">
          <article className="kpi">
            <div className="kpi-top">
              <span>Arbeitsplätze gesamt</span>
              <span className="kpi-icon">
                <Armchair size={19} />
              </span>
            </div>
            <div className="kpi-value">
              {desks.length}
              <span>über 3 Bürobereiche</span>
            </div>
            <div className="kpi-foot">
              <Building2 size={13} />
              Berlin Mitte · 2. Obergeschoss
            </div>
          </article>
          <article className="kpi">
            <div className="kpi-top">
              <span>Verfügbare Plätze</span>
              <span className="kpi-icon green">
                <Check size={19} />
              </span>
            </div>
            <div className="kpi-value">
              {available}
              <span className="green-text">Platz für Ihre Ideen</span>
            </div>
            <div className="kpi-foot">
              <span className="mini-dot available" />
              {Math.round((available / desks.length) * 100)} % der Arbeitsplätze verfügbar
            </div>
          </article>
          <article className="kpi">
            <div className="kpi-top">
              <span>Reservierte Plätze</span>
              <span className="kpi-icon amber">
                <CalendarCheck2 size={19} />
              </span>
            </div>
            <div className="kpi-value">
              {reserved}
              <span>erwartete Ankünfte</span>
            </div>
            <div className="kpi-foot">
              <Clock3 size={13} />
              {date === today() ? 'Für heute vorgemerkt' : 'Für das gewählte Datum'}
            </div>
          </article>
          <article className="kpi">
            <div className="kpi-top">
              <span>Belegte Plätze</span>
              <span className="kpi-icon blue">
                <Users size={19} />
              </span>
            </div>
            <div className="kpi-value">
              {occupied}
              <span>Mitarbeiter vor Ort</span>
            </div>
            <div className="kpi-foot">
              <span className="mini-dot occupied" />
              {Math.round((occupied / desks.length) * 100)} % aktuelle Anwesenheit
            </div>
          </article>
        </div>
      )}
      <div className={`workspace-grid ${full ? 'workspace-grid-full' : ''}`}>
        <section className="panel plan-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">
                <Layers3 size={13} /> IHR BÜRO IM ÜBERBLICK
              </div>
              <h2>{full ? 'Raum für Ihren Arbeitstag' : 'Finden Sie Ihren Lieblingsplatz'}</h2>
            </div>
            <span className="live-indicator">
              <i />
              Demo-Grundriss
            </span>
          </div>
          <div className="plan-toolbar">
            <div className="room-tabs" aria-label="Bürobereich">
              {data.rooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setRoom(r.id);
                    setSelected(undefined);
                  }}
                  className={room.id === r.id ? 'active' : ''}
                >
                  {r.name}
                  <span>{r.objects.filter((o) => o.kind === 'desk').length}</span>
                </button>
              ))}
            </div>
            <select
              className="status-select"
              aria-label="Arbeitsplätze nach Status filtern"
              value={filter}
              onChange={(e) => setFilter(e.target.value as WorkspaceStatus | 'all')}
            >
              <option value="all">Alle Status</option>
              <option value="available">Verfügbar</option>
              <option value="reserved">Reserviert</option>
              <option value="occupied">Belegt</option>
            </select>
          </div>
          <FloorPlan
            room={room}
            bookings={data.bookings}
            date={date}
            selectedId={selected}
            filter={filter}
            onSelect={(o) => {
              setSelected(o.id);
              onBook({ roomId: room.id, objectId: o.id });
            }}
          />
          <div className="plan-legend">
            <div>
              <span>
                <i className="mini-dot available" />
                Verfügbar
              </span>
              <span>
                <i className="mini-dot reserved" />
                Reserviert
              </span>
              <span>
                <i className="mini-dot occupied" />
                Belegt
              </span>
            </div>
            <span>
              {roomDesks.length} Arbeitsplätze <span className="legend-separator">·</span> {room.area} m²
            </span>
          </div>
        </section>
        <aside className="workspace-aside">
          <section className="panel availability-panel">
            <div className="aside-heading">
              <h3>{selectedObject ? 'Ihre Auswahl' : 'Ein Platz wartet auf Sie'}</h3>
              <span className="count-pill">{availableDesks.length} frei</span>
            </div>
            <p className="muted aside-description">{room.name} · Alles bereit für Ihren Tag.</p>
            <div className="desk-suggestions">
              {displayObjects.map((o) => (
                <button
                  key={o.id}
                  className="desk-suggestion"
                  onClick={() => onBook({ roomId: room.id, objectId: o.id })}
                >
                  <span className="desk-icon">
                    <Armchair size={20} />
                  </span>
                  <span className="desk-info">
                    <strong>
                      {o.name}
                      <span className={`mini-dot ${statusFor(data.bookings, o.id, date)}`} />
                    </strong>
                    <span>
                      <Monitor size={11} />
                      {o.kind === 'meeting' ? `${o.capacity} Personen` : 'Monitor · Dockingstation'}
                    </span>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ))}
              {!displayObjects.length && (
                <div className="small-empty">
                  Alle Plätze sind vorgemerkt. Klicken Sie auf einen Platz, um freie Zeitfenster zu prüfen.
                </div>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                onBook({ roomId: room.id, objectId: availableDesks[0]?.id ?? roomDesks[0]?.id ?? '' })
              }
            >
              Arbeitsplatz buchen
              <ArrowRight size={14} />
            </Button>
          </section>
          <section className="meeting-card">
            <div className="meeting-card-top">
              <span className="meeting-icon">
                <Users size={20} />
              </span>
              <span className="meeting-tag">GUTE IDEEN BRAUCHEN RAUM</span>
            </div>
            <h3>Gemeinsam weiterdenken.</h3>
            <p>
              Der richtige Raum für Ihren
              <br />
              nächsten großen Gedanken.
            </p>
            <div className="meeting-avatars">
              {data.employees.slice(0, 3).map((e) => (
                <Avatar key={e.id} {...e} small />
              ))}
              <span>
                {meetings.filter((m) => statusFor(data.bookings, m.id, date) === 'available').length} von{' '}
                {meetings.length} Räumen frei
              </span>
            </div>
            <div className="meeting-room-list">
              {meetings.map((m) => (
                <button key={m.id} onClick={() => onBook({ roomId: m.roomId, objectId: m.id })}>
                  <span>
                    {m.name}
                    <small>{m.capacity} Personen</small>
                  </span>
                  <span>
                    <i className={`mini-dot ${statusFor(data.bookings, m.id, date)}`} />
                    {statusLabels[statusFor(data.bookings, m.id, date)]}
                  </span>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setRoom('hybrid');
                setSelected(undefined);
                const meeting =
                  meetings.find((m) => statusFor(data.bookings, m.id, date) === 'available') ?? meetings[0];
                if (meeting) onBook({ roomId: meeting.roomId, objectId: meeting.id });
              }}
            >
              Meetingraum finden
              <ArrowUpRight size={17} />
            </Button>
          </section>
        </aside>
      </div>
      {!full && (
        <div className="dashboard-bottom">
          <section className="panel bookings-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  {date === today() ? 'Heutige Buchungen' : 'Buchungen am gewählten Tag'}
                  <span className="heading-count">{bookingDay.length}</span>
                </h2>
                <p className="muted">Ein guter Arbeitstag beginnt mit einem festen Platz.</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/buchungen">
                  Alle ansehen
                  <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
            <BookingTable bookings={bookingDay.slice(0, 4)} compact notify={notify} />
          </section>
          <section className="panel occupancy-panel">
            <div className="aside-heading">
              <h3>Belegung im Überblick</h3>
              <ArrowDownRight size={17} className="muted" />
            </div>
            <p className="muted">Arbeitsplätze am ausgewählten Tag</p>
            <div className="occupancy-main">
              <div
                className="donut"
                style={{
                  background: `conic-gradient(#548e7a 0deg ${(available / desks.length) * 360}deg, #e3b965 ${(available / desks.length) * 360}deg ${((available + reserved) / desks.length) * 360}deg, #899bbc ${((available + reserved) / desks.length) * 360}deg 360deg)`,
                }}
              >
                <div>
                  <strong>
                    {Math.round(((reserved + occupied) / desks.length) * 100)}
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
                    <strong>{counts(s)}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="occupancy-note">
              <Check size={14} />
              <span>Noch {available} Möglichkeiten für gute Arbeit.</span>
            </div>
          </section>
        </div>
      )}
      {full && (
        <section className="panel room-summary">
          <div>
            <h3>{room.name}</h3>
            <p className="muted">{room.subtitle}</p>
          </div>
          <span>
            <Armchair size={18} />
            {roomDesks.length} Arbeitsplätze
          </span>
          <span>
            <CalendarDays size={18} />
            {data.bookings.filter((b) => b.roomId === room.id && b.date === date).length} Buchungen
          </span>
          <Button variant="outline" asChild>
            <Link to="/editor">
              <Plus size={15} />
              Grundriss bearbeiten
            </Link>
          </Button>
        </section>
      )}
    </>
  );
}
