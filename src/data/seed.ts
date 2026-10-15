import type { OfficeData } from '../domain/types';
import { today } from '../domain/booking';
import { presentationRooms } from './presentationRooms';
const people = [
  ['Anna Weber', 'Produkt & Design', '#c5d7ca'],
  ['Max Hoffmann', 'Entwicklung', '#cbd3e6'],
  ['Sophie Becker', 'Marketing', '#ead3bd'],
  ['Lukas Fischer', 'Entwicklung', '#d1c8e5'],
  ['Laura Wagner', 'Personal', '#e4c9cf'],
  ['Felix Schneider', 'Vertrieb', '#c0dce0'],
  ['Marie Schulz', 'Produkt & Design', '#dbd7b6'],
  ['Jonas Richter', 'Entwicklung', '#cad5c3'],
  ['Lena Koch', 'Marketing', '#d2c4b8'],
  ['Paul Neumann', 'Vertrieb', '#c2cfe2'],
  ['Julia Braun', 'Personal', '#e7cfc4'],
  ['Tim Krüger', 'Entwicklung', '#c9c5df'],
  ['Clara Wolf', 'Produkt & Design', '#c4d8cc'],
  ['David Schmitt', 'Vertrieb', '#ddd2bf'],
  ['Emma Zimmermann', 'Marketing', '#d3c9df'],
  ['Ben Hartmann', 'Entwicklung', '#bbd6d7'],
  ['Mia Schwarz', 'Personal', '#dfc4ca'],
  ['Leon Bergmann', 'Produkt & Design', '#c8d2b6'],
  ['Nina Roth', 'Marketing', '#c6ccdf'],
  ['Jan Sommer', 'Vertrieb', '#e3cdb6'],
  ['Sarah König', 'Entwicklung', '#c1d5cf'],
  ['Tom Albrecht', 'Produkt & Design', '#d4c8df'],
];
export function createSeed(): OfficeData {
  const rooms = presentationRooms();
  const [open, single, hybrid] = rooms;
  const employees = people.map(([name, department, color], i) => ({
    id: `e${i + 1}`,
    name,
    department,
    color,
    initials: name
      .split(' ')
      .map((p) => p[0])
      .join(''),
  }));
  const booked = [
    ...open.objects.filter((o) => o.kind === 'desk').slice(0, 12),
    ...single.objects.filter((o) => o.kind === 'desk').slice(0, 2),
    ...hybrid.objects.filter((o) => o.kind === 'desk').slice(0, 4),
    hybrid.objects.find((o) => o.kind === 'meeting')!,
  ];
  return {
    version: 3,
    rooms,
    employees,
    bookings: booked.map((o, i) => ({
      id: `seed-${i}`,
      objectId: o.id,
      roomId: rooms.find((r) => r.objects.includes(o))!.id,
      employeeId: employees[i].id,
      date: today(),
      start: i % 3 === 0 ? '09:00' : '08:00',
      end: i % 4 === 0 ? '13:00' : '18:00',
      checkedIn: i < 8 || (i >= 12 && i < 16),
      createdAt: new Date().toISOString(),
    })),
  };
}
