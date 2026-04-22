/**
 * Tests para constraintSolver.ts
 * US-009: Restricciones paramétricas
 */
import { describe, it, expect } from 'vitest';
import { SketchEntityType, ConstraintType } from '@stl-model/shared-types';
import type { Line, Circle, Arc, SketchEntity } from '@stl-model/shared-types';
import { solveConstraints, createConstraint, validateConstraint } from '../constraintSolver';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLine(id: string, x1: number, y1: number, x2: number, y2: number): Line {
  return {
    id,
    type: SketchEntityType.LINE,
    selected: false,
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
  };
}

function makeCircle(id: string, cx: number, cy: number, r: number): Circle {
  return {
    id,
    type: SketchEntityType.CIRCLE,
    selected: false,
    center: { x: cx, y: cy },
    radius: r,
  };
}

function makeArc(id: string, cx: number, cy: number, r: number): Arc {
  return {
    id,
    type: SketchEntityType.ARC,
    selected: false,
    center: { x: cx, y: cy },
    radius: r,
    startAngle: 0,
    endAngle: Math.PI,
  };
}

// ─── HORIZONTAL ───────────────────────────────────────────────────────────────

describe('HORIZONTAL constraint', () => {
  it('should average start.y and end.y to make a horizontal line', () => {
    const line = makeLine('l1', 0, 10, 100, 20);
    const c = createConstraint(ConstraintType.HORIZONTAL, ['l1']);
    const result = solveConstraints([line], [c]) as Line[];
    const l = result.find((e) => e.id === 'l1') as Line;
    expect(l.start.y).toBeCloseTo(15);
    expect(l.end.y).toBeCloseTo(15);
  });

  it('should not change x coordinates', () => {
    const line = makeLine('l1', 5, 10, 95, 30);
    const c = createConstraint(ConstraintType.HORIZONTAL, ['l1']);
    const [l] = solveConstraints([line], [c]) as Line[];
    expect(l.start.x).toBe(5);
    expect(l.end.x).toBe(95);
  });

  it('should leave already-horizontal line unchanged', () => {
    const line = makeLine('l1', 0, 50, 100, 50);
    const c = createConstraint(ConstraintType.HORIZONTAL, ['l1']);
    const [l] = solveConstraints([line], [c]) as Line[];
    expect(l.start.y).toBeCloseTo(50);
    expect(l.end.y).toBeCloseTo(50);
  });

  it('should not affect other entities', () => {
    const line = makeLine('l1', 0, 10, 100, 20);
    const circle = makeCircle('c1', 50, 50, 10);
    const c = createConstraint(ConstraintType.HORIZONTAL, ['l1']);
    const result = solveConstraints([line, circle], [c]);
    const unchanged = result.find((e) => e.id === 'c1') as Circle;
    expect(unchanged.center).toEqual({ x: 50, y: 50 });
  });
});

// ─── VERTICAL ────────────────────────────────────────────────────────────────

describe('VERTICAL constraint', () => {
  it('should average start.x and end.x to make a vertical line', () => {
    const line = makeLine('l1', 10, 0, 20, 100);
    const c = createConstraint(ConstraintType.VERTICAL, ['l1']);
    const result = solveConstraints([line], [c]) as Line[];
    const l = result.find((e) => e.id === 'l1') as Line;
    expect(l.start.x).toBeCloseTo(15);
    expect(l.end.x).toBeCloseTo(15);
  });

  it('should not change y coordinates', () => {
    const line = makeLine('l1', 10, 5, 30, 95);
    const c = createConstraint(ConstraintType.VERTICAL, ['l1']);
    const [l] = solveConstraints([line], [c]) as Line[];
    expect(l.start.y).toBe(5);
    expect(l.end.y).toBe(95);
  });
});

// ─── DISTANCE ────────────────────────────────────────────────────────────────

