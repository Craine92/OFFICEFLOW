import { Link } from 'react-router-dom';
import { X, Layers3, Building2, MapPin, Maximize2, Sparkles } from 'lucide-react';
import { WorkspaceView } from '../components/WorkspaceView';
import { TimeWindowPicker } from '../components/TimeWindowPicker';
import { useOfficeStore } from '../store/useOfficeStore';
import { Button } from '../components/ui/button';
import type { BookingTarget } from '../components/BookingDialog';
export function PresentationPage({ onBook }: { onBook: (v: BookingTarget) => void }) {
  const { date, setDate, data, roomId } = useOfficeStore();
  const room = data?.rooms.find((entry) => entry.id === roomId) ?? data?.rooms[0];
  return (
    <div className="presentation">
      <header className="presentation-header">
        <span>
          <Layers3 size={25} />
          <strong>OFFICEFLOW</strong>
          <small>Ihre Arbeitswelt im Überblick</small>
        </span>
        <div className="presentation-location">
          <MapPin size={15} />
          <span>
            <small>STANDORT</small>
            <strong>Berlin Mitte</strong>
          </span>
          <i />
          <Building2 size={15} />
          <span>
            <small>ETAGE</small>
            <strong>{room?.name ?? 'Arbeitswelt'}</strong>
          </span>
        </div>
        <label>
          Planungsdatum
          <input
            aria-label="Präsentationsdatum"
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
        </label>
        <Button
          variant="ghost"
          aria-label="Vollbildmodus aktivieren"
          onClick={() => void document.documentElement.requestFullscreen?.()}
        >
          <Maximize2 size={17} />
          Vollbild
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/showcase">
            <Sparkles size={17} />
            Showcase
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/raumplanung">
            <X size={17} />
            Präsentation beenden
          </Link>
        </Button>
      </header>
      <TimeWindowPicker />
      <WorkspaceView onBook={onBook} />
    </div>
  );
}
