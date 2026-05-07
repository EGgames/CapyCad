/**
 * Store Zustand para Features 3D (operaciones CAD)
 *
 * Gestiona el árbol de features del modelo 3D:
 * - Extrusiones, revoluciones, fillets, chamfers, etc.
 * - Geometrías 3D resultantes para renderizado
 * - Historial para undo/redo
 * - Selección de features
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { FeatureType } from '@stl-model/shared-types';
import { useSketchStore } from './sketchStore';
import type {
  EntityId,
  Feature,
  ExtrudeFeature,
  RevolveFeature,
  FilletFeature,
  ChamferFeature,
  ShellFeature,
  SweepFeature,
  LoftFeature,
  BooleanFeature,
  ImportFeature,
  LinearPatternFeature,
  CircularPatternFeature,
  DraftFeature,
  OffsetFeature,
  BoxFeature,
  SphereFeature,
  CylinderFeature,
  ConeFeature,
  TorusFeature,
} from '@stl-model/shared-types';
import type { BufferGeometry } from 'three';
import type { FeatureMaterial } from '@/lib/materials/materialPresets';
import type { BooleanShapeDescriptor } from '@/lib/cad/cadWorkerClient';

// ─── Tipos de sólidos válidos para operaciones booleanas y modificadores ─────

/** Todos los tipos de feature que producen un sólido (incluye booleanas encadenadas) */
export const SOLID_FEATURE_TYPES = [
  FeatureType.EXTRUDE,
  FeatureType.PRIMITIVE_BOX,
  FeatureType.PRIMITIVE_SPHERE,
  FeatureType.PRIMITIVE_CYLINDER,
  FeatureType.PRIMITIVE_CONE,
  FeatureType.PRIMITIVE_TORUS,
  FeatureType.BOOLEAN,
] as const;

// ─── Helpers module-level para descriptor + traslación ───────────────────────

/**
 * Convierte cualquier feature sólida a un BooleanShapeDescriptor (recursivo para BooleanFeature).
 * El descriptor describe cómo reconstruir la forma en espacio OCC Z-up.
 */
function featureToDescriptor(
  feature: Feature,
  allFeatures: Feature[],
  defaultCW: number,
  defaultCH: number
): BooleanShapeDescriptor {
  switch (feature.type) {
    case FeatureType.EXTRUDE: {
      const ef = feature as ExtrudeFeature;
      return {
        kind: 'extrude',
        entities: ef.sketch.entities,
        distance: ef.distance,
        direction: ef.direction,
        canvasWidth: ef.sketchCanvasWidth ?? defaultCW,
        canvasHeight: ef.sketchCanvasHeight ?? defaultCH,
      };
    }
    case FeatureType.PRIMITIVE_BOX: {
      const bf = feature as BoxFeature;
      return { kind: 'box', width: bf.width, height: bf.height, depth: bf.depth };
    }
    case FeatureType.PRIMITIVE_SPHERE: {
      const sf = feature as SphereFeature;
      return { kind: 'sphere', radius: sf.radius };
    }
    case FeatureType.PRIMITIVE_CYLINDER: {
      const cf = feature as CylinderFeature;
      return { kind: 'cylinder', radius: cf.radius, height: cf.height };
    }
    case FeatureType.PRIMITIVE_CONE: {
      const cf = feature as ConeFeature;
      return { kind: 'cone', baseRadius: cf.baseRadius, topRadius: cf.topRadius, height: cf.height };
    }
    case FeatureType.PRIMITIVE_TORUS: {
      const tf = feature as TorusFeature;
      return { kind: 'torus', majorRadius: tf.majorRadius, minorRadius: tf.minorRadius };
    }
    case FeatureType.BOOLEAN: {
      const bf = feature as BooleanFeature;
      const zero = { x: 0, y: 0, z: 0 };
      const targetF = allFeatures.find((f) => f.id === bf.targetId);
      const toolF = allFeatures.find((f) => f.id === bf.toolId);
      if (!targetF || !toolF) throw new Error(`[Boolean] Operands not found for boolean feature ${feature.id}`);
      const targetGC = (targetF as ExtrudeFeature).geometryCenter ?? zero;
      const toolGC = (toolF as ExtrudeFeature).geometryCenter ?? zero;
      const targetPos = targetF.position ?? targetGC;
      const toolPos = toolF.position ?? toolGC;
      return {
        kind: 'boolean',
        target: featureToDescriptor(targetF, allFeatures, defaultCW, defaultCH),
        targetTranslation: { x: targetPos.x - targetGC.x, y: targetPos.y - targetGC.y, z: targetPos.z - targetGC.z },
        tool: featureToDescriptor(toolF, allFeatures, defaultCW, defaultCH),
        toolTranslation: { x: toolPos.x - toolGC.x, y: toolPos.y - toolGC.y, z: toolPos.z - toolGC.z },
        operation: bf.operation,
      };
    }
    default:
      throw new Error(`[featureToDescriptor] Tipo no soportado: ${feature.type}`);
  }
}

/**
 * Calcula la traslación a aplicar a un sólido en OCC, como delta entre su
 * posición actual (gizmo) y su centro natural de geometría.
 */
function getFeatureTranslation(feature: Feature): { x: number; y: number; z: number } {
  const zero = { x: 0, y: 0, z: 0 };
  if (feature.type === FeatureType.BOOLEAN) {
    // El BooleanFeature ya tiene la traslación embebida en su descriptor recursivo.
    // El offset externo es: posición actual − geomCenter guardado.
    const bf = feature as BooleanFeature;
    const gc = bf.geometryCenter ?? zero;
    const pos = bf.position ?? gc;
    return { x: pos.x - gc.x, y: pos.y - gc.y, z: pos.z - gc.z };
  }
  const gc = (feature as ExtrudeFeature).geometryCenter ?? zero;
  const pos = feature.position ?? gc;
  return { x: pos.x - gc.x, y: pos.y - gc.y, z: pos.z - gc.z };
}