describe('DISTANCE constraint', () => {
  it('should set exact line length while preserving midpoint', () => {
    const line = makeLine('l1', 0, 0, 10, 0); // length = 10
    const c = createConstraint(ConstraintType.DISTANCE, ['l1'], 20);
    const [l] = solveConstraints([line], [c]) as Line[];
    const len = Math.sqrt((l.end.x - l.start.x) ** 2 + (l.end.y - l.start.y) ** 2);
    expect(len).toBeCloseTo(20);
    // Midpoint should still be at (5, 0)
    expect((l.start.x + l.end.x) / 2).toBeCloseTo(5);
    expect((l.start.y + l.end.y) / 2).toBeCloseTo(0);
  });

  it('should set circle radius', () => {
    const circle = makeCircle('c1', 0, 0, 5);
    const c = createConstraint(ConstraintType.DISTANCE, ['c1'], 15);
    const [circ] = solveConstraints([circle], [c]) as Circle[];
    expect(circ.radius).toBe(15);
  });

  it('should set arc radius', () => {
    const arc = makeArc('a1', 0, 0, 5);
    const c = createConstraint(ConstraintType.DISTANCE, ['a1'], 12);
    const [a] = solveConstraints([arc], [c]) as Arc[];
    expect(a.radius).toBe(12);
  });

  it('should not apply if value is zero', () => {
    const line = makeLine('l1', 0, 0, 10, 0);
    const c = createConstraint(ConstraintType.DISTANCE, ['l1'], 0);
    const [l] = solveConstraints([line], [c]) as Line[];
    expect(l.start.x).toBe(0);
    expect(l.end.x).toBe(10);
  });
});

// ─── EQUAL ───────────────────────────────────────────────────────────────────

describe('EQUAL constraint', () => {
  it('should make second line same length as first', () => {
    const l1 = makeLine('l1', 0, 0, 30, 0); // length 30
    const l2 = makeLine('l2', 50, 50, 60, 50); // length 10
    const c = createConstraint(ConstraintType.EQUAL, ['l1', 'l2']);
    const result = solveConstraints([l1, l2], [c]);
    const r1 = result.find((e) => e.id === 'l1') as Line;
    const r2 = result.find((e) => e.id === 'l2') as Line;
    const len1 = Math.sqrt((r1.end.x - r1.start.x) ** 2 + (r1.end.y - r1.start.y) ** 2);
    const len2 = Math.sqrt((r2.end.x - r2.start.x) ** 2 + (r2.end.y - r2.start.y) ** 2);
    expect(len2).toBeCloseTo(len1);
  });

  it('should make second circle same radius as first', () => {
    const c1 = makeCircle('c1', 0, 0, 20);
    const c2 = makeCircle('c2', 100, 100, 5);
    const constraint = createConstraint(ConstraintType.EQUAL, ['c1', 'c2']);
    const result = solveConstraints([c1, c2], [constraint]);
    const r2 = (result.find((e) => e.id === 'c2') as Circle).radius;
    expect(r2).toBeCloseTo(20);
  });

  it('should preserve midpoint of target line', () => {
    const l1 = makeLine('l1', 0, 0, 20, 0); // length 20
    const l2 = makeLine('l2', 50, 50, 60, 50); // midpoint at (55, 50)
    const c = createConstraint(ConstraintType.EQUAL, ['l1', 'l2']);
    const result = solveConstraints([l1, l2], [c]);
    const r2 = result.find((e) => e.id === 'l2') as Line;
    const midX = (r2.start.x + r2.end.x) / 2;
    const midY = (r2.start.y + r2.end.y) / 2;
    expect(midX).toBeCloseTo(55);
    expect(midY).toBeCloseTo(50);
  });
});

// ─── CONCENTRIC ───────────────────────────────────────────────────────────────

