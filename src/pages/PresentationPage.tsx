import { Link } from 'react-router-dom';
import { X, Layers3 } from 'lucide-react';
import { WorkspaceView } from '../components/WorkspaceView';
import { TimeWindowPicker } from '../components/TimeWindowPicker';
import { useOfficeStore } from '../store/useOfficeStore';
import { Button } from '../components/ui/button';
import type { BookingTarget } from '../components/BookingDialog';
export function PresentationPage({ onBook }: { onBook: (v: BookingTarget) => void }) {
  const { date, setDate } = useOfficeStore();
  return (
    <div className="presentation">
      <header className="presentation-header">
        <span>
          <Layers3 size={25} />
          <strong>OFFICEFLOW</strong>
          <small>Ihre Arbeitswelt im Überblick</small>
        </span>
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
