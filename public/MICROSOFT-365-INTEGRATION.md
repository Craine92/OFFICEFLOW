# OFFICEFLOW 0.4 – Microsoft-365-Administrationsleitfaden

Die vollständige, versionierte Dokumentation befindet sich im Repository unter `docs/MICROSOFT-365-INTEGRATION.md`.

Kurzfassung: Registrieren Sie eine Microsoft-Entra-SPA, hinterlegen Sie die exakte Redirect-URI und konfigurieren Sie ausschließlich die delegierten Leserechte `User.Read` und `Sites.Read.All`. Tragen Sie Tenant-ID, Client-ID, SharePoint-Site-ID sowie die IDs der vorhandenen Etagen- und Arbeitsplatzlisten im OFFICEFLOW-Einrichtungsassistenten ein. Client-Secrets gehören niemals in das Frontend.

OFFICEFLOW 0.4 liest Microsoft-Daten ausschließlich. Buchungen, Stornierungen und Grundrissänderungen bleiben deaktiviert, bis eine serverseitige atomare Konflikt- und Berechtigungslogik implementiert und geprüft ist. Die öffentliche Demo startet weiterhin ohne Anmeldung und verwendet ausschließlich lokale, fiktive Daten.
