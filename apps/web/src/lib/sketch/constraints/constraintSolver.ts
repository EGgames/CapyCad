/**
 * Motor de Restricciones Paramétricas
 *
 * US-009: Restricciones geométricas y dimensionales en sketches 2D.
 *
 * Resuelve restricciones de forma analítica sobre entidades de sketch.
 * Cada solver es una función pura que recibe la colección de entidades
 * y devuelve entidades actualizadas (inmutable).
 *
 * Restricciones soportadas:
 * - HORIZONTAL  : línea horizontal (start.y = end.y)
 * - VERTICAL    : línea vertical (start.x = end.x)
 * - DISTANCE    : longitud fija de línea O radio fijo de círculo/arco
 * - EQUAL       : igualar longitud/radio entre dos entidades
 * - CONCENTRIC  : dos círculos/arcos comparten el mismo centro
 * - PARALLEL    : dos líneas con la misma dirección
 * - PERPENDICULAR: dos líneas con dirección perpendicular
 * - TANGENT     : línea tangente a un círculo
 */

import { nanoid } from 'nanoid';
import { ConstraintType, SketchEntityType } from '@capycad/shared-types';
import type { Constraint, SketchEntity, Line, Circle, Arc } from '@capycad/shared-types';

// ─── Utilidades internas ──────────────────────────────────────────────────────

