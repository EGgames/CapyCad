import { describe, it, expect } from 'vitest';
import { analyzeDOF } from '../dofAnalyzer';
import { ConstraintType, SketchEntityType } from '@stl-model/shared-types';
import type { SketchEntity, Constraint } from '@stl-model/shared-types';

const makeLine = (id: string): SketchEntity =>
  ({
    id,
    type: SketchEntityType.LINE,
    selected: false,
    start: { x: 0, y: 0 },
    end: { x: 10, y: 0 },
  }) as any;

const makeCircle = (id: string): SketchEntity =>
  ({
    id,
    type: SketchEntityType.CIRCLE,
    selected: false,
    center: { x: 0, y: 0 },
    radius: 5,
  }) as any;

const makeConstraint = (type: ConstraintType, entities: string[], value?: number): Constraint => ({
  id: `c-${Math.random()}`,
  type,
  entities,
  value,
});

describe('analyzeDOF', () => {
  it('debe retornar 0 DOF sin entidades', () => {
    const result = analyzeDOF([], []);
    expect(result.totalDOF).toBe(0);
    expect(result.remainingDOF).toBe(0);
    expect(result.status).toBe('well-constrained');
  });

  it('debe calcular DOF de una línea (4)', () => {
    const result = analyzeDOF([makeLine('l1')], []);
    expect(result.totalDOF).toBe(4);
    expect(result.remainingDOF).toBe(4);
    expect(result.status).toBe('under-constrained');
  });

  it('debe calcular DOF de un círculo (3)', () => {
    const result = analyzeDOF([makeCircle('c1')], []);
    expect(result.totalDOF).toBe(3);
    expect(result.remainingDOF).toBe(3);
  });

  it('debe restar 1 DOF por constraint HORIZONTAL', () => {
    const entities = [makeLine('l1')];
    const constraints = [makeConstraint(ConstraintType.HORIZONTAL, ['l1'])];
    const result = analyzeDOF(entities, constraints);
    expect(result.removedDOF).toBe(1);
    expect(result.remainingDOF).toBe(3);
  });

  it('debe restar 2 DOF por constraint CONCENTRIC', () => {
    const entities = [makeCircle('c1'), makeCircle('c2')];
    const constraints = [makeConstraint(ConstraintType.CONCENTRIC, ['c1', 'c2'])];
    const result = analyzeDOF(entities, constraints);
    expect(result.totalDOF).toBe(6); // 3 + 3
    expect(result.removedDOF).toBe(2);
    expect(result.remainingDOF).toBe(4);
  });

  it('debe detectar well-constrained cuando DOF restantes = 0', () => {
    const entities = [makeLine('l1')];
    const constraints = [
      makeConstraint(ConstraintType.HORIZONTAL, ['l1']),
      makeConstraint(ConstraintType.VERTICAL, ['l1']),
      makeConstraint(ConstraintType.DISTANCE, ['l1'], 10),
      makeConstraint(ConstraintType.DISTANCE, ['l1'], 5),
    ];
    const result = analyzeDOF(entities, constraints);
    expect(result.status).toBe('well-constrained');
  });

  it('debe detectar over-constrained cuando removedDOF > totalDOF', () => {
    const entities = [makeLine('l1')];
    const constraints = [
      makeConstraint(ConstraintType.HORIZONTAL, ['l1']),
      makeConstraint(ConstraintType.VERTICAL, ['l1']),
      makeConstraint(ConstraintType.DISTANCE, ['l1'], 10),
      makeConstraint(ConstraintType.DISTANCE, ['l1'], 5),
      makeConstraint(ConstraintType.PARALLEL, ['l1']),
    ];
    const result = analyzeDOF(entities, constraints);
    expect(result.status).toBe('over-constrained');
  });

  it('debe sumar DOF de múltiples entidades', () => {
    const entities = [makeLine('l1'), makeLine('l2'), makeCircle('c1')];
    const result = analyzeDOF(entities, []);
    expect(result.totalDOF).toBe(4 + 4 + 3); // 11
  });
});
