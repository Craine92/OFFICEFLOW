import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Group, Text, Arc, Image as KonvaImage } from 'react-konva';
import { Expand, Minus, Plus, Scan, X, MousePointer2, RefreshCw } from 'lucide-react';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Booking, OfficeRoom, PlanObject, WorkspaceStatus } from '../domain/types';
import { statusFor } from '../domain/booking';
import { Button } from './ui/button';
import { Furniture } from './Furniture';
import { usePlanImage } from '../hooks/usePlanImage';

export function FloorPlan({
  room,
  bookings,
  date,
  selectedId,
  onSelect,
  editor = false,
  onMove,
  filter = 'all',
  timeStart = '09:00',
  timeEnd = '18:00',
  grid = false,
  snap = true,
  collisionIds = [],
}: {
  room: OfficeRoom;
  bookings: Booking[];
  date: string;
  selectedId?: string;
  onSelect: (object: PlanObject) => void;
  editor?: boolean;
  onMove?: (id: string, x: number, y: number) => void;
  filter?: WorkspaceStatus | 'all';
  timeStart?: string;
  timeEnd?: string;
  grid?: boolean;
  snap?: boolean;
  collisionIds?: string[];
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 430 });
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const [expanded, setExpanded] = useState(false);
  const background = usePlanImage(room.background?.assetId);
  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setView({ zoom: 1, x: 0, y: 0 });
  }, [room.id, room.width, room.height]);
  useEffect(() => {
    if (!expanded) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [expanded]);
  const fit = Math.min(size.width / room.width, size.height / room.height) * 0.96;
  const scale = fit * view.zoom;
  const base = { x: (size.width - room.width * scale) / 2, y: (size.height - room.height * scale) / 2 };
  function zoomTo(next: number, pointer = { x: size.width / 2, y: size.height / 2 }) {
    const zoom = Math.min(5, Math.max(0.3, Math.round(next * 1000) / 1000));
    const world = { x: (pointer.x - base.x - view.x) / scale, y: (pointer.y - base.y - view.y) / scale };
    const nextScale = fit * zoom;
    setView({
      zoom,
      x: pointer.x - world.x * nextScale - (size.width - room.width * nextScale) / 2,
      y: pointer.y - world.y * nextScale - (size.height - room.height * nextScale) / 2,
    });
  }
  function wheel(e: KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    zoomTo(
      view.zoom * (e.evt.deltaY > 0 ? 0.94 : 1.06),
      e.target.getStage()?.getPointerPosition() ?? undefined,
    );
  }
  const bg = room.background;
  const custom = room.layout === 'custom';
  const gridStep = 25;
  return (
    <div
      className={`floorplan ${expanded ? 'floorplan-expanded' : ''}`}
      data-background-state={
        bg ? (background.error ? 'error' : background.image ? 'ready' : 'loading') : 'none'
      }
    >
      <div className="plan-annotation">
        <span className="plan-floor-label">
          {custom ? 'EIGENER GRUNDRISS' : 'BERLIN MITTE / 2. OBERGESCHOSS'}
          <span>/</span>
          {room.name.toUpperCase()}
        </span>
        <span>{room.area > 0 ? `${room.area} m²` : `${room.width} × ${room.height} Einheiten`}</span>
      </div>
      {bg && (background.error || background.loading) && (
        <div
          className={`plan-asset-notice ${background.error ? 'is-error' : ''}`}
          role={background.error ? 'alert' : 'status'}
        >
          {background.error ?? 'Ihr Grundriss wird lokal geladen …'}
          {background.error && (
            <Button size="sm" variant="outline" onClick={background.retry}>
              <RefreshCw size={12} />
              Erneut laden
            </Button>
          )}
        </div>
      )}
      <div className="canvas-holder" ref={holder} aria-label={`Interaktiver Grundriss ${room.name}`}>
        <Stage
          width={size.width}
          height={size.height}
          scaleX={scale}
          scaleY={scale}
          x={base.x + view.x}
          y={base.y + view.y}
          draggable
          onWheel={wheel}
          onDragEnd={(e) => {
            if (e.target === e.target.getStage())
              setView((v) => ({ ...v, x: e.target.x() - base.x, y: e.target.y() - base.y }));
          }}
        >
          <Layer>
            {custom ? (
              <Rect
                width={room.width}
                height={room.height}
                fill="#fdfdfb"
                stroke="#bcc7bd"
                strokeWidth={1}
                shadowColor="#475a4d"
                shadowBlur={18}
                shadowOpacity={0.08}
              />
            ) : (
              <Group scaleX={room.width / 900} scaleY={room.height / 570} listening={false}>
                <Rect
                  x={40}
                  y={42}
                  width={820}
                  height={482}
                  fill="#fdfdfb"
                  stroke="#a5afa8"
                  strokeWidth={5}
                  shadowColor="#475a4d"
                  shadowBlur={18}
                  shadowOpacity={0.08}
                  shadowOffsetY={6}
                  cornerRadius={2}
                />
                {[150, 390, 630].map((x) => (
                  <Group key={x}>
                    <Line points={[x, 42, x + 120, 42]} stroke="#e7f0ec" strokeWidth={8} />
                    <Line points={[x, 42, x + 120, 42]} stroke="#9eb9b0" strokeWidth={1.5} />
                    <Line points={[x + 60, 39, x + 60, 45]} stroke="#91aaa1" strokeWidth={2} />
                  </Group>
                ))}
                <Text
                  x={63}
                  y={64}
                  text={room.name.toUpperCase()}
                  fontSize={10}
                  fill="#8b9690"
                  letterSpacing={2}
                />
                {room.id === 'open' && (
                  <>
                    <Line points={[90, 282, 810, 282]} stroke="#ecefe9" dash={[4, 6]} />
                    <Text
                      x={356}
                      y={269}
                      width={190}
                      text="GEMEINSAM ARBEITEN"
                      align="center"
                      fontSize={8}
                      letterSpacing={2}
                      fill="#bdc5be"
                    />
                  </>
                )}
                <Line points={[412, 524, 484, 524]} stroke="#fdfdfb" strokeWidth={9} />
                <Line points={[414, 524, 414, 460]} stroke="#a5afa8" strokeWidth={2} />
                <Arc
                  x={414}
                  y={524}
                  innerRadius={63}
                  outerRadius={64}
                  angle={90}
                  rotation={270}
                  stroke="#bdc6bf"
                  strokeWidth={0.5}
                />
                <Text x={420} y={542} text="EINGANG" fontSize={9} fill="#8b9690" letterSpacing={2} />
              </Group>
            )}
            {bg && background.image && (
              <Group clipX={0} clipY={0} clipWidth={room.width} clipHeight={room.height} listening={false}>
                <KonvaImage
                  image={background.image}
                  x={bg.x}
                  y={bg.y}
                  width={bg.width}
                  height={bg.height}
                  offsetX={bg.width / 2}
                  offsetY={bg.height / 2}
                  rotation={bg.rotation}
                  opacity={bg.opacity}
                />
              </Group>
            )}
            {grid && (
              <Group listening={false}>
                {Array.from({ length: Math.floor(room.width / gridStep) + 1 }, (_, i) => (
                  <Line
                    key={`x${i}`}
                    points={[i * gridStep, 0, i * gridStep, room.height]}
                    stroke="#5d897832"
                    strokeWidth={0.7 / scale}
                  />
                ))}
                {Array.from({ length: Math.floor(room.height / gridStep) + 1 }, (_, i) => (
                  <Line
                    key={`y${i}`}
                    points={[0, i * gridStep, room.width, i * gridStep]}
                    stroke="#5d897832"
                    strokeWidth={0.7 / scale}
                  />
                ))}
              </Group>
            )}
            {room.objects.map((o) => {
              const status = statusFor(bookings, o.id, date, timeStart, timeEnd);
              return (
                <Furniture
                  key={o.id}
                  room={room}
                  object={o}
                  status={status}
                  selected={selectedId === o.id}
                  editor={editor}
                  snap={snap}
                  warning={collisionIds.includes(o.id)}
                  dimmed={filter !== 'all' && ['desk', 'meeting'].includes(o.kind) && status !== filter}
                  onSelect={() => {
                    if (editor || ['desk', 'meeting'].includes(o.kind)) onSelect(o);
                  }}
                  onMove={(x, y) => onMove?.(o.id, x, y)}
                />
              );
            })}
          </Layer>
        </Stage>
      </div>
      {custom && !room.objects.length && editor && (
        <p className="plan-empty-hint">
          Ihr Grundriss ist bereit. Fügen Sie rechts Arbeitsplätze oder Meetingräume hinzu.
        </p>
      )}
      <div className="plan-bottom">
        <span className="plan-hint">
          <MousePointer2 size={13} />
          {editor
            ? `Objekte verschieben · ${snap ? '5er-Raster aktiv' : 'freies Platzieren'}`
            : 'Arbeitsplatz anklicken, um zu buchen'}
        </span>
        <div className="plan-controls">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Verkleinern"
            disabled={view.zoom <= 0.3}
            onClick={() => zoomTo(view.zoom - 0.15)}
          >
            <Minus size={16} />
          </Button>
          <span>{Math.round(view.zoom * 100)} %</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Vergrößern"
            disabled={view.zoom >= 5}
            onClick={() => zoomTo(view.zoom + 0.15)}
          >
            <Plus size={16} />
          </Button>
          <span className="control-divider" />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Plan einpassen"
            onClick={() => setView({ zoom: 1, x: 0, y: 0 })}
          >
            <Scan size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={expanded ? 'Großansicht schließen' : 'Plan in Großansicht öffnen'}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <X size={16} /> : <Expand size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
