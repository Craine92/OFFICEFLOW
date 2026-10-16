import type { AccessTokenProvider } from './auth';
import type {
  GraphConnectionReport,
  GraphListItem,
  GraphListStatus,
  GraphWorkspaceSnapshot,
  Microsoft365Config,
} from './types';
import type { Booking, BookingInput, Employee, OfficeRoom, PlanObject } from '../../domain/types';
import type { MicrosoftGraphGateway } from '../../data/provider';
import { emptyDesign } from '../../domain/design';

interface GraphCollection<T> {
  value: T[];
  '@odata.nextLink'?: string;
}

export class GraphRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

export class GraphClient {
  constructor(
    private readonly tokens: AccessTokenProvider,
    private readonly fetcher: typeof fetch = fetch,
    private readonly pause: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
    private readonly scopes?: string[],
  ) {}

  async get<T>(pathOrUrl: string): Promise<T> {
    let attempt = 0;
    while (true) {
      const token = await this.tokens.getAccessToken(this.scopes);
      let response: Response;
      try {
        response = await this.fetcher(
          pathOrUrl.startsWith('https://') ? pathOrUrl : `https://graph.microsoft.com/v1.0${pathOrUrl}`,
          { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
        );
      } catch {
        throw new GraphRequestError('Microsoft Graph ist derzeit nicht erreichbar.', 0, 'network_error');
      }
      if (response.ok) return (await response.json()) as T;
      const payload = (await response.json().catch(() => ({}))) as {
        error?: { code?: string; message?: string };
      };
      if ([429, 503, 504].includes(response.status) && attempt < 3) {
        const seconds = Number(response.headers.get('Retry-After'));
        await this.pause(Number.isFinite(seconds) ? Math.min(seconds, 30) * 1000 : 500 * 2 ** attempt);
        attempt += 1;
        continue;
      }
      const message =
        response.status === 401
          ? 'Die Microsoft-Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.'
          : response.status === 403
            ? 'Für diese Microsoft-Ressource fehlt die erforderliche Leseberechtigung.'
            : response.status === 404
              ? 'Die konfigurierte Microsoft-Ressource wurde nicht gefunden.'
              : payload.error?.message || `Microsoft Graph antwortete mit HTTP ${response.status}.`;
      throw new GraphRequestError(message, response.status, payload.error?.code);
    }
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const token = await this.tokens.getAccessToken(this.scopes);
    let response: Response;
    try {
      response = await this.fetcher(`https://graph.microsoft.com/v1.0${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new GraphRequestError('Microsoft Graph ist derzeit nicht erreichbar.', 0, 'network_error');
    }
    if (response.ok) return (await response.json()) as T;
    const payload = (await response.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    throw new GraphRequestError(
      response.status === 403
        ? 'Für die Kalenderverfügbarkeit fehlt die delegierte Berechtigung Calendars.ReadBasic.'
        : payload.error?.message || `Microsoft Graph antwortete mit HTTP ${response.status}.`,
      response.status,
      payload.error?.code,
    );
  }

  async getAll<T>(path: string): Promise<T[]> {
    const result: T[] = [];
    let next: string | undefined = path;
    while (next) {
      const page: GraphCollection<T> = await this.get(next);
      result.push(...page.value);
      next = page['@odata.nextLink'];
    }
    return result;
  }

  listItems(siteId: string, listId: string) {
    return this.getAll<GraphListItem>(
      `/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items?$expand=fields&$top=200`,
    );
  }
}

const listLabels: Record<string, string> = {
  locations: 'Standorte',
  floors: 'Etagen und Grundrisse',
  workspaces: 'Arbeitsplätze',
  meetingRooms: 'Meetingräume',
  departments: 'Abteilungen',
  assignments: 'Mitarbeiterzuordnungen',
  bookings: 'Buchungsmetadaten',
};

export class SharePointGraphGateway implements MicrosoftGraphGateway {
  constructor(
    private readonly graph: GraphClient,
    private readonly config: Microsoft365Config,
  ) {}

  async loadWorkspace(): Promise<GraphWorkspaceSnapshot> {
    const report: GraphConnectionReport = {
      siteId: this.config.siteId,
      lists: [],
      placesAvailable: false,
      calendarAvailabilityAvailable: false,
      warnings: [],
    };
    const site = await this.graph.get<{ displayName?: string; webUrl?: string }>(
      `/sites/${encodeURIComponent(this.config.siteId)}?$select=id,displayName,webUrl`,
    );
    report.siteName = site.displayName;
    report.siteUrl = site.webUrl;

    const loaded = new Map<string, GraphListItem[]>();
    for (const [key, id] of Object.entries(this.config.lists)) {
      const status: GraphListStatus = {
        key: key as keyof Microsoft365Config['lists'],
        label: listLabels[key],
        id,
        available: false,
      };
      if (!id) {
        status.error = 'Nicht konfiguriert';
        report.lists.push(status);
        continue;
      }
      try {
        const items = await this.graph.listItems(this.config.siteId, id);
        loaded.set(key, items);
        status.available = true;
        status.itemCount = items.length;
      } catch (error) {
        status.error = (error as Error).message;
        if (key === 'floors' || key === 'workspaces') throw error;
        report.warnings.push(`${status.label}: ${status.error}`);
      }
      report.lists.push(status);
    }

    const rooms = mapRooms(loaded.get('floors') ?? [], [
      ...(loaded.get('workspaces') ?? []),
      ...(loaded.get('meetingRooms') ?? []),
    ]);
    if (!rooms.length) throw new Error('Die verbundenen Listen enthalten keine verwendbaren Etagen.');
    const employees = mapEmployees(loaded.get('assignments') ?? []);
    const bookings = mapBookings(loaded.get('bookings') ?? [], rooms, employees);
    report.lastSuccessfulRead = new Date().toISOString();
    return { rooms, employees, bookings, report };
  }

  async listRooms() {
    return (await this.loadWorkspace()).rooms;
  }

  async listEmployees() {
    return (await this.loadWorkspace()).employees;
  }

  async listBookings(date: string) {
    return (await this.loadWorkspace()).bookings.filter((booking) => booking.date === date);
  }

  async createBooking(_input: BookingInput, _etag?: string): Promise<Booking> {
    throw readOnlyError();
  }

  async cancelBooking(_id: string, _etag: string): Promise<void> {
    throw readOnlyError();
  }

  async updateRoom(_room: OfficeRoom, _etag: string): Promise<void> {
    throw readOnlyError();
  }

}

function readOnlyError() {
  return new Error('Microsoft-Schreibzugriffe sind bis zur zentralen Konfliktprüfung nicht freigegeben.');
}

function value(fields: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) if (fields[key] !== undefined && fields[key] !== null) return fields[key];
  return undefined;
}
function stringValue(fields: Record<string, unknown>, ...keys: string[]) {
  const result = value(fields, ...keys);
  return result === undefined ? '' : String(result).trim();
}
function numberValue(fields: Record<string, unknown>, fallback: number, ...keys: string[]) {
  const result = Number(value(fields, ...keys));
  return Number.isFinite(result) ? result : fallback;
}
function stableId(item: GraphListItem) {
  return stringValue(item.fields, 'OfficeflowId', 'OFFICEFLOWID', 'ExternalId') || `sp-${item.id}`;
}

export function mapRooms(floors: GraphListItem[], resources: GraphListItem[]): OfficeRoom[] {
  return floors.map((item) => {
    const id = stableId(item);
    const width = numberValue(item.fields, 900, 'Width', 'Breite');
    const height = numberValue(item.fields, 570, 'Height', 'Hoehe');
    const design = parseDesign(item.fields.DesignJson);
    const objects = resources
      .filter((resource) => stringValue(resource.fields, 'FloorId', 'EtageId') === id)
      .map(mapResource);
    return {
      id,
      name: stringValue(item.fields, 'Title', 'DisplayName') || `Etage ${item.id}`,
      subtitle: stringValue(item.fields, 'Subtitle', 'Description'),
      area: numberValue(item.fields, 0, 'Area', 'Flaeche'),
      width,
      height,
      layout: 'custom',
      objects,
      ...design,
    };
  });
}

function parseDesign(raw: unknown) {
  const empty = emptyDesign();
  if (typeof raw !== 'string' || !raw.trim()) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<typeof empty>;
    return {
      ...empty,
      ...parsed,
      layers: { ...empty.layers, ...parsed.layers },
    };
  } catch {
    return empty;
  }
}

function mapResource(item: GraphListItem): PlanObject {
  const type = stringValue(item.fields, 'ResourceType', 'Type').toLowerCase();
  return {
    id: stableId(item),
    name: stringValue(item.fields, 'Title', 'DisplayName') || `Ressource ${item.id}`,
    kind: type.includes('meeting') || type.includes('raum') ? 'meeting' : 'desk',
    x: numberValue(item.fields, 80, 'X'),
    y: numberValue(item.fields, 80, 'Y'),
    width: numberValue(item.fields, 80, 'Width', 'Breite'),
    height: numberValue(item.fields, 45, 'Height', 'Hoehe'),
    rotation: numberValue(item.fields, 0, 'Rotation'),
    capacity: numberValue(item.fields, 1, 'Capacity', 'Kapazitaet'),
    equipment: stringValue(item.fields, 'Equipment', 'Ausstattung')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  };
}

export function mapEmployees(items: GraphListItem[]): Employee[] {
  return items.map((item, index) => {
    const name = stringValue(item.fields, 'DisplayName', 'Title') || `Microsoft-Benutzer ${item.id}`;
    return {
      id: stableId(item),
      name,
      department: stringValue(item.fields, 'Department', 'Abteilung'),
      initials:
        stringValue(item.fields, 'Initials') ||
        name
          .split(/\s+/)
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
      color: stringValue(item.fields, 'Color', 'Farbe') || ['#2563eb', '#0891b2', '#7c3aed'][index % 3],
    };
  });
}

export function mapBookings(items: GraphListItem[], rooms: OfficeRoom[], employees: Employee[]): Booking[] {
  const roomIds = new Map(rooms.flatMap((room) => room.objects.map((object) => [object.id, room.id])));
  const employeeIds = new Set(employees.map((employee) => employee.id));
  return items.flatMap((item) => {
    const objectId = stringValue(item.fields, 'WorkspaceId', 'ResourceId');
    const employeeId = stringValue(item.fields, 'EmployeeId', 'UserId');
    const roomId = roomIds.get(objectId);
    const date = stringValue(item.fields, 'BookingDate', 'Date').slice(0, 10);
    if (!roomId || !employeeIds.has(employeeId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    return [
      {
        id: stableId(item),
        objectId,
        roomId,
        employeeId,
        date,
        start: stringValue(item.fields, 'StartTime', 'Start').slice(0, 5),
        end: stringValue(item.fields, 'EndTime', 'End').slice(0, 5),
        checkedIn: Boolean(value(item.fields, 'CheckedIn')),
        createdAt: stringValue(item.fields, 'Created') || new Date(0).toISOString(),
      },
    ];
  });
}
