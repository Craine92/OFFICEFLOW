import type { AccessTokenProvider } from './auth';
import { GraphClient } from './graph';

export interface AvailabilityWindow {
  start: string;
  end: string;
  timeZone: string;
}

export interface RoomAvailability {
  email: string;
  availabilityView: string;
  scheduleItems: Array<{
    status: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
  }>;
}

/**
 * Getrennte Exchange-Datenquelle. Sie wird nicht vom SharePoint-Provider aufgerufen und
 * vermischt Kalendertermine deshalb nicht mit OFFICEFLOW-Arbeitsplatzbuchungen.
 */
export class ExchangeAvailabilityGateway {
  private readonly graph: GraphClient;

  constructor(tokens: AccessTokenProvider, fetcher: typeof fetch = fetch) {
    this.graph = new GraphClient(tokens, fetcher, undefined, ['Calendars.ReadBasic']);
  }

  async readRoomAvailability(roomEmails: string[], window: AvailabilityWindow) {
    if (!roomEmails.length) return [];
    const result = await this.graph.post<{ value: RoomAvailability[] }>('/me/calendar/getSchedule', {
      schedules: roomEmails,
      startTime: { dateTime: window.start, timeZone: window.timeZone },
      endTime: { dateTime: window.end, timeZone: window.timeZone },
      availabilityViewInterval: 30,
    });
    return result.value;
  }
}
