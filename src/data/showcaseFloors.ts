import type {
  FixtureKind,
  FurnitureKind,
  OfficeRoom,
  OpeningKind,
  PlanAnnotation,
  ZoneKind,
} from '../domain/types';
import { emptyDesign } from '../domain/design';
import { CATALOG } from '../domain/catalog';

export interface ShowcaseFloor {
  id: string;
  building: string;
  title: string;
  description: string;
  accent: string;
  room: OfficeRoom;
}

function createRoom(id: string, name: string, subtitle: string, width: number, height: number): OfficeRoom {
  return { ...emptyDesign(), id, name, subtitle, width, height, area: 0, layout: 'demo', objects: [] };
}

function wall(room: OfficeRoom, x1: number, y1: number, x2: number, y2: number, glass = false) {
  const id = `${room.id}-wall-${room.walls.length + 1}`;
  room.walls.push({
    id,
    name: glass ? 'Glastrennwand' : 'Wand',
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: glass ? 5 : 12,
    material: glass ? 'glass' : 'solid',
  });
  return id;
}

function opening(
  room: OfficeRoom,
  wallId: string,
  offset: number,
  width: number,
  kind: OpeningKind = 'door',
  hinge: 'left' | 'right' = 'left',
) {
  room.openings.push({
    id: `${room.id}-opening-${room.openings.length + 1}`,
    name: kind === 'window' ? 'Fenster' : kind === 'double-door' ? 'Doppeltür' : 'Tür',
    wallId,
    kind,
    offset,
    width,
    hinge,
    swing: 'inward',
  });
}

function zone(
  room: OfficeRoom,
  kind: ZoneKind,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const id = `${room.id}-zone-${room.zones.length + 1}`;
  room.zones.push({ id, name, kind, x, y, width, height, rotation: 0, showLabel: true });
  return id;
}

function furniture(
  room: OfficeRoom,
  kind: FurnitureKind,
  x: number,
  y: number,
  width?: number,
  height?: number,
  rotation = 0,
) {
  const item = CATALOG.find((entry) => entry.kind === kind);
  room.furniture.push({
    id: `${room.id}-furniture-${room.furniture.length + 1}`,
    name: item?.name ?? 'Einrichtung',
    kind,
    x,
    y,
    width: width ?? item?.width ?? 40,
    height: height ?? item?.height ?? 40,
    rotation,
  });
}

function fixture(room: OfficeRoom, kind: FixtureKind, x: number, y: number, width: number, height: number) {
  room.fixtures.push({
    id: `${room.id}-${kind}-${room.fixtures.length + 1}`,
    name: { elevator: 'Aufzug', stairs: 'Treppenhaus', entrance: 'Haupteingang', column: 'Stütze' }[kind],
    kind,
    x,
    y,
    width,
    height,
    rotation: 0,
  });
}

function label(room: OfficeRoom, text: string, x: number, y: number, width = 220, size = 15) {
  const annotation: PlanAnnotation = {
    id: `${room.id}-label-${room.annotations.length + 1}`,
    name: text,
    kind: 'label',
    text,
    x,
    y,
    width,
    height: 28,
    rotation: 0,
    fontSize: size,
    color: '#294f58',
  };
  room.annotations.push(annotation);
}

function desk(
  room: OfficeRoom,
  prefix: string,
  number: number,
  x: number,
  y: number,
  rotation = 0,
  groupId?: string,
  equipment = ['34-Zoll-Monitor', 'USB-C-Dock', 'Ergonomischer Stuhl'],
) {
  room.objects.push({
    id: `${room.id}-${prefix.toLowerCase()}-${number}`,
    name: `${prefix}-${String(number).padStart(2, '0')}`,
    kind: 'desk',
    x,
    y,
    width: 78,
    height: 46,
    rotation,
    groupId,
    equipment,
  });
  const radians = (rotation * Math.PI) / 180;
  furniture(room, 'office-chair', x - Math.sin(radians) * 49, y + Math.cos(radians) * 49, 30, 32, rotation);
}

