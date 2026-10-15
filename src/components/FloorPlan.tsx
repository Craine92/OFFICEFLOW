import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Stage,
  Layer,
  Rect,
  Line,
  Group,
  Text,
  Arc,
  Circle,
  Image as KonvaImage,
  Transformer,
  Arrow,
} from 'react-konva';
import Konva from 'konva';
import { Expand, Minus, Plus, Scan, X, MousePointer2, RefreshCw } from 'lucide-react';
import type { KonvaEventObject } from 'konva/lib/Node';
import type {
  Booking,
  OfficeRoom,
  PlanObject,
  WorkspaceStatus,
  EditorTool,
  Point,
  ElementGeometry,
} from '../domain/types';
import { statusFor } from '../domain/booking';
import {
  elementGeometry,
  elementLayer,
  selectedElement,
  isElementEditable,
  wallSolidSegments,
  wallAngle,
  openingPosition,
  formatLength,
  snapPoint,
  snapElementPosition,
  planArea,
} from '../domain/design';
import { Button } from './ui/button';
import { Furniture } from './Furniture';
import { FurnitureSymbol, FixtureSymbol, symbolSize } from './PlanSymbols';
import { usePlanImage } from '../hooks/usePlanImage';

export interface DesignerInteraction {
  selected: string[];
  tool: EditorTool;
  start?: Point;
  onSelect: (ids: string[], add: boolean) => void;
  onMove: (id: string, x: number, y: number) => void;
  onGeometry: (id: string, patch: Partial<ElementGeometry>) => void;
  onPoint: (point: Point) => void;
  onWallEnd: (id: string, end: 'start' | 'end', point: Point) => void;
  onContext: (id: string) => void;
}
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
  designer,
  thumbnail = false,
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
  designer?: DesignerInteraction;
  thumbnail?: boolean;
}) {
  const holder = useRef<HTMLDivElement>(null),
    stage = useRef<Konva.Stage>(null),
    transformer = useRef<Konva.Transformer>(null),
    target = useRef<Konva.Rect>(null);
  const [size, setSize] = useState({ width: 800, height: 430 }),
    [view, setView] = useState({ zoom: 1, x: 0, y: 0 }),
    [expanded, setExpanded] = useState(false),
    [space, setSpace] = useState(false),
    [pointer, setPointer] = useState<Point>(),
    [marquee, setMarquee] = useState<{ start: Point; end: Point }>();
  const background = usePlanImage(room.background?.assetId),
    selected = designer?.selected ?? (selectedId ? [selectedId] : []);
  const interactive = editor && !thumbnail,
    tool = designer?.tool ?? 'select',
    pan = space || tool === 'pan';
  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    const ob = new ResizeObserver(([e]) =>
      setSize({ width: e.contentRect.width, height: e.contentRect.height }),
    );
    ob.observe(element);
    return () => ob.disconnect();
  }, []);
  useEffect(() => setView({ zoom: 1, x: 0, y: 0 }), [room.id, room.width, room.height]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        interactive &&
        !(e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))
      ) {
        e.preventDefault();
        setSpace(true);
      }
      if (e.key === 'Escape') setExpanded(false);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpace(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', () => setSpace(false));
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [interactive]);
  const geometry = selected.length === 1 ? elementGeometry(room, selected[0]) : undefined;
  const ref = selected.length === 1 ? selectedElement(room, selected[0]) : undefined;
  const editable = geometry && isElementEditable(room, geometry.id) && tool === 'select';
  useEffect(() => {
    transformer.current?.nodes(
      target.current && editable && ref?.type !== 'wall' && ref?.type !== 'opening' ? [target.current] : [],
    );
  }, [geometry, editable, ref?.type]);
  const fit = Math.min(size.width / room.width, size.height / room.height) * (thumbnail ? 0.94 : 0.92),
    scale = fit * view.zoom,
    base = { x: (size.width - room.width * scale) / 2, y: (size.height - room.height * scale) / 2 };
  const world = (): Point => {
    const p = stage.current?.getPointerPosition() ?? { x: 0, y: 0 };
    return { x: (p.x - base.x - view.x) / scale, y: (p.y - base.y - view.y) / scale };
  };
  function zoomTo(next: number, p = { x: size.width / 2, y: size.height / 2 }) {
    const zoom = Math.min(8, Math.max(0.25, next)),
      w = { x: (p.x - base.x - view.x) / scale, y: (p.y - base.y - view.y) / scale },
      ns = fit * zoom;
    setView({
      zoom,
      x: p.x - w.x * ns - (size.width - room.width * ns) / 2,
      y: p.y - w.y * ns - (size.height - room.height * ns) / 2,
    });
  }
  function clickElement(id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) {
    if (!interactive) return;
    e.cancelBubble = true;
    if (tool === 'select' && !pan)
      designer?.onSelect(
        [id],
        ('shiftKey' in e.evt && e.evt.shiftKey) || ('ctrlKey' in e.evt && e.evt.ctrlKey),
      );
    else if (!pan) designer?.onPoint(snapPoint(world(), room, snap));
  }
  function item(id: string, children: ReactNode, customGeometry?: ElementGeometry) {
    const ref = selectedElement(room, id)!;
    if (!room.layers[elementLayer(ref.type)].visible) return null;
    const g = customGeometry ?? elementGeometry(room, id)!;
    const locked = !isElementEditable(room, id),
      active = selected.includes(id);
    return (
      <Group
        key={id}
        id={`element-${id}`}
        name="plan-element"
        x={g.x}
        y={g.y}
        rotation={g.rotation}
        opacity={g.opacity ?? 1}
        draggable={interactive && !locked && !pan && tool === 'select'}
        onClick={(e) => clickElement(id, e)}
        onTap={(e) => clickElement(id, e)}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          e.cancelBubble = true;
          if (interactive && !locked) designer?.onContext(id);
        }}
        onDragStart={(e) => {
          e.cancelBubble = true;
          if (!active) designer?.onSelect([id], false);
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          const p = snapElementPosition(room, id, { x: e.target.x(), y: e.target.y() }, snap, [
            ...selected,
            id,
          ]);
          e.target.position({ x: g.x, y: g.y });
          designer ? designer.onMove(id, p.x, p.y) : onMove?.(id, p.x, p.y);
        }}
      >
        <Rect x={-g.width / 2} y={-g.height / 2} width={g.width} height={g.height} fill="transparent" />
        {children}
        {interactive && (active || collisionIds.includes(id)) && (
          <Rect
            listening={false}
            x={-g.width / 2 - 3}
            y={-g.height / 2 - 3}
            width={g.width + 6}
            height={g.height + 6}
            stroke={collisionIds.includes(id) ? '#bd6c51' : '#247f81'}
            strokeWidth={1.4 / scale}
            dash={active ? undefined : [5, 3]}
          />
        )}
      </Group>
    );
  }
  return (
    <div
      className={`floorplan ${expanded ? 'floorplan-expanded' : ''} ${thumbnail ? 'plan-thumbnail' : ''}`}
      data-background-state={
        room.background ? (background.error ? 'error' : background.image ? 'ready' : 'loading') : 'none'
      }
    >
      {!thumbnail && (
        <div className="plan-annotation">
          <span className="plan-floor-label">
            {room.layout === 'custom' ? 'EIGENER GRUNDRISS' : 'NORDLICHT / 2. OBERGESCHOSS'}
            <span>/</span>
            {room.name.toUpperCase()}
          </span>
          <span>{planArea(room)}</span>
        </div>
      )}
      {room.background && (background.error || background.loading) && (
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
      <div
        className="canvas-holder"
        ref={holder}
        aria-label={`Interaktiver Grundriss ${room.name}`}
        style={{
          cursor: thumbnail
            ? 'default'
            : pan
              ? 'grab'
              : interactive && tool !== 'select'
                ? 'crosshair'
                : 'default',
        }}
      >
        <Stage
          ref={stage}
          width={size.width}
          height={size.height}
          x={base.x + view.x}
          y={base.y + view.y}
          scaleX={scale}
          scaleY={scale}
          draggable={!thumbnail && (!interactive || pan)}
          onWheel={(e) => {
            if (thumbnail) return;
            e.evt.preventDefault();
            zoomTo(
              view.zoom * (e.evt.deltaY > 0 ? 0.92 : 1.08),
              e.target.getStage()?.getPointerPosition() ?? undefined,
            );
          }}
          onDragEnd={(e) => {
            if (e.target === stage.current)
              setView((v) => ({ ...v, x: e.target.x() - base.x, y: e.target.y() - base.y }));
          }}
          onMouseDown={(e) => {
            if (!interactive || pan || tool !== 'select' || e.evt.button !== 0) return;
            if (e.target === stage.current || e.target.name() === 'plan-paper') {
              const p = world();
              setMarquee({ start: p, end: p });
            }
          }}
          onMouseMove={() => {
            const p = world();
            setPointer(snapPoint(p, room, snap));
            if (marquee) setMarquee((m) => (m ? { ...m, end: p } : undefined));
          }}
          onMouseUp={(e) => {
            if (!marquee) return;
            const { start, end } = marquee;
            setMarquee(undefined);
            if (Math.hypot(start.x - end.x, start.y - end.y) > 5) {
              const ids = [
                ...room.objects,
                ...room.furniture,
                ...room.fixtures,
                ...room.zones,
                ...room.annotations,
              ]
                .filter(
                  (o) =>
                    isElementEditable(room, o.id) &&
                    o.x >= Math.min(start.x, end.x) &&
                    o.x <= Math.max(start.x, end.x) &&
                    o.y >= Math.min(start.y, end.y) &&
                    o.y <= Math.max(start.y, end.y),
                )
                .map((o) => o.id);
              designer?.onSelect(ids, e.evt.shiftKey);
            } else designer?.onSelect([], e.evt.shiftKey);
          }}
          onClick={(e) => {
            if (
              interactive &&
              !pan &&
              tool !== 'select' &&
              (e.target === stage.current || e.target.name() === 'plan-paper')
            )
              designer?.onPoint(snapPoint(world(), room, snap));
          }}
          onTap={() => {
            if (interactive && !pan && tool !== 'select') designer?.onPoint(snapPoint(world(), room, snap));
          }}
        >
          <Layer listening={!thumbnail}>
            <Rect
              name="plan-paper"
              width={room.width}
              height={room.height}
              fill="#fcfdfb"
              stroke="#c7d0ce"
              strokeWidth={1}
              shadowColor="#152d38"
              shadowBlur={14}
              shadowOpacity={0.07}
            />
            {room.layers.background.visible && room.background && background.image && (
              <Group listening={false} clipWidth={room.width} clipHeight={room.height}>
                <KonvaImage
                  image={background.image}
                  {...room.background}
                  offsetX={room.background.width / 2}
                  offsetY={room.background.height / 2}
                />
              </Group>
            )}
            {grid && (
              <Group listening={false}>
                {Array.from({ length: Math.floor(room.width / 25) + 1 }, (_, i) => (
                  <Line
                    key={`x${i}`}
                    points={[i * 25, 0, i * 25, room.height]}
                    stroke="#819eaa22"
                    strokeWidth={0.6 / scale}
                  />
                ))}
                {Array.from({ length: Math.floor(room.height / 25) + 1 }, (_, i) => (
                  <Line
                    key={`y${i}`}
                    points={[0, i * 25, room.width, i * 25]}
                    stroke="#819eaa22"
                    strokeWidth={0.6 / scale}
                  />
                ))}
              </Group>
            )}
            {room.zones.map((z) =>
              item(
                z.id,
                <>
                  <Rect
                    x={-z.width / 2}
                    y={-z.height / 2}
                    width={z.width}
                    height={z.height}
                    fill={
                      z.color ??
                      {
                        office: '#f4f3ed',
                        meeting: '#edf2ef',
                        corridor: '#eef0ed',
                        lounge: '#efece4',
                        kitchen: '#eeece5',
                        sanitary: '#e8eef0',
                        technical: '#e7ecee',
                        storage: '#eaece6',
                      }[z.kind]
                    }
                    stroke={interactive ? '#c5d0cc' : undefined}
                    strokeWidth={0.7}
                  />
                  {z.showLabel && (
                    <Text
                      listening={false}
                      x={-z.width / 2 + 12}
                      y={-z.height / 2 + 12}
                      width={z.width - 24}
                      text={z.name}
                      fontSize={11}
                      letterSpacing={1.6}
                      fill="#84958f"
                    />
                  )}
                </>,
              ),
            )}
            {room.walls.map((w) => {
              const g = elementGeometry(room, w.id)!;
              return item(
                w.id,
                <Group x={-g.width / 2}>
                  {wallSolidSegments(w, room.openings).map(([a, b], i) => (
                    <Group key={i}>
                      <Line
                        points={[a, 0, b, 0]}
                        stroke={w.color ?? (w.material === 'glass' ? '#a7c8ce' : '#6c7b80')}
                        strokeWidth={w.thickness}
                        lineCap="square"
                      />
                      {w.material === 'glass' && (
                        <Line points={[a, 0, b, 0]} stroke="#f1f9fa" strokeWidth={1} />
                      )}
                    </Group>
                  ))}
                </Group>,
              );
            })}
            {room.openings.map((o) => {
              const wall = room.walls.find((w) => w.id === o.wallId);
              if (!wall) return null;
              const sign = o.swing === 'inward' ? 1 : -1;
              const leaf = o.kind === 'double-door' ? o.width / 2 : o.width;
              return item(
                o.id,
                <Group scaleY={sign} scaleX={o.hinge === 'right' ? -1 : 1}>
                  {o.kind === 'window' ? (
                    <>
                      <Line points={[-o.width / 2, -4, o.width / 2, -4]} stroke="#7ca5b0" strokeWidth={2} />
                      <Line points={[-o.width / 2, 4, o.width / 2, 4]} stroke="#7ca5b0" strokeWidth={2} />
                      <Line points={[0, -4, 0, 4]} stroke="#7ca5b0" />
                    </>
                  ) : o.kind === 'sliding-door' ? (
                    <>
                      <Line
                        points={[-o.width / 2, -5, 0, -5, 0, 5, o.width / 2, 5]}
                        stroke="#648e97"
                        strokeWidth={3}
                      />
                      <Arrow points={[-10, 15, 20, 15]} stroke="#91a6aa" fill="#91a6aa" pointerLength={5} />
                    </>
                  ) : (
                    <>
                      {[0, ...(o.kind === 'double-door' ? [1] : [])].map((side) => (
                        <Group key={side} x={side ? o.width / 2 : -o.width / 2} scaleX={side ? -1 : 1}>
                          <Line points={[0, 0, 0, leaf]} stroke="#8b9b9c" strokeWidth={2} />
                          <Arc
                            innerRadius={leaf - 0.5}
                            outerRadius={leaf}
                            angle={90}
                            stroke="#b3c0bc"
                            strokeWidth={0.7}
                          />
                        </Group>
                      ))}
                    </>
                  )}
                </Group>,
                {
                  id: o.id,
                  name: o.name,
                  ...openingPosition(wall, o),
                  width: o.width,
                  height: wall.thickness,
                  rotation: wallAngle(wall),
                },
              );
            })}
            {room.fixtures.map((o) => {
              const [w, h] = symbolSize(o.kind);
              return item(
                o.id,
                <Group scaleX={o.width / w} scaleY={o.height / h}>
                  <FixtureSymbol kind={o.kind} />
                </Group>,
              );
            })}
            {room.furniture.map((o) => {
              const [w, h] = symbolSize(o.kind);
              return item(
                o.id,
                <Group scaleX={o.width / w} scaleY={o.height / h}>
                  <FurnitureSymbol kind={o.kind} color={o.color} />
                </Group>,
              );
            })}
            {room.layers.resources.visible &&
              room.objects.map((o) => {
                const status = statusFor(bookings, o.id, date, timeStart, timeEnd);
                return (
                  <Group
                    key={o.id}
                    opacity={filter !== 'all' && status !== filter ? 0.25 : 1}
                    onClick={(e) => {
                      if (!interactive) {
                        e.cancelBubble = true;
                        onSelect(o);
                      }
                    }}
                    onTap={(e) => {
                      if (!interactive) {
                        e.cancelBubble = true;
                        onSelect(o);
                      }
                    }}
                  >
                    {item(o.id, <Furniture object={o} status={status} />)}
                  </Group>
                );
              })}
            {room.annotations.map((a) =>
              item(
                a.id,
                a.kind === 'measure' ? (
                  <>
                    <Line points={[-a.width / 2, 0, a.width / 2, 0]} stroke="#77959b" strokeWidth={1} />
                    {[-1, 1].map((s) => (
                      <Line key={s} points={[(s * a.width) / 2, -6, (s * a.width) / 2, 6]} stroke="#77959b" />
                    ))}
                    <Text
                      x={-a.width / 2}
                      y={-18}
                      width={a.width}
                      align="center"
                      text={formatLength(a.width, room)}
                      fontSize={11}
                      fill="#56747b"
                    />
                  </>
                ) : (
                  <Text
                    x={-a.width / 2}
                    y={-a.height / 2}
                    width={a.width}
                    height={a.height}
                    text={a.text}
                    fontSize={a.fontSize}
                    fill={a.color ?? '#516e78'}
                  />
                ),
              ),
            )}
            {interactive &&
              geometry &&
              editable &&
              ref?.type === 'wall' &&
              (['start', 'end'] as const).map((end) => {
                const w = room.walls.find((w) => w.id === geometry.id)!;
                return (
                  <Circle
                    key={end}
                    {...w[end]}
                    radius={5 / scale}
                    stroke="#247f81"
                    strokeWidth={1.5 / scale}
                    fill="white"
                    draggable
                    onDragEnd={(e) =>
                      designer?.onWallEnd(
                        w.id,
                        end,
                        snapPoint({ x: e.target.x(), y: e.target.y() }, room, snap, [w.id]),
                      )
                    }
                  />
                );
              })}
            {interactive && geometry && editable && ref?.type !== 'wall' && ref?.type !== 'opening' && (
              <Rect
                ref={target}
                x={geometry.x}
                y={geometry.y}
                width={geometry.width}
                height={geometry.height}
                offsetX={geometry.width / 2}
                offsetY={geometry.height / 2}
                rotation={geometry.rotation}
                fill="transparent"
                draggable
                onContextMenu={(e) => {
                  e.evt.preventDefault();
                  e.cancelBubble = true;
                  designer?.onContext(geometry.id);
                }}
                onClick={(e) => clickElement(geometry.id, e)}
                onDragEnd={(e) => {
                  const p = snapElementPosition(
                    room,
                    geometry.id,
                    { x: e.target.x(), y: e.target.y() },
                    snap,
                    selected,
                  );
                  designer?.onMove(geometry.id, p.x, p.y);
                }}
                onTransformEnd={() => {
                  const node = target.current;
                  if (!node) return;
                  const width = Math.max(12, node.width() * node.scaleX()),
                    height = Math.max(12, node.height() * node.scaleY());
                  node.scale({ x: 1, y: 1 });
                  designer?.onGeometry(geometry.id, {
                    x: node.x(),
                    y: node.y(),
                    width,
                    height,
                    rotation: node.rotation(),
                  });
                }}
              />
            )}
            {interactive && (
              <Transformer
                ref={transformer}
                flipEnabled={false}
                rotateEnabled
                rotationSnaps={Array.from({ length: 24 }, (_, i) => i * 15)}
                rotationSnapTolerance={4}
                borderStroke="#247f81"
                anchorStroke="#247f81"
                anchorFill="#fff"
                anchorSize={7}
                boundBoxFunc={(old, next) =>
                  Math.abs(next.width) < 12 || Math.abs(next.height) < 12 ? old : next
                }
              />
            )}
            {marquee && (
              <Rect
                listening={false}
                x={Math.min(marquee.start.x, marquee.end.x)}
                y={Math.min(marquee.start.y, marquee.end.y)}
                width={Math.abs(marquee.start.x - marquee.end.x)}
                height={Math.abs(marquee.start.y - marquee.end.y)}
                fill="#247f8115"
                stroke="#247f81"
                strokeWidth={1 / scale}
              />
            )}
            {designer?.start && pointer && (
              <Line
                listening={false}
                points={[designer.start.x, designer.start.y, pointer.x, pointer.y]}
                stroke="#247f81"
                dash={[5, 4]}
                strokeWidth={2 / scale}
              />
            )}
          </Layer>
        </Stage>
      </div>
      {!thumbnail && (
        <div className="plan-bottom">
          <span className="plan-hint">
            <MousePointer2 size={13} />
            {interactive
              ? 'Umschalt: Mehrfachauswahl · Leertaste: Verschieben'
              : 'Arbeitsplatz anklicken, um zu buchen'}
          </span>
          <div className="plan-controls">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Verkleinern"
              onClick={() => zoomTo(view.zoom - 0.15)}
            >
              <Minus size={16} />
            </Button>
            <span>{Math.round(view.zoom * 100)} %</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Vergrößern"
              onClick={() => zoomTo(view.zoom + 0.15)}
            >
              <Plus size={16} />
            </Button>
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
      )}
    </div>
  );
}
