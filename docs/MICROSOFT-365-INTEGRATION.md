# OFFICEFLOW 0.4 – Microsoft-365-Integration

Stand: 16. Oktober 2026. Diese Dokumentation beschreibt die implementierte, ausschließlich lesende Integration und die Voraussetzungen für einen autorisierten Test-Tenant. Ein erfolgreicher Live-Test ist ohne Tenant-Zugangsdaten nicht behauptet.

## Verantwortlichkeiten und Datenquellen

| Schicht | Verantwortung | Führende Datenquelle |
| --- | --- | --- |
| `MicrosoftAuth` | Entra-Anmeldung, Kontoauswahl, stiller Tokenabruf, Abmeldung | Microsoft Entra ID / MSAL |
| `GraphClient` | Authentifizierte GET-Anfragen, Paginierung, Fehlerübersetzung, begrenzter Backoff | Microsoft Graph |
| `SharePointGraphGateway` | Site-/Listenabruf, Schema-Mapping, Verbindungsbericht | SharePoint-Listen |
| `MicrosoftGraphDataProvider` | OFFICEFLOW-Lesemodell; verweigert `save` und `reset` | Gateway-Snapshot |
| `DemoDataProvider` | Vollständige lokale Demo-Funktionen | localStorage + IndexedDB |
| Integrations-Store | Expliziter Moduswechsel; bei Fehlern sichere Rückkehr zur Demo | UI-Sitzung |

Die öffentliche Anwendung startet immer im Demo-Modus und löst nie selbstständig eine Microsoft-Anmeldung aus. Erst nach gültiger Konfiguration, interaktiver Anmeldung und erfolgreichem echten Listenabruf wechselt sie auf `microsoft-graph`. Der Providerwechsel lädt einen neuen Snapshot; lokale Demo-Buchungen werden nicht mitgeführt oder zusammengeführt.

## Entra-App registrieren

1. Im Microsoft Entra Admin Center eine neue App-Registrierung für den gewünschten Tenant erstellen. Für mehrere Unternehmenskunden empfiehlt sich eine bewusst geprüfte Multi-Tenant-Registrierung; standardmäßig ist eine Single-Tenant-App risikoärmer.
2. Unter **Authentication → Add a platform → Single-page application** jede produktive und lokale Redirect-URI exakt eintragen, beispielsweise `https://craine92.github.io/OFFICEFLOW/` und `http://127.0.0.1:5173/`.
3. Keine Client-Secrets oder Zertifikate für das Frontend anlegen oder ausliefern. MSAL Browser verwendet Authorization Code Flow mit PKCE.
4. Delegierte Microsoft-Graph-Berechtigungen hinzufügen:
   - `User.Read`: angemeldetes Benutzerkonto.
   - `Sites.Read.All`: konfigurierte SharePoint-Site und Listen lesen. Falls Tenant-Richtlinien dies verlangen, muss ein Administrator zustimmen.
5. Optional getrennt prüfen und erst nach fachlicher Freigabe ergänzen:
   - `Place.Read.All` für Places-Endpunkte zu Gebäuden, Etagen und Räumen; Verfügbarkeit und Tenant-Konfiguration variieren.
   - `Calendars.ReadBasic` für Frei/Gebucht ausdrücklich berechtigter Raum-Postfächer. Diese Daten bleiben getrennt von OFFICEFLOW-Arbeitsplatzbuchungen.

Die Basiseinrichtung fordert ausschließlich `User.Read` und `Sites.Read.All` an. Die getrennten Adapter fordern `Place.Read.All` beziehungsweise `Calendars.ReadBasic` erst bei tatsächlicher Nutzung der optionalen Quelle an. Es werden keine globalen Schreibrechte oder Administratorrollen angefordert.

## Build-Konfiguration

Alle Werte sind öffentliche Kennungen. Sie dürfen keine Geheimnisse oder Token enthalten.

```text
VITE_MS_TENANT_ID=00000000-0000-0000-0000-000000000000
VITE_MS_CLIENT_ID=00000000-0000-0000-0000-000000000000
VITE_MS_REDIRECT_URI=https://example.github.io/OFFICEFLOW/
VITE_MS_SITE_ID=contoso.sharepoint.com,siteCollectionId,siteId
VITE_MS_LIST_FLOORS_ID=<GUID>
VITE_MS_LIST_WORKSPACES_ID=<GUID>
VITE_MS_LIST_LOCATIONS_ID=<GUID>                 # optional
VITE_MS_LIST_MEETING_ROOMS_ID=<GUID>             # optional
VITE_MS_LIST_DEPARTMENTS_ID=<GUID>               # optional
VITE_MS_LIST_ASSIGNMENTS_ID=<GUID>               # optional
VITE_MS_LIST_BOOKINGS_ID=<GUID>                  # optional
```

