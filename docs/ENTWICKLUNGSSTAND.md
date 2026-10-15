# Entwicklungsstand – OFFICEFLOW 0.3

Stand: 15. Oktober 2026. Öffentliche, vollständig statische Demo: [OFFICEFLOW](https://craine92.github.io/OFFICEFLOW/). Quellcode: [Craine92/OFFICEFLOW](https://github.com/Craine92/OFFICEFLOW).

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

Mitarbeiter, Buchungen, Ressourcenkennungen, Positionen und Hintergrundreferenzen bleiben erhalten. Bisherige Pflanzen und Loungeobjekte werden unter derselben Kennung zu Ausstattungsobjekten. Alte Demo-Pläne erhalten eine einfache, editierbare Bestandskontur; ihre Arbeitsplätze werden nicht verschoben. Eigene importierte Pläne werden unverändert übernommen. Ein Update löst **keinen automatischen Reset** aus. Die neuen Präsentationslayouts erscheinen bei einer frischen Installation oder einem ausdrücklich ausgelösten Demo-Reset.

IndexedDB bleibt bei **`officeflow-plans` / Version 1 / `assets`**. Originaldateien und gerenderte Vorschauen werden nicht umgeschrieben. Import speichert zuerst das Asset, dann den Raum; ein Fehler im zweiten Schritt räumt das neue Asset auf. Fehlende Dateien erzeugen eine verständliche Meldung, ohne Buchungen zu löschen. Der vollständige Reset entfernt auch Assets und beide Migrationssicherungen.

Der lokale Provider und `MicrosoftGraphGateway` bleiben erhalten. Es wurde keine Live-Anbindung oder Anmeldung hinzugefügt.

## Qualitätssicherung

- **47 Fachtests** zu Buchungen, zeitgenauer Verfügbarkeit, Grenzen, Dateiprüfung, Geometrie, Migration und Backups, Speicherausfällen, echten Wandöffnungen, angeschlossenen Wandpunkten, Ebenen, Kalibrierung, Gruppen, Nummerierung und Kopieren.
- **33 Playwright-Prüfungen** einschließlich bisheriger Buchungs- und Importabläufe, Bearbeiten und Neuladen, Wand-/Öffnungswerkzeuge, Aufzug und Treppe, Gruppen, Zwischenablage, freie Drehung, Größen, Kontextmenü, Auswahlrahmen, Ebenen und Präsentation.
- **Drei automatische visuelle Referenzen** für Dashboard, Planung und Editor in `tests/visual/`. Festes Testdatum, lokal gebündelte Schrift und maskierte native Datums-/Zeitfelder reduzieren Unterschiede zwischen Windows Edge und Linux Chromium. Änderungen werden gegen die eingecheckten Bilder verglichen; Referenzen nicht ungeprüft aktualisieren.
- Geprüfte Breiten **390, 768, 1024 und 1440 Pixel**, Hell-/Dunkelmodus sowie Import auf Mobilgeräten. Der Editor ordnet den Inspector auf schmalen Geräten unter dem Plan an.
- Produktionsprüfung des echten statischen Builds unter **`/OFFICEFLOW/`**: direkte Hash-Navigation, Neuladen, lokale PDF-Ressourcen/Worker, zweite PDF-Seite, Bildimport, Buchung und Persistenz. Das Skript erzeugt Bildschirmfotos aller Hauptansichten unter `docs/screenshots/`.
- GitHub Actions prüft Installation, Fachtests, Browser inklusive Bildvergleich, TypeScript und Produktion vor dem Pages-Deployment. Browserartefakte werden bei Fehlern gespeichert.
- Vitest wurde auf 5 aktualisiert; `npm audit` meldet nach der Aktualisierung keine bekannten Befunde.

## Bekannte Grenzen und nächste Schritte

1. **Lokale Demo:** Keine Anmeldung, echten Rollen, tab-/geräteübergreifende Synchronisierung oder Mehrbenutzersperren. Graph/SharePoint bleiben ein eigenes Folgeprojekt mit zentraler Konfliktprüfung.
2. **Geometrie:** Orthogonales Wandzeichnen ist der Standard. Freie Winkel können im Inspector eingestellt werden. Möbelkollisionen verwenden gedrehte Rechtecke, keine exakten Konturen jedes Symbols. Wandbilder aus Imports werden nicht automatisch erkannt. Die Pläne enthalten keine baurechtliche, brandschutztechnische oder barrierefreie Zertifizierung; das WC ist ein Einrichtungssymbol.
3. **Planmaßstab:** Eine globale Kalibrierung setzt einen unverzerrten Hintergrund voraus. Angezeigte Quadratmeter beziehen sich auf die rechteckige Planfläche, nicht auf eine berechnete Nutzfläche. Raumzonen müssen manuell eingerichtet werden.
4. **Dateien und Sicherung:** JSON enthält Planmetadaten und Buchungen, keine Binärdateien. Vollständiger Paketexport/Wiederimport und Bereinigung verwaister Assets sind sinnvolle nächste Schritte. Jede PDF-Seite wird separat importiert. Browserdaten können vom Browser oder Anwender gelöscht werden.
5. **Editor:** Zwischenablage und Historie gelten innerhalb der aktiven Sitzung; Speichern startet eine neue Historie. Hintergrund wird über den Inspector, nicht über frei ziehbare Konva-Griffe transformiert. Browser-Zurück innerhalb der Hash-Navigation wird nicht separat abgefangen; Seitenleistenwechsel und Neuladen warnen bei ungespeicherten Entwürfen.
6. **Buchungen:** Keine Wiederholung, Mehrtagestermine, Outlook-Einladungen oder automatische Anwesenheitserkennung. Anwesenheit wird für heutige Buchungen manuell bestätigt.
7. **Browser und Zugänglichkeit:** Edge/Chromium sind geprüft. Safari, Firefox, Stift-/Touch-Sonderfälle und ein umfassendes Barrierefreiheitsaudit sollten vor produktivem Einsatz folgen. Elemente sind zusätzlich über native Auswahllisten und Eigenschaftenfelder bedienbar.

Als nächster fachlicher Schritt empfiehlt sich die Abnahme mit einem echten Bürogrundriss auf Desktop und Tablet, gefolgt von vollständigem Export/Import und der erweiterten Browser- und Zugänglichkeitsprüfung.
