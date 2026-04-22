import { useMemo } from 'react';
import type { SketchEntity, Constraint } from '@stl-model/shared-types';
import { ConstraintType, SketchEntityType } from '@stl-model/shared-types';
import type { Line, Circle, Arc, Rectangle, Polygon } from '@stl-model/shared-types';

interface ConstraintOverlayProps {
  constraints: Constraint[];
  entities: SketchEntity[];
  vt: number[];
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

interface Position {
  x: number;
  y: number;
}

const CONSTRAINT_SYMBOLS: Record<ConstraintType, string> = {
  [ConstraintType.HORIZONTAL]: 'H',
  [ConstraintType.VERTICAL]: 'V',
  [ConstraintType.DISTANCE]: 'D',
  [ConstraintType.EQUAL]: '=',
  [ConstraintType.CONCENTRIC]: '◎',
  [ConstraintType.PARALLEL]: '∥',
  [ConstraintType.PERPENDICULAR]: '⊥',
  [ConstraintType.TANGENT]: '⊤',
};

const CONSTRAINT_COLORS: Record<ConstraintType, string> = {
  [ConstraintType.HORIZONTAL]: '#f59e0b',
  [ConstraintType.VERTICAL]: '#f59e0b',
  [ConstraintType.DISTANCE]: '#3b82f6',
  [ConstraintType.EQUAL]: '#8b5cf6',
  [ConstraintType.CONCENTRIC]: '#ec4899',
  [ConstraintType.PARALLEL]: '#10b981',
  [ConstraintType.PERPENDICULAR]: '#10b981',
  [ConstraintType.TANGENT]: '#06b6d4',
};

function getEntityCenter(entity: SketchEntity): Position | null {
  switch (entity.type) {
    case SketchEntityType.LINE: {
      const line = entity as Line;
      return {
        x: (line.start.x + line.end.x) / 2,
        y: (line.start.y + line.end.y) / 2,
      };
    }
    case SketchEntityType.CIRCLE: {
      const circle = entity as Circle;
      return { x: circle.center.x, y: circle.center.y };
    }
    case SketchEntityType.ARC: {
      const arc = entity as Arc;
      return { x: arc.center.x, y: arc.center.y };
    }
    case SketchEntityType.RECTANGLE: {
      const rect = entity as Rectangle;
      return {
        x: (rect.topLeft.x + rect.bottomRight.x) / 2,
        y: (rect.topLeft.y + rect.bottomRight.y) / 2,
      };
    }
    case SketchEntityType.POLYGON: {
      const poly = entity as Polygon;
      return { x: poly.center.x, y: poly.center.y };
    }
    default:
      return null;
  }
}

function toScreenCoords(pos: Position, vt: number[]): Position {
  const scaleX = vt[0] ?? 1;
  const scaleY = vt[3] ?? 1;
  const translateX = vt[4] ?? 0;
  const translateY = vt[5] ?? 0;
  return {
    x: pos.x * scaleX + translateX,
    y: pos.y * scaleY + translateY,
  };
}

export default function ConstraintOverlay({
  constraints,
  entities,
  vt,
  canvasRef,
}: ConstraintOverlayProps) {
  const canvas = canvasRef.current;
  if (!canvas || constraints.length === 0) return null;

  const W = canvas.width;
  const H = canvas.height;

  const entityMap = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);

  const indicators = useMemo(() => {
    return constraints
      .map((c) => {
        // For single-entity or two-entity constraints, compute midpoint
        const positions = c.entities
          .map((id) => {
            const ent = entityMap.get(id);
            return ent ? getEntityCenter(ent) : null;
          })
          .filter(Boolean) as Position[];

        if (positions.length === 0) return null;

        const center: Position = {
          x: positions.reduce((s, p) => s + p.x, 0) / positions.length,
          y: positions.reduce((s, p) => s + p.y, 0) / positions.length,
        };

        const screenPos = toScreenCoords(center, vt);

        // Offset slightly so it doesn't overlap the entity directly
        const offsetY = -14;

        return {
          id: c.id,
          type: c.type,
          value: c.value,
          x: screenPos.x,
          y: screenPos.y + offsetY,
          symbol: CONSTRAINT_SYMBOLS[c.type],
          color: CONSTRAINT_COLORS[c.type],
        };
      })
      .filter(Boolean);
  }, [constraints, entityMap, vt]);

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={W}
      height={H}
      style={{ overflow: 'hidden' }}
      data-testid="constraint-overlay"
    >
      {indicators.map((ind) => {
        if (!ind) return null;
        const label =
          ind.type === ConstraintType.DISTANCE && ind.value != null
            ? `${ind.symbol}${ind.value}`
            : ind.symbol;

        return (
          <g key={ind.id}>
            <rect
              x={ind.x - 1}
              y={ind.y - 10}
              width={label.length * 7 + 6}
              height={14}
              rx={3}
              fill={ind.color}
              fillOpacity={0.15}
              stroke={ind.color}
              strokeWidth={0.5}
              strokeOpacity={0.4}
            />
            <text
              x={ind.x + 2}
              y={ind.y}
              fill={ind.color}
              fontSize={10}
              fontFamily="monospace"
              fontWeight="bold"
              opacity={0.85}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
