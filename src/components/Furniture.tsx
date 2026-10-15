import { Rect, Line, Group, Circle, Text } from 'react-konva';
import type { OfficeRoom, PlanObject, WorkspaceStatus } from '../domain/types';
import { constrainObject } from '../domain/layout';
const palette = {
  available: { fill: '#f5faf7', border: '#9fbdb2', dot: '#398d75' },
  reserved: { fill: '#fff7e8', border: '#d9bb7d', dot: '#d69d36' },
  occupied: { fill: '#edf0f9', border: '#aab7d3', dot: '#768bb4' },
};

export function Furniture({
  object: raw,
  status,
  selected,
  editor,
  dimmed,
  onSelect,
  onMove,
  room,
  snap = true,
  warning = false,
}: {
  object: PlanObject;
  status: WorkspaceStatus;
  selected: boolean;
  editor: boolean;
  dimmed: boolean;
  onSelect: () => void;
  onMove?: (x: number, y: number) => void;
  room: OfficeRoom;
  snap?: boolean;
  warning?: boolean;
}) {
  const dimensions =
    raw.kind === 'desk'
      ? [76, 44]
      : raw.kind === 'meeting'
        ? [210, 160]
        : raw.kind === 'lounge'
          ? [210, 64]
          : [40, 40];
  const o = { ...raw, width: dimensions[0], height: dimensions[1] };
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
        const next = constrainObject(
          {
            ...raw,
            x: snap ? Math.round(e.target.x() / 5) * 5 : e.target.x(),
            y: snap ? Math.round(e.target.y() / 5) * 5 : e.target.y(),
          },
          room,
        );
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
      <Group scaleX={raw.width / o.width} scaleY={raw.height / o.height}>
        {warning && (
          <Rect
            x={-o.width / 2 - 4}
            y={-o.height / 2 - 4}
            width={o.width + 8}
            height={o.height + 8}
            fill="#df5c4e12"
            stroke="#c26455"
            strokeWidth={2}
            dash={[4, 3]}
            cornerRadius={6}
            listening={false}
          />
        )}
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
                height={12}
                wrap="none"
                ellipsis
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
    </Group>
  );
}
