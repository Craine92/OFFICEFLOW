import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Building2, Check, ChevronLeft, Database, Download, HardDrive, Link2, LockKeyhole, LogOut, RefreshCw, RotateCcw, ShieldCheck, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { useOfficeStore, getConfiguredDataProvider } from '../store/useOfficeStore';
import { planAssets } from '../data/assets';
import { createBackup, inspectBackup, restoreBackup, type BackupPreview, type OfficeflowBackup } from '../data/backup';
import { useMicrosoftIntegration } from '../integrations/microsoft/store';
import { validateAuthConfig, validateDataConfig } from '../integrations/microsoft/config';
import type { Microsoft365Config } from '../integrations/microsoft/types';

const steps = [
  ['Microsoft 365 verbinden', 'Öffentliche App-Konfiguration prüfen und mit dem Unternehmenskonto anmelden.'],
  ['Berechtigungen und Organisation prüfen', 'Angemeldetes Konto, Tenant und angeforderte Leserechte kontrollieren.'],
  ['SharePoint-Website konfigurieren', 'Stabile Site-ID eintragen; Anzeigenamen werden nicht als Schlüssel verwendet.'],
  ['Vorhandene Datenquellen prüfen', 'IDs der bestehenden SharePoint-Listen den OFFICEFLOW-Datenquellen zuordnen.'],
  ['Arbeitsplätze und Räume zuordnen', 'OFFICEFLOW-ID-Spalten und die Führung je Ressourcentyp kontrollieren.'],
  ['Verbindungsprüfung durchführen', 'Echte Listen lesen, Zuordnung validieren und Fehler sichtbar machen.'],
  ['Unternehmensvorschau öffnen', 'Den schreibgeschützten Microsoft-365-Modus mit realen Tenant-Daten öffnen.'],
] as const;

interface PendingImport {
  backup: OfficeflowBackup;
  assets: Awaited<ReturnType<typeof inspectBackup>>['assets'];
  preview: BackupPreview;
}

