/**
 * Tests para la auto-creación de sketch en addEntity (regresión).
 *
 * Antes: si no existía un sketch activo y se llamaba a addEntity,
 * la entidad se descartaba silenciosamente (early return). Esto provocaba
 * que dibujar antes de presionar "Nuevo sketch" perdiera los trazos y que
 * la posterior extrusión fallara con "No hay un sketch activo con entidades".
 *
 * Ahora: addEntity crea un sketch por defecto ("Sketch 1", plano XY) si no
 * existe ninguno activo, e inicia el historial.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSketchStore } from '@/stores/sketchStore';
import { Line, SketchEntityType } from '@capycad/shared-types';

describe('sketchStore — auto-create sketch en addEntity', () => {
  beforeEach(() => {
    useSketchStore.setState({
      activeSketch: null,
      activeTool: 'select',
      editMode: '2d',
      selectedEntities: [],
      history: [],
      historyIndex: -1,
      previewEntity: null,
    });
  });

  it('addEntity_whenNoActiveSketch_thenCreatesDefaultSketchAndAddsEntity', () => {
    const line: Line = {
      id: 'line-auto-1',
      type: SketchEntityType.LINE,
      selected: false,
      start: { x: 0, y: 0 },
      end: { x: 100, y: 50 },
    };

    expect(useSketchStore.getState().activeSketch).toBeNull();

    useSketchStore.getState().addEntity(line);

    const { activeSketch, history, historyIndex } = useSketchStore.getState();
    expect(activeSketch).not.toBeNull();
    expect(activeSketch?.name).toBe('Sketch 1');
    expect(activeSketch?.plane).toBe('XY');
    expect(activeSketch?.entities).toHaveLength(1);
    expect(activeSketch?.entities[0]).toEqual(line);
    expect(history).toHaveLength(2); // estado inicial + push
    expect(historyIndex).toBe(1);
  });

  it('addEntity_whenSketchExists_thenAppendsWithoutCreatingNew', () => {
    useSketchStore.getState().createSketch('Mi Sketch', 'XZ');
    const originalId = useSketchStore.getState().activeSketch!.id;

    const line: Line = {
      id: 'line-existing-1',
      type: SketchEntityType.LINE,
      selected: false,
      start: { x: 1, y: 2 },
      end: { x: 3, y: 4 },
    };

    useSketchStore.getState().addEntity(line);

    const { activeSketch } = useSketchStore.getState();
    expect(activeSketch!.id).toBe(originalId);
    expect(activeSketch!.name).toBe('Mi Sketch');
    expect(activeSketch!.plane).toBe('XZ');
    expect(activeSketch!.entities).toHaveLength(1);
  });
});
