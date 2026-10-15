import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { useOfficeStore } from '../store/useOfficeStore';
export function TimeWindowPicker() {
  const { timeStart, timeEnd, setTimeWindow } = useOfficeStore();
  const [start, setStart] = useState(timeStart),
    [end, setEnd] = useState(timeEnd);
  useEffect(() => {
    setStart(timeStart);
    setEnd(timeEnd);
  }, [timeStart, timeEnd]);
  function change(nextStart: string, nextEnd: string) {
    setStart(nextStart);
    setEnd(nextEnd);
    setTimeWindow(nextStart, nextEnd);
  }
  const invalid = !start || !end || start >= end;
  return (
    <section className="time-window-panel" aria-label="Zeitgenaue Verfügbarkeit">
      <div>
        <span className="time-window-icon">
          <Clock3 size={18} />
        </span>
        <div>
          <strong>Wann möchten Sie im Büro sein?</strong>
          <p>
            {invalid
              ? 'Die Endzeit muss nach der Startzeit liegen. Bis dahin gilt die letzte gültige Auswahl.'
              : 'Grundriss, Kennzahlen und freie Plätze zeigen genau dieses Zeitfenster.'}
          </p>
        </div>
      </div>
      <div className="time-window-inputs">
        <label>
          Von
          <input
            aria-label="Verfügbarkeit von"
            type="time"
            value={start}
            onChange={(e) => change(e.target.value, end)}
          />
        </label>
        <span>–</span>
        <label>
          Bis
          <input
            aria-label="Verfügbarkeit bis"
            type="time"
            value={end}
            onChange={(e) => change(start, e.target.value)}
          />
        </label>
        <span className={`badge ${invalid ? 'badge-reserved' : 'badge-available'}`}>
          {invalid ? 'Bitte prüfen' : `${timeStart}–${timeEnd} Uhr`}
        </span>
      </div>
    </section>
  );
}
