import type { Booking, Employee, OfficeRoom } from '../../domain/types';

export type MicrosoftConnectionStatus =
  | 'unconfigured'
  | 'disconnected'
  | 'authenticating'
  | 'connected'
  | 'loading'
  | 'ready'
  | 'expired'
  | 'error';

export interface SharePointListIds {
  locations?: string;
  floors: string;
  workspaces: string;
  meetingRooms?: string;
  departments?: string;
  assignments?: string;
  bookings?: string;
}

export interface Microsoft365Config {
  tenantId: string;
  clientId: string;
  redirectUri: string;
  siteId: string;
  lists: SharePointListIds;
}

export interface MicrosoftAccount {
  id: string;
  name: string;
  username: string;
  tenantId: string;
  organization?: string;
}

export interface GraphListStatus {
  key: keyof SharePointListIds;
  label: string;
  id?: string;
  available: boolean;
  itemCount?: number;
  error?: string;
}

export interface GraphConnectionReport {
  siteId: string;
  siteName?: string;
  siteUrl?: string;
  lists: GraphListStatus[];
  placesAvailable: boolean;
  calendarAvailabilityAvailable: boolean;
  lastSuccessfulRead?: string;
  warnings: string[];
}

export interface GraphWorkspaceSnapshot {
  rooms: OfficeRoom[];
  employees: Employee[];
  bookings: Booking[];
  report: GraphConnectionReport;
}

export interface GraphListItem {
  id: string;
  eTag?: string;
  fields: Record<string, unknown>;
}

export interface ResourceBinding {
  officeflowId: string;
  microsoftId: string;
  source: 'sharepoint' | 'places' | 'exchange';
}
