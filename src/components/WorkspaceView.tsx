import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Armchair,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Layers3,
  Monitor,
  Plus,
  Users,
  Presentation,
} from 'lucide-react';
import { useOfficeStore } from '../store/useOfficeStore';
import { statusFor, statusLabels } from '../domain/booking';
import type { BookingTarget } from './BookingDialog';
import type { WorkspaceStatus } from '../domain/types';
import { FloorPlan } from './FloorPlan';
import { Button } from './ui/button';
import { Avatar } from './BookingTable';
import { planArea } from '../domain/design';

export function WorkspaceView({ onBook }: { onBook: (target: BookingTarget) => void }) {
  const { data, date, roomId, setRoom, timeStart, timeEnd } = useOfficeStore();
  const [filter, setFilter] = useState<WorkspaceStatus | 'all'>('all');
  const [selected, setSelected] = useState<string>();
  if (!data) return null;
  const room = data.rooms.find((r) => r.id === roomId) ?? data.rooms[0];
  const roomDesks = room.objects.filter((o) => o.kind === 'desk');
  const availableDesks = roomDesks.filter(
    (o) => statusFor(data.bookings, o.id, date, timeStart, timeEnd) === 'available',
  );
  const meetings = data.rooms.flatMap((r) =>
    r.objects.filter((o) => o.kind === 'meeting').map((o) => ({ ...o, roomId: r.id })),
  );
  const selectedObject = room.objects.find((o) => o.id === selected);
  const displayObjects =
    selectedObject && ['desk', 'meeting'].includes(selectedObject.kind)
      ? [selectedObject]
      : availableDesks.slice(0, 5);
  return (
    <>
      <div className="workspace-grid workspace-grid-full">
        <section className="panel plan-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">
                <Layers3 size={13} /> IHR BÜRO IM ÜBERBLICK
              </div>
              <h2>Raum für Ihren Arbeitstag</h2>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/praesentation">
                <Presentation size={16} />
                Präsentieren
              </Link>
            </Button>
            <span className="live-indicator">
              <i />
              {room.background ? 'Eigener Grundriss' : 'Demo-Grundriss'}
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
            timeStart={timeStart}
            timeEnd={timeEnd}
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
              {roomDesks.length} Arbeitsplätze <span className="legend-separator">·</span> {planArea(room)}
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
                      <span
                        className={`mini-dot ${statusFor(data.bookings, o.id, date, timeStart, timeEnd)}`}
                      />
                    </strong>
                    <span>
                      <Monitor size={11} />
                      {o.kind === 'meeting'
                        ? `${o.capacity} Personen`
                        : o.equipment?.slice(0, 2).join(' · ') || 'Individuell eingerichtet'}
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
                onBook({
                  roomId: room.id,
                  objectId: selectedObject?.id ?? availableDesks[0]?.id ?? roomDesks[0]?.id ?? '',
                })
              }
            >
              {selectedObject ? 'Auswahl buchen' : 'Arbeitsplatz buchen'}
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
                {
                  meetings.filter(
                    (m) => statusFor(data.bookings, m.id, date, timeStart, timeEnd) === 'available',
                  ).length
                }{' '}
                von {meetings.length} Räumen frei
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
                    <i className={`mini-dot ${statusFor(data.bookings, m.id, date, timeStart, timeEnd)}`} />
                    {statusLabels[statusFor(data.bookings, m.id, date, timeStart, timeEnd)]}
                  </span>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              disabled={!meetings.length}
              onClick={() => {
                setSelected(undefined);
                const meeting =
                  meetings.find(
                    (m) => statusFor(data.bookings, m.id, date, timeStart, timeEnd) === 'available',
                  ) ?? meetings[0];
                if (meeting) {
                  setRoom(meeting.roomId);
                  onBook({ roomId: meeting.roomId, objectId: meeting.id });
                }
              }}
            >
              Meetingraum finden
              <ArrowUpRight size={17} />
            </Button>
          </section>
        </aside>
      </div>

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
    </>
  );
}