/**
 * Geometría 3D resultante de una feature
 */
export interface FeatureGeometry {
  featureId: EntityId;
  geometry: BufferGeometry;
  visible: boolean;
}

/**
 * Estado del store
 */
interface FeatureStoreState {
  // Features
  features: Feature[];
  selectedFeatureId: EntityId | null;

  // Geometrías para renderizado
  geometries: Map<EntityId, FeatureGeometry>;

  // Historial
  history: Feature[][];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;

  // Materiales PBR por feature (US-015)
  featureMaterials: Map<EntityId, FeatureMaterial>;

  // Loading state
  isProcessing: boolean;
  processingProgress: number;

  // Click-to-place
  placementMode: { type: string } | null;
  placementPosition: { x: number; y: number; z: number } | null;
  placementRotation: { x: number; y: number; z: number };
}

/**
 * Acciones del store
 */
interface FeatureStoreActions {
  // Features
  addFeature: (feature: Feature, geometry: BufferGeometry) => void;
  updateFeature: (featureId: EntityId, updates: Partial<Feature>) => void;
  deleteFeature: (featureId: EntityId) => void;
  selectFeature: (featureId: EntityId | null) => void;

  // Geometrías
  updateGeometry: (featureId: EntityId, geometry: BufferGeometry) => void;
  getGeometry: (featureId: EntityId) => FeatureGeometry | undefined;

  // Materiales
  setFeatureMaterial: (featureId: EntityId, material: FeatureMaterial) => void;
  getFeatureMaterial: (featureId: EntityId) => FeatureMaterial;

  // Features específicas
  createExtrude: (
    sketchId: EntityId,
    entities: any[],
    distance: number,
    direction: 'positive' | 'negative' | 'both'
  ) => Promise<EntityId>;

  // Importar modelo externo (US-014)
  importModel: (filename: string, format: 'stl' | 'obj', geometry: BufferGeometry) => EntityId;

  // Fillet y Chamfer (US-003/004)
  createFillet: (sourceFeatureId: EntityId, radius: number) => Promise<EntityId>;

  createChamfer: (sourceFeatureId: EntityId, chamferDistance: number) => Promise<EntityId>;

  // Shell (US-010)
  createShell: (sourceFeatureId: EntityId, thickness: number) => Promise<EntityId>;

  // Sweep (US-012)
  createSweep: (
    profileEntities: any[],
    pathPoints: Array<{ x: number; y: number; z: number }>
  ) => Promise<EntityId>;

  // Loft (US-012)
  createLoft: (
    sections: Array<{ entities: any[]; zOffset: number }>,
    closed?: boolean
  ) => Promise<EntityId>;

  // Patrones de repetición (US-011)
  createLinearPattern: (
    sourceFeatureId: EntityId,
    direction: { x: number; y: number; z: number },
    spacing: number,
    instances: number
  ) => Promise<EntityId>;

  createCircularPattern: (
    sourceFeatureId: EntityId,
    axis: { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number } },
    instances: number,
    totalAngle?: number
  ) => Promise<EntityId>;

  // Revolución
  createRevolve: (
    sketchId: EntityId,
    entities: any[],
    axis: 'X' | 'Y' | 'Z',
    angle: number
  ) => Promise<EntityId>;

  // Booleana
  createBoolean: (
    targetFeatureId: EntityId,
    toolFeatureId: EntityId,
    operation: 'union' | 'subtract' | 'intersect'
  ) => Promise<EntityId>;

  // Draft (ángulo de desmoldeo, FUNC-010)
  createDraft: (
    sourceFeatureId: EntityId,
    angle: number,
    neutralPlane?: 'XY' | 'XZ' | 'YZ'
  ) => Promise<EntityId>;

  // Offset (desplazamiento de superficie, FUNC-009)
  createOffset: (sourceFeatureId: EntityId, distance: number) => Promise<EntityId>;

  // Primitivas 3D (con posición/rotación opcional via click-to-place)
  createPrimitiveBox: (
    width: number,
    height: number,
    depth: number,
    position?: { x: number; y: number; z: number },
    rotation?: { x: number; y: number; z: number }
  ) => Promise<EntityId>;
  createPrimitiveSphere: (
    radius: number,
    position?: { x: number; y: number; z: number },
    rotation?: { x: number; y: number; z: number }
  ) => Promise<EntityId>;
  createPrimitiveCylinder: (
    radius: number,
    height: number,
    position?: { x: number; y: number; z: number },
    rotation?: { x: number; y: number; z: number }
  ) => Promise<EntityId>;
  createPrimitiveCone: (
    baseRadius: number,
    topRadius: number,
    height: number,
    position?: { x: number; y: number; z: number },
    rotation?: { x: number; y: number; z: number }
  ) => Promise<EntityId>;
  createPrimitiveTorus: (
    majorRadius: number,
    minorRadius: number,
    position?: { x: number; y: number; z: number },
    rotation?: { x: number; y: number; z: number }
  ) => Promise<EntityId>;

  // Click-to-place
  startPlacement: (type: string) => void;
  confirmPlacement: (position: { x: number; y: number; z: number }) => void;
  setPlacementRotation: (rotation: { x: number; y: number; z: number }) => void;
  cancelPlacement: () => void;

  // Historial
  undo: () => void;
  redo: () => void;

  // Estado
  setProcessing: (isProcessing: boolean, progress?: number) => void;

  // Reset
  reset: () => void;
}

type FeatureStore = FeatureStoreState & FeatureStoreActions;