function deskIslands(
  room: OfficeRoom,
  prefix: string,
  start: number,
  centers: Array<[number, number]>,
  desksPerIsland = 4,
) {
  let number = start;
  for (const [cx, cy] of centers) {
    const groupId = `${room.id}-${prefix.toLowerCase()}-island-${number}`;
    const columns = desksPerIsland / 2;
    for (let index = 0; index < desksPerIsland; index++) {
      const upper = index < columns;
      desk(
        room,
        prefix,
        number++,
        cx + ((index % columns) - (columns - 1) / 2) * 86,
        cy + (upper ? -31 : 31),
        upper ? 180 : 0,
        groupId,
      );
    }
    furniture(room, 'planter', cx, cy, Math.max(80, columns * 54), 22);
  }
  return number;
}

function meeting(
  room: OfficeRoom,
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  capacity: number,
  zoneId: string,
) {
  room.objects.push({
    id: `${room.id}-${id}`,
    name,
    kind: 'meeting',
    x,
    y,
    width,
    height,
    rotation: 0,
    capacity,
    zoneId,
    equipment: ['Videokonferenz', 'Wireless Presentation', 'Whiteboard'],
  });
}

function outerShell(room: OfficeRoom) {
  const top = wall(room, 30, 30, room.width - 30, 30);
  wall(room, room.width - 30, 30, room.width - 30, room.height - 30);
  const bottom = wall(room, 30, room.height - 30, room.width - 30, room.height - 30);
  wall(room, 30, 30, 30, room.height - 30);
  for (let offset = 110; offset < room.width - 170; offset += 210) opening(room, top, offset, 120, 'window');
  for (let offset = 150; offset < room.width - 170; offset += 250)
    opening(room, bottom, offset, 130, 'window');
}

function headquarters() {
  const room = createRoom(
    'showcase-hq',
    'Nordlicht Headquarters',
    'Repräsentative Zentrale · Berlin Mitte',
    2000,
    1200,
  );
  outerShell(room);
  zone(room, 'corridor', 'MAGISTRALE', 1000, 600, 1880, 130);
  const topHall = wall(room, 30, 520, 1970, 520, true);
  const bottomHall = wall(room, 30, 680, 1970, 680, true);
  for (const offset of [150, 460, 780, 1100, 1430, 1770]) opening(room, topHall, offset, 82, 'door');
  for (const offset of [180, 520, 880, 1220, 1580]) opening(room, bottomHall, offset, 88, 'door', 'right');
  for (const x of [310, 640, 970, 1300, 1640])
    wall(room, x, 30, x, 520, x === 640 || x === 970 || x === 1300);

  zone(room, 'office', 'GESCHÄFTSLEITUNG', 170, 275, 260, 450);
  zone(room, 'office', 'TEAM NORD', 475, 275, 290, 450);
  const board = zone(room, 'meeting', 'POLARIS · 12 PERSONEN', 805, 275, 300, 450);
  const conference = zone(room, 'meeting', 'AURORA · 8 PERSONEN', 1135, 275, 300, 450);
  const huddle = zone(room, 'meeting', 'KOMPASS · 4 PERSONEN', 1470, 275, 300, 450);
  zone(room, 'technical', 'VERTIKALE ERSCHLIESSUNG', 1805, 275, 300, 450);
  meeting(room, 'meeting-polaris', 'Polaris', 805, 275, 245, 165, 12, board);
  meeting(room, 'meeting-aurora', 'Aurora', 1135, 275, 215, 150, 8, conference);
  meeting(room, 'meeting-kompass', 'Kompass', 1470, 275, 150, 125, 4, huddle);
  fixture(room, 'elevator', 1735, 215, 105, 125);
  fixture(room, 'elevator', 1860, 215, 105, 125);
  fixture(room, 'stairs', 1800, 400, 230, 150);
  deskIslands(
    room,
    'HQ',
    1,
    [
      [140, 185],
      [140, 380],
    ],
    2,
  );
  deskIslands(
    room,
    'HQ',
    5,
    [
      [445, 180],
      [540, 370],
    ],
    4,
  );

  zone(room, 'office', 'OPEN SPACE WEST', 405, 920, 700, 440);
  zone(room, 'office', 'OPEN SPACE OST', 1115, 920, 650, 440);
  let next = deskIslands(
    room,
    'HQ',
    13,
    [
      [155, 805],
      [385, 805],
      [615, 805],
      [155, 1025],
      [385, 1025],
      [615, 1025],
    ],
    4,
  );
  next = deskIslands(
    room,
    'HQ',
    next,
    [
      [875, 805],
      [1105, 805],
      [1335, 805],
      [875, 1025],
      [1105, 1025],
      [1335, 1025],
    ],
    4,
  );
  // Vier ruhige Fokusplätze ergänzen die offenen Inseln auf rund 60 Arbeitsplätze.
  const focusWall = wall(room, 1450, 680, 1450, 1170, true);
  opening(room, focusWall, 105, 75);
  zone(room, 'office', 'FOKUS & TELEFON', 1565, 805, 200, 210);
  zone(room, 'kitchen', 'KÜCHE & FORUM', 1780, 820, 400, 250);
  zone(room, 'sanitary', 'WC DAMEN', 1545, 1045, 150, 180);
  zone(room, 'sanitary', 'WC HERREN', 1710, 1045, 150, 180);
  zone(room, 'sanitary', 'BARRIEREFREI', 1880, 1045, 150, 180);
  for (let index = 0; index < 4; index++)
    desk(room, 'HQ', next++, 1515 + (index % 2) * 105, 760 + Math.floor(index / 2) * 105, 90);
  furniture(room, 'kitchen', 1800, 735, 300, 45);
  furniture(room, 'round-table', 1720, 855, 85, 85);
  furniture(room, 'round-table', 1880, 855, 85, 85);
  furniture(room, 'toilet', 1545, 1060);
  furniture(room, 'toilet', 1710, 1060);
  furniture(room, 'accessible-wc', 1880, 1060, 88, 88);
  furniture(room, 'washbasin', 1610, 1115);
  furniture(room, 'washbasin', 1775, 1115);
  furniture(room, 'printer', 1395, 600);
  furniture(room, 'reception', 1000, 610, 190, 62);
  furniture(room, 'sofa', 820, 605, 145, 52);
  furniture(room, 'sofa', 1180, 605, 145, 52, 180);
  for (const [x, y] of [
    [70, 80],
    [620, 610],
    [1380, 610],
    [740, 1120],
    [1430, 1120],
    [1950, 650],
  ])
    furniture(room, 'plant-large', x, y);
  label(room, 'EMPFANG', 1000, 555, 180, 13);
  label(room, 'Keine baurechtliche oder rettungswegtechnische Prüfung', 1000, 1160, 520, 10);
  return room;
}

