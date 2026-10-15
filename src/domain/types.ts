export type ObjectKind = 'desk' | 'meeting' | 'lounge' | 'plant';
export type WorkspaceStatus = 'available' | 'reserved' | 'occupied';
export interface PlanObject {
  id: string;
  kind: ObjectKind;
  name: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  capacity?: number;
  equipment?: string[];
}
export interface OfficeRoom {
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
  version: 2;
  rooms: OfficeRoom[];
  employees: Employee[];
  bookings: Booking[];
}
export type BookingInput = Omit<Booking, 'id' | 'createdAt' | 'checkedIn'>;
