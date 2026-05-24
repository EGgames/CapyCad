import { create } from 'zustand';
import { Sketch, SketchEntity, ConstraintType, Measurement } from '@capycad/shared-types';
import { nanoid } from 'nanoid';
import { solveConstraints, createConstraint } from '../lib/sketch/constraints/constraintSolver';

/**
 * Tipos de herramientas de dibujo
 */
export type DrawTool =
  | 'select'
  | 'line'
  | 'circle'
  | 'arc'
  | 'rectangle'
  | 'polygon'
  | 'measure'
  | 'spline'
  | 'ellipse';

/**
 * Modos de edición
 */
export type EditMode = '2d' | '3d';

/**
 * Opciones de snapping
 */
export interface SnapOptions {
  enabled: boolean;
  snapToGrid: boolean;
  snapToPoints: boolean;
  snapToLines: boolean;
  gridSize: number;
}

/**
 * Estado del historial para undo/redo
 */
interface HistoryState {
  entities: SketchEntity[];
  timestamp: number;
}

/**
 * Estado del sketch
 */
interface SketchState {
  // Sketch activo
  activeSketch: Sketch | null;

  // Herramienta seleccionada
  activeTool: DrawTool;

  // Modo de edición
  editMode: EditMode;

  // Entidades seleccionadas
  selectedEntities: string[];

  // Opciones de snapping
  snapOptions: SnapOptions;

  // Historial para undo/redo
  history: HistoryState[];
  historyIndex: number;

  // Preview temporal (mientras se dibuja)
  previewEntity: SketchEntity | null;

  // Dimensiones del canvas 2D (para mapeo de coordenadas con la vista 3D)
  canvasWidth: number;
  canvasHeight: number;

  // Configuración de herramientas
  polygonSides: number;

  // Herramienta de medición
  measureUnit: 'mm' | 'ft';
  /** Cuántos píxeles del canvas equivalen a 1 mm real */
  pixelsPerMm: number;

