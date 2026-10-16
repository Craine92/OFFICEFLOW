import type { OfficeData } from '../../domain/types';
import type { WorkspaceDataProvider } from '../../data/provider';
import { SharePointGraphGateway } from './graph';
import type { GraphConnectionReport, GraphWorkspaceSnapshot } from './types';

export class MicrosoftGraphDataProvider implements WorkspaceDataProvider {
  readonly mode = 'microsoft-graph' as const;
  readonly readOnly = true;
  report?: GraphConnectionReport;
  private initial?: GraphWorkspaceSnapshot;

  constructor(private readonly gateway: SharePointGraphGateway) {}

  prime(snapshot: GraphWorkspaceSnapshot) {
    this.initial = snapshot;
    this.report = snapshot.report;
  }

  async load(): Promise<OfficeData> {
    const snapshot = this.initial ?? (await this.gateway.loadWorkspace());
    this.initial = undefined;
    this.report = snapshot.report;
    return { version: 3, rooms: snapshot.rooms, employees: snapshot.employees, bookings: snapshot.bookings };
  }

  async save(): Promise<void> {
    throw new Error(
      'Microsoft 365 ist derzeit schreibgeschützt. Zentrale Konfliktprüfung und Berechtigungslogik sind noch nicht freigegeben.',
    );
  }

  async reset(): Promise<OfficeData> {
    throw new Error('Unternehmensdaten können in OFFICEFLOW nicht zurückgesetzt werden.');
  }
}
