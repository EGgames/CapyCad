/**
 * Tests unitarios — m3fExporter
 * FUNC-013: Exportar modelo a M3F
 *
 * Convenciones: methodName_whenCondition_thenExpectedBehavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } from 'three';
import { buildM3FData, exportToM3F } from '../m3fExporter';
import type { M3FExportOptions } from '../m3fExporter';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGeometryMap(
  count = 1,
  visible = true
): Map<string, { geometry: BufferGeometry; visible: boolean; name?: string }> {
  const map = new Map<string, { geometry: BufferGeometry; visible: boolean; name?: string }>();
  for (let i = 0; i < count; i++) {
    const geo = new BufferGeometry();
    // Triángulo simple
    geo.setAttribute(
      'position',
      new Float32BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3)
    );
    geo.setAttribute(
      'normal',
      new Float32BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3)
    );
    geo.setIndex(new Uint32BufferAttribute(new Uint32Array([0, 1, 2]), 1));
    map.set(`feat-${i}`, { geometry: geo, visible, name: `Mesh ${i}` });
  }
  return map;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('m3fExporter', () => {
  // ─── buildM3FData ──────────────────────────────────────────────────────────

  describe('buildM3FData', () => {
    it('buildM3FData_whenSingleGeometry_thenReturnValidM3FObject', () => {
      const geos = makeGeometryMap(1);
      const result = buildM3FData(geos);

      expect(result.version).toBe('1.0');
      expect(result.meshes).toHaveLength(1);
      expect(result.metrics.meshCount).toBe(1);
      expect(result.metrics.vertexCount).toBe(3);
      expect(result.metrics.triangleCount).toBe(1);
    });

    it('buildM3FData_whenMultipleGeometries_thenAllMeshesIncluded', () => {
      const geos = makeGeometryMap(3);
      const result = buildM3FData(geos);

      expect(result.meshes).toHaveLength(3);
      expect(result.metrics.meshCount).toBe(3);
      expect(result.metrics.vertexCount).toBe(9);
      expect(result.metrics.triangleCount).toBe(3);
    });

    it('buildM3FData_whenNoVisibleGeometries_thenThrows', () => {
      const geos = makeGeometryMap(2, false);

      expect(() => buildM3FData(geos)).toThrow('No hay geometrías visibles para exportar');
    });

    it('buildM3FData_whenEmptyMap_thenThrows', () => {
      const geos = new Map<string, { geometry: BufferGeometry; visible: boolean; name?: string }>();

      expect(() => buildM3FData(geos)).toThrow();
    });

    it('buildM3FData_whenCustomOptions_thenOptionsApplied', () => {
      const geos = makeGeometryMap(1);
      const opts: M3FExportOptions = {
        projectName: 'Mi Proyecto',
        units: 'cm',
        manufacturing: { material: 'ABS', tolerance: 0.1 },
      };
      const result = buildM3FData(geos, opts);

      expect(result.projectName).toBe('Mi Proyecto');
      expect(result.units).toBe('cm');
      expect(result.manufacturing.material).toBe('ABS');
      expect(result.manufacturing.tolerance).toBe(0.1);
    });

    it('buildM3FData_whenDefaultOptions_thenUsesMmAndPLA', () => {
      const geos = makeGeometryMap(1);
      const result = buildM3FData(geos);

      expect(result.units).toBe('mm');
      expect(result.manufacturing.material).toBe('PLA');
      expect(result.manufacturing.infillPercent).toBe(20);
    });

    it('buildM3FData_whenGeometryHasNormals_thenFaceNormalsPresent', () => {
      const geos = makeGeometryMap(1);
      const result = buildM3FData(geos);

      expect(result.meshes[0].faceNormals).toBeDefined();
      expect(result.meshes[0].faceNormals).toHaveLength(1);
    });

    it('buildM3FData_whenIndexedGeometry_thenTrianglesUseIndices', () => {
      const geos = makeGeometryMap(1);
      const result = buildM3FData(geos);

      // El triángulo indexado [0, 1, 2]
      expect(result.meshes[0].triangles[0]).toEqual([0, 1, 2]);
    });

    it('buildM3FData_whenNonIndexedGeometry_thenGeneratesSequentialTriangles', () => {
      const map = new Map<string, { geometry: BufferGeometry; visible: boolean }>();
      const geo = new BufferGeometry();
      geo.setAttribute(
        'position',
        new Float32BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3)
      );
      // Sin setIndex → no indexado
      map.set('feat-0', { geometry: geo, visible: true });

      const result = buildM3FData(map);
      expect(result.meshes[0].triangles[0]).toEqual([0, 1, 2]);
    });

    it('buildM3FData_whenGeometryHasVertices_thenBoundingBoxComputed', () => {
      const geos = makeGeometryMap(1);
      const result = buildM3FData(geos);

      const { min, max, size } = result.metrics.boundingBox;
      expect(min).toEqual([0, 0, 0]);
      expect(max).toEqual([1, 1, 0]);
      expect(size).toEqual([1, 1, 0]);
    });

    it('buildM3FData_whenGeometryNamed_thenMeshUsesName', () => {
      const geos = makeGeometryMap(1);
      const result = buildM3FData(geos);

      expect(result.meshes[0].name).toBe('Mesh 0');
    });

    it('buildM3FData_whenExportedAt_thenIsValidISO8601', () => {
      const geos = makeGeometryMap(1);
      const result = buildM3FData(geos);

      expect(() => new Date(result.exportedAt)).not.toThrow();
      expect(new Date(result.exportedAt).toISOString()).toBe(result.exportedAt);
    });

    it('buildM3FData_whenMixedVisibility_thenOnlyVisibleIncluded', () => {
      const map = new Map<string, { geometry: BufferGeometry; visible: boolean }>();
      const geoV = new BufferGeometry();
      geoV.setAttribute(
        'position',
        new Float32BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3)
      );
      geoV.setIndex(new Uint32BufferAttribute(new Uint32Array([0, 1, 2]), 1));
      const geoH = new BufferGeometry();
      geoH.setAttribute(
        'position',
        new Float32BufferAttribute(new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0]), 3)
      );

      map.set('visible', { geometry: geoV, visible: true });
      map.set('hidden', { geometry: geoH, visible: false });

      const result = buildM3FData(map);
      expect(result.meshes).toHaveLength(1);
      expect(result.metrics.meshCount).toBe(1);
    });
  });

  // ─── exportToM3F ──────────────────────────────────────────────────────────

  describe('exportToM3F', () => {
    let createObjectURLMock: ReturnType<typeof vi.fn>;
    let revokeObjectURLMock: ReturnType<typeof vi.fn>;
    let clickMock: ReturnType<typeof vi.fn>;
    let removeMock: ReturnType<typeof vi.fn>;
    let createElementOriginal: typeof document.createElement;

    beforeEach(() => {
      createObjectURLMock = vi.fn(() => 'blob:fake-url') as any;
      revokeObjectURLMock = vi.fn();
      clickMock = vi.fn();
      removeMock = vi.fn();

      globalThis.URL.createObjectURL = createObjectURLMock as any;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock as any;

      createElementOriginal = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          const link = createElementOriginal('a');
          link.click = clickMock;
          link.remove = removeMock;
          return link;
        }
        return createElementOriginal(tag);
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('exportToM3F_whenCalled_thenCreatesObjectURL', () => {
      const geos = makeGeometryMap(1);
      exportToM3F(geos);

      expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob));
    });

    it('exportToM3F_whenCalled_thenClicksLink', () => {
      const geos = makeGeometryMap(1);
      exportToM3F(geos);

      expect(clickMock).toHaveBeenCalled();
    });

    it('exportToM3F_whenCalled_thenRevokesObjectURL', () => {
      const geos = makeGeometryMap(1);
      exportToM3F(geos);

      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:fake-url');
    });

    it('exportToM3F_whenCustomFilename_thenLinkDownloadUsesFilename', () => {
      const geos = makeGeometryMap(1);
      let capturedLink: HTMLAnchorElement | null = null;

      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = createElementOriginal(tag);
        if (tag === 'a') {
          capturedLink = el as HTMLAnchorElement;
          el.click = clickMock;
          el.remove = removeMock;
        }
        return el;
      });

      exportToM3F(geos, { filename: 'my-model' });

      expect(capturedLink!.download).toBe('my-model.m3f');
    });

    it('exportToM3F_whenNoFilename_thenDefaultsToModel', () => {
      const geos = makeGeometryMap(1);
      let capturedLink: HTMLAnchorElement | null = null;

      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = createElementOriginal(tag);
        if (tag === 'a') {
          capturedLink = el as HTMLAnchorElement;
          el.click = clickMock;
          el.remove = removeMock;
        }
        return el;
      });

      exportToM3F(geos);

      expect(capturedLink!.download).toBe('model.m3f');
    });
  });
});
