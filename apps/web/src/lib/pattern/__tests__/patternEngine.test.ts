/**
 * Tests para patternEngine.ts
 * US-011: Patrones de repetición (lineal y circular)
 *
 * TDD RED → implementar patternEngine para pasar estos tests.
 */
import { describe, it, expect } from 'vitest';
import { Matrix4, Vector3, BufferGeometry, Float32BufferAttribute } from 'three';
import {
  computeLinearTransforms,
  computeCircularTransforms,
  applyTransformToGeometry,
  mergePatternGeometries,
} from '../patternEngine';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Crea una geometría de tetraedro básico para tests */
function makeTestGeometry(): BufferGeometry {
  const geo = new BufferGeometry();
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geo;
}

function matrixTranslation(m: Matrix4): { x: number; y: number; z: number } {
  const e = m.elements;
  return { x: e[12], y: e[13], z: e[14] };
}

// ─── computeLinearTransforms ──────────────────────────────────────────────────

describe('computeLinearTransforms', () => {
  it('should return exactly `instances` transforms', () => {
    const transforms = computeLinearTransforms({
      direction: { x: 1, y: 0, z: 0 },
      spacing: 10,
      instances: 4,
    });
    expect(transforms).toHaveLength(4);
  });

  it('first transform should be identity (the original)', () => {
    const transforms = computeLinearTransforms({
      direction: { x: 1, y: 0, z: 0 },
      spacing: 10,
      instances: 3,
    });
    const identity = new Matrix4();
    expect(transforms[0].equals(identity)).toBe(true);
  });

  it('should space transforms by spacing along direction', () => {
    const transforms = computeLinearTransforms({
      direction: { x: 1, y: 0, z: 0 },
      spacing: 10,
      instances: 3,
    });
    const t1 = matrixTranslation(transforms[1]);
    const t2 = matrixTranslation(transforms[2]);
    expect(t1.x).toBeCloseTo(10);
    expect(t2.x).toBeCloseTo(20);
  });

  it('should normalize direction vector', () => {
    const transforms = computeLinearTransforms({
      direction: { x: 2, y: 0, z: 0 }, // unnormalized
      spacing: 5,
      instances: 2,
    });
    const t1 = matrixTranslation(transforms[1]);
    expect(t1.x).toBeCloseTo(5); // not 10
  });

  it('should work with arbitrary 3D direction', () => {
    const transforms = computeLinearTransforms({
      direction: { x: 0, y: 0, z: 1 },
      spacing: 7,
      instances: 2,
    });
    const t1 = matrixTranslation(transforms[1]);
    expect(t1.z).toBeCloseTo(7);
    expect(t1.x).toBeCloseTo(0);
    expect(t1.y).toBeCloseTo(0);
  });

  it('should handle instances = 1 (only original)', () => {
    const transforms = computeLinearTransforms({
      direction: { x: 1, y: 0, z: 0 },
      spacing: 10,
      instances: 1,
    });
    expect(transforms).toHaveLength(1);
    expect(transforms[0].equals(new Matrix4())).toBe(true);
  });

  it('should throw if instances < 1', () => {
    expect(() =>
      computeLinearTransforms({ direction: { x: 1, y: 0, z: 0 }, spacing: 10, instances: 0 })
    ).toThrow();
  });

  it('should throw if spacing <= 0', () => {
    expect(() =>
      computeLinearTransforms({ direction: { x: 1, y: 0, z: 0 }, spacing: 0, instances: 3 })
    ).toThrow();
  });
});

// ─── computeCircularTransforms ────────────────────────────────────────────────

describe('computeCircularTransforms', () => {
  const defaultAxis = {
    start: { x: 0, y: 0, z: 0 },
    end: { x: 0, y: 1, z: 0 }, // Y axis
  };

  it('should return exactly `instances` transforms', () => {
    const transforms = computeCircularTransforms({
      axis: defaultAxis,
      instances: 6,
    });
    expect(transforms).toHaveLength(6);
  });

  it('first transform should be identity (the original)', () => {
    const transforms = computeCircularTransforms({
      axis: defaultAxis,
      instances: 4,
    });
    expect(transforms[0].equals(new Matrix4())).toBe(true);
  });

  it('should evenly distribute 4 instances at 90° apart around Y axis', () => {
    const transforms = computeCircularTransforms({
      axis: defaultAxis,
      instances: 4,
      totalAngle: 360,
    });
    // Apply each transform to point (1, 0, 0)
    const points = transforms.map((m) => {
      const v = new Vector3(1, 0, 0);
      v.applyMatrix4(m);
      return v;
    });
    // Instance 0: (1,0,0) → identity
    expect(points[0].x).toBeCloseTo(1);
    expect(points[0].z).toBeCloseTo(0);
    // Instance 1: 90° → (0,0,-1) in right-hand convention rotating around +Y
    expect(points[1].x).toBeCloseTo(0);
    expect(points[1].z).toBeCloseTo(-1);
  });

  it('should handle totalAngle = 180 (half circle)', () => {
    const transforms = computeCircularTransforms({
      axis: defaultAxis,
      instances: 3,
      totalAngle: 180,
    });
    // step = 180/3 = 60°; instance 2 is at 120°
    // Rotating (1,0,0) by 120° around +Y: x=cos(120°)=-0.5, z=-sin(120°)≈-0.866
    const v = new Vector3(1, 0, 0);
    v.applyMatrix4(transforms[2]);
    expect(v.x).toBeCloseTo(-0.5);
    expect(v.z).toBeCloseTo(-Math.sqrt(3) / 2);
  });

  it('should default to 360° if totalAngle is omitted', () => {
    const t6 = computeCircularTransforms({ axis: defaultAxis, instances: 6 });
    // 6 instances at 360° → step = 60°
    expect(t6).toHaveLength(6);
  });

  it('should throw if instances < 1', () => {
    expect(() => computeCircularTransforms({ axis: defaultAxis, instances: 0 })).toThrow();
  });

  it('should work with axis not at origin (translates and rotates)', () => {
    const axis = {
      start: { x: 5, y: 0, z: 0 },
      end: { x: 5, y: 1, z: 0 },
    };
    const transforms = computeCircularTransforms({ axis, instances: 4, totalAngle: 360 });
    expect(transforms).toHaveLength(4);
    // First transform (index 0) should be identity
    expect(transforms[0].equals(new Matrix4())).toBe(true);
  });
});