export function SettingsPage({ notify }: { notify: (message: string) => void }) {
  const { data, reset, initialize, providerMode } = useOfficeStore();
  const integration = useMicrosoftIntegration();
  const [confirmReset, setConfirmReset] = useState(false);
  const [wizard, setWizard] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Microsoft365Config>(integration.config);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingImport, setPendingImport] = useState<PendingImport>();
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(integration.config), [integration.config]);

  async function exportData() {
    if (!data || providerMode !== 'demo') return;
    setBusy(true);
    setError('');
    try {
      const backup = await createBackup(data, planAssets);
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/vnd.officeflow.backup+json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `officeflow-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify(`Vollständige Sicherung mit ${backup.assets.length} Datei(en) erstellt.`);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function chooseImport(file?: File) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      setPendingImport(await inspectBackup(await file.text()));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function applyImport() {
    if (!pendingImport || !data) return;
    setBusy(true);
    setError('');
    try {
      await restoreBackup(pendingImport.backup, pendingImport.assets, data, getConfiguredDataProvider(), planAssets);
      await initialize();
      setPendingImport(undefined);
      notify('Die Sicherung wurde vollständig geprüft und wiederhergestellt.');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function wizardAction() {
    setBusy(true);
    setError('');
    try {
      if (step === 0) {
        integration.setConfig(draft);
        await useMicrosoftIntegration.getState().signIn();
      } else if (step === 2 || step === 3) {
        integration.setConfig(draft);
      } else if (step === 5) {
        integration.setConfig(draft);
        await useMicrosoftIntegration.getState().activate();
      }
      setStep((current) => Math.min(6, current + 1));
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings-stack">
      <section className="panel integration-dashboard">
        <div className="settings-section-heading">
          <span className="settings-icon"><Link2 size={25} /></span>
          <div><span className="eyebrow">INTEGRATIONEN</span><h2>Microsoft 365 & SharePoint</h2><p>Kontrollierte, lesende Verbindung zu Ihrer eigenen Microsoft-365-Umgebung.</p></div>
          <span className={`badge ${integration.status === 'ready' ? 'badge-available' : 'badge-neutral'}`}><i />{statusLabel(integration.status)}</span>
        </div>
        {integration.error && <p className="integration-error" role="alert">{integration.error}</p>}
        <div className="integration-kpis">
          <StatusCell label="Betriebsart" value={integration.mode === 'demo' ? 'Lokale Demo' : 'Microsoft 365 · Nur Lesen'} />
          <StatusCell label="Organisation" value={integration.account?.organization || integration.account?.tenantId || 'Nicht verbunden'} />
          <StatusCell label="SharePoint-Website" value={integration.report?.siteName || integration.config.siteId || 'Nicht konfiguriert'} />
          <StatusCell label="Letzter erfolgreicher Abruf" value={formatTimestamp(integration.report?.lastSuccessfulRead)} />
        </div>
        {integration.report && <div className="source-grid" aria-label="Erkannte SharePoint-Listen">{integration.report.lists.map((list) => <div key={list.key} className="source-row"><span className={list.available ? 'source-ok' : 'source-missing'}>{list.available ? <Check size={14} /> : '!'}</span><div><strong>{list.label}</strong><small>{list.available ? `${list.itemCount ?? 0} Einträge gelesen` : list.error}</small></div></div>)}</div>}
        <div className="integration-actions">
          <Button onClick={() => { setStep(integration.account ? 1 : 0); setError(''); setWizard(true); }}><Building2 size={16} />{integration.status === 'ready' ? 'Verbindung prüfen' : 'Unternehmen einrichten'}</Button>
          {integration.account && <Button variant="outline" disabled={busy} onClick={() => void integration.useDemo(true)}><LogOut size={16} />Abmelden und Demo öffnen</Button>}
        </div>
        <div className="integration-note"><LockKeyhole size={18} /><span>Minimaler Zugriff: <code>User.Read</code> und <code>Sites.Read.All</code>. Keine Client-Secrets, keine Schreibrechte und keine Token in Protokollen.</span></div>
      </section>

      <div className="settings-grid">
        <section className="panel settings-card">
          <span className="settings-icon"><Database size={25} /></span><h2>Lokale Demo sichern</h2>
          <p>Das Sicherungspaket enthält Daten, Grundrissgeometrie, Buchungen sowie importierte Bilder und PDF-Originale mit SHA-256-Integritätswerten.</p>
          <div className="settings-detail"><HardDrive size={18} /><div><strong>Vollständiges lokales Paket</strong><span>Schema {data?.version ?? 3} · Vorschau vor jedem Ersetzen</span></div><span className="badge badge-available"><i />Bereit</span></div>
          {error && !wizard && <p className="form-error" role="alert">{error}</p>}
          <div className="backup-actions"><Button variant="outline" disabled={busy || providerMode !== 'demo'} onClick={() => void exportData()}><Download size={16} />Sicherung exportieren</Button><Button variant="outline" disabled={busy || providerMode !== 'demo'} onClick={() => fileInput.current?.click()}><Upload size={16} />Sicherung einlesen</Button><input ref={fileInput} className="sr-only" type="file" accept="application/json,.json" aria-label="OFFICEFLOW-Sicherung auswählen" onChange={(event) => void chooseImport(event.target.files?.[0])} /></div>
          {providerMode !== 'demo' && <p className="muted">Import und Export sind bewusst nur für lokale Demo-Daten verfügbar.</p>}
        </section>
        <section className="panel settings-card">
          <span className="settings-icon"><ShieldCheck size={25} /></span><h2>Klare Datenhoheit</h2>
          <p>SharePoint führt Stammdaten und OFFICEFLOW-Buchungsmetadaten. Microsoft Places ist optional für Gebäude und Räume; Exchange bleibt ausschließlich führend für Raumkalender.</p>
          <div className="settings-detail"><ShieldCheck size={18} /><div><strong>Arbeitsplatzbuchungen</strong><span>Im Microsoft-Modus nur lesbar, bis eine atomare Serverlogik verfügbar ist</span></div></div>
          <div className="settings-detail"><RefreshCw size={18} /><div><strong>Keine Vermischung</strong><span>Lokale Demo-Buchungen werden niemals in der Unternehmensansicht verwendet</span></div></div>
          <Button variant="outline" asChild><a href="./MICROSOFT-365-INTEGRATION.md" target="_blank">Administrationsleitfaden öffnen<ArrowRight size={15} /></a></Button>
        </section>
      </div>

      {providerMode === 'demo' && <section className="panel reset-card"><div><h3>Mit einer frischen Demo starten</h3><p className="muted">Setzt Buchungen, Mitarbeiter, Grundrisse und importierte Dateien auf die Ausgangsdaten zurück.</p></div><Button variant="outline" onClick={() => { setConfirmReset(true); setError(''); }}><RotateCcw size={15} />Demo zurücksetzen</Button></section>}

      <Dialog open={wizard} onOpenChange={(open) => !busy && setWizard(open)} title="Microsoft 365 einrichten" description={`Schritt ${step + 1} von 7 · ${steps[step][0]}`}>
        <div className="wizard-progress" aria-label={`Schritt ${step + 1} von 7`}>{steps.map((entry, index) => <span key={entry[0]} className={index <= step ? 'active' : ''}>{index + 1}</span>)}</div>
        <div className="wizard-step"><h3>{steps[step][0]}</h3><p>{steps[step][1]}</p>{renderStep(step, draft, setDraft, integration)}</div>
        {(error || integration.error) && <p className="form-error" role="alert">{error || integration.error}</p>}
        <div className="dialog-actions"><Button variant="outline" disabled={busy || step === 0} onClick={() => setStep((value) => value - 1)}><ChevronLeft size={15} />Zurück</Button>{step === 6 ? <Button asChild><Link to="/" onClick={() => setWizard(false)}>Unternehmensvorschau öffnen<ArrowRight size={15} /></Link></Button> : <Button disabled={busy || (step === 1 && !integration.account)} onClick={() => void wizardAction()}>{busy ? 'Wird geprüft …' : actionLabel(step)}<ArrowRight size={15} /></Button>}</div>
      </Dialog>

      <Dialog open={Boolean(pendingImport)} onOpenChange={(open) => !busy && !open && setPendingImport(undefined)} title="Sicherung wiederherstellen?" description="Die Datei wurde vollständig gelesen und auf Schema sowie Integrität geprüft. Erst Ihre Bestätigung ersetzt den aktuellen lokalen Datenbestand.">
        {pendingImport && <div className="backup-preview"><StatusCell label="Erstellt" value={formatTimestamp(pendingImport.preview.createdAt)} /><StatusCell label="Inhalt" value={`${pendingImport.preview.rooms} Etagen · ${pendingImport.preview.employees} Mitarbeitende · ${pendingImport.preview.bookings} Buchungen`} /><StatusCell label="Dateien" value={`${pendingImport.preview.assets} Datei(en) · ${formatBytes(pendingImport.preview.assetBytes)}`} /></div>}
        {error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><Button variant="outline" disabled={busy} onClick={() => setPendingImport(undefined)}>Abbrechen</Button><Button disabled={busy} onClick={() => void applyImport()}>{busy ? 'Wird wiederhergestellt …' : 'Geprüfte Sicherung übernehmen'}</Button></div>
      </Dialog>

      <Dialog open={confirmReset} onOpenChange={(open) => !busy && setConfirmReset(open)} title="Demo vollständig zurücksetzen?" description="Alle eigenen Buchungen, Grundrissänderungen und importierten Dateien werden gelöscht. Eine vorherige Sicherung wird empfohlen.">
        {error && <p role="alert" className="form-error">{error}</p>}<div className="dialog-actions"><Button variant="outline" disabled={busy} onClick={() => setConfirmReset(false)}>Abbrechen</Button><Button variant="destructive" disabled={busy} onClick={async () => { setBusy(true); try { await reset(); setConfirmReset(false); notify('Die Demo wurde vollständig zurückgesetzt.'); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); } }}>{busy ? 'Wird zurückgesetzt …' : 'Jetzt zurücksetzen'}</Button></div>
      </Dialog>
    </div>
  );
}

function StatusCell({ label, value }: { label: string; value: string }) { return <div className="status-cell"><span>{label}</span><strong>{value}</strong></div>; }

function renderStep(step: number, draft: Microsoft365Config, setDraft: (config: Microsoft365Config) => void, integration: ReturnType<typeof useMicrosoftIntegration.getState>) {
  const field = (label: string, value: string, update: (value: string) => void, placeholder?: string) => <label className="wizard-field"><span>{label}</span><input value={value} placeholder={placeholder} onChange={(event) => update(event.target.value.trim())} /></label>;
  if (step === 0) return <div className="wizard-form">{field('Tenant-ID', draft.tenantId, (tenantId) => setDraft({ ...draft, tenantId }), 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')}{field('Client-ID der Entra-App', draft.clientId, (clientId) => setDraft({ ...draft, clientId }), 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')}{field('Redirect-URI', draft.redirectUri, (redirectUri) => setDraft({ ...draft, redirectUri }))}<ConfigCheck errors={validateAuthConfig(draft)} /></div>;
  if (step === 1) return <div className="wizard-summary"><StatusCell label="Benutzerkonto" value={integration.account?.name || 'Noch nicht angemeldet'} /><StatusCell label="Anmeldename" value={integration.account?.username || '—'} /><StatusCell label="Organisation / Tenant" value={integration.account?.tenantId || '—'} /><p className="permission-note"><ShieldCheck size={17} />Delegierte Leserechte: User.Read und Sites.Read.All. Zustimmung und Tenant-Richtlinien werden von Microsoft Entra ID durchgesetzt.</p></div>;
  if (step === 2) return <div className="wizard-form">{field('SharePoint-Site-ID', draft.siteId, (siteId) => setDraft({ ...draft, siteId }), 'hostname,siteCollectionId,siteId')}<p className="muted">Verwenden Sie die von Microsoft Graph gelieferte Site-ID, nicht den veränderlichen Anzeigenamen.</p></div>;
  if (step === 3) return <div className="wizard-form list-fields">{field('Etagen und Grundrisse *', draft.lists.floors, (floors) => setDraft({ ...draft, lists: { ...draft.lists, floors } }))}{field('Arbeitsplätze *', draft.lists.workspaces, (workspaces) => setDraft({ ...draft, lists: { ...draft.lists, workspaces } }))}{field('Meetingräume', draft.lists.meetingRooms || '', (meetingRooms) => setDraft({ ...draft, lists: { ...draft.lists, meetingRooms } }))}{field('Standorte', draft.lists.locations || '', (locations) => setDraft({ ...draft, lists: { ...draft.lists, locations } }))}{field('Abteilungen', draft.lists.departments || '', (departments) => setDraft({ ...draft, lists: { ...draft.lists, departments } }))}{field('Mitarbeiterzuordnungen', draft.lists.assignments || '', (assignments) => setDraft({ ...draft, lists: { ...draft.lists, assignments } }))}{field('Buchungsmetadaten', draft.lists.bookings || '', (bookings) => setDraft({ ...draft, lists: { ...draft.lists, bookings } }))}</div>;
  if (step === 4) return <div className="mapping-table"><p><strong>Etage:</strong> SharePoint <code>OfficeflowId</code> → OFFICEFLOW-Raum-ID</p><p><strong>Ressource:</strong> <code>FloorId</code> + <code>OfficeflowId</code> → Arbeitsplatz oder Meetingraum</p><p><strong>Kalender:</strong> Exchange führt Frei/Gebucht für Räume; OFFICEFLOW führt keine Kalendertermine zusammen.</p><p><strong>Fallback:</strong> Fehlt <code>OfficeflowId</code>, wird die stabile SharePoint-Item-ID mit Präfix <code>sp-</code> verwendet.</p></div>;
  if (step === 5) return <div className="wizard-summary"><ConfigCheck errors={validateDataConfig(draft)} /><p className="permission-note"><Database size={17} />Die Prüfung liest die Site und alle konfigurierten Listen. Es wird nichts erstellt, geändert oder gelöscht.</p></div>;
  return <div className="wizard-summary"><span className="wizard-success"><Check size={23} /></span><h3>Verbindung erfolgreich geprüft</h3><p>{integration.report?.siteName || integration.config.siteId} ist jetzt als schreibgeschützte Unternehmensdatenquelle aktiv.</p><p className="muted">Buchungen, Stornierungen und Editor-Speicherungen bleiben bis zur zentralen Konfliktlogik deaktiviert.</p></div>;
}

function ConfigCheck({ errors }: { errors: string[] }) { return errors.length ? <p className="config-warning">{errors.join(' ')}</p> : <p className="config-valid"><Check size={15} />Konfiguration vollständig</p>; }
function statusLabel(status: string) { return ({ unconfigured: 'Nicht konfiguriert', disconnected: 'Nicht verbunden', authenticating: 'Anmeldung läuft', connected: 'Angemeldet', loading: 'Datenabruf läuft', ready: 'Verbunden · Nur Lesen', expired: 'Sitzung abgelaufen', error: 'Prüfung fehlgeschlagen' } as Record<string, string>)[status] || status; }
function actionLabel(step: number) { return step === 0 ? 'Mit Microsoft anmelden' : step === 5 ? 'Verbindung jetzt prüfen' : 'Weiter'; }
function formatTimestamp(value?: string) { return value ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Noch kein erfolgreicher Abruf'; }
function formatBytes(value: number) { return new Intl.NumberFormat('de-DE', { style: 'unit', unit: value >= 1_000_000 ? 'megabyte' : 'kilobyte', maximumFractionDigits: 1 }).format(value / (value >= 1_000_000 ? 1_000_000 : 1_000)); }
