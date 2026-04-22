/**
 * Tests unitarios — stlExporter
 * US-006: Exportar modelo a STL
 *
 * Convenciones: methodName_whenCondition_thenExpectedBehavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { buildSTLData, exportToSTL, triggerDownload } from '../stlExporter';

// ─── Mock STLExporter de Three.js ────────────────────────────────────────────
vi.mock('three/examples/jsm/exporters/STLExporter.js', () => ({
  STLExporter: vi.fn().mockImplementation(() => ({
    parse: vi.fn((_scene: THREE.Scene, opts: { binary: boolean }) => {
      if (opts.binary) {
        // STL binario: header 80 bytes + uint32 + triángulos
        return new ArrayBuffer(84);
      }
      return 'solid model\nendsolid model';
    }),
  })),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeGeometry(visible = true) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  return { geometry: geo, visible };
}

function makeGeometryMap(
  count = 1,
  visible = true
): Map<string, { geometry: THREE.BufferGeometry; visible: boolean }> {
  const map = new Map<string, { geometry: THREE.BufferGeometry; visible: boolean }>();
  for (let i = 0; i < count; i++) {
    map.set(`feat-${i}`, makeGeometry(visible));
  }
  return map;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe('stlExporter', () => {
  // ─── buildSTLData ──────────────────────────────────────────────────────────

  describe('buildSTLData', () => {
    it('buildSTLData_whenFormatBinary_thenReturnsArrayBuffer', () => {
      const geos = makeGeometryMap(1);
      const result = buildSTLData(geos, 'binary');
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('buildSTLData_whenFormatAscii_thenReturnsString', () => {
      const geos = makeGeometryMap(1);
      const result = buildSTLData(geos, 'ascii');
      expect(typeof result).toBe('string');
    });

    it('buildSTLData_whenAsciiFormat_thenContainsSolidKeyword', () => {
      const geos = makeGeometryMap(1);
      const result = buildSTLData(geos, 'ascii') as string;
      expect(result).toContain('solid');
    });

    it('buildSTLData_whenMultipleVisibleGeometries_thenAllIncluded', () => {
      // 3 geometrías visibles → no debe lanzar error
      const geos = makeGeometryMap(3);
      expect(() => buildSTLData(geos, 'binary')).not.toThrow();
    });

    it('buildSTLData_whenNoVisibleGeometries_thenThrowsError', () => {
      const geos = makeGeometryMap(1, false); // visible = false
      expect(() => buildSTLData(geos, 'binary')).toThrow(
        'No hay geometrías visibles para exportar'
      );
    });

    it('buildSTLData_whenEmptyMap_thenThrowsError', () => {
      const geos = new Map<string, { geometry: THREE.BufferGeometry; visible: boolean }>();
      expect(() => buildSTLData(geos, 'ascii')).toThrow('No hay geometrías visibles para exportar');
    });

    it('buildSTLData_whenMixedVisibility_thenOnlyExportsVisible', () => {
      const geos = new Map<string, { geometry: THREE.BufferGeometry; visible: boolean }>([
        ['a', makeGeometry(true)],
        ['b', makeGeometry(false)],
      ]);
      // Solo 'a' es visible → no debe lanzar error
      expect(() => buildSTLData(geos, 'binary')).not.toThrow();
    });
  });

  // ─── triggerDownload ───────────────────────────────────────────────────────

  describe('triggerDownload', () => {
    // Nota: se usa asignación directa (no vi.spyOn) para no interferir con
    // las implementaciones de los vi.mock() de módulos al llamar vi.restoreAllMocks()
    let clickFn: ReturnType<typeof vi.fn>;
    let link: { href: string; download: string; click: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      clickFn = vi.fn();
      link = { href: '', download: '', click: clickFn };
      URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
      URL.revokeObjectURL = vi.fn();
      document.createElement = vi.fn().mockReturnValue(link);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('triggerDownload_whenBinaryFormat_thenSetsCorrectFilename', () => {
      triggerDownload(new ArrayBuffer(84), 'myModel', 'binary');
      expect(link.download).toBe('myModel.stl');
    });

    it('triggerDownload_whenAsciiFormat_thenSetsCorrectFilename', () => {
      triggerDownload('solid model\nendsolid', 'pieza', 'ascii');
      expect(link.download).toBe('pieza.stl');
    });

    it('triggerDownload_whenCalled_thenClicksLink', () => {
      triggerDownload(new ArrayBuffer(84), 'test', 'binary');
      expect(clickFn).toHaveBeenCalledOnce();
    });

    it('triggerDownload_whenCalled_thenRevokesObjectURL', () => {
      triggerDownload(new ArrayBuffer(84), 'test', 'binary');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    it('triggerDownload_whenCalled_thenCreatesAnchorElement', () => {
      triggerDownload('solid\nendsolid', 'test', 'ascii');
      expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('triggerDownload_whenCalled_thenCreatesObjectURL', () => {
      triggerDownload(new ArrayBuffer(0), 'test', 'binary');
      expect(URL.createObjectURL).toHaveBeenCalledOnce();
    });
  });

  // ─── exportToSTL (integración) ─────────────────────────────────────────────

  describe('exportToSTL', () => {
    let clickFn: ReturnType<typeof vi.fn>;
    let link: { href: string; download: string; click: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      clickFn = vi.fn();
      link = { href: '', download: '', click: clickFn };
      URL.createObjectURL = vi.fn().mockReturnValue('blob:url');
      URL.revokeObjectURL = vi.fn();
      document.createElement = vi.fn().mockReturnValue(link);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('exportToSTL_whenDefaultOptions_thenTriggersBinaryDownload', () => {
      const geos = makeGeometryMap(1);
      exportToSTL(geos);
      expect(clickFn).toHaveBeenCalledOnce();
    });

    it('exportToSTL_whenAsciiFormat_thenTriggersAsciiDownload', () => {
      const geos = makeGeometryMap(1);
      exportToSTL(geos, { format: 'ascii', filename: 'export-test' });
      expect(clickFn).toHaveBeenCalledOnce();
    });

    it('exportToSTL_whenCustomFilename_thenUsesFilename', () => {
      const geos = makeGeometryMap(1);
      exportToSTL(geos, { filename: 'mi-pieza-cad' });
      expect(link.download).toBe('mi-pieza-cad.stl');
    });

    it('exportToSTL_whenNoVisibleGeometries_thenThrowsError', () => {
      const geos = makeGeometryMap(1, false);
      expect(() => exportToSTL(geos)).toThrow('No hay geometrías visibles para exportar');
    });
  });
});