// ─── applyTransformToGeometry ─────────────────────────────────────────────────

describe('applyTransformToGeometry', () => {
  it('should return a new geometry (not mutate the original)', () => {
    const geo = makeTestGeometry();
    const matrix = new Matrix4().makeTranslation(10, 0, 0);
    const result = applyTransformToGeometry(geo, matrix);
    expect(result).not.toBe(geo);
    // Original should be unchanged
    const origPositions = (geo.getAttribute('position') as any).array;
    expect(origPositions[0]).toBe(0);
  });

  it('should translate positions by the matrix', () => {
    const geo = makeTestGeometry();
    const matrix = new Matrix4().makeTranslation(5, 0, 0);
    const result = applyTransformToGeometry(geo, matrix);
    const positions = (result.getAttribute('position') as any).array;
    // First vertex was (0,0,0) → should be (5,0,0)
    expect(positions[0]).toBeCloseTo(5);
    expect(positions[1]).toBeCloseTo(0);
    expect(positions[2]).toBeCloseTo(0);
  });

  it('should apply identity matrix without changing geometry', () => {
    const geo = makeTestGeometry();
    const identity = new Matrix4();
    const result = applyTransformToGeometry(geo, identity);
    const origPos = (geo.getAttribute('position') as any).array;
    const newPos = (result.getAttribute('position') as any).array;
    for (let i = 0; i < origPos.length; i++) {
      expect(newPos[i]).toBeCloseTo(origPos[i]);
    }
  });

  it('should copy other attributes (normals, uvs) if present', () => {
    const geo = makeTestGeometry();
    const normals = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
    geo.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    const matrix = new Matrix4().makeTranslation(0, 5, 0);
    const result = applyTransformToGeometry(geo, matrix);
    expect(result.getAttribute('normal')).toBeDefined();
  });
});

// ─── mergePatternGeometries ───────────────────────────────────────────────────

describe('mergePatternGeometries', () => {
  it('should merge multiple geometries into one', () => {
    const geo = makeTestGeometry();
    const transforms = computeLinearTransforms({
      direction: { x: 1, y: 0, z: 0 },
      spacing: 10,
      instances: 3,
    });
    const merged = mergePatternGeometries(geo, transforms);
    expect(merged).toBeInstanceOf(BufferGeometry);
    const posAttr = merged.getAttribute('position');
    // 3 copies × 4 vertices = 12 vertices
    expect(posAttr.count).toBe(12);
  });

  it('should handle single instance (identity)', () => {
    const geo = makeTestGeometry();
    const transforms = [new Matrix4()];
    const merged = mergePatternGeometries(geo, transforms);
    const posAttr = merged.getAttribute('position');
    expect(posAttr.count).toBe(4);
  });

  it('first set of positions matches original geometry', () => {
    const geo = makeTestGeometry();
    const transforms = computeLinearTransforms({
      direction: { x: 0, y: 0, z: 1 },
      spacing: 5,
      instances: 2,
    });
    const merged = mergePatternGeometries(geo, transforms);
    const positions = (merged.getAttribute('position') as any).array;
    // First 4 vertices (positions 0..11) are the original (identity transform)
    expect(positions[0]).toBeCloseTo(0);
    expect(positions[1]).toBeCloseTo(0);
    expect(positions[2]).toBeCloseTo(0);
  });

  it('second set of positions is offset by spacing', () => {
    const geo = makeTestGeometry();
    const spacing = 10;
    const transforms = computeLinearTransforms({
      direction: { x: 1, y: 0, z: 0 },
      spacing,
      instances: 2,
    });
    const merged = mergePatternGeometries(geo, transforms);
    const positions = (merged.getAttribute('position') as any).array;
    // Second set starts at index 12 (4 verts × 3 components)
    // Original first vertex was (0,0,0) → transformed to (10, 0, 0)
    expect(positions[12]).toBeCloseTo(spacing);
    expect(positions[13]).toBeCloseTo(0);
    expect(positions[14]).toBeCloseTo(0);
  });
});
