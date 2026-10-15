import { Group } from 'react-konva';
import { ResourceSymbol } from './PlanSymbols';
import type { PlanObject, WorkspaceStatus } from '../domain/types';
export function Furniture({ object, status }: { object: PlanObject; status: WorkspaceStatus }) {
  return (
    <Group
      scaleX={object.width / (object.kind === 'desk' ? 76 : 210)}
      scaleY={object.height / (object.kind === 'desk' ? 44 : 160)}
    >
      <ResourceSymbol object={object} status={status} />
    </Group>
  );
}