describe('CONCENTRIC constraint', () => {
  it('should move second circle center to match first', () => {
    const c1 = makeCircle('c1', 10, 20, 15);
    const c2 = makeCircle('c2', 80, 90, 5);
    const constraint = createConstraint(ConstraintType.CONCENTRIC, ['c1', 'c2']);
    const result = solveConstraints([c1, c2], [constraint]);
    const r2 = result.find((e) => e.id === 'c2') as Circle;
    expect(r2.center.x).toBeCloseTo(10);
    expect(r2.center.y).toBeCloseTo(20);
  });

  it('should not change radii', () => {
    const c1 = makeCircle('c1', 0, 0, 10);
    const c2 = makeCircle('c2', 50, 50, 25);
    const constraint = createConstraint(ConstraintType.CONCENTRIC, ['c1', 'c2']);
    const result = solveConstraints([c1, c2], [constraint]);
    const r1 = result.find((e) => e.id === 'c1') as Circle;
    const r2 = result.find((e) => e.id === 'c2') as Circle;
    expect(r1.radius).toBe(10);
    expect(r2.radius).toBe(25);
  });
});

// ─── PARALLEL ────────────────────────────────────────────────────────────────

describe('PARALLEL constraint', () => {
  it('should make second line parallel to first (same angle)', () => {
    const l1 = makeLine('l1', 0, 0, 10, 10); // 45°
    const l2 = makeLine('l2', 50, 50, 100, 50); // horizontal
    const c = createConstraint(ConstraintType.PARALLEL, ['l1', 'l2']);
    const result = solveConstraints([l1, l2], [c]);
    const r1 = result.find((e) => e.id === 'l1') as Line;
    const r2 = result.find((e) => e.id === 'l2') as Line;
    const angle1 = Math.atan2(r1.end.y - r1.start.y, r1.end.x - r1.start.x);
    const angle2 = Math.atan2(r2.end.y - r2.start.y, r2.end.x - r2.start.x);
    expect(angle2).toBeCloseTo(angle1);
  });

  it('should preserve length of target line', () => {
    const l1 = makeLine('l1', 0, 0, 10, 10);
    const l2 = makeLine('l2', 50, 50, 100, 50); // length 50
    const c = createConstraint(ConstraintType.PARALLEL, ['l1', 'l2']);
    const result = solveConstraints([l1, l2], [c]);
    const r2 = result.find((e) => e.id === 'l2') as Line;
    const len = Math.sqrt((r2.end.x - r2.start.x) ** 2 + (r2.end.y - r2.start.y) ** 2);
    expect(len).toBeCloseTo(50);
  });
});

// ─── PERPENDICULAR ───────────────────────────────────────────────────────────

describe('PERPENDICULAR constraint', () => {
  it('should make second line perpendicular to first (90° difference)', () => {
    const l1 = makeLine('l1', 0, 0, 10, 0); // horizontal (0°)
    const l2 = makeLine('l2', 50, 50, 100, 50); // also horizontal
    const c = createConstraint(ConstraintType.PERPENDICULAR, ['l1', 'l2']);
    const result = solveConstraints([l1, l2], [c]);
    const r1 = result.find((e) => e.id === 'l1') as Line;
    const r2 = result.find((e) => e.id === 'l2') as Line;
    const angle1 = Math.atan2(r1.end.y - r1.start.y, r1.end.x - r1.start.x);
    const angle2 = Math.atan2(r2.end.y - r2.start.y, r2.end.x - r2.start.x);
    const diff = Math.abs(angle2 - angle1);
    // diff should be ~PI/2 (or ~3PI/2 depending on sign)
    expect(diff).toBeCloseTo(Math.PI / 2);
  });
});

// ─── TANGENT ─────────────────────────────────────────────────────────────────

describe('TANGENT constraint', () => {
  it('should move endpoint of line to tangent point on circle', () => {
    const line = makeLine('l1', 50, 50, 100, 50); // horizontal line ending near circle
    const circle = makeCircle('c1', 110, 50, 10);
    const c = createConstraint(ConstraintType.TANGENT, ['l1', 'c1']);
    const result = solveConstraints([line, circle], [c]);
    const l = result.find((e) => e.id === 'l1') as Line;
    // The end point (closer to circle) should be approx on the circle surface
    const dist = Math.sqrt((l.end.x - circle.center.x) ** 2 + (l.end.y - circle.center.y) ** 2);
    expect(dist).toBeCloseTo(circle.radius, 5);
  });
});

