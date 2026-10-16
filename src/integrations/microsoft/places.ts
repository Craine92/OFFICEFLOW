import type { AccessTokenProvider } from './auth';
import { GraphClient } from './graph';

export type PlaceType = 'building' | 'floor' | 'section' | 'desk' | 'room' | 'workspace';

export interface MicrosoftPlace {
  id: string;
  placeId?: string;
  displayName: string;
  parentId?: string;
  emailAddress?: string;
  capacity?: number;
}

/** Optionale Datenquelle mit eigener Zustimmung; SharePoint funktioniert ohne Places. */
export class MicrosoftPlacesGateway {
  private readonly graph: GraphClient;

  constructor(tokens: AccessTokenProvider, fetcher: typeof fetch = fetch) {
    this.graph = new GraphClient(tokens, fetcher, undefined, ['Place.Read.All']);
  }

  list(type: PlaceType) {
    return this.graph.getAll<MicrosoftPlace>(`/places/microsoft.graph.${type}?$top=200`);
  }
}
