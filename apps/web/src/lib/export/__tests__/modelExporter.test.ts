/**
 * Tests para modelExporter.ts
 * US-013: Exportación OBJ + STL (unificado)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks de Three.js ────────────────────────────────────────────────────────

const mockParse = vi.fn().mockReturnValue('o mesh_0\nv 0 0 0\n');

vi.mock('three/examples/jsm/exporters/OBJExporter.js', () => ({
  OBJExporter: vi.fn().mockImplementation(() => ({
    parse: mockParse,
  })),
}));

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    Mesh: vi.fn().mockImplementation(() => ({ name: '', add: vi.fn() })),
    Object3D: vi.fn().mockImplementation(() => ({ add: vi.fn(), children: [] })),
    MeshStandardMaterial: vi.fn().mockImplementation(() => ({})),
  };
});

// ─── Mock del stlExporter subyacente ─────────────────────────────────────────

vi.mock('@/lib/export/stlExporter', () => ({
  exportToSTL: vi.fn(),
}));

// ─── Importaciones sujeto ─────────────────────────────────────────────────────

import { buildOBJData, buildOBJBlob, exportModel } from '../modelExporter';
import { exportToSTL } from '@/lib/export/stlExporter';
import type { FeatureGeometry } from '@/stores/featureStore';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeGeometry() {
  const { BufferGeometry, Float32BufferAttribute } = require('three');
  const geo = new BufferGeometry();
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geo;
}

function makeFeatureGeometry(id: string, visible = true): FeatureGeometry {
  return { featureId: id, geometry: makeGeometry(), visible };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildOBJData', () => {
  it('should throw when no geometries provided', async () => {
    await expect(buildOBJData([])).rejects.toThrow('No hay geometrías para exportar');
  });

  it('should return OBJ string for valid geometries', async () => {
    const result = await buildOBJData([makeGeometry()]);
    expect(typeof result).toBe('string');
  });

  it('should call OBJExporter.parse', async () => {
    await buildOBJData([makeGeometry()]);
    expect(mockParse).toHaveBeenCalled();
  });
});

describe('buildOBJBlob', () => {
  it('should throw when no geometries provided', async () => {
    await expect(buildOBJBlob([])).rejects.toThrow('No hay geometrías para exportar');
  });

  it('should return a Blob with text/plain type', async () => {
    const blob = await buildOBJBlob([makeGeometry()]);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/plain');
  });

  it('should contain OBJ content', async () => {
    const blob = await buildOBJBlob([makeGeometry()]);
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe('exportModel', () => {
  let createObjectURL: typeof URL.createObjectURL;
  let revokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    createObjectURL = URL.createObjectURL;
    revokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node as any);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    // NO usar vi.restoreAllMocks() — destruye las implementaciones de vi.mock factories
    vi.clearAllMocks();
    vi.mocked(exportToSTL).mockReset();
  });

  it('should throw when no visible geometries', async () => {
    const hidden = makeFeatureGeometry('f1', false);
    await expect(exportModel([hidden], { format: 'obj' })).rejects.toThrow(
      'No hay geometrías visibles para exportar'
    );
  });

  it('should export OBJ format and trigger download', async () => {
    const fg = makeFeatureGeometry('f1');
    await exportModel([fg], { format: 'obj', filename: 'mi-modelo' });
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should call exportToSTL for stl-binary format', async () => {
    const fg = makeFeatureGeometry('f1');
    await exportModel([fg], { format: 'stl-binary', filename: 'mi-modelo' });
    expect(vi.mocked(exportToSTL)).toHaveBeenCalledWith(
      expect.any(Map),
      expect.objectContaining({ format: 'binary', filename: 'mi-modelo' })
    );
  });

  it('should call exportToSTL with ascii for stl-ascii format', async () => {
    const fg = makeFeatureGeometry('f1');
    await exportModel([fg], { format: 'stl-ascii', filename: 'ascii-model' });
    expect(vi.mocked(exportToSTL)).toHaveBeenCalledWith(
      expect.any(Map),
      expect.objectContaining({ format: 'ascii', filename: 'ascii-model' })
    );
  });

  it('should filter out hidden feature geometries', async () => {
    const visible = makeFeatureGeometry('f1', true);
    const hidden = makeFeatureGeometry('f2', false);
    await exportModel([visible, hidden], { format: 'stl-binary' });
    const callMap = vi.mocked(exportToSTL).mock.calls[0][0] as Map<string, any>;
    expect(callMap.size).toBe(1);
    expect(callMap.has('f1')).toBe(true);
  });
});