function lineLength(line: Line): number {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function midpoint(line: Line): { x: number; y: number } {
  return {
    x: (line.start.x + line.end.x) / 2,
    y: (line.start.y + line.end.y) / 2,
  };
}

function lineAngle(line: Line): number {
  return Math.atan2(line.end.y - line.start.y, line.end.x - line.start.x);
}

function updateLine(entities: SketchEntity[], id: string, patch: Partial<Line>): SketchEntity[] {
  return entities.map((e) => (e.id === id ? { ...e, ...patch } : e));
}

function updateCircle(
  entities: SketchEntity[],
  id: string,
  patch: Partial<Circle>
): SketchEntity[] {
  return entities.map((e) => (e.id === id ? { ...e, ...patch } : e));
}

// ─── Solucionadores individuales ──────────────────────────────────────────────

/**
 * HORIZONTAL — fuerza que start.y = end.y (promediados).
 * Entidades[0] debe ser una Line.
 */
function solveHorizontal(entities: SketchEntity[], constraint: Constraint): SketchEntity[] {
  const [lineId] = constraint.entities;
  const line = entities.find((e) => e.id === lineId) as Line | undefined;
  if (!line || line.type !== SketchEntityType.LINE) return entities;

  const avgY = (line.start.y + line.end.y) / 2;
  return updateLine(entities, lineId, {
    start: { x: line.start.x, y: avgY },
    end: { x: line.end.x, y: avgY },
  });
}

/**
 * VERTICAL — fuerza que start.x = end.x (promediados).
 * Entidades[0] debe ser una Line.
 */
function solveVertical(entities: SketchEntity[], constraint: Constraint): SketchEntity[] {
  const [lineId] = constraint.entities;
  const line = entities.find((e) => e.id === lineId) as Line | undefined;
  if (!line || line.type !== SketchEntityType.LINE) return entities;

  const avgX = (line.start.x + line.end.x) / 2;
  return updateLine(entities, lineId, {
    start: { x: avgX, y: line.start.y },
    end: { x: avgX, y: line.end.y },
  });
}

/**
 * DISTANCE — fija la longitud de una Line o el radio de Circle/Arc.
 * constraint.value = longitud o radio target.
 * Entidades[0] = id de la entidad.
 * Para Line: mantiene el midpoint, ajusta los extremos.
 */
function solveDistance(entities: SketchEntity[], constraint: Constraint): SketchEntity[] {
  const targetValue = constraint.value;
  if (targetValue == null || targetValue <= 0) return entities;

  const [entityId] = constraint.entities;
  const entity = entities.find((e) => e.id === entityId);
  if (!entity) return entities;

  if (entity.type === SketchEntityType.LINE) {
    const line = entity as Line;
    const current = lineLength(line);
    if (current === 0) return entities;

    const cx = midpoint(line).x;
    const cy = midpoint(line).y;
    const angle = lineAngle(line);
    const half = targetValue / 2;

    return updateLine(entities, entityId, {
      start: { x: cx - Math.cos(angle) * half, y: cy - Math.sin(angle) * half },
      end: { x: cx + Math.cos(angle) * half, y: cy + Math.sin(angle) * half },
    });
  }

  if (entity.type === SketchEntityType.CIRCLE || entity.type === SketchEntityType.ARC) {
    return updateCircle(entities, entityId, { radius: targetValue });
  }

  return entities;
}

/**
 * EQUAL — iguala la longitud/radio de entities[1] a entities[0].
 * Para Line: ajusta entities[1] manteniendo su midpoint y dirección.
 * Para Circle/Arc: ajusta el radio de entities[1].
 */
function solveEqual(entities: SketchEntity[], constraint: Constraint): SketchEntity[] {
  const [referenceId, targetId] = constraint.entities;
  const reference = entities.find((e) => e.id === referenceId);
  const target = entities.find((e) => e.id === targetId);
  if (!reference || !target) return entities;

  if (reference.type === SketchEntityType.LINE && target.type === SketchEntityType.LINE) {
    const refLine = reference as Line;
    const tgtLine = target as Line;
    const refLen = lineLength(refLine);
    const cx = midpoint(tgtLine).x;
    const cy = midpoint(tgtLine).y;
    const angle = lineAngle(tgtLine);
    const half = refLen / 2;

    return updateLine(entities, targetId, {
      start: { x: cx - Math.cos(angle) * half, y: cy - Math.sin(angle) * half },
      end: { x: cx + Math.cos(angle) * half, y: cy + Math.sin(angle) * half },
    });
  }

  if (
    (reference.type === SketchEntityType.CIRCLE || reference.type === SketchEntityType.ARC) &&
    (target.type === SketchEntityType.CIRCLE || target.type === SketchEntityType.ARC)
  ) {
    const refRadius = (reference as Circle | Arc).radius;
    return updateCircle(entities, targetId, { radius: refRadius });
  }

  return entities;
}

/**
 * CONCENTRIC — promedia los centros de dos Circle/Arc.
 * entities[0] y entities[1] deben ser Circle o Arc.
 */
function solveConcentric(entities: SketchEntity[], constraint: Constraint): SketchEntity[] {
  const [id1, id2] = constraint.entities;
  const e1 = entities.find((e) => e.id === id1) as Circle | Arc | undefined;
  const e2 = entities.find((e) => e.id === id2) as Circle | Arc | undefined;

  if (
    !e1 ||
    !e2 ||
    ![SketchEntityType.CIRCLE, SketchEntityType.ARC].includes(e1.type as any) ||
    ![SketchEntityType.CIRCLE, SketchEntityType.ARC].includes(e2.type as any)
  ) {
    return entities;
  }

  // El primer círculo es la referencia; el segundo se mueve a su centro
  return updateCircle(entities, id2, { center: { ...e1.center } });
}

/**
 * PARALLEL — hace que entities[1] sea paralela a entities[0].
 * Ambas deben ser Line. Mantiene el midpoint de entities[1].
 */
function solveParallel(entities: SketchEntity[], constraint: Constraint): SketchEntity[] {
  const [refId, targetId] = constraint.entities;
  const ref = entities.find((e) => e.id === refId) as Line | undefined;
  const tgt = entities.find((e) => e.id === targetId) as Line | undefined;

  if (!ref || !tgt || ref.type !== SketchEntityType.LINE || tgt.type !== SketchEntityType.LINE) {
    return entities;
  }

  const angle = lineAngle(ref);
  const tgtLen = lineLength(tgt);
  const cx = midpoint(tgt).x;
  const cy = midpoint(tgt).y;
  const half = tgtLen / 2;

  return updateLine(entities, targetId, {
    start: { x: cx - Math.cos(angle) * half, y: cy - Math.sin(angle) * half },
    end: { x: cx + Math.cos(angle) * half, y: cy + Math.sin(angle) * half },
  });
}

/**
 * PERPENDICULAR — hace que entities[1] sea perpendicular a entities[0].
 * Ambas deben ser Line. entities[1] se rota 90° respecto a entities[0].
 */
function solvePerpendicular(entities: SketchEntity[], constraint: Constraint): SketchEntity[] {
  const [refId, targetId] = constraint.entities;
  const ref = entities.find((e) => e.id === refId) as Line | undefined;
  const tgt = entities.find((e) => e.id === targetId) as Line | undefined;

  if (!ref || !tgt || ref.type !== SketchEntityType.LINE || tgt.type !== SketchEntityType.LINE) {
    return entities;
  }

  const angle = lineAngle(ref) + Math.PI / 2; // +90°
  const tgtLen = lineLength(tgt);
  const cx = midpoint(tgt).x;
  const cy = midpoint(tgt).y;
  const half = tgtLen / 2;

  return updateLine(entities, targetId, {
    start: { x: cx - Math.cos(angle) * half, y: cy - Math.sin(angle) * half },
    end: { x: cx + Math.cos(angle) * half, y: cy + Math.sin(angle) * half },
  });
}

/**
 * TANGENT — hace que el extremo más cercano al círculo quede sobre su superficie.
 * entities[0] = Line id, entities[1] = Circle id.
 *
 * Snap estable: proyecta el extremo más cercano en la dirección
 * (extremo → centro del círculo) al radio exacto. Idempotente bajo múltiples pasadas.
 */
function solveTangent(entities: SketchEntity[], constraint: Constraint): SketchEntity[] {
  const [lineId, circleId] = constraint.entities;
  const line = entities.find((e) => e.id === lineId) as Line | undefined;
  const circle = entities.find((e) => e.id === circleId) as Circle | undefined;

  if (
    !line ||
    !circle ||
    line.type !== SketchEntityType.LINE ||
    circle.type !== SketchEntityType.CIRCLE
  ) {
    return entities;
  }

  const { center, radius } = circle;

  const distStart = Math.sqrt((line.start.x - center.x) ** 2 + (line.start.y - center.y) ** 2);
  const distEnd = Math.sqrt((line.end.x - center.x) ** 2 + (line.end.y - center.y) ** 2);

  const useStart = distStart < distEnd;
  const near = useStart ? line.start : line.end;

  // Dirección desde el centro del círculo hacia el extremo (para conservarla)
  const dirX = near.x - center.x;
  const dirY = near.y - center.y;
  const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);

  if (dirLen === 0) return entities; // extremo coincide con el centro

  // Snap al punto de la superficie del círculo en la misma dirección
  const snapX = center.x + (dirX / dirLen) * radius;
  const snapY = center.y + (dirY / dirLen) * radius;

  if (useStart) {
    return updateLine(entities, lineId, { start: { x: snapX, y: snapY } });
  } else {
    return updateLine(entities, lineId, { end: { x: snapX, y: snapY } });
  }
}

