import { Circle, Group, Line } from 'react-konva';
import type { WorkspaceStatus } from '../domain/types';
import { STATUS_LED_DIAMETER, statusLedInverseScale, statusLedVisual } from '../domain/statusLed';

export function StatusLED({
  status,
  stageScale,
  x,
  y,
  opacity = 1,
}: {
  status: WorkspaceStatus;
  stageScale: number;
  x: number;
  y: number;
  opacity?: number;
}) {
  const visual = statusLedVisual(status);
  const inverseScale = statusLedInverseScale(stageScale);
  const radius = STATUS_LED_DIAMETER / 2;

  return (
    <Group
      x={x}
      y={y}
      scaleX={inverseScale}
      scaleY={inverseScale}
      opacity={opacity}
      listening={false}
      name={`status-led status-led-${visual.unavailable ? 'unavailable' : 'available'}`}
    >
      <Circle
        radius={radius + 3}
        fill={visual.color}
        opacity={0.14}
        shadowColor={visual.color}
        shadowBlur={8}
        shadowOpacity={0.42}
      />
      <Circle
        radius={radius}
        fill={visual.color}
        stroke="#FFFFFF"
        strokeWidth={2.5}
        shadowColor="#0F172A"
        shadowBlur={3}
        shadowOpacity={0.38}
      />
      {visual.symbol === 'check' ? (
        <Line
          points={[-4, 0, -1, 3, 4.5, -3.5]}
          stroke="#FFFFFF"
          strokeWidth={2.1}
          lineCap="round"
          lineJoin="round"
        />
      ) : (
        <>
          <Line points={[-3.2, -3.2, 3.2, 3.2]} stroke="#FFFFFF" strokeWidth={2.1} lineCap="round" />
          <Line points={[3.2, -3.2, -3.2, 3.2]} stroke="#FFFFFF" strokeWidth={2.1} lineCap="round" />
        </>
      )}
    </Group>
  );
}
