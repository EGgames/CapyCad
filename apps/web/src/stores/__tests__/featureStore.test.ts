/**
 * Tests para featureStore
 *
 * Prueba el store Zustand que gestiona features 3D:
 * - Adición de features
 * - Actualización de features
 * - Eliminación de features
 * - Selección de features
 * - Undo/Redo
 * - Gestión de geometrías
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFeatureStore } from '@/stores/featureStore';
import {
  FeatureType,
  ExtrudeFeature,
  RevolveFeature,
  BooleanFeature,
  SketchEntityType,
  type Line,
} from '@stl-model/shared-types';
import { BufferGeometry } from 'three';

const mockGeometryData = {
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  indices: new Uint32Array([0, 1, 2]),
};

const defaultSketch = {
  id: 'sketch-1',
  name: 'Sketch',
  entities: [] as any[],
  constraints: [] as any[],
  measurements: [] as any[],
  plane: 'XY' as const,
};

// Mock del CAD Worker Client
vi.mock('@/lib/cad/cadWorkerClient', () => ({
  getCADWorker: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    extrude: vi.fn().mockResolvedValue(mockGeometryData),
    revolve: vi.fn().mockResolvedValue(mockGeometryData),
    booleanOp: vi.fn().mockResolvedValue(mockGeometryData),
    draft: vi.fn().mockResolvedValue(mockGeometryData),
    fillet: vi.fn().mockResolvedValue(mockGeometryData),
    chamfer: vi.fn().mockResolvedValue(mockGeometryData),
    shell: vi.fn().mockResolvedValue(mockGeometryData),
    sweep: vi.fn().mockResolvedValue(mockGeometryData),
    loft: vi.fn().mockResolvedValue(mockGeometryData),
    offset: vi.fn().mockResolvedValue(mockGeometryData),
  })),
}));

describe('featureStore', () => {
  beforeEach(() => {
    // Reset del store antes de cada test
    useFeatureStore.setState({
      features: [],
      selectedFeatureId: null,
      geometries: new Map(),
      history: [[]],
      historyIndex: 0,
      canUndo: false,
      canRedo: false,
      isProcessing: false,
      processingProgress: 0,
    });
  });

  describe('Gestión de Features', () => {
    it('debe agregar una feature con geometría', () => {
      const { addFeature } = useFeatureStore.getState();

      const feature: ExtrudeFeature = {
        id: 'extrude-1',
        type: FeatureType.EXTRUDE,
        name: 'Extrusión 10mm',
        parentId: 'sketch-1',
        visible: true,
        suppressed: false,
        sketch: defaultSketch,
        distance: 10,
        direction: 'positive',
      };

      const geometry = new BufferGeometry();

      addFeature(feature, geometry);

      const { features, geometries } = useFeatureStore.getState();
      expect(features).toHaveLength(1);
      expect(features[0]).toEqual(feature);
      expect(geometries.size).toBe(1);
      expect(geometries.get('extrude-1')).toBeDefined();
    });

    it('debe seleccionar feature agregada automáticamente', () => {
      const { addFeature } = useFeatureStore.getState();

      const feature: ExtrudeFeature = {
        id: 'extrude-1',
        type: FeatureType.EXTRUDE,
        name: 'Extrusión 10mm',
        parentId: 'sketch-1',
        visible: true,
        suppressed: false,
        sketch: defaultSketch,
        distance: 10,
        direction: 'positive',
      };

      addFeature(feature, new BufferGeometry());

      expect(useFeatureStore.getState().selectedFeatureId).toBe('extrude-1');
    });

    it('debe actualizar una feature', () => {
      const { addFeature, updateFeature } = useFeatureStore.getState();

      const feature: ExtrudeFeature = {
        id: 'extrude-1',
        type: FeatureType.EXTRUDE,
        name: 'Extrusión 10mm',
        parentId: 'sketch-1',
        visible: true,
        suppressed: false,
        sketch: defaultSketch,
        distance: 10,
        direction: 'positive',
      };

      addFeature(feature, new BufferGeometry());

      updateFeature('extrude-1', {
        distance: 20,
        name: 'Extrusión 20mm',
      } as Partial<ExtrudeFeature>);

      const { features } = useFeatureStore.getState();
      const updated = features[0] as ExtrudeFeature;
      expect(updated.distance).toBe(20);
      expect(updated.name).toBe('Extrusión 20mm');
    });

    it('debe eliminar una feature y su geometría', () => {
      const { addFeature, deleteFeature } = useFeatureStore.getState();

      const feature: ExtrudeFeature = {
        id: 'extrude-1',
        type: FeatureType.EXTRUDE,
        name: 'Extrusión 10mm',
        parentId: 'sketch-1',
        visible: true,
        suppressed: false,
        sketch: defaultSketch,
        distance: 10,
        direction: 'positive',
      };

      const geometry = new BufferGeometry();
      const disposeSpy = vi.spyOn(geometry, 'dispose');

      addFeature(feature, geometry);
      expect(useFeatureStore.getState().features).toHaveLength(1);

      deleteFeature('extrude-1');

      const { features, geometries } = useFeatureStore.getState();
      expect(features).toHaveLength(0);
      expect(geometries.size).toBe(0);
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('Selección de Features', () => {
    beforeEach(() => {
      const { addFeature } = useFeatureStore.getState();

      const feature: ExtrudeFeature = {
        id: 'extrude-1',
        type: FeatureType.EXTRUDE,
        name: 'Extrusión 10mm',
        parentId: 'sketch-1',
        visible: true,
        suppressed: false,
        sketch: defaultSketch,
        distance: 10,
        direction: 'positive',
      };

      addFeature(feature, new BufferGeometry());
    });

    it('debe seleccionar una feature', () => {
      const { selectFeature } = useFeatureStore.getState();

      selectFeature('extrude-1');
      expect(useFeatureStore.getState().selectedFeatureId).toBe('extrude-1');
    });

    it('debe deseleccionar feature', () => {
      const { selectFeature } = useFeatureStore.getState();

      selectFeature('extrude-1');
      selectFeature(null);

      expect(useFeatureStore.getState().selectedFeatureId).toBeNull();
    });
  });

  describe('Historial Undo/Redo', () => {
    it('debe deshacer adición de feature', () => {
      const { addFeature, undo } = useFeatureStore.getState();

      const feature: ExtrudeFeature = {
        id: 'extrude-1',
        type: FeatureType.EXTRUDE,
        name: 'Extrusión 10mm',
        parentId: 'sketch-1',
        visible: true,
        suppressed: false,
        sketch: defaultSketch,
        distance: 10,
        direction: 'positive',
      };

      addFeature(feature, new BufferGeometry());
      expect(useFeatureStore.getState().features).toHaveLength(1);
      expect(useFeatureStore.getState().canUndo).toBe(true);

      undo();
      expect(useFeatureStore.getState().features).toHaveLength(0);
    });

    it('debe rehacer operación deshecha', () => {
      const { addFeature, undo, redo } = useFeatureStore.getState();

      const feature: ExtrudeFeature = {
        id: 'extrude-1',
        type: FeatureType.EXTRUDE,
        name: 'Extrusión 10mm',
        parentId: 'sketch-1',
        visible: true,
        suppressed: false,
        sketch: defaultSketch,
        distance: 10,
        direction: 'positive',
      };

      addFeature(feature, new BufferGeometry());
      undo();

      expect(useFeatureStore.getState().features).toHaveLength(0);
      expect(useFeatureStore.getState().canRedo).toBe(true);

      redo();
      expect(useFeatureStore.getState().features).toHaveLength(1);
    });
  });

  describe('Gestión de Geometrías', () => {
    it('debe actualizar geometría de feature existente', () => {
      const { addFeature, updateGeometry } = useFeatureStore.getState();

      const feature: ExtrudeFeature = {
        id: 'extrude-1',
        type: FeatureType.EXTRUDE,
        name: 'Extrusión 10mm',
        parentId: 'sketch-1',
        visible: true,
        suppressed: false,
        sketch: defaultSketch,
        distance: 10,
        direction: 'positive',
      };

      const oldGeometry = new BufferGeometry();
      const disposeSpy = vi.spyOn(oldGeometry, 'dispose');

      addFeature(feature, oldGeometry);

      const newGeometry = new BufferGeometry();
      updateGeometry('extrude-1', newGeometry);

      const { geometries } = useFeatureStore.getState();
      expect(geometries.get('extrude-1')?.geometry).toBe(newGeometry);
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('debe obtener geometría por ID', () => {
      const { addFeature, getGeometry } = useFeatureStore.getState();

      const feature: ExtrudeFeature = {
        id: 'extrude-1',
        type: FeatureType.EXTRUDE,
        name: 'Extrusión 10mm',
        parentId: 'sketch-1',
        visible: true,
        suppressed: false,
        sketch: defaultSketch,
        distance: 10,
        direction: 'positive',
      };

      const geometry = new BufferGeometry();
      addFeature(feature, geometry);

      const retrieved = getGeometry('extrude-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.geometry).toBe(geometry);
      expect(retrieved?.visible).toBe(true);
    });
  });

  describe('Estado de Procesamiento', () => {
    it('debe actualizar estado de procesamiento', () => {
      const { setProcessing } = useFeatureStore.getState();

      setProcessing(true, 50);

      const { isProcessing, processingProgress } = useFeatureStore.getState();
      expect(isProcessing).toBe(true);
      expect(processingProgress).toBe(50);

      setProcessing(false, 0);

      const state2 = useFeatureStore.getState();
      expect(state2.isProcessing).toBe(false);
      expect(state2.processingProgress).toBe(0);
    });
  });

  describe('Crear Extrusión (integración)', () => {
    it('debe crear extrusión exitosamente', async () => {
      const { createExtrude } = useFeatureStore.getState();

      const entities = [
        {
          id: 'line-1',
          type: SketchEntityType.LINE,
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 },
        },
      ];

      const featureId = await createExtrude('sketch-1', entities, 10, 'positive');

      const { features, geometries, isProcessing } = useFeatureStore.getState();
      expect(featureId).toBeDefined();
      expect(features).toHaveLength(1);
      expect(geometries.size).toBe(1);
      expect(isProcessing).toBe(false);
    });

    it('debe manejar errores durante extrusión', async () => {
      // Mock error en worker
      const { getCADWorker } = await import('@/lib/cad/cadWorkerClient');
      vi.mocked(getCADWorker).mockReturnValueOnce({
        initialize: vi.fn().mockResolvedValue(undefined),
        extrude: vi.fn().mockRejectedValue(new Error('Extrusion failed')),
        terminate: vi.fn(),
      } as any);

      const { createExtrude } = useFeatureStore.getState();

      const entities = [
        {
          id: 'line-1',
          type: SketchEntityType.LINE,
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 },
        },
      ];

      await expect(createExtrude('sketch-1', entities, 10, 'positive')).rejects.toThrow();

      const { isProcessing } = useFeatureStore.getState();
      expect(isProcessing).toBe(false);
    });
  });

  describe('Reset Store', () => {
    it('debe limpiar todas las geometrías al resetear', () => {
      const { addFeature, reset } = useFeatureStore.getState();

      const geometry = new BufferGeometry();
      const disposeSpy = vi.spyOn(geometry, 'dispose');

      const feature: ExtrudeFeature = {
        id: 'extrude-1',
        type: FeatureType.EXTRUDE,
        name: 'Extrusión 10mm',
        parentId: 'sketch-1',
        visible: true,
        suppressed: false,
        sketch: defaultSketch,
        distance: 10,
        direction: 'positive',
      };

      addFeature(feature, geometry);

      reset();

      const { features, geometries } = useFeatureStore.getState();
      expect(features).toHaveLength(0);
      expect(geometries.size).toBe(0);
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  // ─── createRevolve ─────────────────────────────────────────────────────────

  describe('Crear Revolución (createRevolve)', () => {
    const entities = [
      { id: 'line-1', type: SketchEntityType.LINE, start: { x: 0, y: 0 }, end: { x: 10, y: 0 } },
    ];

    it('createRevolve_whenValidParams_thenCreatesRevolveFeature', async () => {
      const { createRevolve } = useFeatureStore.getState();

      const featureId = await createRevolve('sketch-1', entities, 'Z', 360);

      const { features, geometries, isProcessing } = useFeatureStore.getState();
      expect(featureId).toBeDefined();
      expect(isProcessing).toBe(false);
      expect(features).toHaveLength(1);
      expect(features[0].type).toBe(FeatureType.REVOLVE);
      expect(geometries.size).toBe(1);
    });

    it('createRevolve_whenCreated_thenFeatureHasCorrectAngleAndAxis', async () => {
      const { createRevolve } = useFeatureStore.getState();

      await createRevolve('sketch-1', entities, 'X', 180);

      const { features } = useFeatureStore.getState();
      const revolve = features[0] as RevolveFeature;
      expect(revolve.angle).toBe(180);
      expect(revolve.axis.end.x).toBe(1);
      expect(revolve.axis.end.y).toBe(0);
      expect(revolve.axis.end.z).toBe(0);
    });

    it('createRevolve_whenWorkerFails_thenThrowsAndResetsProcessing', async () => {
      const { getCADWorker } = await import('@/lib/cad/cadWorkerClient');
      vi.mocked(getCADWorker).mockReturnValueOnce({
        initialize: vi.fn().mockResolvedValue(undefined),
        revolve: vi.fn().mockRejectedValue(new Error('Revolve failed')),
      } as any);

      const { createRevolve } = useFeatureStore.getState();

      await expect(createRevolve('sketch-1', entities, 'Z', 360)).rejects.toThrow();
      expect(useFeatureStore.getState().isProcessing).toBe(false);
    });

    it('createRevolve_whenYAxis_thenFeatureNameIncludesY', async () => {
      const { createRevolve } = useFeatureStore.getState();

      await createRevolve('sketch-1', entities, 'Y', 90);

      const { features } = useFeatureStore.getState();
      expect(features[0].name).toContain('Y');
    });
  });

  // ─── createBoolean ─────────────────────────────────────────────────────────

  describe('Crear Boolean (createBoolean)', () => {
    const mkExtrude = (id: string): ExtrudeFeature => ({
      id,
      type: FeatureType.EXTRUDE,
      name: `Extrusión ${id}`,
      parentId: null,
      visible: true,
      suppressed: false,
      sketch: {
        id: `sketch-${id}`,
        name: 'Sketch',
        entities: [
          {
            id: 'l1',
            type: SketchEntityType.LINE,
            selected: false,
            start: { x: 0, y: 0 },
            end: { x: 5, y: 0 },
          } as Line,
        ],
        constraints: [],
        measurements: [],
        plane: 'XY' as const,
      },
      distance: 10,
      direction: 'positive' as const,
    });

    beforeEach(() => {
      // Agregar dos extrudes para operar
      const { addFeature } = useFeatureStore.getState();
      addFeature(mkExtrude('ext-1'), new BufferGeometry());
      addFeature(mkExtrude('ext-2'), new BufferGeometry());
    });

    it('createBoolean_whenUnion_thenCreatesBooleanFeatureWithUnion', async () => {
      const { createBoolean } = useFeatureStore.getState();

      const featureId = await createBoolean('ext-1', 'ext-2', 'union');

      const { features } = useFeatureStore.getState();
      const boolFeature = features.find((f) => f.id === featureId) as BooleanFeature;
      expect(boolFeature).toBeDefined();
      expect(boolFeature.type).toBe(FeatureType.BOOLEAN);
      expect(boolFeature.operation).toBe('union');
      expect(boolFeature.targetId).toBe('ext-1');
      expect(boolFeature.toolId).toBe('ext-2');
    });

    it('createBoolean_whenSubtract_thenBooleanNameContainsResta', async () => {
      const { createBoolean } = useFeatureStore.getState();

      await createBoolean('ext-1', 'ext-2', 'subtract');

      const { features } = useFeatureStore.getState();
      const bool = features.find((f) => f.type === FeatureType.BOOLEAN)!;
      expect(bool.name).toContain('Resta');
    });

    it('createBoolean_whenIntersect_thenBooleanNameContainsInterseccion', async () => {
      const { createBoolean } = useFeatureStore.getState();

      await createBoolean('ext-1', 'ext-2', 'intersect');

      const { features } = useFeatureStore.getState();
      const bool = features.find((f) => f.type === FeatureType.BOOLEAN)!;
      expect(bool.name).toContain('Intersección');
    });

    it('createBoolean_whenTargetNotFound_thenThrows', async () => {
      const { createBoolean } = useFeatureStore.getState();

      await expect(createBoolean('nonexistent', 'ext-2', 'union')).rejects.toThrow(
        'Target extrude feature not found'
      );
    });

    it('createBoolean_whenToolNotFound_thenThrows', async () => {
      const { createBoolean } = useFeatureStore.getState();

      await expect(createBoolean('ext-1', 'nonexistent', 'union')).rejects.toThrow(
        'Tool extrude feature not found'
      );
    });

    it('createBoolean_whenWorkerFails_thenResetsProcessingState', async () => {
      const { getCADWorker } = await import('@/lib/cad/cadWorkerClient');
      vi.mocked(getCADWorker).mockReturnValueOnce({
        initialize: vi.fn().mockResolvedValue(undefined),
        booleanOp: vi.fn().mockRejectedValue(new Error('Boolean failed')),
      } as any);

      const { createBoolean } = useFeatureStore.getState();

      await expect(createBoolean('ext-1', 'ext-2', 'union')).rejects.toThrow();
      expect(useFeatureStore.getState().isProcessing).toBe(false);
    });
  });

  // ─── createDraft ───────────────────────────────────────────────────────────

  describe('Crear Draft (createDraft)', () => {
    const extrudeBase: ExtrudeFeature = {
      id: 'ext-base',
      type: FeatureType.EXTRUDE,
      name: 'Base',
      parentId: null,
      visible: true,
      suppressed: false,
      sketch: {
        id: 'sketch-base',
        name: 'Sketch',
        entities: [
          {
            id: 'l1',
            type: SketchEntityType.LINE,
            selected: false,
            start: { x: 0, y: 0 },
            end: { x: 10, y: 0 },
          } as Line,
        ],
        constraints: [],
        measurements: [],
        plane: 'XY' as const,
      },
      distance: 20,
      direction: 'positive' as const,
    };

    beforeEach(() => {
      useFeatureStore.getState().addFeature(extrudeBase, new BufferGeometry());
    });

    it('createDraft_whenValidAngle_thenCreatesDraftFeature', async () => {
      const { createDraft } = useFeatureStore.getState();

      const featureId = await createDraft('ext-base', 5, 'XY');

      const { features } = useFeatureStore.getState();
      const draft = features.find((f) => f.id === featureId);
      expect(draft).toBeDefined();
      expect(draft?.type).toBe(FeatureType.DRAFT);
    });

    it('createDraft_whenAngleExceeds30_thenThrows', async () => {
      const { createDraft } = useFeatureStore.getState();

      await expect(createDraft('ext-base', 45)).rejects.toThrow(
        'Draft angle must be between -30 and 30 degrees'
      );
    });

    it('createDraft_whenAngleBelowMinus30_thenThrows', async () => {
      const { createDraft } = useFeatureStore.getState();

      await expect(createDraft('ext-base', -31)).rejects.toThrow(
        'Draft angle must be between -30 and 30 degrees'
      );
    });

    it('createDraft_whenSourceNotFound_thenThrows', async () => {
      const { createDraft } = useFeatureStore.getState();

      await expect(createDraft('nonexistent', 5)).rejects.toThrow(
        'Source extrude feature not found'
      );
    });

    it('createDraft_whenDefaultNeutralPlane_thenUsesXY', async () => {
      const { createDraft } = useFeatureStore.getState();

      const featureId = await createDraft('ext-base', 10);

      const { features } = useFeatureStore.getState();
      const draft = features.find((f) => f.id === featureId) as { neutralPlane?: string };
      expect(draft?.neutralPlane).toBe('XY');
    });
  });

  // ─── createFillet ──────────────────────────────────────────────────────────

  describe('Crear Fillet (createFillet)', () => {
    const extrudeBase: ExtrudeFeature = {
      id: 'ext-fillet',
      type: FeatureType.EXTRUDE,
      name: 'Base',
      parentId: null,
      visible: true,
      suppressed: false,
      sketch: defaultSketch,
      distance: 20,
      direction: 'positive' as const,
    };

    beforeEach(() => {
      useFeatureStore.getState().addFeature(extrudeBase, new BufferGeometry());
    });

    it('createFillet_whenValidRadius_thenCreatesFilletFeature', async () => {
      const { createFillet } = useFeatureStore.getState();
      const featureId = await createFillet('ext-fillet', 3);
      const { features } = useFeatureStore.getState();
      const fillet = features.find((f) => f.id === featureId);
      expect(fillet).toBeDefined();
      expect(fillet?.type).toBe(FeatureType.FILLET);
      expect(fillet?.name).toContain('3');
    });

    it('createFillet_whenSourceNotFound_thenThrows', async () => {
      const { createFillet } = useFeatureStore.getState();
      await expect(createFillet('nonexistent', 3)).rejects.toThrow(
        'Source extrude feature not found'
      );
    });

    it('createFillet_whenCompleted_thenResetsProcessing', async () => {
      const { createFillet } = useFeatureStore.getState();
      await createFillet('ext-fillet', 3);
      expect(useFeatureStore.getState().isProcessing).toBe(false);
    });
  });

  // ─── createChamfer ─────────────────────────────────────────────────────────

  describe('Crear Chamfer (createChamfer)', () => {
    const extrudeBase: ExtrudeFeature = {
      id: 'ext-chamfer',
      type: FeatureType.EXTRUDE,
      name: 'Base',
      parentId: null,
      visible: true,
      suppressed: false,
      sketch: defaultSketch,
      distance: 20,
      direction: 'positive' as const,
    };

    beforeEach(() => {
      useFeatureStore.getState().addFeature(extrudeBase, new BufferGeometry());
    });

    it('createChamfer_whenValidDistance_thenCreatesChamferFeature', async () => {
      const { createChamfer } = useFeatureStore.getState();
      const featureId = await createChamfer('ext-chamfer', 2);
      const { features } = useFeatureStore.getState();
      const chamfer = features.find((f) => f.id === featureId);
      expect(chamfer).toBeDefined();
      expect(chamfer?.type).toBe(FeatureType.CHAMFER);
      expect(chamfer?.name).toContain('2');
    });

    it('createChamfer_whenSourceNotFound_thenThrows', async () => {
      const { createChamfer } = useFeatureStore.getState();
      await expect(createChamfer('nonexistent', 2)).rejects.toThrow(
        'Source extrude feature not found'
      );
    });

    it('createChamfer_whenCompleted_thenResetsProcessing', async () => {
      const { createChamfer } = useFeatureStore.getState();
      await createChamfer('ext-chamfer', 2);
      expect(useFeatureStore.getState().isProcessing).toBe(false);
    });
  });

  // ─── createShell ───────────────────────────────────────────────────────────

  describe('Crear Shell (createShell)', () => {
    const extrudeBase: ExtrudeFeature = {
      id: 'ext-shell',
      type: FeatureType.EXTRUDE,
      name: 'Base',
      parentId: null,
      visible: true,
      suppressed: false,
      sketch: defaultSketch,
      distance: 20,
      direction: 'positive' as const,
    };

    beforeEach(() => {
      useFeatureStore.getState().addFeature(extrudeBase, new BufferGeometry());
    });

    it('createShell_whenValidThickness_thenCreatesShellFeature', async () => {
      const { createShell } = useFeatureStore.getState();
      const featureId = await createShell('ext-shell', 1.5);
      const { features } = useFeatureStore.getState();
      const shell = features.find((f) => f.id === featureId);
      expect(shell).toBeDefined();
      expect(shell?.type).toBe(FeatureType.SHELL);
      expect(shell?.name).toContain('1.5');
    });

    it('createShell_whenSourceNotFound_thenThrows', async () => {
      const { createShell } = useFeatureStore.getState();
      await expect(createShell('nonexistent', 1.5)).rejects.toThrow(
        'Source extrude feature not found'
      );
    });

    it('createShell_whenCompleted_thenResetsProcessing', async () => {
      const { createShell } = useFeatureStore.getState();
      await createShell('ext-shell', 1.5);
      expect(useFeatureStore.getState().isProcessing).toBe(false);
    });
  });

  // ─── createSweep ──────────────────────────────────────────────────────────

  describe('Crear Sweep (createSweep)', () => {
    const profileEntities: Line[] = [
      {
        id: 'l1',
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
      },
    ];

    const pathPoints = [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 20 },
      { x: 10, y: 0, z: 30 },
    ];

    it('createSweep_whenValidInput_thenCreatesSweepFeature', async () => {
      const { createSweep } = useFeatureStore.getState();
      const featureId = await createSweep(profileEntities, pathPoints);
      const { features } = useFeatureStore.getState();
      const sweep = features.find((f) => f.id === featureId);
      expect(sweep).toBeDefined();
      expect(sweep?.type).toBe(FeatureType.SWEEP);
      expect(sweep?.name).toBe('Sweep');
    });

    it('createSweep_whenCompleted_thenResetsProcessing', async () => {
      const { createSweep } = useFeatureStore.getState();
      await createSweep(profileEntities, pathPoints);
      expect(useFeatureStore.getState().isProcessing).toBe(false);
    });
  });

  // ─── createLoft ───────────────────────────────────────────────────────────

  describe('Crear Loft (createLoft)', () => {
    const section1 = {
      entities: [
        {
          id: 'l1',
          type: SketchEntityType.LINE,
          selected: false,
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 },
        } as Line,
      ],
      zOffset: 0,
    };

    const section2 = {
      entities: [
        {
          id: 'l2',
          type: SketchEntityType.LINE,
          selected: false,
          start: { x: 2, y: 2 },
          end: { x: 8, y: 2 },
        } as Line,
      ],
      zOffset: 20,
    };

    it('createLoft_whenValidSections_thenCreatesLoftFeature', async () => {
      const { createLoft } = useFeatureStore.getState();
      const featureId = await createLoft([section1, section2]);
      const { features } = useFeatureStore.getState();
      const loft = features.find((f) => f.id === featureId);
      expect(loft).toBeDefined();
      expect(loft?.type).toBe(FeatureType.LOFT);
      expect(loft?.name).toContain('2 secciones');
    });

    it('createLoft_whenClosed_thenCreatesClosedLoft', async () => {
      const { createLoft } = useFeatureStore.getState();
      const featureId = await createLoft([section1, section2], true);
      const { features } = useFeatureStore.getState();
      const loft = features.find((f) => f.id === featureId) as any;
      expect(loft?.closed).toBe(true);
    });

    it('createLoft_whenCompleted_thenResetsProcessing', async () => {
      const { createLoft } = useFeatureStore.getState();
      await createLoft([section1, section2]);
      expect(useFeatureStore.getState().isProcessing).toBe(false);
    });
  });

  // ─── createOffset ─────────────────────────────────────────────────────────

  describe('Crear Offset (createOffset)', () => {
    const extrudeBase: ExtrudeFeature = {
      id: 'ext-offset',
      type: FeatureType.EXTRUDE,
      name: 'Base',
      parentId: null,
      visible: true,
      suppressed: false,
      sketch: defaultSketch,
      distance: 20,
      direction: 'positive' as const,
    };

    beforeEach(() => {
      useFeatureStore.getState().addFeature(extrudeBase, new BufferGeometry());
    });

    it('createOffset_whenPositiveDistance_thenCreatesOffsetFeature', async () => {
      const { createOffset } = useFeatureStore.getState();
      const featureId = await createOffset('ext-offset', 5);
      const { features } = useFeatureStore.getState();
      const offset = features.find((f) => f.id === featureId);
      expect(offset).toBeDefined();
      expect(offset?.type).toBe(FeatureType.OFFSET);
      expect(offset?.name).toContain('+5');
    });

    it('createOffset_whenNegativeDistance_thenNameHasNoPlus', async () => {
      const { createOffset } = useFeatureStore.getState();
      const featureId = await createOffset('ext-offset', -3);
      const { features } = useFeatureStore.getState();
      const offset = features.find((f) => f.id === featureId);
      expect(offset?.name).toContain('-3');
      expect(offset?.name).not.toContain('+-3');
    });

    it('createOffset_whenSourceNotFound_thenThrows', async () => {
      const { createOffset } = useFeatureStore.getState();
      await expect(createOffset('nonexistent', 5)).rejects.toThrow(
        'Source extrude feature not found'
      );
    });

    it('createOffset_whenCompleted_thenResetsProcessing', async () => {
      const { createOffset } = useFeatureStore.getState();
      await createOffset('ext-offset', 5);
      expect(useFeatureStore.getState().isProcessing).toBe(false);
    });
  });
});