// ─── Solver principal ─────────────────────────────────────────────────────────

const SOLVERS: Record<
  ConstraintType,
  (entities: SketchEntity[], constraint: Constraint) => SketchEntity[]
> = {
  [ConstraintType.HORIZONTAL]: solveHorizontal,
  [ConstraintType.VERTICAL]: solveVertical,
  [ConstraintType.DISTANCE]: solveDistance,
  [ConstraintType.EQUAL]: solveEqual,
  [ConstraintType.CONCENTRIC]: solveConcentric,
  [ConstraintType.PARALLEL]: solveParallel,
  [ConstraintType.PERPENDICULAR]: solvePerpendicular,
  [ConstraintType.TANGENT]: solveTangent,
};

/**
 * Aplica todas las restricciones sobre el array de entidades.
 * Retorna una copia inmutable con las entidades actualizadas.
 *
 * @param entities - Entidades actuales del sketch
 * @param constraints - Lista de restricciones a aplicar
 * @param passes - Número de pasadas del solver (defecto 3, para convergencia)
 */
export function solveConstraints(
  entities: SketchEntity[],
  constraints: Constraint[],
  passes = 3
): SketchEntity[] {
  let result = [...entities];

  for (let pass = 0; pass < passes; pass++) {
    for (const constraint of constraints) {
      const solver = SOLVERS[constraint.type];
      if (solver) {
        result = solver(result, constraint);
      }
    }
  }

  return result;
}

/**
 * Crea una restricción nueva con ID generado.
 */
export function createConstraint(
  type: ConstraintType,
  entityIds: string[],
  value?: number
): Constraint {
  return {
    id: nanoid(),
    type,
    entities: entityIds,
    value,
  };
}

/**
 * Verifica si una restricción es válida para las entidades dadas.
 * Retorna `null` si es válida, o un mensaje de error.
 */
export function validateConstraint(
  type: ConstraintType,
  entities: SketchEntity[],
  entityIds: string[]
): string | null {
  const targets = entityIds.map((id) => entities.find((e) => e.id === id));

  if (targets.some((t) => t == null)) {
    return 'Una o más entidades no existen';
  }

  switch (type) {
    case ConstraintType.HORIZONTAL:
    case ConstraintType.VERTICAL:
    case ConstraintType.DISTANCE:
      if (entityIds.length !== 1) return 'Requiere exactamente 1 entidad';
      if (
        (type === ConstraintType.HORIZONTAL || type === ConstraintType.VERTICAL) &&
        targets[0]?.type !== SketchEntityType.LINE
      ) {
        return 'HORIZONTAL/VERTICAL solo aplica a líneas';
      }
      break;

    case ConstraintType.EQUAL:
    case ConstraintType.PARALLEL:
    case ConstraintType.PERPENDICULAR:
    case ConstraintType.CONCENTRIC:
    case ConstraintType.TANGENT:
      if (entityIds.length !== 2) return 'Requiere exactamente 2 entidades';
      break;
  }

  return null;
}
