import {
  SketchEntity,
  Constraint,
  ConstraintType,
  SketchEntityType,
} from '@capycad/shared-types';

export type ConstraintStatus = 'under-constrained' | 'well-constrained' | 'over-constrained';

export interface DOFResult {
  totalDOF: number;
  removedDOF: number;
  remainingDOF: number;
  status: ConstraintStatus;
}

/**
 * Calcula los grados de libertad (DOF) de un sketch.
 *
 * DOF iniciales por entidad:
 *  - LINE: 4 (start.x, start.y, end.x, end.y)
 *  - CIRCLE: 3 (center.x, center.y, radius)
 *  - ARC: 5 (center.x, center.y, radius, startAngle, endAngle)
 *  - RECTANGLE: 4 (topLeft.x, topLeft.y, bottomRight.x, bottomRight.y)
 *  - POLYGON: 3 (center.x, center.y, radius)
 *  - SPLINE: 2 * nPoints
 *
 * DOF removidos por constraint:
 *  - HORIZONTAL: 1
 *  - VERTICAL: 1
 *  - DISTANCE: 1
 *  - EQUAL: 1
 *  - CONCENTRIC: 2
 *  - PARALLEL: 1
 *  - PERPENDICULAR: 1
 *  - TANGENT: 1
 */
export function analyzeDOF(entities: SketchEntity[], constraints: Constraint[]): DOFResult {
  let totalDOF = 0;

  for (const entity of entities) {
    switch (entity.type) {
      case SketchEntityType.LINE:
        totalDOF += 4;
        break;
      case SketchEntityType.CIRCLE:
        totalDOF += 3;
        break;
      case SketchEntityType.ARC:
        totalDOF += 5;
        break;
      case SketchEntityType.RECTANGLE:
        totalDOF += 4;
        break;
      case SketchEntityType.POLYGON:
        totalDOF += 3;
        break;
      case SketchEntityType.SPLINE:
        totalDOF += 4; // Mínimo: start + 1 control point
        break;
      default:
        totalDOF += 2;
    }
  }

  let removedDOF = 0;

  for (const constraint of constraints) {
    switch (constraint.type) {
      case ConstraintType.HORIZONTAL:
      case ConstraintType.VERTICAL:
      case ConstraintType.DISTANCE:
      case ConstraintType.EQUAL:
      case ConstraintType.PARALLEL:
      case ConstraintType.PERPENDICULAR:
      case ConstraintType.TANGENT:
        removedDOF += 1;
        break;
      case ConstraintType.CONCENTRIC:
        removedDOF += 2;
        break;
    }
  }

  const remainingDOF = Math.max(0, totalDOF - removedDOF);
  let status: ConstraintStatus;

  if (removedDOF > totalDOF) {
    status = 'over-constrained';
  } else if (remainingDOF === 0) {
    status = 'well-constrained';
  } else {
    status = 'under-constrained';
  }

  return { totalDOF, removedDOF, remainingDOF, status };
}
