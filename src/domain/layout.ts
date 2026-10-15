import type { PlanObject } from './types';

// Der begehbare Bereich liegt innerhalb der Außenwände des Demo-Grundrisses.
export function constrainObject(object: PlanObject): PlanObject {
  const radians = (object.rotation * Math.PI) / 180;
  const width = Math.abs(object.width * Math.cos(radians)) + Math.abs(object.height * Math.sin(radians));
  const height = Math.abs(object.width * Math.sin(radians)) + Math.abs(object.height * Math.cos(radians));
  return {
    ...object,
    x: Math.max(48 + width / 2, Math.min(852 - width / 2, object.x)),
    y: Math.max(50 + height / 2, Math.min(516 - height / 2, object.y)),
  };
}
