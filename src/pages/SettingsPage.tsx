import { useState } from 'react';
import {
  Database,
  HardDrive,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Unplug,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { useOfficeStore } from '../store/useOfficeStore';

export function SettingsPage({ notify }: { notify: (message: string) => void }) {
  const { data, reset } = useOfficeStore();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function exportData() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'officeflow-demo-sicherung.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Die Demo-Daten wurden als JSON exportiert.');
  }
  return (
    <div className="settings-grid">
      <section className="panel settings-card">
        <span className="settings-icon">
          <Database size={25} />
        </span>
        <h2>Einfach ausprobieren.</h2>
        <p>
          Sie arbeiten mit fiktiven Demo-Daten. Buchungen, Grundrisse und Änderungen bleiben lokal in diesem
          Browser gespeichert. Hochgeladene Originaldateien und Vorschauen liegen in IndexedDB; Buchungen und
          Planpositionen in localStorage.
        </p>
        <div className="settings-detail">
          <HardDrive size={18} />
          <div>
            <strong>Lokaler Demo-Datenanbieter</strong>
            <span>Kein Server und kein Benutzerkonto erforderlich</span>
          </div>
          <span className="badge badge-available">
            <i />
            Aktiv
          </span>
        </div>
        <div className="settings-detail">
          <ShieldCheck size={18} />
          <div>
            <strong>Ihre Demo, Ihr Browser</strong>
            <span>Keine Synchronisierung zwischen Geräten oder Browsern</span>
          </div>
        </div>
        <Button variant="outline" onClick={exportData}>
          <Download size={16} />
          Demo-Daten exportieren
        </Button>
        <p className="muted">
          Der JSON-Export enthält Metadaten und Buchungen, jedoch keine Hintergrunddateien. Bitte bewahren Sie
          Ihre Originaldateien auf.
        </p>
      </section>
      <section className="panel settings-card integration-card">
        <span className="settings-icon">
          <Unplug size={25} />
        </span>
        <div className="title-with-badge">
          <h2>Bereit für den nächsten Schritt</h2>
          <span className="badge badge-neutral">Vorbereitet</span>
        </div>
        <p>
          Microsoft 365 und SharePoint können später über einen eigenen Datenanbieter angebunden werden.
          Aktuell besteht keine Verbindung zu Microsoft-Diensten.
        </p>
        <div className="integration-logos">
          <span>
            <i className="microsoft-mark">
              <b />
              <b />
              <b />
              <b />
            </i>
            Microsoft 365
          </span>
          <span className="sharepoint-mark">S</span>
          <span>SharePoint</span>
        </div>
        <div className="integration-note">
          <LockKeyhole size={18} />
          <span>
            Es werden keine Zugangsdaten abgefragt. Die Schnittstellen für Datenzugriff, Buchungen und
            Grundrisse sind im Projekt definiert.
          </span>
        </div>
        <Button variant="outline" asChild>
          <a href="https://learn.microsoft.com/de-de/graph/overview" target="_blank" rel="noreferrer">
            Microsoft Graph kennenlernen
            <ArrowUpRight size={15} />
          </a>
        </Button>
      </section>
      <section className="panel reset-card">
        <div>
          <h3>Mit einer frischen Demo starten</h3>
          <p className="muted">
            Setzt alle Buchungen, Mitarbeiter und Grundrisse auf die Ausgangsdaten zurück.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setConfirm(true);
            setError('');
          }}
        >
          <RotateCcw size={15} />
          Demo zurücksetzen
        </Button>
      </section>
      <Dialog
        open={confirm}
        onOpenChange={(open) => {
          if (!busy) setConfirm(open);
        }}
        title="Demo vollständig zurücksetzen?"
        description="Alle eigenen Buchungen, Grundrissänderungen und importierten Dateien in IndexedDB werden gelöscht. Die ursprünglichen Demo-Daten werden für das heutige Datum neu angelegt."
      >
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await reset();
                setConfirm(false);
                notify('Die Demo wurde vollständig zurückgesetzt.');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Wird zurückgesetzt …' : 'Jetzt zurücksetzen'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