  // Acciones
  setActiveTool: (tool: DrawTool) => void;
  setCanvasDimensions: (width: number, height: number) => void;
  setPolygonSides: (sides: number) => void;
  setMeasureUnit: (unit: 'mm' | 'ft') => void;
  setPixelsPerMm: (value: number) => void;
  setEditMode: (mode: EditMode) => void;
  createSketch: (name: string, plane?: 'XY' | 'XZ' | 'YZ') => void;
  addEntity: (entity: SketchEntity) => void;
  updateEntity: (id: string, updates: Partial<SketchEntity>) => void;
  deleteEntity: (id: string) => void;
  selectEntity: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setPreviewEntity: (entity: SketchEntity | null) => void;
  updateSnapOptions: (options: Partial<SnapOptions>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  addConstraint: (type: ConstraintType, entityIds: string[], value?: number) => void;
  removeConstraint: (constraintId: string) => void;
  addMeasurement: (
    start: { x: number; y: number },
    end: { x: number; y: number },
    distance: number,
    unit: 'mm' | 'ft'
  ) => void;
  removeMeasurement: (id: string) => void;
}

/**
 * Store del sketch
 */
export const useSketchStore = create<SketchState>((set, get) => ({
  // Estado inicial
  activeSketch: {
    id: nanoid(),
    name: 'Sketch 1',
    entities: [],
    constraints: [],
    measurements: [],
    plane: 'XY',
  },
  activeTool: 'select',
  editMode: '2d',
  selectedEntities: [],
  snapOptions: {
    enabled: true,
    snapToGrid: true,
    snapToPoints: true,
    snapToLines: false,
    gridSize: 10,
  },
  history: [{ entities: [], timestamp: Date.now() }],
  historyIndex: 0,
  previewEntity: null,
  canvasWidth: 800,
  canvasHeight: 600,
  polygonSides: 6,
  measureUnit: 'mm',
  pixelsPerMm: 1,

  // Acciones
  setActiveTool: (tool) => set({ activeTool: tool }),

  setCanvasDimensions: (width, height) => set({ canvasWidth: width, canvasHeight: height }),

  setPolygonSides: (sides) => set({ polygonSides: sides }),

  setMeasureUnit: (unit) => set({ measureUnit: unit }),

  setPixelsPerMm: (value) => set({ pixelsPerMm: Math.max(0.01, value) }),

  setEditMode: (mode) => set({ editMode: mode }),

  createSketch: (name, plane = 'XY') => {
    const newSketch: Sketch = {
      id: nanoid(),
      name,
      entities: [],
      constraints: [],
      measurements: [],
      plane,
    };

    set({
      activeSketch: newSketch,
      history: [{ entities: [], timestamp: Date.now() }],
      historyIndex: 0,
    });
  },

  addEntity: (entity) => {
    let { activeSketch, history, historyIndex } = get();
    if (!activeSketch) {
      const newSketch: Sketch = {
        id: nanoid(),
        name: 'Sketch 1',
        entities: [],
        constraints: [],
        measurements: [],
        plane: 'XY',
      };
      const initialHistory = [{ entities: [] as SketchEntity[], timestamp: Date.now() }];
      set({ activeSketch: newSketch, history: initialHistory, historyIndex: 0 });
      activeSketch = newSketch;
      history = initialHistory;
      historyIndex = 0;
    }

    const updatedEntities = [...activeSketch.entities, entity];
    const newSketch = { ...activeSketch, entities: updatedEntities };

    // Agregar al historial
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      entities: updatedEntities,
      timestamp: Date.now(),
    });

    set({
      activeSketch: newSketch,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  updateEntity: (id, updates) => {
    const { activeSketch } = get();
    if (!activeSketch) return;

    const updatedEntities = activeSketch.entities.map((entity) =>
      entity.id === id ? { ...entity, ...updates } : entity
    );

    set({
      activeSketch: { ...activeSketch, entities: updatedEntities },
    });
  },

  deleteEntity: (id) => {
    const { activeSketch, history, historyIndex } = get();
    if (!activeSketch) return;

    const updatedEntities = activeSketch.entities.filter((entity) => entity.id !== id);
    const newSketch = { ...activeSketch, entities: updatedEntities };

    // Agregar al historial
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      entities: updatedEntities,
      timestamp: Date.now(),
    });

    set({
      activeSketch: newSketch,
      selectedEntities: get().selectedEntities.filter((entityId) => entityId !== id),
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  selectEntity: (id, multi = false) => {
    const { selectedEntities } = get();

    if (multi) {
      const isSelected = selectedEntities.includes(id);
      set({
        selectedEntities: isSelected
          ? selectedEntities.filter((entityId) => entityId !== id)
          : [...selectedEntities, id],
      });
    } else {
      set({ selectedEntities: [id] });
    }

    // Actualizar selected flag en entidades
    const { activeSketch } = get();
    if (activeSketch) {
      const updatedEntities = activeSketch.entities.map((entity) => ({
        ...entity,
        selected: get().selectedEntities.includes(entity.id),
      }));
      set({
        activeSketch: { ...activeSketch, entities: updatedEntities },
      });
    }
  },

  clearSelection: () => {
    set({ selectedEntities: [] });

    const { activeSketch } = get();
    if (activeSketch) {
      const updatedEntities = activeSketch.entities.map((entity) => ({
        ...entity,
        selected: false,
      }));
      set({
        activeSketch: { ...activeSketch, entities: updatedEntities },
      });
    }
  },

  setPreviewEntity: (entity) => set({ previewEntity: entity }),

  updateSnapOptions: (options) =>
    set((state) => ({
      snapOptions: { ...state.snapOptions, ...options },
    })),

  undo: () => {
    const { history, historyIndex, activeSketch } = get();
    if (historyIndex <= 0 || !activeSketch) return;

    const newIndex = historyIndex - 1;
    const prevState = history[newIndex];

    set({
      activeSketch: { ...activeSketch, entities: prevState.entities },
      historyIndex: newIndex,
    });
  },

  redo: () => {
    const { history, historyIndex, activeSketch } = get();
    if (historyIndex >= history.length - 1 || !activeSketch) return;

    const newIndex = historyIndex + 1;
    const nextState = history[newIndex];

    set({
      activeSketch: { ...activeSketch, entities: nextState.entities },
      historyIndex: newIndex,
    });
  },

  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  addConstraint: (type, entityIds, value) => {
    const { activeSketch } = get();
    if (!activeSketch) return;

    const constraint = createConstraint(type, entityIds, value);
    const newConstraints = [...activeSketch.constraints, constraint];
    const solvedEntities = solveConstraints(activeSketch.entities, newConstraints);

    set({
      activeSketch: {
        ...activeSketch,
        constraints: newConstraints,
        entities: solvedEntities,
      },
    });
  },

  removeConstraint: (constraintId) => {
    const { activeSketch } = get();
    if (!activeSketch) return;

    const newConstraints = activeSketch.constraints.filter((c) => c.id !== constraintId);
    const solvedEntities = solveConstraints(activeSketch.entities, newConstraints);

    set({
      activeSketch: {
        ...activeSketch,
        constraints: newConstraints,
        entities: solvedEntities,
      },
    });
  },

  addMeasurement: (start, end, distance, unit) => {
    const { activeSketch } = get();
    if (!activeSketch) return;

    const measurement: Measurement = {
      id: nanoid(),
      start,
      end,
      distance,
      unit,
    };

    set({
      activeSketch: {
        ...activeSketch,
        measurements: [...activeSketch.measurements, measurement],
      },
    });
  },

  removeMeasurement: (id) => {
    const { activeSketch } = get();
    if (!activeSketch) return;

    set({
      activeSketch: {
        ...activeSketch,
        measurements: activeSketch.measurements.filter((m) => m.id !== id),
      },
    });
  },
}));
