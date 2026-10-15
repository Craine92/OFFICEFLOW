import { Group, Rect, Circle, Ellipse, Line, Text, Arc, Arrow } from 'react-konva';
import type { FurnitureKind, FixtureKind, PlanObject, WorkspaceStatus } from '../domain/types';
const ink = '#70818b',
  light = '#eef1f1',
  wood = '#ded5c3',
  teal = '#75958d';
const Chair = ({ x = 0, y = 0, rotation = 0 }: { x?: number; y?: number; rotation?: number }) => (
  <Group x={x} y={y} rotation={rotation}>
    <Rect
      x={-12}
      y={-12}
      width={24}
      height={25}
      cornerRadius={6}
      fill="#c5cfd1"
      stroke={ink}
      strokeWidth={1}
    />
    <Rect x={-14} y={8} width={28} height={7} cornerRadius={3} fill="#8d9da5" />
    <Line points={[-15, -2, -15, 8, 15, 8, 15, -2]} stroke={ink} />
  </Group>
);
/** Eigene Vektorsymbole. Normierte Koordinaten, auf die Elementgröße skaliert. */
export function FurnitureSymbol({ kind, color }: { kind: FurnitureKind; color?: string }) {
  const c = color ?? teal;
  if (kind.includes('plant') || kind === 'planter')
    return (
      <Group>
        {kind === 'planter' ? (
          <Rect x={-50} y={-15} width={100} height={30} cornerRadius={6} fill="#d7d9d2" stroke={ink} />
        ) : (
          <Circle radius={18} fill="#ddd9cb" stroke="#b2b9ab" />
        )}
        {(kind === 'planter' ? [-32, 0, 32] : [0]).map((x) => (
          <Group key={x} x={x}>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <Ellipse
                key={a}
                x={Math.sin((a * Math.PI) / 180) * 9}
                y={Math.cos((a * Math.PI) / 180) * 9}
                radiusX={6}
                radiusY={17}
                rotation={-a}
                fill={a % 120 ? '#7e9d86' : '#a0b49a'}
                stroke="#6b8f76"
                strokeWidth={0.5}
              />
            ))}
            <Circle radius={5} fill="#607f6a" />
          </Group>
        ))}
      </Group>
    );
  if (kind.includes('chair')) return <Chair />;
  if (kind === 'sofa' || kind === 'armchair')
    return (
      <Group>
        <Rect x={-50} y={-24} width={100} height={48} fill={c} stroke={ink} cornerRadius={9} />
        <Rect x={-43} y={-15} width={86} height={32} fill="#b6c8c1" stroke={ink} cornerRadius={5} />
        {kind === 'sofa' && <Line points={[0, -15, 0, 17]} stroke={ink} />}
        <Rect x={-50} y={-24} width={100} height={10} fill={c} cornerRadius={4} />
        {[-50, 40].map((x) => (
          <Rect key={x} x={x} y={-20} width={10} height={42} fill={c} cornerRadius={4} />
        ))}
      </Group>
    );
  if (['conference-table', 'round-table', 'coffee-table'].includes(kind))
    return (
      <Group>
        {kind === 'round-table' ? (
          <Circle radius={45} fill={color ?? wood} stroke="#b8b09f" />
        ) : (
          <Rect
            x={-75}
            y={-35}
            width={150}
            height={70}
            cornerRadius={kind === 'coffee-table' ? 30 : 12}
            fill={color ?? wood}
            stroke="#b8b09f"
          />
        )}
        <Line
          points={kind === 'round-table' ? [-25, 0, 25, 0] : [-55, -22, 55, -22]}
          stroke="#c9bfaa"
          opacity={0.7}
        />
      </Group>
    );
  if (kind === 'rug')
    return (
      <Group>
        <Rect
          x={-90}
          y={-55}
          width={180}
          height={110}
          cornerRadius={7}
          fill={color ?? '#e1ddd2'}
          opacity={0.75}
        />
        {[-44, -30, -16, 0, 16, 30, 44].map((y) => (
          <Line key={y} points={[-82, y, 82, y]} stroke="#c7c4bc" strokeWidth={0.8} />
        ))}
      </Group>
    );
  if (kind === 'toilet')
    return (
      <Group>
        <Rect x={-17} y={-27} width={34} height={15} cornerRadius={3} fill="#fafbfb" stroke={ink} />
        <Ellipse y={4} radiusX={15} radiusY={23} fill="#fff" stroke={ink} />
        <Ellipse y={5} radiusX={10} radiusY={16} fill="#e7eff1" stroke="#b4c4ca" />
        <Circle x={8} y={-20} radius={2} fill={ink} />
      </Group>
    );
  if (kind === 'accessible-wc')
    return (
      <Group>
        <Rect
          x={-45}
          y={-45}
          width={90}
          height={90}
          cornerRadius={8}
          fill="#e9efee"
          stroke="#b8c8c5"
          dash={[4, 4]}
        />
        <Circle x={-2} y={-23} radius={6} fill={ink} />
        <Line points={[-5, -12, -5, 8, 18, 8, 27, 25]} stroke={ink} strokeWidth={5} lineCap="round" />
        <Arc x={-8} y={9} innerRadius={18} outerRadius={22} angle={260} rotation={-20} fill={ink} />
      </Group>
    );
  if (kind === 'sink' || kind === 'washbasin')
    return (
      <Group>
        <Rect x={-25} y={-18} width={50} height={36} cornerRadius={7} fill="#f8fafb" stroke={ink} />
        <Rect x={-18} y={-12} width={36} height={25} cornerRadius={8} fill="#dde8eb" stroke="#91a7af" />
        <Circle y={3} radius={2} fill={ink} />
        <Line points={[0, -19, 0, -8, 5, -8]} stroke={ink} strokeWidth={3} />
      </Group>
    );
  if (kind === 'lamp')
    return (
      <Group>
        <Circle radius={17} fill="#e7dfc8" stroke="#b5ad98" />
        <Circle radius={11} fill="#faf5dd" />
        <Circle radius={3} fill="#b5ad98" />
      </Group>
    );
  if (kind === 'coat-rack')
    return (
      <Group>
        <Line points={[-35, 0, 35, 0]} stroke={ink} strokeWidth={4} />
        {[-27, -9, 9, 27].map((x) => (
          <Group key={x}>
            <Line points={[x, -10, x, 10]} stroke={ink} strokeWidth={2} />
            <Circle x={x} y={-10} radius={3} fill={wood} />
            <Circle x={x} y={10} radius={3} fill={wood} />
          </Group>
        ))}
      </Group>
    );
  if (kind === 'monitor')
    return (
      <Group>
        <Rect x={-18} y={-9} width={36} height={7} cornerRadius={2} fill="#4a606b" />
        <Line points={[0, -2, 0, 6, -8, 6, 8, 6]} stroke={ink} strokeWidth={2} />
        <Rect x={19} y={1} width={7} height={10} fill={ink} cornerRadius={2} />
      </Group>
    );
  if (kind === 'whiteboard' || kind === 'divider')
    return (
      <Group>
        <Rect
          x={-50}
          y={-6}
          width={100}
          height={12}
          cornerRadius={3}
          fill={kind === 'whiteboard' ? '#fbfcfc' : c}
          stroke={ink}
        />
        {[-34, 34].map((x) => (
          <Line key={x} points={[x, -10, x, 10]} stroke={ink} strokeWidth={3} />
        ))}
      </Group>
    );
  if (kind === 'printer' || kind === 'coffee-machine')
    return (
      <Group>
        <Rect x={-22} y={-21} width={44} height={42} cornerRadius={5} fill={light} stroke={ink} />
        <Rect
          x={-15}
          y={-14}
          width={30}
          height={kind === 'printer' ? 14 : 25}
          cornerRadius={2}
          fill="#687e87"
        />
        {kind === 'printer' ? (
          <>
            <Rect x={-12} y={4} width={24} height={19} fill="#fff" stroke="#b9c5ca" />
            <Line points={[-8, 10, 8, 10, -8, 14, 8, 14]} stroke="#c2cbd0" />
          </>
        ) : (
          <>
            <Circle y={5} radius={6} fill="#efe9da" />
            <Circle y={5} radius={3} fill="#7e6552" />
          </>
        )}
        <Circle x={15} y={-17} radius={2} fill="#76a697" />
      </Group>
    );
  if (kind === 'kitchen' || kind === 'reception')
    return (
      <Group>
        <Rect
          x={-95}
          y={-24}
          width={190}
          height={48}
          cornerRadius={kind === 'reception' ? 14 : 3}
          fill={color ?? wood}
          stroke="#aeb5ae"
        />
        {kind === 'kitchen' ? (
          <>
            <Rect x={-80} y={-16} width={45} height={32} cornerRadius={5} fill="#d7e1e3" stroke={ink} />
            <Line points={[-58, -25, -58, -10, -52, -10]} stroke={ink} strokeWidth={3} />
            {[25, 46].flatMap((x) =>
              [-10, 10].map((y) => (
                <Circle key={`${x}-${y}`} x={x} y={y} radius={7} stroke={ink} strokeWidth={1.5} />
              )),
            )}
            <Line points={[-20, -24, -20, 24, 65, 24, 65, -24]} stroke="#b5af9f" />
          </>
        ) : (
          <>
            <Rect x={-85} y={-16} width={170} height={23} fill="#f1eee5" cornerRadius={8} />
            <Rect x={-20} y={-13} width={40} height={6} fill={ink} />
          </>
        )}
      </Group>
    );
  return (
    <Group>
      <Rect x={-50} y={-18} width={100} height={36} cornerRadius={3} fill={color ?? '#d6dbd9'} stroke={ink} />
      {(kind === 'shelf' ? [-30, -10, 10, 30] : [-25, 25]).map((x) => (
        <Group key={x}>
          <Line points={[x, -17, x, 17]} stroke={ink} />
          {kind === 'shelf' ? (
            <>
              <Rect x={x + 3} y={-11} width={6} height={22} fill="#a6b6bd" />
              <Rect x={x + 11} y={-10} width={5} height={20} fill={wood} />
            </>
          ) : (
            <Line points={[x + 9, 5, x + 15, 5]} stroke={ink} strokeWidth={2} />
          )}
        </Group>
      ))}
    </Group>
  );
}
export function FixtureSymbol({ kind }: { kind: FixtureKind }) {
  if (kind === 'column')
    return (
      <Group>
        <Rect x={-15} y={-15} width={30} height={30} fill="#71818b" />
        <Line points={[-15, -15, 15, 15, -15, 15, 15, -15]} stroke="#a4b0b6" />
      </Group>
    );
  if (kind === 'stairs')
    return (
      <Group>
        <Rect x={-60} y={-75} width={120} height={150} fill="#eff2f1" stroke={ink} strokeWidth={3} />
        {Array.from({ length: 11 }, (_, i) => (
          <Line key={i} points={[-55, -67 + i * 13, 55, -67 + i * 13]} stroke="#98a8ae" />
        ))}
        <Arrow points={[0, 60, 0, -55]} stroke="#536e78" fill="#536e78" strokeWidth={2} pointerLength={10} />
        <Text text="AUF" x={8} y={-8} fontSize={10} fill={ink} />
      </Group>
    );
  if (kind === 'elevator')
    return (
      <Group>
        <Rect x={-55} y={-60} width={110} height={120} stroke={ink} strokeWidth={5} fill="#e5ebed" />
        <Rect x={-43} y={-49} width={86} height={93} fill="#f8faf9" stroke="#9aaeb5" />
        <Line points={[0, -49, 0, 44]} stroke="#a3b5bc" />
        <Rect x={-32} y={49} width={64} height={11} fill="#c7d4d9" stroke={ink} />
        <Line points={[0, 49, 0, 60]} stroke={ink} />
        <Arrow points={[-15, 15, -15, -14]} stroke={ink} fill={ink} pointerLength={6} />
        <Arrow points={[15, -14, 15, 15]} stroke={ink} fill={ink} pointerLength={6} />
      </Group>
    );
  return (
    <Group>
      <Rect x={-50} y={-25} width={100} height={50} fill="#e9efec" cornerRadius={5} />
      <Arrow points={[0, 18, 0, -18]} stroke="#547f76" fill="#547f76" strokeWidth={3} />
      <Text text="EINGANG" x={-50} y={28} width={100} align="center" fontSize={10} fill={ink} />
    </Group>
  );
}
export function ResourceSymbol({ object: o, status }: { object: PlanObject; status: WorkspaceStatus }) {
  const statusColor = { available: '#328775', reserved: '#c29440', occupied: '#6f87aa' }[status];
  if (o.kind === 'meeting')
    return (
      <Group>
        <Rect
          x={-105}
          y={-80}
          width={210}
          height={160}
          cornerRadius={12}
          fill="#eef3f1"
          stroke="#bdcdc8"
          strokeWidth={1}
          dash={[5, 4]}
        />
        {[-1, 1].flatMap((side) =>
          [-1, 0, 1].map((i) => (
            <Chair key={`${side}${i}`} x={i * 36} y={side * 38} rotation={side < 0 ? 180 : 0} />
          )),
        )}
        <Rect
          x={-67}
          y={-27}
          width={134}
          height={54}
          cornerRadius={22}
          fill={o.color ?? wood}
          stroke="#bcb39f"
        />
        <Rect x={-28} y={-72} width={56} height={5} fill="#566c76" />
        <Text text={o.name} x={-100} y={59} width={200} align="center" fill="#415d65" fontSize={12} />
        <Circle x={89} y={-64} radius={5} fill={statusColor} />
      </Group>
    );
  return (
    <Group>
      <Chair y={35} />
      {o.variant === 'corner' ? (
        <Line
          points={[-38, -22, 38, -22, 38, 12, 0, 12, 0, 38, -38, 38]}
          closed
          fill={o.color ?? '#e9e5da'}
          stroke="#aebbb8"
          strokeWidth={1.2}
        />
      ) : (
        <Rect
          x={-38}
          y={-22}
          width={76}
          height={44}
          fill={o.color ?? '#e9e5da'}
          stroke="#aebbb8"
          cornerRadius={5}
          strokeWidth={1.1}
        />
      )}
      <Rect x={-15} y={-16} width={30} height={5} fill="#4b636e" cornerRadius={1.5} />
      <Line points={[0, -11, 0, -6, -7, -6, 7, -6]} stroke={ink} strokeWidth={1.5} />
      <Rect x={-10} y={4} width={20} height={6} cornerRadius={1} fill="#c2cccd" />
      <Ellipse x={17} y={8} radiusX={3} radiusY={4} fill="#b3c0c1" />
      <Rect x={-31} y={-18} width={4} height={13} fill={statusColor} cornerRadius={2} />
      <Group rotation={-o.rotation}>
        <Text text={o.name} x={-36} y={-4} width={72} fontSize={9} align="center" fill="#405760" />
        <Circle x={29} y={-13} radius={3.5} fill={statusColor} />
      </Group>
    </Group>
  );
}
export const symbolSize = (kind: FurnitureKind | FixtureKind): [number, number] =>
  kind === 'elevator'
    ? [110, 120]
    : kind === 'stairs'
      ? [120, 150]
      : kind === 'entrance'
        ? [100, 55]
        : kind === 'column'
          ? [30, 30]
          : kind.includes('chair')
            ? [30, 32]
            : kind === 'sofa' || kind === 'armchair'
              ? [100, 48]
              : kind === 'planter'
                ? [100, 30]
                : kind.includes('plant')
                  ? [44, 44]
                  : kind === 'toilet'
                    ? [34, 54]
                    : kind === 'accessible-wc'
                      ? [90, 90]
                      : kind === 'sink' || kind === 'washbasin'
                        ? [50, 36]
                        : kind === 'round-table'
                          ? [90, 90]
                          : kind === 'coffee-table' || kind === 'conference-table'
                            ? [150, 70]
                            : kind === 'kitchen' || kind === 'reception'
                              ? [190, 48]
                              : kind === 'rug'
                                ? [180, 110]
                                : kind === 'lamp'
                                  ? [34, 34]
                                  : kind === 'monitor'
                                    ? [50, 20]
                                    : kind === 'printer' || kind === 'coffee-machine'
                                      ? [44, 42]
                                      : kind === 'coat-rack'
                                        ? [76, 26]
                                        : ['whiteboard', 'divider'].includes(kind)
                                          ? [100, 20]
                                          : [100, 36];
