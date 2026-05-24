import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportConstraintsToCSV, downloadCSV } from '../constraintExporter';
import { ConstraintType, SketchEntityType } from '@capycad/shared-types';
import type { Constraint, SketchEntity } from '@capycad/shared-types';

function makeEntity(id: string, type: SketchEntityType): SketchEntity {
  return { id, type, data: {} } as unknown as SketchEntity;
}

function makeConstraint(
  id: string,
  type: ConstraintType,
  entities: string[],
  value?: number
): Constraint {
  return { id, type, entities, value } as Constraint;
}

describe('exportConstraintsToCSV', () => {
  it('returns header row when no constraints', () => {
    const csv = exportConstraintsToCSV([], []);
    expect(csv).toBe('ID,Tipo,Entidades,Valor,Tipo_Entidad_1,Tipo_Entidad_2');
  });

  it('exports a single HORIZONTAL constraint', () => {
    const entities = [makeEntity('e1', SketchEntityType.LINE)];
    const constraints = [makeConstraint('c1', ConstraintType.HORIZONTAL, ['e1'])];
    const csv = exportConstraintsToCSV(constraints, entities);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('c1,Horizontal,e1,,Línea,');
  });

  it('exports a DISTANCE constraint with value', () => {
    const entities = [makeEntity('e1', SketchEntityType.LINE)];
    const constraints = [makeConstraint('c1', ConstraintType.DISTANCE, ['e1'], 42.5)];
    const csv = exportConstraintsToCSV(constraints, entities);
    const lines = csv.split('\n');
    expect(lines[1]).toContain('42.5');
    expect(lines[1]).toBe('c1,Distancia,e1,42.5,Línea,');
  });

  it('exports a two-entity constraint with both entity types', () => {
    const entities = [
      makeEntity('e1', SketchEntityType.LINE),
      makeEntity('e2', SketchEntityType.LINE),
    ];
    const constraints = [makeConstraint('c1', ConstraintType.PARALLEL, ['e1', 'e2'])];
    const csv = exportConstraintsToCSV(constraints, entities);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('c1,Paralelo,e1;e2,,Línea,Línea');
  });

  it('exports CONCENTRIC constraint for two circles', () => {
    const entities = [
      makeEntity('e1', SketchEntityType.CIRCLE),
      makeEntity('e2', SketchEntityType.CIRCLE),
    ];
    const constraints = [makeConstraint('c1', ConstraintType.CONCENTRIC, ['e1', 'e2'])];
    const csv = exportConstraintsToCSV(constraints, entities);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('c1,Concéntrico,e1;e2,,Círculo,Círculo');
  });

  it('exports multiple constraints', () => {
    const entities = [
      makeEntity('e1', SketchEntityType.LINE),
      makeEntity('e2', SketchEntityType.LINE),
    ];
    const constraints = [
      makeConstraint('c1', ConstraintType.HORIZONTAL, ['e1']),
      makeConstraint('c2', ConstraintType.PERPENDICULAR, ['e1', 'e2']),
    ];
    const csv = exportConstraintsToCSV(constraints, entities);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
  });

  it('handles unknown entity type gracefully', () => {
    const entities = [makeEntity('e1', 'UNKNOWN_TYPE' as SketchEntityType)];
    const constraints = [makeConstraint('c1', ConstraintType.DISTANCE, ['e1'], 10)];
    const csv = exportConstraintsToCSV(constraints, entities);
    const lines = csv.split('\n');
    expect(lines[1]).toContain('UNKNOWN_TYPE');
  });

  it('handles missing entity gracefully', () => {
    const constraints = [makeConstraint('c1', ConstraintType.HORIZONTAL, ['nonexistent'])];
    const csv = exportConstraintsToCSV(constraints, []);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('c1,Horizontal,nonexistent,,,');
  });
});

describe('downloadCSV', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates and clicks a download link', () => {
    const mockClick = vi.fn();
    const mockLink = { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
    const revokeURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const createURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');

    downloadCSV('a,b,c\n1,2,3');

    expect(createURL).toHaveBeenCalledOnce();
    expect(mockLink.download).toBe('parametros.csv');
    expect(mockClick).toHaveBeenCalledOnce();
    expect(revokeURL).toHaveBeenCalledWith('blob:test');
  });

  it('uses custom filename when provided', () => {
    const mockLink = { href: '', download: '', click: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    downloadCSV('data', 'custom.csv');
    expect(mockLink.download).toBe('custom.csv');
  });
});
