# Entwicklungsstand – OFFICEFLOW 0.1

Stand: 15. Oktober 2026. Erste funktionsfähige Version als durchgängiger Vertical Slice.

## Umgesetzt

| Bereich     | Funktionsumfang                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Übersicht   | Vier Kennzahlen, Tagesauswahl, Belegungsdiagramm, aktuelle Termine und verfügbare Arbeitsplätze                                    |
| Grundrisse  | Einzelbüro mit 6, Open Space mit 24, Hybrid Office mit 12 Arbeitsplätzen, 2 Meetingräumen und Lounge                               |
| Interaktion | Canvas mit Zoom, Verschieben, Großansicht, Statusfilter und Buchungsdialog per Arbeitsplatzklick                                   |
| Buchung     | Mitarbeiter, Arbeitsplatz oder Raum, Datum, Start und Ende; Konflikte für Ressource und Mitarbeiter; direkte Statusaktualisierung  |
| Verwaltung  | Suche, Raumfilter, alle Termine, CSV-Export, bestätigte Stornierung und manuelle Anwesenheit                                       |
| Mitarbeiter | 22 fiktive Personen in 5 Abteilungen, Suche, Abteilungsfilter und Termin-Detailansicht                                             |
| Editor      | Eigener Entwurf, neue Objekte, Verschieben, Drehen, Bezeichnungen, Ausstattung, Meetingkapazität, Löschen, Speichern und Verwerfen |
| Demo        | Vollständiger Reset mit Bestätigung, JSON-Export, Speicherfehlerbehandlung und sichtbarer Demo-Kennzeichnung                       |
| Oberfläche  | Deutsch, Desktop und Tablet, ergänzende mobile Navigation, gespeicherter Hell-/Dunkelmodus, Radix-Dialoge mit Fokussteuerung       |
| Architektur | Getrennte Darstellung, Domänenregeln und Datenanbieter; Schnittstellen für spätere Graph-Anbindung                                 |
| Hosting     | Statischer Produktions-Build, Hash-Routing, automatische Repository-Basis und GitHub-Actions-Deployment                            |

## Nachgewiesene Prüfungen

Ergebnis des lokalen Prüfstands: **17 fachliche Tests erfolgreich**, **10 Browserprüfungen erfolgreich**, **TypeScript und Produktions-Build erfolgreich**, **statische Produktionsprüfung unter `/OFFICEFLOW/` erfolgreich**.

- Fachliche Tests: Buchungskonflikte, direkt angrenzende Zeitfenster, Vergangenheit, ungültige Daten und Uhrzeiten, Mitarbeiterprüfung, Meetingräume, Statusberechnung und Grundrissgrenzen nach Drehung.
- Speichertests: Buchung und Stornierung bleiben nach erneutem Laden erhalten; Reset; doppelt ausgelöste Buchungen; Löschschutz gebuchter Objekte; beschädigte Daten und Speicherfehler.
- Browserprüfungen: Buchung → Konflikt → Neuladen → Suche → Stornierung; drei Grundrisse und Zoom; Editoränderungen und Persistenz; Meetingraum anlegen, konfigurieren und buchen; kompletter Demo-Reset.
- Responsive Prüfungen bei 1440 × 1000, 1024 × 900, 768 × 1024 und 390 × 844, einschließlich Dialogdarstellung, Navigation, Dunkelmodus-Persistenz und fehlendem horizontalem Seitenüberlauf.
- Produktionsprüfung: statische Auslieferung unter `/officeflow/`, direkte Buchungsadresse mit Hash-Routing, Neuladen, Laden aller Assets, Buchung und Persistenz. Bildschirmfotos liegen in `docs/screenshots/`.

Die Browserprüfungen verwenden den installierten Edge auf Windows und Chromium in GitHub Actions. Safari/WebKit und Firefox wurden noch nicht geprüft. Ein vollständiges manuelles Barrierefreiheitsaudit wurde noch nicht durchgeführt. Arbeitsplätze sind zusätzlich über HTML-Auswahllisten buchbar; Editorobjekte sind ebenfalls über eine HTML-Liste auswählbar.

