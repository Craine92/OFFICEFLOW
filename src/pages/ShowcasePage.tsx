import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  Armchair,
  Building2,
  Check,
  CopyPlus,
  Maximize2,
  Presentation,
  Sparkles,
  Users,
} from 'lucide-react';
import { showcaseFloors, cloneShowcaseFloor } from '../data/showcaseFloors';
import { useOfficeStore } from '../store/useOfficeStore';
import { FloorPlan } from '../components/FloorPlan';
import { Button } from '../components/ui/button';

export function ShowcasePage({ notify }: { notify: (message: string) => void }) {
  const floors = useMemo(showcaseFloors, []);
  const [activeId, setActiveId] = useState(floors[0].id);
  const [busy, setBusy] = useState(false);
  const viewer = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { date, timeStart, timeEnd, addRoom, setRoom, providerMode } = useOfficeStore();
  const active = floors.find((floor) => floor.id === activeId) ?? floors[0];
  const totalDesks = floors.reduce(
    (sum, floor) => sum + floor.room.objects.filter((object) => object.kind === 'desk').length,
    0,
  );

  async function copyFloor() {
    if (providerMode !== 'demo') {
      notify('Showcase-Pläne können nur in eine lokale Demo-Arbeitsumgebung übernommen werden.');
      return;
    }
    setBusy(true);
    try {
      const room = cloneShowcaseFloor(active.room);
      await addRoom(room);
      setRoom(room.id);
      notify(`${active.title} wurde als unabhängige lokale Kopie übernommen.`);
      navigate('/raumplanung');
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="showcase-page">
      <section className="showcase-hero panel">
        <div>
          <span className="eyebrow">
            <Sparkles size={13} /> OFFICEFLOW SHOWCASE
          </span>
          <h2>Arbeitswelten, die Eindruck hinterlassen.</h2>
          <p>
            Drei sorgfältig konstruierte Etagen zeigen, wie realistische Büroplanung, Ressourcen und
            Präsentation in OFFICEFLOW zusammenspielen.
          </p>
          <div className="showcase-hero-actions">
            <Button onClick={() => viewer.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              Ausgewählten Plan erkunden
              <ArrowDown size={16} />
            </Button>
            <span>
              <Check size={15} /> Immer sichtbar · unabhängig von Ihren Daten
            </span>
          </div>
        </div>
        <div className="showcase-hero-metric">
          <strong>{totalDesks}</strong>
          <span>gestaltete Arbeitsplätze</span>
          <small>in drei Präsentationswelten</small>
        </div>
      </section>

      <div className="showcase-cards">
        {floors.map((floor) => {
          const desks = floor.room.objects.filter((object) => object.kind === 'desk').length;
          const meetings = floor.room.objects.filter((object) => object.kind === 'meeting').length;
          return (
            <article
              key={floor.id}
              className={`panel showcase-card ${floor.id === active.id ? 'active' : ''}`}
              style={{ '--showcase-accent': floor.accent } as CSSProperties}
            >
              <button
                className="showcase-preview"
                onClick={() => {
                  setActiveId(floor.id);
                  viewer.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                aria-label={`${floor.title} ansehen`}
              >
                <FloorPlan
                  thumbnail
                  room={floor.room}
                  bookings={[]}
                  date={date}
                  timeStart={timeStart}
                  timeEnd={timeEnd}
                  onSelect={() => undefined}
                />
                <span className="showcase-preview-action">
                  <Maximize2 size={15} /> Grundriss ansehen
                </span>
              </button>
              <div className="showcase-card-copy">
                <span className="showcase-building">
                  <Building2 size={13} />
                  {floor.building}
                </span>
                <h3>{floor.title}</h3>
                <p>{floor.description}</p>
                <div className="showcase-facts">
                  <span>
                    <Armchair size={15} />
                    <strong>{desks}</strong> Arbeitsplätze
                  </span>
                  <span>
                    <Users size={15} />
                    <strong>{meetings}</strong> Besprechungsräume
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <section className="panel showcase-viewer" ref={viewer}>
        <div className="showcase-viewer-head">
          <div>
            <span className="eyebrow">
              <Presentation size={13} /> LIVE-VORSCHAU
            </span>
            <h2>{active.title}</h2>
            <p>{active.building} · vollständig zoombar und interaktiv</p>
          </div>
          <div className="showcase-viewer-actions">
            <Button variant="outline" onClick={() => navigate('/praesentation')}>
              Präsentationsmodus
              <Presentation size={16} />
            </Button>
            <Button disabled={busy || providerMode !== 'demo'} onClick={() => void copyFloor()}>
              <CopyPlus size={16} />
              {busy ? 'Wird übernommen …' : 'Als eigene Kopie übernehmen'}
            </Button>
          </div>
        </div>
        <div className="showcase-canvas">
          <FloorPlan
            room={active.room}
            bookings={[]}
            date={date}
            timeStart={timeStart}
            timeEnd={timeEnd}
            onSelect={() => undefined}
          />
        </div>
        <div className="showcase-viewer-foot">
          <span>Showcase-Pläne sind unveränderliche Vorlagen.</span>
          <span>
            Eine Kopie erhält vollständig neue IDs und berührt keine bestehenden Buchungen oder Dateien.
          </span>
        </div>
      </section>
    </div>
  );
}