function creativeCampus() {
  const room = createRoom(
    'showcase-creative',
    'Creative Campus',
    'Agentur, Coworking und Ideenlabor · Hamburg',
    1800,
    1100,
  );
  outerShell(room);
  zone(room, 'corridor', 'CREATIVE SPINE', 900, 520, 1680, 110);
  const spineTop = wall(room, 30, 455, 1770, 455, true);
  const spineBottom = wall(room, 30, 585, 1770, 585, true);
  for (const offset of [170, 500, 850, 1200, 1540]) opening(room, spineTop, offset, 88);
  for (const offset of [190, 540, 900, 1260, 1580]) opening(room, spineBottom, offset, 88, 'door', 'right');
  for (const x of [390, 760, 1140, 1460]) wall(room, x, 30, x, 455, x !== 1460);
  zone(room, 'meeting', 'MAKER LAB', 210, 240, 330, 370);
  const workshop = zone(room, 'meeting', 'WORKSHOP STUDIO', 575, 240, 340, 370);
  const project = zone(room, 'meeting', 'PROJEKTRAUM', 950, 240, 350, 370);
  zone(room, 'office', 'QUIET LIBRARY', 1300, 240, 280, 370);
  zone(room, 'technical', 'CORE', 1615, 240, 270, 370);
  meeting(room, 'meeting-workshop', 'Workshop Studio', 575, 245, 245, 170, 10, workshop);
  meeting(room, 'meeting-project', 'Projektraum', 950, 245, 210, 150, 8, project);
  furniture(room, 'conference-table', 210, 230, 220, 95);
  furniture(room, 'whiteboard', 340, 150, 130, 15, 90);
  fixture(room, 'elevator', 1555, 190, 105, 125);
  fixture(room, 'stairs', 1680, 250, 130, 180);

  zone(room, 'office', 'FLEX DESKS', 620, 815, 1120, 400);
  let next = deskIslands(
    room,
    'CC',
    1,
    [
      [170, 710],
      [400, 710],
      [630, 710],
      [860, 710],
      [170, 915],
      [400, 915],
      [630, 915],
      [860, 915],
    ],
    4,
  );
  zone(room, 'lounge', 'CAMPUS LOUNGE', 1220, 790, 500, 350);
  furniture(room, 'rug', 1190, 790, 280, 190);
  furniture(room, 'sofa', 1120, 745, 150, 55);
  furniture(room, 'sofa', 1310, 745, 150, 55, 180);
  furniture(room, 'coffee-table', 1215, 810, 80, 50);
  for (const [x, y, r] of [
    [1080, 875, 90],
    [1370, 875, 270],
  ] as Array<[number, number, number]>)
    furniture(room, 'armchair', x, y, 55, 55, r);
  const lowerDivider = wall(room, 1460, 585, 1460, 1070, true);
  opening(room, lowerDivider, 110, 80);
  zone(room, 'kitchen', 'COMMUNITY KITCHEN', 1615, 750, 270, 280);
  zone(room, 'office', 'RETREAT PODS', 1615, 970, 270, 150);
  furniture(room, 'kitchen', 1615, 650, 235, 45);
  furniture(room, 'round-table', 1560, 800, 72, 72);
  furniture(room, 'round-table', 1670, 800, 72, 72);
  for (let index = 0; index < 8; index++)
    desk(room, 'CC', next++, 1190 + (index % 4) * 82, 970 + Math.floor(index / 4) * 65, index < 4 ? 0 : 180);
  for (const [x, y] of [
    [80, 630],
    [1000, 620],
    [1410, 620],
    [1050, 1020],
    [1740, 1030],
  ])
    furniture(room, 'plant-large', x, y);
  furniture(room, 'printer', 1035, 520);
  label(room, 'IDEEN WERDEN RAUM', 900, 515, 300, 13);
  return room;
}

