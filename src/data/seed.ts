import type { OfficeData, OfficeRoom, PlanObject } from '../domain/types';
import { today } from '../domain/booking';

const desk = (prefix: string, n: number, x: number, y: number, rotation = 0): PlanObject => ({
  id: `${prefix}-${n}`,
  kind: 'desk',
  name: `${prefix}-${String(n).padStart(2, '0')}`,
  x,
  y,
  rotation,
  width: 76,
  height: 44,
  equipment: ['Monitor', 'Dockingstation', 'Ergonomischer Stuhl'],
});
const plant = (id: string, x: number, y: number): PlanObject => ({
  id,
  kind: 'plant',
  name: 'Pflanze',
  x,
  y,
  width: 28,
  height: 28,
  rotation: 0,
});
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
  const open: OfficeRoom = {
    id: 'open',
    name: 'Open Space',
    subtitle: 'Zusammen mehr bewegen',
    area: 180,
    width: 900,
    height: 570,
    objects: [],
  };
  let n = 1;
  for (const y of [126, 330])
    for (const x of [148, 390, 632]) {
      open.objects.push(
        desk('OS', n++, x, y, 180),
        desk('OS', n++, x + 84, y, 180),
        desk('OS', n++, x, y + 58),
        desk('OS', n++, x + 84, y + 58),
      );
    }
  open.objects.push(
    plant('op1', 70, 70),
    plant('op2', 830, 70),
    plant('op3', 70, 480),
    plant('op4', 830, 480),
  );
  const single: OfficeRoom = {
    id: 'single',
    name: 'Einzelbüro',
    subtitle: 'Platz für konzentriertes Arbeiten',
    area: 48,
    width: 900,
    height: 570,
    objects: [
      desk('EB', 1, 210, 150, 180),
      desk('EB', 2, 410, 150, 180),
      desk('EB', 3, 610, 150, 180),
      desk('EB', 4, 210, 350),
      desk('EB', 5, 410, 350),
      desk('EB', 6, 610, 350),
      plant('sp1', 90, 85),
      plant('sp2', 810, 480),
    ],
  };
  const hybrid: OfficeRoom = {
    id: 'hybrid',
    name: 'Hybrid Office',
    subtitle: 'Raum für Ideen und Begegnungen',
    area: 140,
    width: 900,
    height: 570,
    objects: [],
  };
  n = 1;
  for (const y of [148, 350])
    for (const x of [130, 300, 470])
      hybrid.objects.push(desk('HY', n++, x, y, 180), desk('HY', n++, x, y + 58));
  hybrid.objects.push(
    {
      id: 'meeting-1',
      kind: 'meeting',
      name: 'Denkraum',
      x: 740,
      y: 155,
      width: 210,
      height: 160,
      rotation: 0,
      capacity: 6,
      equipment: ['Bildschirm', 'Whiteboard', 'Videokonferenz'],
    },
    {
      id: 'meeting-2',
      kind: 'meeting',
      name: 'Ideenwerk',
      x: 740,
      y: 350,
      width: 210,
      height: 160,
      rotation: 0,
      capacity: 4,
      equipment: ['Bildschirm', 'Whiteboard'],
    },
    { id: 'lounge', kind: 'lounge', name: 'Lounge', x: 330, y: 500, width: 210, height: 64, rotation: 0 },
    plant('hp1', 70, 70),
    plant('hp2', 570, 490),
  );
  const rooms = [open, single, hybrid];
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
    version: 2,
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
