import { Group } from 'react-konva';
import { ResourceSymbol } from './PlanSymbols';
import type { PlanObject } from '../domain/types';
export function Furniture({ object }: { object: PlanObject }) {
  return (
    <Group
      scaleX={object.width / (object.kind === 'desk' ? 76 : 210)}
      scaleY={object.height / (object.kind === 'desk' ? 44 : 160)}
    >
      <ResourceSymbol object={object} />
    </Group>
  );
}