Tenant-ID und Client-ID müssen GUIDs sein; als Tenant ist außerdem bewusst `organizations` zulässig. Site- und Listen-IDs können im Einrichtungsassistenten ergänzt werden und liegen dann als nicht vertrauliche Konfiguration im lokalen Browser. Token werden von MSAL in `sessionStorage` verwaltet und weder protokolliert noch exportiert.

## SharePoint-Datenmodell

Alle Listen verwenden die unveränderliche SharePoint-Item-ID als sicheren Fallback. Empfohlen ist zusätzlich eine eindeutige Textspalte `OfficeflowId`, die nach Erstellung nie geändert wird. Anzeigenamen sind keine Primärschlüssel.

### Etagen und Grundrisse (Pflicht)

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `OfficeflowId` | Text, eindeutig | Interne stabile Etagen-ID |
| `Title` | Text | Anzeigename |
| `Subtitle` | Text | Beschreibung |
| `Area` | Zahl | Fläche, informativ |
| `Width`, `Height` | Zahl | OFFICEFLOW-Planeinheiten |
| `DesignJson` | Mehrzeiliger Text | Vektorgeometrie für Wände, Öffnungen, Zonen, Möbel, Bauteile, Annotationen und Ebenen |

### Arbeitsplätze / Meetingräume (Arbeitsplätze Pflicht)

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `OfficeflowId` | Text, eindeutig | Stabile Ressourcen-ID |
| `FloorId` | Text | `OfficeflowId` der Etage |
| `Title` | Text | Anzeigename |
| `ResourceType` | Auswahl/Text | `desk` oder `meeting` |
| `X`, `Y`, `Width`, `Height`, `Rotation` | Zahl | Geometrie |
| `Capacity` | Zahl | Kapazität |
| `Equipment` | Text | Kommaseparierte Ausstattung |

Meetingräume dürfen in einer eigenen Liste liegen. Der Adapter vereinigt ihre Geometrie für die Darstellung, nicht aber deren Exchange-Kalender mit Arbeitsplatzbuchungen.

### Mitarbeiterzuordnungen (optional)

`OfficeflowId`, `DisplayName`, `Department`, `Initials`, `Color`. Die Liste soll nur die für OFFICEFLOW erforderlichen Personen enthalten. Ohne konfigurierte Liste werden keine echten Mitarbeiter erfunden.

### Buchungsmetadaten (optional, lesend)

`OfficeflowId`, `WorkspaceId`, `EmployeeId`, `BookingDate` (`YYYY-MM-DD`), `StartTime`, `EndTime`, `CheckedIn`, `Created`. Verwaiste oder ungültige Referenzen werden nicht als Buchung dargestellt. Zeiten sind als lokale Bürozeit plus separat definierter Standortzeitzone zu verstehen; eine produktive zentrale API muss sie intern als UTC/Offset speichern.

### Standorte und Abteilungen (optional)

Diese Listen werden erkannt und im Verbindungsbericht angezeigt. Das gegenwärtige OFFICEFLOW-Schema verwendet noch keine eigenständigen Standort-/Abteilungsobjekte; ihre IDs sind für die nächste normalisierte Schemaversion reserviert.

## Fehler- und Verbindungsverhalten

- `401`: Sitzung abgelaufen; neue interaktive Anmeldung erforderlich.
- `403`: benötigte Leseberechtigung fehlt; keine falsche Erfolgsmeldung.
- `404`: Site oder Liste wurde unter der konfigurierten ID nicht gefunden.
- Netzwerkfehler: als nicht erreichbarer Microsoft-Graph-Dienst gemeldet.
- `429`, `503`, `504`: bis zu drei Wiederholungen, `Retry-After` wird bis maximal 30 Sekunden berücksichtigt, sonst exponentieller Backoff.
- `@odata.nextLink`: jede Seite wird bis zum Ende gelesen.
- Etagen- und Arbeitsplatzlisten sind zwingend. Optionale Listen erzeugen sichtbare Warnungen. Ohne verwendbare Etage wird Microsoft-Modus nicht aktiviert.
- Bei jeder fehlgeschlagenen Aktivierung wird wieder der lokale Demo-Provider geladen. Demo-Daten werden dabei weder gelöscht noch überschrieben.

## Microsoft Places und Exchange

Die Quellhoheit ist bewusst getrennt:

