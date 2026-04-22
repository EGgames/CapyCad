/**
 * Tests para sketchStore
 *
 * Prueba el store Zustand que gestiona el estado del sketch 2D:
 * - Creación de sketches
 * - Adición/actualización/eliminación de entidades
 * - Undo/Redo
 * - Selección de herramientas
 * - Cambio de modo de edición
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSketchStore } from '@/stores/sketchStore';
import { Line, Circle, SketchEntityType } from '@stl-model/shared-types';

describe('sketchStore', () => {
  beforeEach(() => {
    // Reset del store antes de cada test
    const { activeSketch } = useSketchStore.getState();
    if (activeSketch) {
      useSketchStore.setState({
        activeSketch: null,
        activeTool: 'select',
        editMode: '2d',
        selectedEntities: [],
        history: [],
        historyIndex: -1,
        previewEntity: null,
      });
    }
  });

  describe('Creación de Sketch', () => {
    it('debe crear un nuevo sketch con nombre y plano', () => {
      const { createSketch } = useSketchStore.getState();

      createSketch('Test Sketch', 'XY');

      const { activeSketch } = useSketchStore.getState();
      expect(activeSketch).not.toBeNull();
      expect(activeSketch?.name).toBe('Test Sketch');
      expect(activeSketch?.entities).toHaveLength(0);
    });

    it('debe generar ID único para el sketch', () => {
      const { createSketch } = useSketchStore.getState();

      createSketch('Sketch 1');
      const sketch1Id = useSketchStore.getState().activeSketch?.id;

      createSketch('Sketch 2');
      const sketch2Id = useSketchStore.getState().activeSketch?.id;

      expect(sketch1Id).not.toBe(sketch2Id);
    });
  });

  describe('Gestión de Entidades', () => {
    beforeEach(() => {
      const { createSketch } = useSketchStore.getState();
      createSketch('Test Sketch');
    });

    it('debe agregar una línea al sketch', () => {
      const { addEntity } = useSketchStore.getState();

      const line: Line = {
        id: 'line-1',
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
      };

      addEntity(line);

      const updatedSketch = useSketchStore.getState().activeSketch;
      expect(updatedSketch?.entities).toHaveLength(1);
      expect(updatedSketch?.entities[0]).toEqual(line);
    });

    it('debe agregar múltiples entidades', () => {
      const { addEntity } = useSketchStore.getState();

      const line: Line = {
        id: 'line-1',
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
      };

      const circle: Circle = {
        id: 'circle-1',
        type: SketchEntityType.CIRCLE,
        selected: false,
        center: { x: 5, y: 5 },
        radius: 3,
      };

      addEntity(line);
      addEntity(circle);

      const { activeSketch } = useSketchStore.getState();
      expect(activeSketch?.entities).toHaveLength(2);
    });

    it('debe actualizar una entidad existente', () => {
      const { addEntity, updateEntity } = useSketchStore.getState();

      const line: Line = {
        id: 'line-1',
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
      };

      addEntity(line);
      updateEntity('line-1', { end: { x: 20, y: 20 } } as Partial<Line>);

      const { activeSketch } = useSketchStore.getState();
      const updatedLine = activeSketch?.entities[0] as Line;
      expect(updatedLine.end).toEqual({ x: 20, y: 20 });
    });

    it('debe eliminar una entidad', () => {
      const { addEntity, deleteEntity } = useSketchStore.getState();

      const line: Line = {
        id: 'line-1',
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
      };

      addEntity(line);
      expect(useSketchStore.getState().activeSketch?.entities).toHaveLength(1);

      deleteEntity('line-1');
      expect(useSketchStore.getState().activeSketch?.entities).toHaveLength(0);
    });
  });

  describe('Undo/Redo', () => {
    beforeEach(() => {
      const { createSketch } = useSketchStore.getState();
      createSketch('Test Sketch');
    });

    it('debe deshacer adición de entidad', () => {
      const { addEntity, undo } = useSketchStore.getState();

      const line: Line = {
        id: 'line-1',
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
      };

      addEntity(line);
      expect(useSketchStore.getState().activeSketch?.entities).toHaveLength(1);
      expect(useSketchStore.getState().canUndo()).toBe(true);

      undo();
      expect(useSketchStore.getState().activeSketch?.entities).toHaveLength(0);
    });

    it('debe rehacer operación deshecha', () => {
      const { addEntity, undo, redo } = useSketchStore.getState();

      const line: Line = {
        id: 'line-1',
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
      };

      addEntity(line);
      undo();
      expect(useSketchStore.getState().activeSketch?.entities).toHaveLength(0);
      expect(useSketchStore.getState().canRedo()).toBe(true);

      redo();
      expect(useSketchStore.getState().activeSketch?.entities).toHaveLength(1);
    });

    it('debe gestionar historial de múltiples operaciones', () => {
      const { addEntity, undo } = useSketchStore.getState();

      // Agregar 3 líneas
      for (let i = 0; i < 3; i++) {
        const line: Line = {
          id: `line-${i}`,
          type: SketchEntityType.LINE,
          selected: false,
          start: { x: i, y: i },
          end: { x: i + 10, y: i + 10 },
        };
        addEntity(line);
      }

      expect(useSketchStore.getState().activeSketch?.entities).toHaveLength(3);

      // Deshacer 2 veces
      undo();
      undo();

      expect(useSketchStore.getState().activeSketch?.entities).toHaveLength(1);
    });

    it('debe limpiar redo al agregar nueva entidad después de undo', () => {
      const { addEntity, undo } = useSketchStore.getState();

      const line1: Line = {
        id: 'line-1',
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
      };

      const line2: Line = {
        id: 'line-2',
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: 5, y: 5 },
        end: { x: 15, y: 15 },
      };

      addEntity(line1);
      undo();

      expect(useSketchStore.getState().canRedo()).toBe(true);

      // Agregar nueva entidad debe limpiar el redo
      addEntity(line2);

      expect(useSketchStore.getState().canRedo()).toBe(false);
    });
  });

  describe('Herramientas y Modo de Edición', () => {
    it('debe cambiar herramienta activa', () => {
      const { setActiveTool } = useSketchStore.getState();

      setActiveTool('line');
      expect(useSketchStore.getState().activeTool).toBe('line');

      setActiveTool('circle');
      expect(useSketchStore.getState().activeTool).toBe('circle');

      setActiveTool('rectangle');
      expect(useSketchStore.getState().activeTool).toBe('rectangle');
    });

    it('debe cambiar modo de edición', () => {
      const { setEditMode } = useSketchStore.getState();

      expect(useSketchStore.getState().editMode).toBe('2d');

      setEditMode('3d');
      expect(useSketchStore.getState().editMode).toBe('3d');

      setEditMode('2d');
      expect(useSketchStore.getState().editMode).toBe('2d');
    });
  });

  describe('Selección de Entidades', () => {
    beforeEach(() => {
      const { createSketch, addEntity } = useSketchStore.getState();
      createSketch('Test Sketch');

      // Agregar algunas entidades
      const line: Line = {
        id: 'line-1',
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: 0, y: 0 },
        end: { x: 10, y: 10 },
      };
      addEntity(line);
    });

    it('debe seleccionar una entidad', () => {
      const { selectEntity } = useSketchStore.getState();

      selectEntity('line-1');
      expect(useSketchStore.getState().selectedEntities).toContain('line-1');
    });

    it('debe limpiar selección', () => {
      const { selectEntity, clearSelection } = useSketchStore.getState();

      selectEntity('line-1');
      expect(useSketchStore.getState().selectedEntities).toHaveLength(1);

      clearSelection();
      expect(useSketchStore.getState().selectedEntities).toHaveLength(0);
    });
  });

  describe('Snapping Options', () => {
    it('debe actualizar opciones de snapping', () => {
      const { updateSnapOptions } = useSketchStore.getState();

      updateSnapOptions({ gridSize: 20 });
      expect(useSketchStore.getState().snapOptions.gridSize).toBe(20);

      updateSnapOptions({ snapToPoints: false });
      expect(useSketchStore.getState().snapOptions.snapToPoints).toBe(false);
    });
  });

  describe('Preview Entity', () => {
    it('debe establecer entidad de preview', () => {
      const { setPreviewEntity } = useSketchStore.getState();

      const previewLine: Line = {
        id: 'preview-1',
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: 0, y: 0 },
        end: { x: 5, y: 5 },
      };

      setPreviewEntity(previewLine);
      expect(useSketchStore.getState().previewEntity).toEqual(previewLine);
    });

    it('debe limpiar preview entity', () => {
      const { setPreviewEntity } = useSketchStore.getState();

      const previewLine: Line = {
        id: 'preview-1',
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: 0, y: 0 },
        end: { x: 5, y: 5 },
      };

      setPreviewEntity(previewLine);
      setPreviewEntity(null);

      expect(useSketchStore.getState().previewEntity).toBeNull();
    });
  });
});