// ─── createConstraint ─────────────────────────────────────────────────────────

describe('createConstraint', () => {
  it('should create a constraint with generated id', () => {
    const c = createConstraint(ConstraintType.HORIZONTAL, ['l1']);
    expect(c.id).toBeTruthy();
    expect(c.type).toBe(ConstraintType.HORIZONTAL);
    expect(c.entities).toEqual(['l1']);
    expect(c.value).toBeUndefined();
  });

  it('should include value when provided', () => {
    const c = createConstraint(ConstraintType.DISTANCE, ['l1'], 42);
    expect(c.value).toBe(42);
  });

  it('should generate unique ids', () => {
    const c1 = createConstraint(ConstraintType.HORIZONTAL, ['l1']);
    const c2 = createConstraint(ConstraintType.HORIZONTAL, ['l1']);
    expect(c1.id).not.toBe(c2.id);
  });
});

// ─── validateConstraint ───────────────────────────────────────────────────────

describe('validateConstraint', () => {
  const line = makeLine('l1', 0, 0, 10, 0);
  const circle = makeCircle('c1', 50, 50, 5);
  const entities: SketchEntity[] = [line, circle];

  it('should return null for valid HORIZONTAL (single line)', () => {
    expect(validateConstraint(ConstraintType.HORIZONTAL, entities, ['l1'])).toBeNull();
  });

  it('should return null for valid DISTANCE (single entity)', () => {
    expect(validateConstraint(ConstraintType.DISTANCE, entities, ['l1'])).toBeNull();
  });

  it('should return null for valid EQUAL (two entities)', () => {
    expect(validateConstraint(ConstraintType.EQUAL, entities, ['l1', 'c1'])).toBeNull();
  });

  it('should return error when HORIZONTAL has wrong entity count', () => {
    expect(validateConstraint(ConstraintType.HORIZONTAL, entities, ['l1', 'c1'])).not.toBeNull();
  });

  it('should return error when HORIZONTAL applied to circle', () => {
    expect(validateConstraint(ConstraintType.HORIZONTAL, entities, ['c1'])).not.toBeNull();
  });

  it('should return error when entity does not exist', () => {
    expect(validateConstraint(ConstraintType.HORIZONTAL, entities, ['nonexistent'])).not.toBeNull();
  });

  it('should return error for PARALLEL with only one entity', () => {
    expect(validateConstraint(ConstraintType.PARALLEL, entities, ['l1'])).not.toBeNull();
  });
});

// ─── Multi-constraint convergence ────────────────────────────────────────────

describe('solveConstraints multi-pass convergence', () => {
  it('should handle multiple constraints without errors', () => {
    const l1 = makeLine('l1', 0, 0, 10, 10);
    const l2 = makeLine('l2', 20, 15, 40, 15);
    const c1 = createConstraint(ConstraintType.HORIZONTAL, ['l2']);
    const c2 = createConstraint(ConstraintType.PARALLEL, ['l1', 'l2']);
    // These two constraints conflict; the last one applied wins
    // Just verify it doesn't throw and returns entities
    const result = solveConstraints([l1, l2], [c1, c2]);
    expect(result).toHaveLength(2);
  });

  it('should return original entities if no constraints', () => {
    const line = makeLine('l1', 0, 0, 10, 10);
    const result = solveConstraints([line], []);
    expect(result[0]).toEqual(line);
  });

  it('should not mutate input entities array', () => {
    const line = makeLine('l1', 0, 0, 10, 10);
    const original = { ...line, start: { ...line.start }, end: { ...line.end } };
    const c = createConstraint(ConstraintType.HORIZONTAL, ['l1']);
    solveConstraints([line], [c]);
    expect(line.start.y).toBe(original.start.y);
    expect(line.end.y).toBe(original.end.y);
  });
});