## Fachliche Entscheidungen

- Tagesbezogene Verfügbarkeit: Die Raumplanung zeigt alle Buchungen des ausgewählten Tages. Eine Vormittagsbuchung markiert den Platz daher auch beim Betrachten am Nachmittag als vorgemerkt. Der Dialog zeigt konkrete Zeitfenster, sodass freie Restzeiten buchbar bleiben.
- Anwesenheit wird in der Demo manuell gesetzt, unabhängig von der tatsächlichen Uhrzeit. Nur heutige Termine können als anwesend markiert werden.
- Schreiben erfolgt in einer Instanz nacheinander. Änderungen erscheinen erst nach erfolgreichem Speichern. Damit führen zwei rasche Klicks nicht zu einer doppelten Reservierung.
- Editoränderungen werden bewusst erst durch Speichern übernommen. Navigation über die Seitenleiste und das Schließen/Neuladen warnen vor ungespeicherten Änderungen. Browser-Zurück innerhalb der Hash-Navigation wird noch nicht separat abgefangen.
- Feste Außenwände und ein einfaches Objektmodell ermöglichen einen gut bedienbaren Demo-Editor. Die manuelle Planung kann Objekte überlappen lassen; echte bauliche Planung ist nicht abgebildet.

## Offene Punkte

1. **Abnahme der öffentlichen Demo:** Repository `Craine92/OFFICEFLOW` und GitHub Pages mit HTTPS und Actions sind eingerichtet. Die Demo-Adresse lautet `https://craine92.github.io/OFFICEFLOW/`; eine Abnahme mit tatsächlichen Nutzern steht noch aus.
2. **Mehrbenutzerbetrieb:** localStorage bietet keine gemeinsame Datenbasis, tabübergreifende Sperre, Rollen oder echte Berechtigungen.
3. **Microsoft 365/SharePoint:** Es bestehen ausschließlich Schnittstellen. Anmeldung, Datenschema, Adapter, Kalenderabgleich und tenantbezogene Berechtigungen fehlen.
4. **Erweiterte Planung:** Wände zeichnen, Grundrissimport, mehrere Standorte/Etagen, Undo/Redo-Verlauf, Kollisionsvermeidung, Gruppenwahl und bauliche Prüfung sind noch nicht enthalten.
5. **Erweiterte Buchung:** Wiederholungstermine, mehrtägige Buchungen, Genehmigungen, Benachrichtigungen und Outlook-Einladungen fehlen.
6. **Produktionshärtung:** Vollständiger Barrierefreiheitstest, Safari/Firefox, grafische Regressionstests, Audit-Protokoll, versionierte Datenmigration und Wiederherstellung aus JSON sind nächste Ausbaustufen.

## Nächste sinnvolle Schritte

1. Die öffentliche Demo auf Desktop und Tablet mit dem vorgesehenen Team abnehmen.
2. Mit tatsächlichen Nutzern Buchungszeiten, Filter und Editor-Bedienung testen; anschließend Tages- oder Zeitfensteransicht und wiederkehrende Buchungen priorisieren.
3. Das gewünschte Microsoft-Datenmodell festlegen: SharePoint-Listen für Grundrisse und Metadaten; eindeutige Zuständigkeit für Buchungen und Ressourcen; gewünschte Mitarbeiterdaten und Rollen klären.
4. Entra-App-Registrierung mit PKCE und minimalen Berechtigungen vorbereiten. Keine Client-Secrets in Vite-Variablen oder im statischen Build speichern.
5. Einen Graph-Datenanbieter implementieren und zunächst gegen einen Test-Tenant prüfen. Konkurrenz, Rollen und atomare Buchungskonflikte müssen an der gemeinsam genutzten Datenbasis zuverlässig abgefangen werden.
6. Integrationsprüfungen und Datenschutz-/Betriebskonzept ergänzen, bevor echte Mitarbeiterdaten verwendet werden.
