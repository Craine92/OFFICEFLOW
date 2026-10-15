export type WorkspaceStatus = 'available' | 'reserved' | 'occupied';
export type ObjectKind = 'desk' | 'meeting';
export type LayerId = 'background' | 'architecture' | 'furniture' | 'resources' | 'annotations';
export interface LayerState {
  visible: boolean;
  locked: boolean;
}
export type PlanLayers = Record<LayerId, LayerState>;
export interface Point {
  x: number;
  y: number;
}
export interface ElementGeometry {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  groupId?: string;
  color?: string;
  opacity?: number;
}
/** Fachliche Ressource: ausschließlich diese Objekte sind buchbar. */
export interface PlanObject extends ElementGeometry {
  kind: ObjectKind;
  variant?: 'standard' | 'corner' | 'round';
  capacity?: number;
  equipment?: string[];
  zoneId?: string;
}
export type FurnitureKind =
  | 'office-chair'
  | 'visitor-chair'
  | 'conference-chair'
  | 'pedestal'
  | 'cabinet'
  | 'shelf'
  | 'printer'
  | 'monitor'
  | 'whiteboard'
  | 'conference-table'
  | 'round-table'
  | 'sofa'
  | 'armchair'
  | 'coffee-table'
  | 'kitchen'
  | 'sink'
  | 'coffee-machine'
  | 'reception'
  | 'coat-rack'
  | 'toilet'
  | 'washbasin'
  | 'accessible-wc'
  | 'plant-small'
  | 'plant-large'
  | 'planter'
  | 'rug'
  | 'divider'
  | 'lamp';
export interface FurnitureElement extends ElementGeometry {
  kind: FurnitureKind;
}
export type FixtureKind = 'elevator' | 'stairs' | 'entrance' | 'column';
export interface BuildingFixture extends ElementGeometry {
  kind: FixtureKind;
}
export type ZoneKind =
  'office' | 'meeting' | 'corridor' | 'lounge' | 'kitchen' | 'sanitary' | 'technical' | 'storage';
export interface RoomZone extends ElementGeometry {
  kind: ZoneKind;
  showLabel: boolean;
}
export interface WallSegment {
  id: string;
  name: string;
  start: Point;
  end: Point;
  thickness: number;
  material: 'solid' | 'glass';
  groupId?: string;
  color?: string;
}
export type OpeningKind = 'door' | 'double-door' | 'sliding-door' | 'window';
export interface WallOpening {
  id: string;
  name: string;
  wallId: string;
  kind: OpeningKind;
  offset: number;
  width: number;
  hinge: 'left' | 'right';
  swing: 'inward' | 'outward';
  groupId?: string;
}
export interface PlanAnnotation extends ElementGeometry {
  kind: 'label' | 'measure';
  text: string;
  fontSize: number;
  end?: Point;
}
export interface Calibration {
  start: Point;
  end: Point;
  meters: number;
}
export interface FloorDesign {
  walls: WallSegment[];
  openings: WallOpening[];
  zones: RoomZone[];
  furniture: FurnitureElement[];
  fixtures: BuildingFixture[];
  annotations: PlanAnnotation[];
  layers: PlanLayers;
  calibration?: Calibration;
}
export interface OfficeRoom extends FloorDesign {
  id: string;
  name: string;
  subtitle: string;
  area: number;
  width: number;
  height: number;
  objects: PlanObject[];
  layout?: 'demo' | 'custom';
  background?: PlanBackground;
}
export interface PlanBackground {
  assetId: string;
  name: string;
  mime: string;
  page?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}
export interface PlanAsset {
  id: string;
  name: string;
  mime: string;
  source: Blob;
  image: Blob;
  width: number;
  height: number;
  page?: number;
  pageCount?: number;
}
export interface Employee {
  id: string;
  name: string;
  department: string;
  initials: string;
  color: string;
}
export interface Booking {
  id: string;
  objectId: string;
  roomId: string;
  employeeId: string;
  date: string;
  start: string;
  end: string;
  checkedIn: boolean;
  createdAt: string;
}
export interface OfficeData {
  version: 3;
  rooms: OfficeRoom[];
  employees: Employee[];
  bookings: Booking[];
}
export type BookingInput = Omit<Booking, 'id' | 'createdAt' | 'checkedIn'>;
export type ElementType = 'resource' | 'furniture' | 'fixture' | 'zone' | 'wall' | 'opening' | 'annotation';
export interface SelectedElement {
  type: ElementType;
  id: string;
}
export type EditorTool =
  | 'select'
  | 'pan'
  | 'wall'
  | 'zone'
  | 'door'
  | 'double-door'
  | 'sliding-door'
  | 'window'
  | 'label'
  | 'measure'
  | 'calibrate';
