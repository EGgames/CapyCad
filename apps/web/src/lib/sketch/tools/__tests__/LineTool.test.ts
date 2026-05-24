/**
 * Tests para LineTool
 *
 * Flujo real: mouseDown (inicia) → mouseMove (preview) → mouseUp (crea línea)
 * La línea se crea sólo si el desplazamiento es >= 2px.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LineTool } from '@/lib/sketch/tools/LineTool';
import type { Line } from '@capycad/shared-types';

// Mock completo de fabric — los objetos son instancias virtuales sin DOM
vi.mock('fabric', () => ({
  Line: vi.fn().mockImplementation(() => ({ set: vi.fn() })),
  Circle: vi.fn().mockImplementation(() => ({ set: vi.fn() })),
  Rect: vi.fn().mockImplementation(() => ({ set: vi.fn() })),
}));

describe('LineTool', () => {
  let tool: LineTool;
  let mockCanvas: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas = {
      add: vi.fn(),
      remove: vi.fn(),
      renderAll: vi.fn(),
    };
    tool = new LineTool(mockCanvas);
  });

  it('debe inicializar con estado inactivo', () => {
    expect((tool as any).isDrawing).toBe(false);
    expect((tool as any).startPoint).toBeNull();
  });

  describe('onMouseDown', () => {
    it('debe activar isDrawing en el primer click', () => {
      tool.onMouseDown({ x: 10, y: 20 });
      expect((tool as any).isDrawing).toBe(true);
    });

    it('debe guardar el punto inicial', () => {
      const point = { x: 10, y: 20 };
      tool.onMouseDown(point);
      expect((tool as any).startPoint).toEqual(point);
    });

    it('no debe sobrescribir startPoint si ya está dibujando', () => {
      const start = { x: 10, y: 20 };
      tool.onMouseDown(start);
      tool.onMouseDown({ x: 99, y: 99 }); // segundo mouseDown ignorado
      expect((tool as any).startPoint).toEqual(start);
    });

    it('debe agregar objeto preview al canvas', () => {
      tool.onMouseDown({ x: 10, y: 20 });
      expect(mockCanvas.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('onMouseMove', () => {
    it('debe llamar renderAll después del primer click', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseMove({ x: 5, y: 5 });
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('no debe llamar renderAll sin click inicial', () => {
      tool.onMouseMove({ x: 10, y: 10 });
      expect(mockCanvas.renderAll).not.toHaveBeenCalled();
    });

    it('debe actualizar el preview con cada movimiento', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      const previewObj = (tool as any).previewObject;
      tool.onMouseMove({ x: 50, y: 50 });
      expect(previewObj.set).toHaveBeenCalled();
    });
  });

  describe('onMouseUp', () => {
    it('debe crear línea al soltar (desplazamiento >= 2px)', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 10 };
      tool.onMouseDown(start);
      const result = tool.onMouseUp(end);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('line');
      const line = result as Line;
      expect(line.start).toEqual(start);
      expect(line.end).toEqual(end);
      expect(line.id).toBeDefined();
    });

    it('debe retornar null si el movimiento es menor a 2px', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      const result = tool.onMouseUp({ x: 1, y: 1 }); // dx=1, dy=1 < 2
      expect(result).toBeNull();
    });

    it('debe retornar null si no hubo mouseDown previo', () => {
      expect(tool.onMouseUp({ x: 10, y: 10 })).toBeNull();
    });

    it('debe resetear isDrawing después de crear', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseUp({ x: 20, y: 20 });
      expect((tool as any).isDrawing).toBe(false);
    });

    it('debe resetear startPoint después de crear', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseUp({ x: 20, y: 20 });
      expect((tool as any).startPoint).toBeNull();
    });
  });

  describe('cancel', () => {
    it('debe limpiar estado', () => {
      tool.onMouseDown({ x: 10, y: 10 });
      tool.cancel();
      expect((tool as any).isDrawing).toBe(false);
      expect((tool as any).startPoint).toBeNull();
    });

    it('debe remover el preview del canvas', () => {
      tool.onMouseDown({ x: 10, y: 10 });
      tool.cancel();
      expect(mockCanvas.remove).toHaveBeenCalled();
    });
  });

  describe('Casos edge', () => {
    it('debe manejar línea de longitud cero (mismo punto)', () => {
      const p = { x: 10, y: 10 };
      tool.onMouseDown(p);
      expect(tool.onMouseUp(p)).toBeNull();
    });

    it('debe generar IDs únicos para cada línea', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      const line1 = tool.onMouseUp({ x: 20, y: 20 }) as Line;

      tool.onMouseDown({ x: 0, y: 0 });
      const line2 = tool.onMouseUp({ x: 30, y: 30 }) as Line;

      expect(line1.id).not.toBe(line2.id);
    });
  });
});
