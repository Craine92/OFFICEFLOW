import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CalendarCheck2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  Layers3,
  Menu,
  Moon,
  PencilRuler,
  Plus,
  Settings2,
  Sun,
  Users,
  X,
  MapPin,
  Command,
  RotateCcw,
  LockKeyhole,
  Sparkles,
} from 'lucide-react';
import { WorkspaceView } from './components/WorkspaceView';
import { BookingDialog, type BookingTarget } from './components/BookingDialog';
import { Button } from './components/ui/button';
import { Dialog } from './components/ui/dialog';
import { BookingsPage } from './pages/BookingsPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { useOfficeStore } from './store/useOfficeStore';
import { formatDate, today } from './domain/booking';
import { TimeWindowPicker } from './components/TimeWindowPicker';
import { Dashboard } from './components/Dashboard';
import { useMicrosoftIntegration } from './integrations/microsoft/store';

const EditorPage = lazy(() =>
  import('./pages/EditorPage').then((module) => ({ default: module.EditorPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);
const PresentationPage = lazy(() =>
  import('./pages/PresentationPage').then((module) => ({ default: module.PresentationPage })),
);
const ShowcasePage = lazy(() =>
  import('./pages/ShowcasePage').then((module) => ({ default: module.ShowcasePage })),
);

const navigation = [
  { path: '/', label: 'Übersicht', Icon: LayoutDashboard },
  { path: '/raumplanung', label: 'Raumplanung', Icon: Layers3 },
  { path: '/showcase', label: 'Showcase-Galerie', Icon: Sparkles },
  { path: '/buchungen', label: 'Buchungen', Icon: CalendarCheck2 },
  { path: '/mitarbeiter', label: 'Mitarbeiter', Icon: Users },
];
const pageTitles: Record<string, [string, string]> = {
  '/': ['Gute Arbeit beginnt hier.', 'Ihr Büro im Blick. Ihr Team am richtigen Platz.'],
  '/raumplanung': [
    'Ihr Büro. Viele Möglichkeiten.',
    'Entdecken Sie den passenden Platz für Ihren Arbeitstag.',
  ],
  '/buchungen': ['Platz für einen guten Tag.', 'Alle Reservierungen, Zeiten und Anwesenheiten an einem Ort.'],
  '/mitarbeiter': ['Menschen machen den Unterschied.', 'Finden Sie Ihr Team und sehen Sie, wer vor Ort ist.'],
  '/editor': ['Gestalten Sie Ihre Arbeitswelt.', 'Ein Grundriss, der zu Ihrem Team passt.'],
  '/showcase': [
    'Arbeitswelten mit Charakter.',
    'Drei detailreiche Etagen für Präsentation, Inspiration und Ihre eigene Demo.',
  ],
  '/einstellungen': [
    'Alles gut verbunden.',
    'Lokale Sicherungen und Microsoft-365-Integrationen zentral verwalten.',
  ],
};

function initials(name?: string) {
  if (!name) return 'MS';
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function Shell() {
  const { data, error, initialize, date, setDate, roomId, setRoom, reset } = useOfficeStore();
  const integration = useMicrosoftIntegration();
  const microsoftMode = integration.mode === 'microsoft-graph';
  const location = useLocation();
  const navigate = useNavigate();
  const [target, setTarget] = useState<BookingTarget | null>(null);
  const [toast, setToast] = useState('');
  const [sidebar, setSidebar] = useState(false);
  const [help, setHelp] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('officeflow.theme') === 'dark';
    } catch {
      return false;
    }
  });
  const notify = useCallback((message: string) => setToast(message), []);
  const onDirty = useCallback((value: boolean) => setDirty(value), []);
  useEffect(() => {
    void initialize();
  }, [initialize]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try {
      localStorage.setItem('officeflow.theme', dark ? 'dark' : 'light');
    } catch {
      /* Die Oberfläche bleibt auch ohne Themespeicherung bedienbar. */
    }
  }, [dark]);
  useEffect(() => {
    setSidebar(false);
    document.title = `OFFICEFLOW – ${pageTitles[location.pathname]?.[0] ?? 'Seite nicht gefunden'}`;
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const guard = (e: React.MouseEvent) => {
    if (
      dirty &&
      !window.confirm(
        'Sie haben ungespeicherte Änderungen im Raumeditor. Möchten Sie diese verwerfen und die Seite wechseln?',
      )
    )
      e.preventDefault();
  };
  const [title, subtitle] = pageTitles[location.pathname] ?? [
    'Hier ist noch kein Arbeitsplatz.',
    'Diese Seite konnten wir nicht finden.',
  ];
  const room = data?.rooms.find((r) => r.id === roomId) ?? data?.rooms[0];
  const newBooking = () => {
    if (microsoftMode) {
      notify('Buchungen sind im Microsoft-365-Modus bis zur zentralen Konfliktprüfung schreibgeschützt.');
      return;
    }
    const object = room?.objects.find((o) => o.kind === 'desk');
    if (room) setTarget({ roomId: room.id, objectId: object?.id ?? '' });
  };
  function shiftDate(days: number) {
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + days);
    setDate(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`,
    );
  }
  return (
    <div
      className={`app-shell ${location.pathname === '/editor' ? 'editor-shell' : ''} ${location.pathname === '/praesentation' ? 'presentation-shell' : ''}`}
    >
      {sidebar && (
        <button
          className="sidebar-backdrop"
          aria-label="Navigation schließen"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`sidebar ${sidebar ? 'sidebar-open' : ''}`}>
        <Link className="brand" to="/" onClick={guard} aria-label="OFFICEFLOW Übersicht">
          <span className="brand-mark">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            OFFICE<span>FLOW</span>
            <small>SMARTE RAUMPLANUNG</small>
          </span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-logo">N</span>
          <span>
            <strong>
              {microsoftMode ? integration.report?.siteName || 'Microsoft 365' : 'Nordlicht Studio'}
            </strong>
            <small>{microsoftMode ? 'Verbundene Organisation' : 'Ihr gemeinsamer Arbeitsort'}</small>
          </span>
          <span className="demo-small">{microsoftMode ? 'M365' : 'DEMO'}</span>
        </div>
        {data && (
          <label className="sidebar-floor-switch">
            <span>AKTIVE ETAGE</span>
            <select
              aria-label="Etage schnell wechseln"
              value={room?.id ?? ''}
              onChange={(event) => {
                setRoom(event.target.value);
                navigate('/raumplanung');
              }}
            >
              {data.rooms.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="nav-caption">ARBEITSWELT</span>
        <nav aria-label="Hauptnavigation">
          {navigation.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={guard}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
              {path === '/buchungen' && (
                <span className="nav-count">{data?.bookings.filter((b) => b.date === date).length ?? 0}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <span className="nav-caption management-caption">VERWALTUNG</span>
        <nav aria-label="Verwaltung">
          <NavLink
            to="/editor"
            onClick={guard}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <PencilRuler size={19} />
            <span>Raumeditor</span>
          </NavLink>
          <NavLink
            to="/einstellungen"
            onClick={guard}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Settings2 size={19} />
            <span>Einstellungen</span>
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-orbit">
              <Layers3 size={22} />
            </span>
            <strong>Raum für neue Ideen.</strong>
            <p>Entdecken Sie, wie einfach gute Büroplanung sein kann.</p>
            <button onClick={() => setHelp(true)}>
              Demo kennenlernen
              <ArrowRight size={14} />
            </button>
          </div>
          <button className="help-link" onClick={() => setHelp(true)}>
            <CircleHelp size={17} />
            Hilfe & Kurzanleitung
            <ArrowRight size={14} />
          </button>
          <div className="sidebar-profile">
            <span className="profile-avatar">
              {microsoftMode ? initials(integration.account?.name) : 'AW'}
            </span>
            <div>
              <strong>
                {microsoftMode ? integration.account?.name || 'Microsoft-Benutzer' : 'Anna Weber'}
              </strong>
              <span>{microsoftMode ? integration.account?.username : 'Demo-Administratorin'}</span>
            </div>
            <span className="profile-status" title="Lokales Demo-Profil" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <Button
              className="mobile-menu"
              variant="ghost"
              size="icon"
              aria-label="Navigation öffnen"
              onClick={() => setSidebar(true)}
            >
              <Menu size={20} />
            </Button>
            <span className="breadcrumb">
              Arbeitswelt
              <ChevronRight size={13} />
              <strong>
                {navigation.find((n) => n.path === location.pathname)?.label ??
                  (location.pathname === '/editor'
                    ? 'Raumeditor'
                    : location.pathname === '/einstellungen'
                      ? 'Einstellungen'
                      : 'Seite nicht gefunden')}
              </strong>
            </span>
          </div>
          <div className="topbar-actions">
            <span className={`demo-badge ${microsoftMode ? 'microsoft-mode-badge' : ''}`}>
              <i />
              {microsoftMode ? 'Microsoft 365 · Nur Lesen' : 'Demo-Modus'}
            </span>
            <span className="topbar-divider" />
            <Button
              variant="ghost"
              size="icon"
              aria-label={dark ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren'}
              onClick={() => setDark((v) => !v)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Buchungshinweise anzeigen"
              onClick={() => setNotifications(true)}
            >
              <Bell size={18} />
            </Button>
            <span
              className="topbar-avatar"
              title={microsoftMode ? integration.account?.username : 'Anna Weber · Demo-Profil'}
            >
              {microsoftMode ? initials(integration.account?.name) : 'AW'}
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-intro">
            <div>
              <div className="greeting">
                <span />
                {location.pathname === '/' ? 'WILLKOMMEN BEI OFFICEFLOW' : 'IHR SMARTER ARBEITSPLATZ'}
              </div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            {location.pathname === '/showcase' ? (
              <Button asChild>
                <Link to="/raumplanung">
                  <Layers3 size={17} />
                  Eigene Planung
                </Link>
              </Button>
            ) : !['/einstellungen', '/editor', '/praesentation'].includes(location.pathname) ? (
              <Button
                onClick={newBooking}
                disabled={!data || microsoftMode}
                title={microsoftMode ? 'Im lesenden Microsoft-Modus noch nicht freigegeben' : undefined}
              >
                <Plus size={17} />
                Neue Buchung
              </Button>
            ) : null}
          </div>
          <div className="context-row">
            <span className="location-label">
              <MapPin size={15} />
              <strong>Berlin Mitte</strong>
              <span className="context-separator" />
              {microsoftMode ? integration.report?.siteName || 'Microsoft 365' : 'Nordlicht Studio'}
              <ChevronDown size={12} />
            </span>
            <div className="date-controls">
              <button onClick={() => shiftDate(-1)} aria-label="Vorheriger Tag">
                <ChevronLeft size={15} />
              </button>
              <label className="date-label">
                <CalendarDays size={15} />
                <span>
                  {date === today() ? 'Heute, ' : ''}
                  {formatDate(date, { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
                <input
                  type="date"
                  aria-label="Planungsdatum"
                  value={date}
                  onChange={(e) => {
                    if (e.target.value) setDate(e.target.value);
                  }}
                />
              </label>
              <button onClick={() => shiftDate(1)} aria-label="Nächster Tag">
                <ChevronRight size={15} />
              </button>
              {date !== today() && (
                <button className="today-button" onClick={() => setDate(today())}>
                  Heute
                </button>
              )}
            </div>
          </div>
          {data && ['/', '/raumplanung'].includes(location.pathname) && <TimeWindowPicker />}
          {microsoftMode && (
            <div className="readonly-banner" role="status">
              <LockKeyhole size={16} />
              <span>
                <strong>Microsoft-365-Modus · Nur Lesen.</strong> Angezeigt werden ausschließlich verbundene
                Unternehmensdaten. Schreiben, Buchen und Stornieren werden erst nach einer serverseitigen
                Konflikt- und Berechtigungsprüfung freigegeben.
              </span>
            </div>
          )}
          {error ? (
            <section className="panel load-error">
              <h2>Ihre Demo konnte nicht geladen werden.</h2>
              <p role="alert">{error}</p>
              <Button
                onClick={() => {
                  if (
                    window.confirm(
                      'Gespeicherte Demo-Daten löschen und mit den ursprünglichen Daten neu starten?',
                    )
                  )
                    void reset().catch((e) => notify((e as Error).message));
                }}
              >
                <RotateCcw size={16} />
                Demo-Daten zurücksetzen
              </Button>
            </section>
          ) : !data ? (
            <div className="loading-state">Ihre Arbeitswelt wird vorbereitet …</div>
          ) : (
            <Suspense fallback={<div className="loading-state">Ihre Arbeitswelt wird vorbereitet …</div>}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <Dashboard
                      onBook={
                        microsoftMode
                          ? () => notify('Im Microsoft-365-Modus sind Buchungen noch nicht freigegeben.')
                          : setTarget
                      }
                      notify={notify}
                    />
                  }
                />
                <Route
                  path="/praesentation"
                  element={
                    <PresentationPage
                      onBook={
                        microsoftMode
                          ? () => notify('Im Microsoft-365-Modus sind Buchungen noch nicht freigegeben.')
                          : setTarget
                      }
                    />
                  }
                />
                <Route
                  path="/raumplanung"
                  element={
                    <WorkspaceView
                      onBook={
                        microsoftMode
                          ? () => notify('Im Microsoft-365-Modus sind Buchungen noch nicht freigegeben.')
                          : setTarget
                      }
                    />
                  }
                />
                <Route path="/buchungen" element={<BookingsPage notify={notify} />} />
                <Route path="/mitarbeiter" element={<EmployeesPage />} />
                <Route path="/showcase" element={<ShowcasePage notify={notify} />} />
                <Route path="/editor" element={<EditorPage notify={notify} onDirty={onDirty} />} />
                <Route path="/einstellungen" element={<SettingsPage notify={notify} />} />
                <Route
                  path="*"
                  element={
                    <div className="panel empty-state">
                      <Layers3 size={32} />
                      <p>Diese Adresse gehört zu keinem Bürobereich.</p>
                      <Button asChild>
                        <Link to="/">
                          Zur Übersicht
                          <ArrowRight size={15} />
                        </Link>
                      </Button>
                    </div>
                  }
                />
              </Routes>
            </Suspense>
          )}
          <footer className="page-footer">
            <span>
              <span className="footer-mark" />
              OFFICEFLOW<span className="footer-divider">/</span>Mehr Raum. Mehr Möglichkeiten.
            </span>
            <span>
              Version 0.5<span className="footer-divider">·</span>
              {microsoftMode ? 'Microsoft Graph · Nur Lesen' : 'Daten bleiben in Ihrem Browser'}
            </span>
          </footer>
        </main>
      </div>
      <BookingDialog target={target} onClose={() => setTarget(null)} onSuccess={notify} />
      <Dialog
        open={help}
        onOpenChange={setHelp}
        title="Willkommen in Ihrer Arbeitswelt."
        description="OFFICEFLOW ist eine interaktive Demo mit fiktiven Daten. Probieren Sie alle Abläufe direkt aus."
      >
        <div className="help-steps">
          <div>
            <span>01</span>
            <div>
              <strong>Lieblingsplatz finden</strong>
              <p>
                Wechseln Sie zwischen drei Bürobereichen. Grüne Plätze sind frei, gelbe reserviert und blaue
                belegt. Die Farben beziehen sich auf das ausgewählte Datum und Zeitfenster.
              </p>
            </div>
          </div>
          <div>
            <span>02</span>
            <div>
              <strong>In wenigen Schritten buchen</strong>
              <p>
                Klicken Sie auf einen Arbeitsplatz oder Meetingraum, wählen Sie Datum, Zeitraum und
                Mitarbeiter. Doppelbuchungen werden automatisch verhindert.
              </p>
            </div>
          </div>
          <div>
            <span>03</span>
            <div>
              <strong>Ihre Arbeitswelt gestalten</strong>
              <p>
                Verschieben und drehen Sie Objekte im Raumeditor. Speichern Sie den Grundriss, um Änderungen
                in der Raumplanung zu sehen.
              </p>
            </div>
          </div>
        </div>
        <div className="help-demo-note">
          <Command size={18} />
          <span>
            Alle Änderungen sind lokal. Unter Einstellungen können Sie die vollständige Demo jederzeit
            zurücksetzen.
          </span>
        </div>
        <Button className="w-full" onClick={() => setHelp(false)}>
          Los geht’s
          <ArrowRight size={15} />
        </Button>
      </Dialog>
      <Dialog
        open={notifications}
        onOpenChange={setNotifications}
        title="Ihr Tag im Überblick"
        description="Buchungshinweise für das ausgewählte Planungsdatum."
      >
        <div className="notification-summary">
          <CalendarCheck2 size={25} />
          <strong>{data?.bookings.filter((b) => b.date === date).length ?? 0} Buchungen</strong>
          <span>{formatDate(date)} · Berlin Mitte</span>
          <p>
            Dies sind lokal gespeicherte Demo-Termine. Anwesenheiten können Sie unter „Buchungen“ bestätigen.
          </p>
        </div>
        <Button className="w-full" asChild>
          <Link
            to="/buchungen"
            onClick={(e) => {
              guard(e);
              if (!e.defaultPrevented) setNotifications(false);
            }}
          >
            Buchungen verwalten
            <ArrowRight size={15} />
          </Link>
        </Button>
      </Dialog>
      {toast && (
        <div className="toast" role="status">
          <span className="toast-icon">
            <Check size={16} />
          </span>
          <span>{toast}</span>
          <button aria-label="Hinweis schließen" onClick={() => setToast('')}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
export default function App() {
  return (
    <HashRouter>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Zum Inhalt springen
      </a>
      <Shell />
    </HashRouter>
  );
}