function businessCenter() {
  const room = createRoom(
    'showcase-business',
    'Business Center',
    'Klassische Bürowelt mit klarer Struktur · Frankfurt',
    1600,
    1000,
  );
  outerShell(room);
  zone(room, 'corridor', 'ZENTRALER FLUR', 800, 500, 1480, 120);
  const upper = wall(room, 30, 430, 1570, 430, true);
  const lower = wall(room, 30, 570, 1570, 570, true);
  for (const offset of [140, 390, 650, 920, 1190, 1450]) opening(room, upper, offset, 76);
  for (const offset of [155, 430, 730, 1020, 1320]) opening(room, lower, offset, 82, 'door', 'right');
  for (const x of [280, 540, 800, 1080, 1340]) wall(room, x, 30, x, 430, x === 800);
  zone(room, 'office', 'GESCHÄFTSFÜHRUNG', 155, 230, 230, 350);
  zone(room, 'office', 'FINANZEN', 410, 230, 240, 350);
  zone(room, 'office', 'BERATUNG I', 670, 230, 240, 350);
  const board = zone(room, 'meeting', 'BOARDROOM', 940, 230, 250, 350);
  const meetingSmall = zone(room, 'meeting', 'BESPRECHUNG', 1210, 230, 240, 350);
  zone(room, 'technical', 'ERSCHLIESSUNG', 1455, 230, 200, 350);
  meeting(room, 'meeting-board', 'Boardroom', 940, 230, 200, 145, 10, board);
  meeting(room, 'meeting-small', 'Besprechung Main', 1210, 230, 160, 125, 6, meetingSmall);
  fixture(room, 'elevator', 1415, 180, 95, 115);
  fixture(room, 'stairs', 1515, 265, 80, 175);
  deskIslands(
    room,
    'BC',
    1,
    [
      [150, 170],
      [410, 170],
      [410, 330],
      [670, 170],
      [670, 330],
    ],
    2,
  );

  zone(room, 'office', 'TEAMFLÄCHE SÜD', 520, 770, 920, 350);
  let next = deskIslands(
    room,
    'BC',
    11,
    [
      [160, 680],
      [400, 680],
      [640, 680],
      [160, 875],
      [400, 875],
      [640, 875],
    ],
    4,
  );
  zone(room, 'lounge', 'EMPFANG & WARTEBEREICH', 950, 735, 280, 250);
  furniture(room, 'reception', 870, 620, 165, 60);
  furniture(room, 'sofa', 1010, 700, 140, 52);
  furniture(room, 'coffee-table', 1010, 775, 70, 45);
  zone(room, 'storage', 'ARCHIV', 1170, 735, 150, 250);
  zone(room, 'technical', 'TECHNIK', 1340, 735, 160, 250);
  zone(room, 'sanitary', 'SANITÄR', 1510, 735, 150, 250);
  const service = wall(room, 1080, 570, 1080, 970, false);
  opening(room, service, 90, 75);
  wall(room, 1260, 570, 1260, 970);
  wall(room, 1420, 570, 1420, 970);
  furniture(room, 'shelf', 1170, 655, 110, 30);
  furniture(room, 'shelf', 1170, 735, 110, 30);
  furniture(room, 'printer', 1335, 690);
  furniture(room, 'toilet', 1490, 690);
  furniture(room, 'washbasin', 1540, 850);
  for (const [x, y] of [
    [70, 80],
    [1040, 930],
    [1230, 930],
    [1390, 930],
    [1550, 930],
  ])
    furniture(room, 'plant-large', x, y);
  // Zwei Fokusplätze schließen den Plan mit insgesamt 36 Arbeitsplätzen ab.
  desk(room, 'BC', next++, 950, 875, 90);
  desk(room, 'BC', next, 1030, 875, 90);
  label(room, 'EMPFANG', 880, 520, 180, 13);
  return room;
}

