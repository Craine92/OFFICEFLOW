import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Group, Circle, Text, Arc } from 'react-konva';
import { Expand, Minus, Plus, Scan, X, MousePointer2 } from 'lucide-react';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Booking, OfficeRoom, PlanObject, WorkspaceStatus } from '../domain/types';
import { statusFor } from '../domain/booking';
import { constrainObject } from '../domain/layout';
import { Button } from './ui/button';

const palette = {
  available: { fill: '#f5faf7', border: '#9fbdb2', dot: '#398d75' },
  reserved: { fill: '#fff7e8', border: '#d9bb7d', dot: '#d69d36' },
  occupied: { fill: '#edf0f9', border: '#aab7d3', dot: '#768bb4' },
};

function Furniture({
  object: o,
  status,
  selected,
  editor,
  dimmed,
  onSelect,
  onMove,
}: {
  object: PlanObject;
  status: WorkspaceStatus;
  selected: boolean;
  editor: boolean;
  dimmed: boolean;
  onSelect: () => void;
  onMove?: (x: number, y: number) => void;
}) {
  const color = palette[status];
  return (
    <Group
      x={o.x}
      y={o.y}
      rotation={o.rotation}
      draggable={editor}
      opacity={dimmed ? 0.25 : 1}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        const next = constrainObject({
          ...o,
          x: Math.round(e.target.x() / 5) * 5,
          y: Math.round(e.target.y() / 5) * 5,
        });
        e.target.position({ x: next.x, y: next.y });
        onMove?.(next.x, next.y);
      }}
      onMouseEnter={(e) => {
        const c = e.target.getStage()?.container();
        if (c)
          c.style.cursor = editor
            ? 'move'
            : o.kind === 'plant' || o.kind === 'lounge'
              ? 'default'
              : 'pointer';
      }}
      onMouseLeave={(e) => {
        const c = e.target.getStage()?.container();
        if (c) c.style.cursor = 'grab';
      }}
    >
      {selected && (
        <Rect
          x={-o.width / 2 - 7}
          y={-o.height / 2 - 7}
          width={o.width + 14}
          height={o.height + (o.kind === 'desk' ? 36 : 14)}
          stroke="#1c826d"
          strokeWidth={1.5}
          dash={[5, 4]}
          cornerRadius={9}
        />
      )}
      {o.kind === 'desk' && (
        <>
          <Rect
            x={-15}
            y={23}
            width={30}
            height={21}
            cornerRadius={7}
            fill="#d9dedb"
            stroke="#c4cbc7"
            strokeWidth={1}
          />
          <Rect x={-11} y={27} width={22} height={15} cornerRadius={5} fill="#e9ece9" />
          <Rect
            x={-o.width / 2}
            y={-o.height / 2}
            width={o.width}
            height={o.height}
            fill={color.fill}
            stroke={selected ? '#1c826d' : color.border}
            strokeWidth={selected ? 2 : 1.1}
            cornerRadius={5}
            shadowColor="#1c382d"
            shadowBlur={5}
            shadowOpacity={0.04}
            shadowOffsetY={3}
          />
          <Rect x={-13} y={-16} width={26} height={5} fill="#566762" cornerRadius={1.5} />
          <Line points={[0, -11, 0, -7, -7, -7, 7, -7]} stroke="#788982" strokeWidth={1.3} />
          <Group rotation={-o.rotation}>
            <Text
              x={-26}
              y={-3}
              width={52}
              align="center"
              text={o.name}
              fontFamily="Arial"
              fontSize={10}
              fill="#52615d"
            />
            <Circle x={26} y={-9} radius={3} fill={color.dot} />
          </Group>
        </>
      )}
      {o.kind === 'plant' && (
        <>
          <Circle radius={16} fill="#dfdfd0" />
          <Circle radius={12} fill="#acbba6" />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <Group key={a} rotation={a}>
              <Rect
                x={-4}
                y={-19}
                width={8}
                height={20}
                fill={a % 120 ? '#799c78' : '#91ad84'}
                cornerRadius={8}
              />
            </Group>
          ))}
          <Circle radius={5} fill="#668d68" />
        </>
      )}
      {o.kind === 'meeting' && (
        <>
          <Rect
            x={-o.width / 2}
            y={-o.height / 2}
            width={o.width}
            height={o.height}
            fill="#f2f5f1"
            stroke="#a4b2a8"
            strokeWidth={3}
            cornerRadius={3}
          />
          <Line
            points={[-o.width / 2 + 20, -o.height / 2, o.width / 2 - 20, -o.height / 2]}
            stroke="#b5d4d1"
            strokeWidth={5}
          />
          {[-1, 1].map((side) =>
            [-1, 0, 1].map((i) => (
              <Rect
                key={`${side}-${i}`}
                x={i * 28 - 9}
                y={side * 30 - 9}
                width={18}
                height={18}
                cornerRadius={5}
                fill="#c7d2c8"
              />
            )),
          )}
          <Rect x={-51} y={-21} width={102} height={42} fill="#e0d6c3" stroke="#b9af9d" cornerRadius={16} />
          <Text
            x={-o.width / 2}
            y={o.height / 2 - 32}
            width={o.width}
            text={o.name}
            align="center"
            fontSize={12}
            fontStyle="bold"
            fill="#4d6055"
          />
          <Circle x={o.width / 2 - 15} y={-o.height / 2 + 15} radius={4} fill={color.dot} />
        </>
      )}
      {o.kind === 'lounge' && (
        <>
          <Rect
            x={-o.width / 2}
            y={-o.height / 2 - 5}
            width={o.width}
            height={o.height + 10}
            fill="#ebe6db"
            cornerRadius={20}
          />
          <Rect
            x={-o.width / 2 + 8}
            y={-20}
            width={74}
            height={42}
            fill="#9daea1"
            stroke="#7b9181"
            cornerRadius={8}
          />
          <Rect
            x={o.width / 2 - 82}
            y={-20}
            width={74}
            height={42}
            fill="#9daea1"
            stroke="#7b9181"
            cornerRadius={8}
          />
          <Circle radius={19} fill="#d1bda0" stroke="#b8a487" />
          <Text x={-25} y={-4} width={50} text="Lounge" align="center" fontSize={8} fill="#6c614f" />
        </>
      )}
    </Group>
  );
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
}: {
  room: OfficeRoom;
  bookings: Booking[];
  date: string;
  selectedId?: string;
  onSelect: (object: PlanObject) => void;
  editor?: boolean;
  onMove?: (id: string, x: number, y: number) => void;
  filter?: WorkspaceStatus | 'all';
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 430 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [expanded, setExpanded] = useState(false);
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
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [room.id]);
  useEffect(() => {
    if (!expanded) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [expanded]);
  const fit = Math.min(size.width / room.width, size.height / room.height) * 0.96;
  const scale = fit * zoom;
  const base = { x: (size.width - room.width * scale) / 2, y: (size.height - room.height * scale) / 2 };
  function wheel(e: KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    setZoom((z) => Math.min(2.5, Math.max(0.6, z * (e.evt.deltaY > 0 ? 0.94 : 1.06))));
  }
  return (
    <div className={`floorplan ${expanded ? 'floorplan-expanded' : ''}`}>
      <div className="plan-annotation">
        <span className="plan-floor-label">
          BERLIN MITTE <span>/</span> 2. OBERGESCHOSS
        </span>
        <span>{room.area} m²</span>
      </div>
      <div className="canvas-holder" ref={holder}>
        <Stage
          width={size.width}
          height={size.height}
          scaleX={scale}
          scaleY={scale}
          x={base.x + pan.x}
          y={base.y + pan.y}
          draggable
          onWheel={wheel}
          onDragEnd={(e) => {
            if (e.target === e.target.getStage())
              setPan({ x: e.target.x() - base.x, y: e.target.y() - base.y });
          }}
        >
          <Layer>
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
            {room.objects.map((o) => {
              const status = statusFor(bookings, o.id, date);
              return (
                <Furniture
                  key={o.id}
                  object={o}
                  status={status}
                  selected={selectedId === o.id}
                  editor={editor}
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
      <div className="plan-bottom">
        <span className="plan-hint">
          <MousePointer2 size={13} />{' '}
          {editor ? 'Objekte auswählen und verschieben' : 'Arbeitsplatz anklicken, um zu buchen'}
        </span>
        <div className="plan-controls">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Verkleinern"
            disabled={zoom <= 0.6}
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
          >
            <Minus size={16} />
          </Button>
          <span>{Math.round(zoom * 100)} %</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Vergrößern"
            disabled={zoom >= 2.5}
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
          >
            <Plus size={16} />
          </Button>
          <span className="control-divider" />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Plan einpassen"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
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