const initialState: FeatureStoreState = {
  features: [],
  selectedFeatureId: null,
  geometries: new Map(),
  featureMaterials: new Map(),
  history: [[]],
  historyIndex: 0,
  canUndo: false,
  canRedo: false,
  isProcessing: false,
  processingProgress: 0,
  placementMode: null,
  placementPosition: null,
  placementRotation: { x: 0, y: 0, z: 0 },
};

/**
 * Hook del store
 */
export const useFeatureStore = create<FeatureStore>((set, get) => ({
  ...initialState,

  // ==================== Features ====================

  addFeature: (feature, geometry) => {
    set((state) => {
      const newFeatures = [...state.features, feature];
      const newGeometries = new Map(state.geometries);
      newGeometries.set(feature.id, {
        featureId: feature.id,
        geometry,
        visible: true,
      });

      // Agregar al historial
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newFeatures);

      const newIndex = newHistory.length - 1;
      return {
        features: newFeatures,
        geometries: newGeometries,
        history: newHistory,
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: false,
        selectedFeatureId: feature.id,
      };
    });
  },

  updateFeature: (featureId, updates) => {
    set((state) => {
      const newFeatures = state.features.map((f) =>
        f.id === featureId ? { ...f, ...updates } : f
      );

      // Agregar al historial
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newFeatures);

      const newIndex = newHistory.length - 1;
      return {
        features: newFeatures,
        history: newHistory,
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: false,
      };
    });
  },

  deleteFeature: (featureId) => {
    set((state) => {
      const deletedFeature = state.features.find((f) => f.id === featureId);

      // Teoría de conjuntos: si se elimina una booleana, restaurar los operandos
      // (target y tool) para que vuelvan a ser visibles.
      const sourcesToRestore: Set<string> = new Set();
      if (deletedFeature?.type === FeatureType.BOOLEAN) {
        const bool = deletedFeature as BooleanFeature;
        sourcesToRestore.add(bool.targetId);
        sourcesToRestore.add(bool.toolId);
      }

      const newFeatures = state.features
        .filter((f) => f.id !== featureId)
        .map((f) =>
          sourcesToRestore.has(f.id) ? { ...f, suppressed: false } : f
        );
      const newGeometries = new Map(state.geometries);

      // Limpiar geometría
      const featureGeom = newGeometries.get(featureId);
      if (featureGeom) {
        featureGeom.geometry.dispose();
        newGeometries.delete(featureId);
      }

      // Agregar al historial
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newFeatures);

      const newIndex = newHistory.length - 1;
      return {
        features: newFeatures,
        geometries: newGeometries,
        history: newHistory,
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: false,
        selectedFeatureId: state.selectedFeatureId === featureId ? null : state.selectedFeatureId,
      };
    });
  },

  selectFeature: (featureId) => {
    set({ selectedFeatureId: featureId });
  },

  // ==================== Geometrías ====================

  updateGeometry: (featureId, geometry) => {
    set((state) => {
      const newGeometries = new Map(state.geometries);
      const existing = newGeometries.get(featureId);

      // Limpiar geometría anterior
      if (existing) {
        existing.geometry.dispose();
      }

      newGeometries.set(featureId, {
        featureId,
        geometry,
        visible: true,
      });

      return { geometries: newGeometries };
    });
  },

  getGeometry: (featureId) => {
    return get().geometries.get(featureId);
  },

  // ==================== Materiales (US-015) ====================

  setFeatureMaterial: (featureId, material) => {
    set((state) => {
      const newMaterials = new Map(state.featureMaterials);
      newMaterials.set(featureId, material);
      return { featureMaterials: newMaterials };
    });
  },

  getFeatureMaterial: (featureId) => {
    const { getMaterialPreset } = require('@/lib/materials/materialPresets');
    const material = get().featureMaterials.get(featureId);
    return material ?? getMaterialPreset('default');
  },

  // ==================== Importar Modelo (US-014) ====================

  importModel: (filename, format, geometry) => {
    const featureId = nanoid();

    const feature: ImportFeature = {
      id: featureId,
      type: FeatureType.IMPORT,
      name: filename,
      parentId: null,
      visible: true,
      suppressed: false,
      sourceFilename: filename,
      sourceFormat: format,
    };

    get().addFeature(feature, geometry);

    return featureId;
  },

  // ==================== Crear Extrusión ====================

  createExtrude: async (sketchId, entities, distance, direction) => {
    const featureId = nanoid();

    try {
      set({ isProcessing: true, processingProgress: 0 });

      // Importar el worker dinámicamente
      const { getCADWorker } = await import('../lib/cad/cadWorkerClient');
      const worker = getCADWorker();

      set({ processingProgress: 30 });

      // Inicializar si es necesario
      await worker.initialize();

      set({ processingProgress: 50 });

      // Ejecutar extrusión
      const { canvasWidth, canvasHeight } = useSketchStore.getState();
      const geometryData = await worker.extrude(entities, distance, direction, canvasWidth, canvasHeight);

      set({ processingProgress: 80 });

      // Convertir a BufferGeometry de Three.js
      const { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute, Vector3 } =
        await import('three');

      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(geometryData.positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(geometryData.normals, 3));
      geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
      geometry.computeVertexNormals(); // Recalcular normales correctamente

      // Centrar la geometría en el origen para que el gizmo de transformación
      // (TransformControls) aparezca en el centro visual del mesh.
      geometry.computeBoundingBox();
      const geomCenter = new Vector3();
      geometry.boundingBox!.getCenter(geomCenter);
      geometry.translate(-geomCenter.x, -geomCenter.y, -geomCenter.z);

      set({ processingProgress: 90 });

      // Crear feature
      const feature: ExtrudeFeature = {
        id: featureId,
        type: FeatureType.EXTRUDE,
        name: `Extrusión ${distance}mm`,
        parentId: sketchId,
        visible: true,
        suppressed: false,
        sketch: {
          id: sketchId,
          name: 'Sketch',
          entities,
          constraints: [],
          measurements: [],
          plane: 'XY',
        },
        distance,
        direction,
        position: { x: geomCenter.x, y: geomCenter.y, z: geomCenter.z },
        geometryCenter: { x: geomCenter.x, y: geomCenter.y, z: geomCenter.z },
        sketchCanvasWidth: canvasWidth,
        sketchCanvasHeight: canvasHeight,
      };

      // Agregar al store
      get().addFeature(feature, geometry);

      set({ processingProgress: 100 });

      return featureId;
    } catch (error) {
      console.error('[Feature Store] Extrude failed:', error);
      throw error;
    } finally {
      set({ isProcessing: false, processingProgress: 0 });
    }
  },

  // ==================== Fillet (US-003) ====================

  createFillet: async (sourceFeatureId, radius) => {
    const featureId = nanoid();
    const { features } = get();

    const sourceFeature = features.find(
      (f) => f.id === sourceFeatureId && (SOLID_FEATURE_TYPES as readonly string[]).includes(f.type)
    );
    if (!sourceFeature) {
      throw new Error(`Source solid feature not found: ${sourceFeatureId}`);
    }

    try {
      set({ isProcessing: true, processingProgress: 0 });

      const { getCADWorker } = await import('../lib/cad/cadWorkerClient');
      const worker = getCADWorker();

      set({ processingProgress: 30 });
      await worker.initialize();
      set({ processingProgress: 50 });

      const { canvasWidth: defaultCW, canvasHeight: defaultCH } = useSketchStore.getState();
      const sourceDesc = featureToDescriptor(sourceFeature, features, defaultCW, defaultCH);
      const sourceTranslation = getFeatureTranslation(sourceFeature);

      const geometryData = await worker.fillet(sourceDesc, sourceTranslation, radius);

      set({ processingProgress: 80 });

      const { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } =
        await import('three');
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(geometryData.positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(geometryData.normals, 3));
      geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
      geometry.computeVertexNormals();

      set({ processingProgress: 90 });

      const feature: FilletFeature = {
        id: featureId,
        type: FeatureType.FILLET,
        name: `Fillet r${radius}mm`,
        parentId: sourceFeatureId,
        visible: true,
        suppressed: false,
        edges: [],
        radius,
      };

      get().addFeature(feature, geometry);
      set({ processingProgress: 100 });
      return featureId;
    } catch (error) {
      console.error('[Feature Store] Fillet failed:', error);
      throw error;
    } finally {
      set({ isProcessing: false, processingProgress: 0 });
    }
  },

  // ==================== Chamfer (US-004) ====================

  createChamfer: async (sourceFeatureId, chamferDistance) => {
    const featureId = nanoid();
    const { features } = get();

    const sourceFeature = features.find(
      (f) => f.id === sourceFeatureId && (SOLID_FEATURE_TYPES as readonly string[]).includes(f.type)
    );
    if (!sourceFeature) {
      throw new Error(`Source solid feature not found: ${sourceFeatureId}`);
    }

    try {
      set({ isProcessing: true, processingProgress: 0 });

      const { getCADWorker } = await import('../lib/cad/cadWorkerClient');
      const worker = getCADWorker();

      set({ processingProgress: 30 });
      await worker.initialize();
      set({ processingProgress: 50 });

      const { canvasWidth: defaultCW, canvasHeight: defaultCH } = useSketchStore.getState();
      const sourceDesc = featureToDescriptor(sourceFeature, features, defaultCW, defaultCH);
      const sourceTranslation = getFeatureTranslation(sourceFeature);

      const geometryData = await worker.chamfer(sourceDesc, sourceTranslation, chamferDistance);

      set({ processingProgress: 80 });

      const { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } =
        await import('three');
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(geometryData.positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(geometryData.normals, 3));
      geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
      geometry.computeVertexNormals();

      set({ processingProgress: 90 });

      const feature: ChamferFeature = {
        id: featureId,
        type: FeatureType.CHAMFER,
        name: `Chamfer ${chamferDistance}mm`,
        parentId: sourceFeatureId,
        visible: true,
        suppressed: false,
        edges: [],
        distance: chamferDistance,
      };

      get().addFeature(feature, geometry);
      set({ processingProgress: 100 });
      return featureId;
    } catch (error) {
      console.error('[Feature Store] Chamfer failed:', error);
      throw error;
    } finally {
      set({ isProcessing: false, processingProgress: 0 });
    }
  },

  // ==================== Shell (US-010) ====================

  createShell: async (sourceFeatureId, thickness) => {
    const featureId = nanoid();
    const { features } = get();

    const sourceFeature = features.find(
      (f) => f.id === sourceFeatureId && (SOLID_FEATURE_TYPES as readonly string[]).includes(f.type)
    );
    if (!sourceFeature) {
      throw new Error(`Source solid feature not found: ${sourceFeatureId}`);
    }

    try {
      set({ isProcessing: true, processingProgress: 0 });

      const { getCADWorker } = await import('../lib/cad/cadWorkerClient');
      const worker = getCADWorker();

      set({ processingProgress: 30 });
      await worker.initialize();
      set({ processingProgress: 50 });

      const { canvasWidth: defaultCW, canvasHeight: defaultCH } = useSketchStore.getState();
      const sourceDesc = featureToDescriptor(sourceFeature, features, defaultCW, defaultCH);
      const sourceTranslation = getFeatureTranslation(sourceFeature);

      const geometryData = await worker.shell(sourceDesc, sourceTranslation, thickness);

      set({ processingProgress: 80 });

      const { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } =
        await import('three');
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(geometryData.positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(geometryData.normals, 3));
      geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
      geometry.computeVertexNormals();

      set({ processingProgress: 90 });

      const feature: ShellFeature = {
        id: featureId,
        type: FeatureType.SHELL,
        name: `Shell ${thickness}mm`,
        parentId: sourceFeatureId,
        visible: true,
        suppressed: false,
        facesToRemove: [],
        thickness,
      };

      get().addFeature(feature, geometry);
      set({ processingProgress: 100 });
      return featureId;
    } catch (error) {
      console.error('[Feature Store] Shell failed:', error);
      throw error;
    } finally {
      set({ isProcessing: false, processingProgress: 0 });
    }
  },

  // ==================== Sweep (US-012) ====================

  createSweep: async (profileEntities, pathPoints) => {
    const featureId = nanoid();

    try {
      set({ isProcessing: true, processingProgress: 0 });

      const { getCADWorker } = await import('../lib/cad/cadWorkerClient');
      const worker = getCADWorker();

      set({ processingProgress: 30 });
      await worker.initialize();
      set({ processingProgress: 50 });

      const geometryData = await worker.sweep(profileEntities, pathPoints);

      set({ processingProgress: 80 });

      const { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } =
        await import('three');
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(geometryData.positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(geometryData.normals, 3));
      geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
      geometry.computeVertexNormals();

      set({ processingProgress: 90 });

      const feature: SweepFeature = {
        id: featureId,
        type: FeatureType.SWEEP,
        name: 'Sweep',
        parentId: null,
        visible: true,
        suppressed: false,
        profileSketch: {
          id: nanoid(),
          name: 'Profile',
          entities: profileEntities,
          constraints: [],
          measurements: [],
          plane: 'XY',
        },
        pathPoints,
      };

      get().addFeature(feature, geometry);
      set({ processingProgress: 100 });
      return featureId;
    } catch (error) {
      console.error('[Feature Store] Sweep failed:', error);
      throw error;
    } finally {
      set({ isProcessing: false, processingProgress: 0 });
    }
  },

  // ==================== Loft (US-012) ====================

  createLoft: async (sections, closed = false) => {
    const featureId = nanoid();

    try {
      set({ isProcessing: true, processingProgress: 0 });

      const { getCADWorker } = await import('../lib/cad/cadWorkerClient');
      const worker = getCADWorker();

      set({ processingProgress: 30 });
      await worker.initialize();
      set({ processingProgress: 50 });

      const geometryData = await worker.loft(sections, closed);

      set({ processingProgress: 80 });

      const { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } =
        await import('three');
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(geometryData.positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(geometryData.normals, 3));
      geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
      geometry.computeVertexNormals();

      set({ processingProgress: 90 });

      const feature: LoftFeature = {
        id: featureId,
        type: FeatureType.LOFT,
        name: `Loft (${sections.length} secciones)`,
        parentId: null,
        visible: true,
        suppressed: false,
        sections: sections.map((s) => ({
          sketch: {
            id: nanoid(),
            name: 'Section',
            entities: s.entities,
            constraints: [],
            measurements: [],
            plane: 'XY',
          },
          zOffset: s.zOffset,
        })),
        closed,
      };

      get().addFeature(feature, geometry);
      set({ processingProgress: 100 });
      return featureId;
    } catch (error) {
      console.error('[Feature Store] Loft failed:', error);
      throw error;
    } finally {
      set({ isProcessing: false, processingProgress: 0 });
    }
  },

  // ==================== Patrones de Repetición (US-011) ====================

  createLinearPattern: async (sourceFeatureId, direction, spacing, instances) => {
    const featureId = nanoid();
    const { geometries, features } = get();

    const sourceGeom = geometries.get(sourceFeatureId);
    const sourceFeature = features.find((f) => f.id === sourceFeatureId);
    if (!sourceGeom || !sourceFeature) {
      throw new Error(`Source feature not found: ${sourceFeatureId}`);
    }

    const { computeLinearTransforms, mergePatternGeometries } =
      await import('../lib/pattern/patternEngine');

    const transforms = computeLinearTransforms({ direction, spacing, instances });
    const mergedGeometry = mergePatternGeometries(sourceGeom.geometry, transforms);
    mergedGeometry.computeVertexNormals();

    const feature: LinearPatternFeature = {
      id: featureId,
      type: FeatureType.PATTERN_LINEAR,
      name: `Patrón Lineal x${instances}`,
      parentId: sourceFeatureId,
      visible: true,
      suppressed: false,
      featureId: sourceFeatureId,
      direction,
      spacing,
      instances,
    };

    get().addFeature(feature, mergedGeometry);
    return featureId;
  },

  createCircularPattern: async (sourceFeatureId, axis, instances, totalAngle = 360) => {
    const featureId = nanoid();
    const { geometries, features } = get();

    const sourceGeom = geometries.get(sourceFeatureId);
    const sourceFeature = features.find((f) => f.id === sourceFeatureId);
    if (!sourceGeom || !sourceFeature) {
      throw new Error(`Source feature not found: ${sourceFeatureId}`);
    }

    const { computeCircularTransforms, mergePatternGeometries } =
      await import('../lib/pattern/patternEngine');

    const transforms = computeCircularTransforms({ axis, instances, totalAngle });
    const mergedGeometry = mergePatternGeometries(sourceGeom.geometry, transforms);
    mergedGeometry.computeVertexNormals();

    const feature: CircularPatternFeature = {
      id: featureId,
      type: FeatureType.PATTERN_CIRCULAR,
      name: `Patrón Circular x${instances}`,
      parentId: sourceFeatureId,
      visible: true,
      suppressed: false,
      featureId: sourceFeatureId,
      axis,
      instances,
      angle: totalAngle,
    };

    get().addFeature(feature, mergedGeometry);
    return featureId;
  },

  // ==================== Revolve ====================

  createRevolve: async (sketchId, entities, axis, angle) => {
    const featureId = nanoid();

    try {
      set({ isProcessing: true, processingProgress: 0 });

      const { getCADWorker } = await import('../lib/cad/cadWorkerClient');
      const worker = getCADWorker();

      set({ processingProgress: 30 });
      await worker.initialize();
      set({ processingProgress: 50 });

      const geometryData = await worker.revolve(entities, axis, angle);

      set({ processingProgress: 80 });

      const { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } =
        await import('three');
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(geometryData.positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(geometryData.normals, 3));
      geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
      geometry.computeVertexNormals();

      set({ processingProgress: 90 });

      const feature: RevolveFeature = {
        id: featureId,
        type: FeatureType.REVOLVE,
        name: `Revolve ${angle}° ${axis}`,
        parentId: null,
        visible: true,
        suppressed: false,
        sketch: {
          id: sketchId,
          name: 'Sketch',
          entities,
          constraints: [],
          measurements: [],
          plane: 'XY',
        },
        axis: {
          start: { x: 0, y: 0, z: 0 },
          end: { x: axis === 'X' ? 1 : 0, y: axis === 'Y' ? 1 : 0, z: axis === 'Z' ? 1 : 0 },
        },
        angle,
      };

      get().addFeature(feature, geometry);
      set({ processingProgress: 100 });
      return featureId;
    } catch (error) {
      console.error('[Feature Store] Revolve failed:', error);
      throw error;
    } finally {
      set({ isProcessing: false, processingProgress: 0 });
    }
  },

  // ==================== Boolean ====================

  createBoolean: async (targetFeatureId, toolFeatureId, operation) => {
    const featureId = nanoid();
    const { features } = get();

    const targetFeature = features.find(
      (f) => f.id === targetFeatureId && (SOLID_FEATURE_TYPES as readonly string[]).includes(f.type)
    );
    if (!targetFeature) {
      throw new Error(`Target solid feature not found: ${targetFeatureId}`);
    }

    const toolFeature = features.find(
      (f) => f.id === toolFeatureId && (SOLID_FEATURE_TYPES as readonly string[]).includes(f.type)
    );
    if (!toolFeature) {
      throw new Error(`Tool solid feature not found: ${toolFeatureId}`);
    }

    try {
      set({ isProcessing: true, processingProgress: 0 });

      const { getCADWorker } = await import('../lib/cad/cadWorkerClient');
      const worker = getCADWorker();

      set({ processingProgress: 30 });
      await worker.initialize();
      set({ processingProgress: 50 });

      const { canvasWidth: defaultCW, canvasHeight: defaultCH } = useSketchStore.getState();

      const targetTranslation = getFeatureTranslation(targetFeature);
      const toolTranslation = getFeatureTranslation(toolFeature);

      const geometryData = await worker.booleanOp(
        featureToDescriptor(targetFeature, features, defaultCW, defaultCH),
        targetTranslation,
        featureToDescriptor(toolFeature, features, defaultCW, defaultCH),
        toolTranslation,
        operation
      );

      set({ processingProgress: 80 });

      const { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute, Vector3 } =
        await import('three');
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(geometryData.positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(geometryData.normals, 3));
      geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
      geometry.computeVertexNormals();

      // Centrar la geometría del resultado para que el gizmo quede en el centro visual.
      geometry.computeBoundingBox();
      const geomCenter = new Vector3();
      geometry.boundingBox!.getCenter(geomCenter);
      geometry.translate(-geomCenter.x, -geomCenter.y, -geomCenter.z);

      set({ processingProgress: 90 });

      const opLabel =
        operation === 'union' ? 'Unión' : operation === 'subtract' ? 'Resta' : 'Intersección';
      const feature: BooleanFeature = {
        id: featureId,
        type: FeatureType.BOOLEAN,
        name: `Boolean ${opLabel}`,
        parentId: null,
        visible: true,
        suppressed: false,
        operation,
        targetId: targetFeatureId,
        toolId: toolFeatureId,
        position: { x: geomCenter.x, y: geomCenter.y, z: geomCenter.z },
        geometryCenter: { x: geomCenter.x, y: geomCenter.y, z: geomCenter.z },
      };

      // Teoría de conjuntos: A∪B, A\B, A∩B → el resultado REEMPLAZA a los
      // operandos. Suprimir target y tool para que solo se renderice el resultado.
      set((state) => {
        const newFeatures = [
          ...state.features.map((f) =>
            f.id === targetFeatureId || f.id === toolFeatureId
              ? { ...f, suppressed: true }
              : f
          ),
          feature,
        ];
        const newGeometries = new Map(state.geometries);
        newGeometries.set(feature.id, { featureId: feature.id, geometry, visible: true });
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(newFeatures);
        const newIndex = newHistory.length - 1;
        return {
          features: newFeatures,
          geometries: newGeometries,
          history: newHistory,
          historyIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: false,
          selectedFeatureId: feature.id,
          processingProgress: 100,
        };
      });
      return featureId;
    } catch (error) {
      console.error('[Feature Store] Boolean failed:', error);
      throw error;
    } finally {
      set({ isProcessing: false, processingProgress: 0 });
    }
  },

  // ==================== Draft (FUNC-010) ====================

  createDraft: async (sourceFeatureId, angle, neutralPlane = 'XY') => {
    const featureId = nanoid();
    const { features } = get();

    const sourceFeature = features.find(
      (f) => f.id === sourceFeatureId && (SOLID_FEATURE_TYPES as readonly string[]).includes(f.type)
    );
    if (!sourceFeature) {
      throw new Error(`Source solid feature not found: ${sourceFeatureId}`);
    }

    if (angle < -30 || angle > 30) {
      throw new Error('Draft angle must be between -30 and 30 degrees');
    }

    try {
      set({ isProcessing: true, processingProgress: 0 });

      const { getCADWorker } = await import('../lib/cad/cadWorkerClient');
      const worker = getCADWorker();

      set({ processingProgress: 30 });
      await worker.initialize();
      set({ processingProgress: 50 });

      const { canvasWidth: defaultCW, canvasHeight: defaultCH } = useSketchStore.getState();
      const sourceDesc = featureToDescriptor(sourceFeature, features, defaultCW, defaultCH);
      const sourceTranslation = getFeatureTranslation(sourceFeature);

      const geometryData = await worker.draft(sourceDesc, sourceTranslation, angle, neutralPlane);

      set({ processingProgress: 80 });

      const { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } =
        await import('three');
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(geometryData.positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(geometryData.normals, 3));
      geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
      geometry.computeVertexNormals();

      set({ processingProgress: 90 });

      const feature: DraftFeature = {
        id: featureId,
        type: FeatureType.DRAFT,
        name: `Draft ${angle}° (${neutralPlane})`,
        parentId: sourceFeatureId,
        visible: true,
        suppressed: false,
        sourceFeatureId,
        angle,
        neutralPlane,
      };

      get().addFeature(feature, geometry);
      set({ processingProgress: 100 });
      return featureId;
    } catch (error) {
      console.error('[Feature Store] Draft failed:', error);
      throw error;
    } finally {
      set({ isProcessing: false, processingProgress: 0 });
    }
  },

  // ==================== Offset (FUNC-009) ====================

  createOffset: async (sourceFeatureId, distance) => {
    const featureId = nanoid();
    const { features } = get();

    const sourceFeature = features.find(
      (f) => f.id === sourceFeatureId && (SOLID_FEATURE_TYPES as readonly string[]).includes(f.type)
    );
    if (!sourceFeature) {
      throw new Error(`Source solid feature not found: ${sourceFeatureId}`);
    }

    try {
      set({ isProcessing: true, processingProgress: 0 });

      const { getCADWorker } = await import('../lib/cad/cadWorkerClient');
      const worker = getCADWorker();

      set({ processingProgress: 30 });
      await worker.initialize();
      set({ processingProgress: 50 });

      const { canvasWidth: defaultCW, canvasHeight: defaultCH } = useSketchStore.getState();
      const sourceDesc = featureToDescriptor(sourceFeature, features, defaultCW, defaultCH);
      const sourceTranslation = getFeatureTranslation(sourceFeature);

      const geometryData = await worker.offset(sourceDesc, sourceTranslation, distance);

      set({ processingProgress: 80 });

      const { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } =
        await import('three');
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(geometryData.positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(geometryData.normals, 3));
      geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
      geometry.computeVertexNormals();

      set({ processingProgress: 90 });

      const feature: OffsetFeature = {
        id: featureId,
        type: FeatureType.OFFSET,
        name: `Offset ${distance > 0 ? '+' : ''}${distance}mm`,
        parentId: sourceFeatureId,
        visible: true,
        suppressed: false,
        sourceFeatureId,
        distance,
      };

      get().addFeature(feature, geometry);
      set({ processingProgress: 100 });
      return featureId;
    } catch (error) {
      console.error('[Feature Store] Offset failed:', error);
      throw error;
    } finally {
      set({ isProcessing: false, processingProgress: 0 });
    }
  },

  // ==================== Primitivas 3D ====================

  // ── Click-to-place ──

  startPlacement: (type) => {
    set({
      placementMode: { type },
      placementPosition: null,
      placementRotation: { x: 0, y: 0, z: 0 },
    });
  },

  confirmPlacement: (position) => {
    set({ placementPosition: position });
  },

  setPlacementRotation: (rotation) => {
    set({ placementRotation: rotation });
  },

  cancelPlacement: () => {
    set({ placementMode: null, placementPosition: null, placementRotation: { x: 0, y: 0, z: 0 } });
  },

  createPrimitiveBox: async (width, height, depth, position, rotation) => {
    const featureId = nanoid();
    try {
      set({ isProcessing: true, processingProgress: 0 });
      const { getCADWorker } = await import('../lib/cad/cadWorkerClient');
      const worker = getCADWorker();
      set({ processingProgress: 30 });
      await worker.initialize();
      set({ processingProgress: 50 });
      const geometryData = await worker.primitiveBox(width, height, depth);
      set({ processingProgress: 80 });
      const { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } =
        await import('three');
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(geometryData.positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(geometryData.normals, 3));
      geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
      geometry.computeVertexNormals();
      set({ processingProgress: 90 });
      const feature: BoxFeature = {
        id: featureId,
        type: FeatureType.PRIMITIVE_BOX,
        name: `Cubo ${width}×${height}×${depth}`,
        parentId: null,
        visible: true,
        suppressed: false,
        position: position ?? { x: 0, y: 0, z: 0 },
        rotation: rotation ?? { x: 0, y: 0, z: 0 },
        width,
        height,
        depth,
      };
      get().addFeature(feature, geometry);
      set({ processingProgress: 100 });
      return featureId;
    } catch (error) {
      console.error('[Feature Store] PrimitiveBox failed:', error);
      throw error;
    } finally {
      set({ isProcessing: false, processingProgress: 0 });
    }
  },

  createPrimitiveSphere: async (radius, position, rotation) => {
    const featureId = nanoid();
    try {
      set({ isProcessing: true, processingProgress: 0 });
      const { getCADWorker } = await import('../lib/cad/cadWorkerClient');
      const worker = getCADWorker();
      set({ processingProgress: 30 });
      await worker.initialize();
      set({ processingProgress: 50 });
      const geometryData = await worker.primitiveSphere(radius);
      set({ processingProgress: 80 });
      const { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } =
        await import('three');
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(geometryData.positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(geometryData.normals, 3));
      geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
      geometry.computeVertexNormals();
      set({ processingProgress: 90 });
      const feature: SphereFeature = {
        id: featureId,
        type: FeatureType.PRIMITIVE_SPHERE,
        name: `Esfera r${radius}`,
        parentId: null,
        visible: true,
        suppressed: false,
        position: position ?? { x: 0, y: 0, z: 0 },
        rotation: rotation ?? { x: 0, y: 0, z: 0 },
        radius,
      };
      get().addFeature(feature, geometry);
      set({ processingProgress: 100 });
      return featureId;
    } catch (error) {
      console.error('[Feature Store] PrimitiveSphere failed:', error);
      throw error;
    } finally {
      set({ isProcessing: false, processingProgress: 0 });
    }
  },

  createPrimitiveCylinder: async (radius, height, position, rotation) => {
    const featureId = nanoid();
    try {
      set({ isProcessing: true, processingProgress: 0 });
      const { getCADWorker } = await import('../lib/cad/cadWorkerClient');
      const worker = getCADWorker();
      set({ processingProgress: 30 });
      await worker.initialize();
      set({ processingProgress: 50 });
      const geometryData = await worker.primitiveCylinder(radius, height);
      set({ processingProgress: 80 });
      const { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } =
        await import('three');
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(geometryData.positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(geometryData.normals, 3));
      geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
      geometry.computeVertexNormals();
      set({ processingProgress: 90 });
      const feature: CylinderFeature = {
        id: featureId,
        type: FeatureType.PRIMITIVE_CYLINDER,
        name: `Cilindro r${radius} h${height}`,
        parentId: null,
        visible: true,
        suppressed: false,
        position: position ?? { x: 0, y: 0, z: 0 },
        rotation: rotation ?? { x: 0, y: 0, z: 0 },
        radius,
        height,
      };
      get().addFeature(feature, geometry);
      set({ processingProgress: 100 });
      return featureId;
    } catch (error) {
      console.error('[Feature Store] PrimitiveCylinder failed:', error);
      throw error;
    } finally {
      set({ isProcessing: false, processingProgress: 0 });
    }
  },

  createPrimitiveCone: async (baseRadius, topRadius, height, position, rotation) => {
    const featureId = nanoid();
    try {
      set({ isProcessing: true, processingProgress: 0 });
      const { getCADWorker } = await import('../lib/cad/cadWorkerClient');
      const worker = getCADWorker();
      set({ processingProgress: 30 });
      await worker.initialize();
      set({ processingProgress: 50 });
      const geometryData = await worker.primitiveCone(baseRadius, topRadius, height);
      set({ processingProgress: 80 });
      const { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } =
        await import('three');
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(geometryData.positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(geometryData.normals, 3));
      geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
      geometry.computeVertexNormals();
      set({ processingProgress: 90 });
      const feature: ConeFeature = {
        id: featureId,
        type: FeatureType.PRIMITIVE_CONE,
        name: `Cono r${baseRadius}/${topRadius} h${height}`,
        parentId: null,
        visible: true,
        suppressed: false,
        position: position ?? { x: 0, y: 0, z: 0 },
        rotation: rotation ?? { x: 0, y: 0, z: 0 },
        baseRadius,
        topRadius,
        height,
      };
      get().addFeature(feature, geometry);
      set({ processingProgress: 100 });
      return featureId;
    } catch (error) {
      console.error('[Feature Store] PrimitiveCone failed:', error);
      throw error;
    } finally {
      set({ isProcessing: false, processingProgress: 0 });
    }
  },

  createPrimitiveTorus: async (majorRadius, minorRadius, position, rotation) => {
    const featureId = nanoid();
    try {
      set({ isProcessing: true, processingProgress: 0 });
      const { getCADWorker } = await import('../lib/cad/cadWorkerClient');
      const worker = getCADWorker();
      set({ processingProgress: 30 });
      await worker.initialize();
      set({ processingProgress: 50 });
      const geometryData = await worker.primitiveTorus(majorRadius, minorRadius);
      set({ processingProgress: 80 });
      const { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } =
        await import('three');
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(geometryData.positions, 3));
      geometry.setAttribute('normal', new Float32BufferAttribute(geometryData.normals, 3));
      geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
      geometry.computeVertexNormals();
      set({ processingProgress: 90 });
      const feature: TorusFeature = {
        id: featureId,
        type: FeatureType.PRIMITIVE_TORUS,
        name: `Toroide R${majorRadius} r${minorRadius}`,
        parentId: null,
        visible: true,
        suppressed: false,
        position: position ?? { x: 0, y: 0, z: 0 },
        rotation: rotation ?? { x: 0, y: 0, z: 0 },
        majorRadius,
        minorRadius,
      };
      get().addFeature(feature, geometry);
      set({ processingProgress: 100 });
      return featureId;
    } catch (error) {
      console.error('[Feature Store] PrimitiveTorus failed:', error);
      throw error;
    } finally {
      set({ isProcessing: false, processingProgress: 0 });
    }
  },

  // ==================== Historial ====================

  undo: () => {
    set((state) => {
      if (state.historyIndex <= 0) return state;

      const newIndex = state.historyIndex - 1;
      const features = state.history[newIndex];

      return {
        features,
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: newIndex < state.history.length - 1,
        selectedFeatureId: null,
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;

      const newIndex = state.historyIndex + 1;
      const features = state.history[newIndex];

      return {
        features,
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: newIndex < state.history.length - 1,
        selectedFeatureId: null,
      };
    });
  },

  // ==================== Estado ====================

  setProcessing: (isProcessing, progress = 0) => {
    set({ isProcessing, processingProgress: progress });
  },

  // ==================== Reset ====================

  reset: () => {
    const state = get();

    // Limpiar todas las geometrías
    state.geometries.forEach((featureGeom) => {
      featureGeom.geometry.dispose();
    });

    set(initialState);
  },
}));