export function showcaseFloors(): ShowcaseFloor[] {
  return [
    {
      id: 'nordlicht-headquarters',
      building: 'Berlin · Nordlicht Headquarters',
      title: 'Nordlicht Headquarters',
      description:
        'Eine großzügige Unternehmenszentrale mit rund 60 Arbeitsplätzen, drei Konferenzwelten, Fokusbereichen und vollständigem Servicekern.',
      accent: '#137d7e',
      room: headquarters(),
    },
    {
      id: 'creative-campus',
      building: 'Hamburg · Creative Campus',
      title: 'Creative Campus',
      description:
        'Flexible Teaminseln, Workshopflächen, Quiet Library und eine atmosphärische Campus-Lounge für kreatives Arbeiten.',
      accent: '#7257a8',
      room: creativeCampus(),
    },
    {
      id: 'business-center',
      building: 'Frankfurt · Business Center',
      title: 'Business Center',
      description:
        'Klassische Büros, repräsentativer Empfang, Boardroom und klar erschlossene Teamflächen für 36 Arbeitsplätze.',
      accent: '#9a6b2f',
      room: businessCenter(),
    },
  ];
}

export function cloneShowcaseFloor(source: OfficeRoom): OfficeRoom {
  const copy = structuredClone(source);
  const roomId = crypto.randomUUID();
  const copyTag = roomId.slice(0, 4).toUpperCase();
  const ids = new Map<string, string>();
  const nextId = (id: string) => {
    const generated = crypto.randomUUID();
    ids.set(id, generated);
    return generated;
  };
  const groups = new Map<string, string>();
  const group = (id?: string) => {
    if (!id) return undefined;
    if (!groups.has(id)) groups.set(id, crypto.randomUUID());
    return groups.get(id);
  };
  copy.id = roomId;
  copy.name = `${source.name} · Eigene Kopie`;
  copy.subtitle = 'Aus der OFFICEFLOW Showcase-Galerie übernommen';
  copy.layout = 'custom';
  copy.walls = copy.walls.map((item) => ({ ...item, id: nextId(item.id), groupId: group(item.groupId) }));
  copy.openings = copy.openings.map((item) => ({
    ...item,
    id: nextId(item.id),
    wallId: ids.get(item.wallId) ?? item.wallId,
    groupId: group(item.groupId),
  }));
  copy.zones = copy.zones.map((item) => ({ ...item, id: nextId(item.id), groupId: group(item.groupId) }));
  copy.objects = copy.objects.map((item) => ({
    ...item,
    id: nextId(item.id),
    name: `${source.id.replace('showcase-', '').toUpperCase()}-${copyTag}-${item.name}`,
    zoneId: item.zoneId ? ids.get(item.zoneId) : undefined,
    groupId: group(item.groupId),
  }));
  copy.furniture = copy.furniture.map((item) => ({
    ...item,
    id: nextId(item.id),
    groupId: group(item.groupId),
  }));
  copy.fixtures = copy.fixtures.map((item) => ({
    ...item,
    id: nextId(item.id),
    groupId: group(item.groupId),
  }));
  copy.annotations = copy.annotations.map((item) => ({
    ...item,
    id: nextId(item.id),
    groupId: group(item.groupId),
  }));
  return copy;
}
