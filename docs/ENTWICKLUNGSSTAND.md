# Entwicklungsstand – OFFICEFLOW 0.5

Stand: 16. Oktober 2026. Öffentliche, vollständig statische Demo: [OFFICEFLOW](https://craine92.github.io/OFFICEFLOW/). Quellcode: [Craine92/OFFICEFLOW](https://github.com/Craine92/OFFICEFLOW).

## Premium Experience und Showcase in 0.5

Version 0.5 schärft die vollständige Oberfläche, ohne das Schema 3 oder den lokalen Speichernamensraum zu verändern. Navigation, Seiteneinstiege, Typografie, Fokuszustände, Schatten und responsive Abstände verwenden weiterhin die zentralen Tokens. Das Dashboard zeigt sechs aus realen Buchungsdaten berechnete Kennzahlen und standardmäßig eine großformatige, interaktive Headquarters-Etage. Etagen lassen sich dort sowie in der Seitenleiste direkt wechseln.

Die neue `ShowcasePage` liest drei statische Vorlagen aus `data/showcaseFloors.ts`: **Nordlicht Headquarters** (64 Arbeitsplätze), **Creative Campus** (40) und **Business Center** (36). Ihre Galerie ist unabhängig vom aktiven Datenanbieter sichtbar. Erst eine bewusste Übernahme im Demo-Modus erzeugt eine tiefe Kopie mit neuen IDs für Raum, Ressourcen, Wände, Öffnungen, Zonen, Möbel, Bauteile, Annotationen und Gruppen. Referenzen auf Wände und Zonen werden mit umgesetzt; vorhandene Buchungen und Dateien bleiben unverändert.

Die Raumplanung trennt Auswahl und Buchung: Hover und Klick markieren die Ressource, der Detailbereich zeigt Status, Ausstattung und heutige Termine, erst eine zweite Aktion öffnet den Buchungsdialog. Suche, Ausstattungs- und Statusfilter dimmen unpassende Ressourcen. Der Editor besitzt auf großen Bildschirmen eine dauerhafte Objektbibliothek links, Canvas in der Mitte und Eigenschaften rechts; auf kleineren Breiten wird die Bibliothek platzsparend ausgeblendet. Eine optionale fünfstufige Kurztour erklärt den Ablauf.

Editor, Einstellungen, Showcase und Präsentationsmodus werden als Routen nachgeladen. Konva und Lucide liegen in separaten Build-Chunks; die Showcase-Canvas nutzt Layout-/Paint-Containment. Die geprüften Zielbreiten sind 390, 768, 1024, 1440 und 1920 Pixel.

### Kompatibilität zu 0.4

Ein bestehender 0.4-Datenbestand liegt bereits im aktuellen Schema 3 und wird bytegetreu geladen. OFFICEFLOW ergänzt dort keine Räume automatisch. Die Galerie bleibt trotzdem verfügbar, weil ihre Vorlagen nicht im gespeicherten Bestand liegen. Nur ein frischer Start oder ausdrücklicher Demo-Reset enthält zusätzlich eine lokale Headquarters-Arbeitskopie. Dieser Weg schützt eigene Grundrisse, UUIDs, Buchungen und IndexedDB-Dateien.

## Integrationsarchitektur aus 0.4

Version 0.4 ergänzt die bestehende lokale Architektur um MSAL Browser, einen paginierten Microsoft-Graph-Client, ein stabiles SharePoint-Mapping und einen strikt lesenden `MicrosoftGraphDataProvider`. Demo und Microsoft 365 sind explizite Betriebsarten. Der Start bleibt immer lokal; Microsoft-Anmeldung und Providerwechsel erfolgen nur im Einrichtungsassistenten nach gültiger öffentlicher Konfiguration. Ein fehlgeschlagener Abruf kehrt zur unveränderten Demo zurück.

Der Integrationsstatus zeigt Konto/Tenant, Site, jede konfigurierte Liste, tatsächlich gelesene Eintragszahlen, Warnungen und den letzten erfolgreichen Abruf. `401`, `403`, `404`, Netzwerkfehler und Graph-Throttling werden unterschieden. Paginierung folgt `@odata.nextLink`. Lokale Demo-Buchungen werden nicht in den Microsoft-Snapshot kopiert.

Der lokale Export enthält jetzt das vollständige Schema sowie Original- und Vorschaudateien aus IndexedDB. SHA-256-Integrität, Datenversion und Referenzen werden vor der Vorschau geprüft. Der Import ersetzt den aktuellen Stand erst nach Bestätigung und versucht bei einem Speicherfehler, Daten und Assets zurückzurollen.

Details zu Entra-Registrierung, Berechtigungen, Listenfeldern, Places/Exchange-Quellhoheit und der notwendigen zentralen Buchungsarchitektur stehen in [MICROSOFT-365-INTEGRATION.md](MICROSOFT-365-INTEGRATION.md).

## Architekturprüfung von 0.2

Die vorhandene Trennung von Buchungsregeln, Zustand und Datenanbieter sowie Import und IndexedDB wurde beibehalten. Die entscheidenden Engstellen lagen im gemeinsamen `PlanObject` für Ressourcen und Dekoration, hart eingebauten Architekturzeichnungen in `FloorPlan.tsx`, einer einfachen Einzelauswahl im Editor und zahlreichen visuellen Sonderregeln. Schema 2 konnte keine editierbaren Wände, Wandöffnungen, Raumzonen oder Ebenen speichern.

Version 0.3 führt eigenständige Architektur-, Ausstattungs-, Zonen-, Annotations- und Ressourcentypen ein. Die Darstellung liest ausschließlich gespeicherte Vektorgeometrie; es gibt keine fest eingebauten Demo-Wände mehr. Die fachlichen Ressourcen bleiben in `room.objects`, sodass die vorhandenen Buchungsreferenzen und Graph-Verträge weiter funktionieren.

| Bereich                                  | Verantwortung                                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `domain/types.ts`                        | Schema 3, Ressourcen, Möbel, Bauteile, Wände, Öffnungen, Zonen, Annotationen und Ebenen                           |
| `domain/geometry.ts`                     | Gedrehte Rechtecke und SAT-Überschneidungsprüfung                                                                 |
| `domain/design.ts`                       | Wandsegmente mit echten Öffnungen, Projektion, Auswahl, Gruppen, Ebenen, Transformationen, Fangpunkte und Maßstab |
| `domain/editor.ts`                       | Duplizieren, Kopieren zwischen Plänen, Ausrichten, Verteilen und verbundene Wandpunkte                            |
| `domain/validation.ts`                   | Planbegrenzungen, geometrische Fehler und Überschneidungshinweise                                                 |
| `domain/catalog.ts`                      | Vollständiger Objektkatalog und einzeln buchbare Arbeitsplatzgruppen                                              |
| `domain/layout.ts`                       | Nummerierung, Planabmessungen, Hintergrundtransformationen und Speichervalidierung                                |
| `components/PlanSymbols.tsx`             | Eigene detaillierte Vektorsymbole in Draufsicht                                                                   |
| `components/Furniture.tsx`               | Neutrale Ressourcendarstellung mit kleinen Statusmarkierungen                                                     |
| `components/FloorPlan.tsx`               | Dynamischer Konva-Plan, Kamera, Ebenen, Auswahlrahmen, Bearbeitungsgriffe und Wandendpunkte                       |
| `components/editor/CatalogPanel.tsx`     | Katalogsuche, Kategorien und lokale Favoriten                                                                     |
| `pages/EditorPage.tsx`                   | Werkzeugsteuerung, Eigenschaften, Ebenen, Speichern und Verwerfen                                                 |
| `components/Dashboard.tsx`               | Berechnete Kennzahlen, echte Etagenminiaturen, Buchungen und Besprechungsraumauslastung                           |
| `pages/PresentationPage.tsx`             | Bildschirmfüllende Planung mit Datum, Zeitfenster und Buchungsdetails                                             |
| `styles/tokens.css`                      | Semantische Farb-, Abstands-, Schrift-, Radius-, Schatten- und Zustandstoken                                      |
| `styles/enterprise.css`                  | Durchgängige Gestaltung aller Ansichten und Bildschirmgrößen                                                      |
| `data/presentationRooms.ts`              | Drei vollständig eingerichtete Demo-Etagen                                                                        |
| `data/migration.ts` / `data/provider.ts` | Gesicherte Migration und austauschbarer Datenzugriff                                                              |

`ImportWizard`, `data/importer.ts`, `data/assets.ts`, `usePlanImage`, die serialisierten Store-Transaktionen und die Buchungsregeln werden weiterverwendet. PDF-Verarbeitung, Schrift und Symbole benötigen keine externen Dienste.

## Umgesetzte Funktionen

- Enterprise-Oberfläche mit Navy-Navigation, Petrol-Akzenten, lokal gebündelter Inter-Schrift und Hell-/Dunkelmodus. Dashboard, Raumplanung, Buchungen, Mitarbeiter, Einstellungen und Editor verwenden dasselbe Designsystem.
- Dashboard mit real berechneten Kennzahlen, drei beziehungsweise allen eigenen Etagenminiaturen, zeitgenauer Belegung, Buchungen und prozentualer Meetingraumauslastung im gewählten Zeitfenster.
- Orthogonale Wände aus zwei Punkten; intelligente Fangpunkte an Wandenden. Gemeinsame Endpunkte werden beim Bearbeiten gemeinsam verschoben. Wandstärke, Endpunkte und Material lassen sich ändern; Glaswände sind ein eigener Darstellungsstil.
- Türen, Doppeltüren, Schiebetüren und Fenster werden einer Wand zugeordnet. Der Renderer teilt die Wand in tatsächlich sichtbare Segmente. Anschlag und Öffnungsrichtung sind konfigurierbar.
- Eigenständige Raumzonen für Büro, Besprechung, Flur, Lounge, Küche, Sanitär, Technik und Lager. Ein buchbarer Meetingraum kann einer Zone zugeordnet werden. Die Zone selbst ist keine Ressource.
- Aufzug, Treppe mit Laufrichtung, Eingang und Stütze. Vollständiger Möbelkatalog mit Arbeitsplätzen, Stühlen, Stauraum, Technik, Gemeinschafts-, Küchen-, Sanitär- und Dekorationsobjekten. Sämtliche Planillustrationen sind eigene Vektoren.
- Einzel- und Eckarbeitsplätze sowie Zweier-, Vierer- und Sechsergruppen. Jede Station einer Gruppe hat eine eigene UUID, eindeutige Nummer und kann separat gebucht werden.
- Mehrfachauswahl per Umschalt oder Auswahlrahmen; Gruppieren/Aufheben, Kopieren/Einfügen, Duplizieren, Löschen, Reihenfolge innerhalb der Ebene, Ausrichten und gleichmäßige Verteilung der Mittelpunkte.
- Freie Größen und Winkel, 15°-Drehung, Konva-Transformationsgriffe, Pfeiltastenbewegung, Cursorzoom und Schwenken per Werkzeug oder Leertaste. Zoom und Bildschirmgröße verändern keine gespeicherten Weltkoordinaten.
- Fünf unabhängig sichtbare und sperrbare Ebenen. Die normale Planung zeigt keine Editorgriffe. Hintergrundtransformationen sind unter „Plan“ zugänglich.
- Zweipunktkalibrierung einer bekannten Strecke. Vorher ausschließlich Planeinheiten; danach Längen und die rechteckige Planfläche in Metern beziehungsweise Quadratmetern. Eine Änderung der Planabmessungen entfernt die bisherige Kalibrierung, damit kein falscher Maßstab entsteht.
- Geometrische Fehler verhindern das Speichern. Möbel- und Wandkollisionen werden angezeigt; die bewusste Übernahme von Hinweisen benötigt eine Bestätigung. Zonencontainment wird erlaubt. Gebuchte Ressourcen bleiben gegen versehentliches Löschen geschützt.
- Bis zu 80 Undo-/Redo-Schritte für alle Planarten und Ebenenänderungen. Speichern, Verwerfen und Importabschluss bilden einen neuen Ausgangsstand.
- Drei neue Präsentationspläne: sechs Fokusbüros mit Flur, Open Space mit 24 Plätzen und Gemeinschaftsflächen, Hybrid-Etage mit zwölf Plätzen, zwei Meetingräumen, Lounge, Empfang, Küche, WC, Aufzug und Treppe.
- Präsentationsansicht unter `#/praesentation` mit Etagen-, Datums- und Zeitwahl sowie der bestehenden Buchungsdetailansicht.

## Migration und Speicherung

Der Schlüssel **`officeflow.demo.v1` bleibt unverändert**, sein Inhalt hat jetzt Schema **3**. Version 1 und 2 werden beim Laden migriert. Das unveränderte Original wird vor dem ersten Schreiben unter `officeflow.demo.backup.v1` beziehungsweise `officeflow.demo.backup.v2` gesichert; vorhandene Sicherungen werden nicht überschrieben. Ein Speicherfehler stoppt die Migration.

Mitarbeiter, Buchungen, Ressourcenkennungen, Positionen und Hintergrundreferenzen bleiben erhalten. Bisherige Pflanzen und Loungeobjekte werden unter derselben Kennung zu Ausstattungsobjekten. Alte Demo-Pläne erhalten eine einfache, editierbare Bestandskontur; ihre Arbeitsplätze werden nicht verschoben. Eigene importierte Pläne werden unverändert übernommen. Ein fehlendes `layout`-Feld alter Demo-Pläne wird als Bestandslayout ergänzt. Bereits auf Schema 3 übernommene Bestände ohne dieses Feld erhalten dieselbe Kontur, mit vorheriger Sicherung unter `officeflow.demo.backup.v3`. Ein Update löst **keinen automatischen Reset** aus. Die neuen Präsentationslayouts erscheinen bei einer frischen Installation oder einem ausdrücklich ausgelösten Demo-Reset.

IndexedDB bleibt bei **`officeflow-plans` / Version 1 / `assets`**. Originaldateien und gerenderte Vorschauen werden nicht umgeschrieben. Import speichert zuerst das Asset, dann den Raum; ein Fehler im zweiten Schritt räumt das neue Asset auf. Fehlende Dateien erzeugen eine verständliche Meldung, ohne Buchungen zu löschen. Der vollständige Reset entfernt auch Assets und die Migrationssicherungen.

Der lokale Provider und sein gespeicherter Datenbestand bleiben erhalten. Die neue Live-Anbindung wird ohne autorisierten Test-Tenant nicht als erfolgreich getestet; die öffentliche CI prüft Graph-Verhalten vollständig mit Mocks.

## Qualitätssicherung

- **62 Fachtests** zu Buchungen, Showcase-Geometrie und ID-Isolation, zeitgenauer Verfügbarkeit, Grenzen, Dateiprüfung, Geometrie, Migration, vollständigen Sicherungen, Konfiguration, Graph-Paginierung/Throttling, Berechtigungs- und Netzwerkfehlern, SharePoint-Mapping, getrennten Places-/Exchange-Quellen, Speicherausfällen, Wandöffnungen, Ebenen, Kalibrierung, Gruppen und Kopieren.
- **37 Playwright-Prüfungen** einschließlich Showcase-Übernahme und anschließender Buchung, bisheriger Buchungs- und Importabläufe, Bearbeiten und Neuladen, Wand-/Öffnungswerkzeuge, Aufzug und Treppe, Gruppen, Zwischenablage, freie Drehung, Größen, Kontextmenü, Auswahlrahmen, Ebenen und Präsentation.
- **Fünf automatische visuelle Referenzen** für Dashboard, Planung, Editor, Showcase und Präsentation in `tests/visual/`. Festes Testdatum, lokal gebündelte Schrift und maskierte native Datums-/Zeitfelder reduzieren Unterschiede zwischen Windows Edge und Linux Chromium. Änderungen werden gegen die eingecheckten und visuell geprüften Bilder verglichen.
- Geprüfte Breiten **390, 768, 1024, 1440 und 1920 Pixel**, Hell-/Dunkelmodus sowie Import auf Mobilgeräten. Der Editor ordnet den Inspector auf schmalen Geräten unter dem Plan an.
- Produktionsprüfung des echten statischen Builds unter **`/OFFICEFLOW/`**: direkte Hash-Navigation, Neuladen, lokale PDF-Ressourcen/Worker, zweite PDF-Seite, Bildimport, Buchung und Persistenz. Das Skript erzeugt Bildschirmfotos aller Hauptansichten unter `docs/screenshots/`.
- GitHub Actions prüft Installation, Fachtests, Browser inklusive Bildvergleich, TypeScript und Produktion vor dem Pages-Deployment. Browserartefakte werden bei Fehlern gespeichert.
- Vitest wurde auf 5 aktualisiert; `npm audit` meldet nach der Aktualisierung keine bekannten Befunde.

## Bekannte Grenzen und nächste Schritte

1. **Betriebsarten:** Die lokale Demo besitzt keine echten Rollen, tab-/geräteübergreifende Synchronisierung oder Mehrbenutzersperren. Graph/SharePoint sind in 0.4 lesend integriert; produktive Mutationen bleiben bis zur zentralen Konfliktprüfung gesperrt.
2. **Geometrie:** Orthogonales Wandzeichnen ist der Standard. Freie Winkel können im Inspector eingestellt werden. Möbelkollisionen verwenden gedrehte Rechtecke, keine exakten Konturen jedes Symbols. Wandbilder aus Imports werden nicht automatisch erkannt. Die Pläne enthalten keine baurechtliche, brandschutztechnische oder barrierefreie Zertifizierung; das WC ist ein Einrichtungssymbol.
3. **Planmaßstab:** Eine globale Kalibrierung setzt einen unverzerrten Hintergrund voraus. Angezeigte Quadratmeter beziehen sich auf die rechteckige Planfläche, nicht auf eine berechnete Nutzfläche. Raumzonen müssen manuell eingerichtet werden.
4. **Dateien und Sicherung:** Das JSON-Sicherungspaket enthält auch Binärdateien als Base64 und kann dadurch groß werden. Jede PDF-Seite wird weiterhin separat als Bürobereich importiert. Browserdaten können vom Browser oder Anwender gelöscht werden; externe Unternehmens-Backups ersetzt der lokale Export nicht.
5. **Editor:** Zwischenablage und Historie gelten innerhalb der aktiven Sitzung; Speichern startet eine neue Historie. Hintergrund wird über den Inspector, nicht über frei ziehbare Konva-Griffe transformiert. Browser-Zurück innerhalb der Hash-Navigation wird nicht separat abgefangen; Seitenleistenwechsel und Neuladen warnen bei ungespeicherten Entwürfen.
6. **Buchungen:** Keine Wiederholung, Mehrtagestermine, Outlook-Einladungen oder automatische Anwesenheitserkennung. Anwesenheit wird für heutige Buchungen manuell bestätigt.
7. **Browser und Zugänglichkeit:** Edge/Chromium sind geprüft. Safari, Firefox, Stift-/Touch-Sonderfälle und ein umfassendes Barrierefreiheitsaudit sollten vor produktivem Einsatz folgen. Elemente sind zusätzlich über native Auswahllisten und Eigenschaftenfelder bedienbar.

Als nächster fachlicher Schritt empfiehlt sich die Abnahme mit einem echten Bürogrundriss auf Desktop und Tablet, gefolgt von vollständigem Export/Import und der erweiterten Browser- und Zugänglichkeitsprüfung.
