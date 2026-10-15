# Entwicklungsstand – OFFICEFLOW 0.2

Stand: 15. Oktober 2026. Vollständig statische Demo im Repository [Craine92/OFFICEFLOW](https://github.com/Craine92/OFFICEFLOW), veröffentlicht über GitHub Pages unter **https://craine92.github.io/OFFICEFLOW/**.

## Architekturprüfung und Änderungen gegenüber 0.1

Die Ausgangsversion trennte Buchungsregeln, Zustand und Datenanbieter bereits sinnvoll. `FloorPlan.tsx` enthielt jedoch Möbelgrafiken, feste Raumdekoration und Kameralogik gemeinsam. `EditorPage.tsx` und `domain/layout.ts` nutzten Grenzen des 900 × 570 großen Demo-Plans. Das Datenmodell unterstützte keine Hintergrunddateien; localStorage enthielt ausschließlich Schema 1. Die Raumplanung rief die Statusfunktion mit einem ganztägigen Standardintervall auf.

Version 0.2 erhält die Buchungsregeln und die vorbereiteten Microsoft-Schnittstellen und erweitert die Architektur:

| Datei/Bereich                            | Verantwortung in 0.2                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `components/Furniture.tsx`               | Wiederverwendete Möbelgrafiken, skaliert auf logische Objektgrößen, Auswahl und Kollisionsmarkierung     |
| `components/FloorPlan.tsx`               | Dynamischer Plan, Hintergrund, Raster, Kamera, Zoom um den Mauszeiger, Verschieben und Auswahl           |
| `components/ImportWizard.tsx`            | Drei Importschritte: Datei/Seite, Ausrichtung, bestätigtes lokales Speichern                             |
| `components/TimeWindowPicker.tsx`        | Sofortige Aktualisierung der ausgewählten Verfügbarkeitszeiten                                           |
| `pages/EditorPage.tsx`                   | Editorwerkzeuge, Eigenschaften, Planabmessungen, Speichern und Verwerfen                                 |
| `hooks/useEditorHistory.ts`              | Bis zu 80 Entwurfsschritte, Undo/Redo und Vergleich mit gespeichertem Stand                              |
| `hooks/usePlanImage.ts`                  | Lokales Laden von Assets, Bilddekodierung, Fehlerzustände und Freigabe von Blob-URLs                     |
| `domain/layout.ts`                       | Raumgrenzen, Rotationen, SAT-Überschneidungen, Nummerierung, Einpassen und Größenänderungen              |
| `domain/import.ts`                       | Dateisignaturen, Endungen, MIME-Prüfung und Größenlimits                                                 |
| `data/importer.ts`                       | Bilddekodierung und PDF.js-Verarbeitung einschließlich Seitenauswahl                                     |
| `data/assets.ts`                         | IndexedDB-Adapter für Originaldateien und gerenderte Hintergrundbilder                                   |
| `data/migration.ts` / `data/provider.ts` | Verlustfreie Migration auf Schema 2, Sicherung des v1-Bestands und Metadatenpersistenz                   |
| `store/useOfficeStore.ts`                | Austauschbarer Anbieter, serialisierte Schreibtransaktionen, neue Bürobereiche und gewähltes Zeitfenster |

## Funktionsumfang

- PNG, JPG/JPEG, WebP und mehrseitige PDFs mit Dateiprüfung, Vorschau und PDF-Seitenauswahl.
- Drei hochwertige Importschritte mit 90°-Drehung, proportionalem Einpassen, Skalierung, Ausrichtung und Verschieben der Vorschau.
- Pro Import eine ausgewählte PDF-Seite; weitere Seiten können separat importiert werden. Keine externen Datei-Uploads, kein CDN und kein Backend.
- Neue Bürobereiche mit dynamischen Seitenverhältnissen oder Ersetzen eines bestehenden Hintergrunds bei unveränderten Objekten und Buchungen.
- Arbeitsplätze, Meetingräume, Lounge und Pflanzen über dem Hintergrund; Position, Rotation, Größe, Bezeichnung, Ausstattung und Kapazität bearbeiten.
- Raster, optionales Einrasten, Zoom, Verschieben, Großansicht und persistente Koordinaten in Planeinheiten.
- Undo/Redo einschließlich Objektänderungen, Planabmessungen und Hintergrundkonfiguration. Importabschluss und Speichern bilden jeweils einen neuen gespeicherten Ausgangsstand.
- Eindeutige automatische Nummern; Schutz gegen neue doppelte Bezeichnungen. Alte unveränderte Namen und technische UUIDs bleiben bei der Migration erhalten.
- Überschneidungserkennung auch für gedrehte Rechtecke, rote Markierungen und verständliche Auflistung. Bewusste Speicherung von Überschneidungen nur nach Bestätigung.
- Zeitfenster in Übersicht und Raumplanung; Kennzahlen, Diagramm, Vorschläge und Raumstatus verwenden genau diese Zeit. Buchungsdialog übernimmt die Auswahl und zeigt alle Termine mit Mitarbeitern.
- Alle Funktionen aus 0.1 bleiben enthalten: Dashboard, Buchung, Konflikte, Stornierung, Anwesenheit, Mitarbeiter, Exporte, Hell-/Dunkelmodus und vollständiger Reset.

## Persistenz und Migration

Metadaten bleiben unter `officeflow.demo.v1` in localStorage; die interne Schema-Version ist 2. Vor einer Migration wird das ursprüngliche JSON unter `officeflow.demo.backup.v1` gesichert. Buchungen, Mitarbeiter, Objekte und Positionen werden nicht neu erzeugt. Bei einer fehlgeschlagenen Migration bleibt der vorherige Bestand bestehen. Es ist kein Reset für das Update erforderlich.

IndexedDB `officeflow-plans`, Version 1, speichert im Store `assets` Originaldatei und PNG-Vorschau. Hintergrundmetadaten enthalten Asset-ID, Dateiname, PDF-Seite und Transformation. Vorschauen haben maximal 2400 Pixel an der langen Seite; die Originaldatei bleibt unverändert im Browser.

Die Datei wird vor dem Raum gespeichert. Schlägt das Speichern des Raums fehl, wird das neue Asset aufgeräumt. Fehlende Assets erzeugen einen verständlichen Fehler, ohne Buchungen zu verändern. Dateien bereits ersetzter Hintergründe werden für diese Demo nicht automatisch einzeln bereinigt; der vollständige Reset leert auch IndexedDB und entfernt die Migrationssicherung. Zwei unterschiedliche Browserdatenbanken können keine gemeinsame atomare Transaktion bilden; ein Browserabbruch zwischen Schreibschritten kann unreferenzierte Dateien zurücklassen, jedoch keine Buchungen löschen.

## Nachgewiesene Prüfungen

- **30 fachliche Tests:** bestehende Buchungsregeln, Konflikte für Arbeitsplatz und Mitarbeiter, Zeitgrenzen, zeitgenaue Freigabe, Dateisignaturen und Limits, dynamische Grenzen, Rotationen, Kollisionen, Nummerierung, Skalierung, Migration, Sicherung und Speicherausfälle.
- **25 Playwright-Prüfungen:** sämtliche bisherigen Abläufe plus PNG/JPG/WebP-Import, mehrseitige PDF mit Seitenauswahl und Originaldatei, fehlerhafte Dateien, Ersetzen ohne Buchungsverlust, IndexedDB-Speicherfehler, fehlender Hintergrund, Reset einschließlich Dateien, Undo/Redo, Kollisionen, Skalierung, Buchung auf importiertem Plan und sofortige Verfügbarkeitsänderung.
- **Desktop, Tablet und Mobil:** 1440, 1024, 768 und 390 Pixel Breite; der Importdialog wird zusätzlich bei 1440, 768 und 390 Pixeln vollständig bedient.
- **Produktionsprüfung:** statischer Build unter `/OFFICEFLOW/` mit direkter Hash-Navigation, Neuladen, PDF-Worker, lokalen Ressourcen, Seite 2 einer PDF, Bildimport, Buchung auf eigenem Plan und Persistenz. Bildschirmfotos liegen unter `docs/screenshots/`.
- **GitHub Actions:** Installation einschließlich lokaler PDF-Ressourcen, fachliche Tests, Browserprüfungen, TypeScript, Build, statische Produktionsprüfung und anschließend GitHub-Pages-Deployment. Bei Fehlern werden Browserartefakte sieben Tage aufbewahrt.

Lokale Browserprüfungen verwenden Edge auf Windows, GitHub Actions verwendet Chromium auf Linux. Firefox und Safari/WebKit sowie ein vollständiges manuelles Barrierefreiheitsaudit stehen noch aus. Buchungen und Editorobjekte sind zusätzlich über native HTML-Auswahllisten bedienbar.

## Grenzen und offene Punkte

1. **Gemeinsame Datenbasis:** Weiterhin eine lokale Demo ohne Geräte-/Tab-Synchronisierung, Anmeldung, echte Rollen oder Mehrbenutzersperren.
2. **Vollständige Sicherung:** JSON exportiert Metadaten und Buchungen. Ein Paketexport einschließlich Dateien sowie Wiederimport ist noch nicht enthalten; Originaldateien zusätzlich aufbewahren.
3. **Bauliche Planung:** Keine automatische Wand-/Raumerkennung, keine Kalibrierung in Metern und keine Fluchtwegprüfung. Überschneidungen beziehen sich auf Objektrechtecke, nicht auf gezeichnete Wände im Hintergrundbild oder jedes Detail einer Möbelillustration.
4. **Erweiterte Dateiverwaltung:** Keine zentrale Dateiablage, keine individuelle Bereinigung unreferenzierter Assets, keine mehrseitigen Planstapel. Jede PDF-Seite wird separat als eigener Hintergrund importiert.
5. **Editorhistorie:** Maximal 80 Schritte im geöffneten Entwurf, nicht über Neuladen hinweg. Navigation per Seitenleiste und Neuladen warnen bei ungespeicherten Änderungen; Browser-Zurück innerhalb der Hash-Navigation wird weiterhin nicht separat abgefangen.
6. **Erweiterte Buchung:** Keine Wiederholungstermine, mehrtägigen Termine, Outlook-Einladungen oder automatische Anwesenheitserkennung. Buchungen zwischen 07:00 und 22:00 Uhr eines Tages.
7. **Microsoft 365:** Keine Live-Anbindung und keine neuen Zugangsdaten. `WorkspaceDataProvider` und `MicrosoftGraphGateway` bleiben als Vorbereitung erhalten.

## Nächste sinnvolle Schritte

1. Die veröffentlichte Demo mit echten Bürogrundrissen des Teams auf Desktop und Tablet abnehmen.
2. Vollständigen lokalen Export/Import mit Hintergrunddateien und optionaler Speicherverwaltung ergänzen.
3. Maßstabskalibrierung, Mehrfachauswahl, Duplizieren und einen separaten Bearbeitungsmodus für Hintergrundtransformationen priorisieren.
4. Browserabdeckung und Barrierefreiheit erweitern; anschließend wiederkehrende Buchungen und tabübergreifende Konflikte angehen.
5. Eine Microsoft-Anbindung erst als eigenes, klar abgegrenztes Folgeprojekt mit gemeinsamem Datenmodell und zuverlässiger serverseitiger Konfliktkontrolle umsetzen.