| Ressourcentyp | Führendes System | OFFICEFLOW 0.4 |
| --- | --- | --- |
| Standort, Gebäude, Etage | SharePoint; optional Mapping zu Places-ID | SharePoint und optional Places werden getrennt gelesen |
| Arbeitsplatzgeometrie | SharePoint | Wird gelesen |
| OFFICEFLOW-Arbeitsplatzbuchung | Künftiger zentraler Booking Service | SharePoint-Metadaten nur lesend |
| Meetingraum-Stammdaten | SharePoint; optional Places-Referenz | Wird gelesen |
| Meetingraum-Frei/Gebucht | Exchange-Raumkalender | Über getrennten `ExchangeAvailabilityGateway`; nicht automatisch angefordert oder vermischt |

Ein Tenant ohne Places-Konfiguration bleibt vollständig nutzbar, sofern die Pflichtlisten vorhanden sind. Frei/Gebucht aus Exchange darf später nur als eigene, beschriftete Datenquelle erscheinen.

## Zielarchitektur für sichere Mehrbenutzerbuchungen

Produktive Schreibfunktionen benötigen einen vertrauenswürdigen Server, beispielsweise Azure Functions/API Management mit Entra-Authentifizierung. Der Browser darf keine Buchung direkt nach einer bloßen Vorabprüfung in eine SharePoint-Liste schreiben.

1. Client sendet Ressourcen-ID, UTC-Zeitfenster, Standortzeitzone und Idempotency-Key mit Entra-Token an den Booking Service.
2. Service validiert Tenant, Benutzer, Ressourcenzugriff und Zeitgrenzen serverseitig.
3. Service führt Konfliktprüfung und Erstellung in derselben atomaren Transaktion aus. Geeignet sind eine Datenbank mit eindeutiger/Exclusion-Constraint oder eine serialisierte Queue pro Ressource. SharePoint allein bietet dafür keine robuste Bereichs-Constraint.
4. Die Antwort enthält unveränderliche Booking-ID, Version/ETag und normalisierte Zeitwerte. Wiederholte Idempotency-Keys erzeugen keine zweite Buchung.
5. Stornierung verlangt Booking-ID und aktuelle Version; Besitzer- oder Administratorberechtigung wird serverseitig geprüft.
6. Jede Mutation erzeugt ein manipulationsgeschütztes Änderungsereignis mit Tenant, Akteur, Zeitpunkt, alter/neuer Version und Korrelations-ID – ohne Access Token oder unnötige Personendaten.
7. Ein Outbox-/Worker-Prozess synchronisiert die lesende SharePoint-Projektion und gegebenenfalls Exchange. Fehler werden wiederholt und sichtbar, nicht als Erfolg ausgegeben.
8. Tenant-ID ist Bestandteil jedes Speicherschlüssels und jeder Abfrage. Serverseitige Autorisierung verhindert organisationsübergreifenden Zugriff.

Bis diese Logik implementiert, gegen konkurrierende Anfragen getestet und sicherheitlich geprüft ist, werfen `save` und `reset` im Microsoft-Provider einen Fehler. UI-Aktionen für neue Buchungen sind deaktiviert und der Modus ist permanent als „Nur Lesen“ markiert.

## Test-Tenant und Abnahme

1. Separate Test-Site mit ausschließlich synthetischen Personen- und Buchungsdaten erstellen.
2. Listen nach obigem Schema und mindestens je eine Etage, Ressource und Zuordnung anlegen.
3. Entra-App ausschließlich für den Test-Tenant registrieren; Redirect-URIs exakt setzen.
4. Anwendung mit den Testwerten bauen, Einrichtungsassistent öffnen und Zustimmungsdialog prüfen.
5. Paginierung mit mehr als 200 Einträgen, fehlende optionale Liste, ungültige Listen-ID, entzogene Zustimmung, Tokenablauf und simulierte Netzwerkunterbrechung prüfen.
6. Mit Browserentwicklerwerkzeugen bestätigen: keine Secrets/Token in Logs, Sicherungen oder localStorage; nur HTTPS-Aufrufe an Graph/Login.
7. Konto abmelden und bestätigen, dass die unveränderte lokale Demo wieder erscheint.

Die öffentliche CI verwendet absichtlich Mock-Antworten. Ein gesonderter, geschützter Live-Test darf nur mit autorisiertem Test-Tenant und nicht in einem öffentlichen Fork laufen.

## Offizielle Microsoft-Referenzen

- [MSAL Browser und Authorization Code Flow mit PKCE](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/about-msal-browser)
- [SharePoint-Listeneinträge lesen](https://learn.microsoft.com/en-us/graph/api/listitem-list?view=graph-rest-1.0)
- [Places-Objekte und `Place.Read.All`](https://learn.microsoft.com/en-us/graph/api/place-list?view=graph-rest-1.0)
- [Raumverfügbarkeit mit `getSchedule` und `Calendars.ReadBasic`](https://learn.microsoft.com/en-us/graph/api/calendar-getschedule?view=graph-rest-1.0)
