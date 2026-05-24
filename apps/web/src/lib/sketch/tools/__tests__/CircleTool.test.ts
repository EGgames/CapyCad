/**
 * Tests para CircleTool
 *
 * Flujo real: mouseDown (establece centro) → mouseMove (preview radio) → mouseUp (crea círculo)
 * El círculo se crea sólo si el radio es >= 5px.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircleTool } from '@/lib/sketch/tools/CircleTool';
import type { Circle } from '@capycad/shared-types';
import { distance } from '@/lib/sketch/geometry';

vi.mock('fabric', () => ({
  Line: vi.fn().mockImplementation(() => ({ set: vi.fn() })),
  Circle: vi.fn().mockImplementation(() => ({ set: vi.fn() })),
  Rect: vi.fn().mockImplementation(() => ({ set: vi.fn() })),
}));

describe('CircleTool', () => {
  let tool: CircleTool;
  let mockCanvas: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas = {
      add: vi.fn(),
      remove: vi.fn(),
      renderAll: vi.fn(),
    };
    tool = new CircleTool(mockCanvas);
  });

  it('debe inicializar con estado inactivo', () => {
    expect((tool as any).isDrawing).toBe(false);
    expect((tool as any).startPoint).toBeNull();
  });

  describe('onMouseDown', () => {
    it('debe establecer centro en el primer click', () => {
      const center = { x: 50, y: 50 };
      tool.onMouseDown(center);
      expect((tool as any).isDrawing).toBe(true);
      expect((tool as any).startPoint).toEqual(center);
    });

    it('no debe sobrescribir centro si ya está dibujando', () => {
      const center = { x: 50, y: 50 };
      tool.onMouseDown(center);
      tool.onMouseDown({ x: 99, y: 99 });
      expect((tool as any).startPoint).toEqual(center);
    });

    it('debe agregar preview al canvas', () => {
      tool.onMouseDown({ x: 50, y: 50 });
      expect(mockCanvas.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('onMouseMove', () => {
    it('debe llamar renderAll al mover el mouse', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseMove({ x: 10, y: 0 });
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('no debe renderizar sin click inicial', () => {
      tool.onMouseMove({ x: 10, y: 10 });
      expect(mockCanvas.renderAll).not.toHaveBeenCalled();
    });

    it('debe actualizar el radio del preview', () => {
      const center = { x: 0, y: 0 };
      tool.onMouseDown(center);
      const previewObj = (tool as any).previewObject;
      tool.onMouseMove({ x: 10, y: 0 });
      expect(previewObj.set).toHaveBeenCalledWith({ radius: 10 });
    });
  });

  describe('onMouseUp', () => {
    it('debe crear círculo con radio suficiente (>= 5)', () => {
      const center = { x: 0, y: 0 };
      const edge = { x: 10, y: 0 }; // radio = 10
      tool.onMouseDown(center);
      const result = tool.onMouseUp(edge);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('circle');
      const circle = result as Circle;
      expect(circle.center).toEqual(center);
      expect(circle.radius).toBeCloseTo(10);
    });

    it('debe retornar null si el radio es menor a 5', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      const result = tool.onMouseUp({ x: 3, y: 0 }); // radio = 3 < 5
      expect(result).toBeNull();
    });

    it('debe retornar null sin mouseDown previo', () => {
      expect(tool.onMouseUp({ x: 10, y: 0 })).toBeNull();
    });

    it('debe resetear estado después de crear', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseUp({ x: 10, y: 0 });
      expect((tool as any).isDrawing).toBe(false);
      expect((tool as any).startPoint).toBeNull();
    });

    it('debe calcular radio como distancia triángulo 3-4-5', () => {
      const center = { x: 0, y: 0 };
      const edge = { x: 3, y: 4 }; // radio = 5
      tool.onMouseDown(center);
      const circle = tool.onMouseUp(edge) as Circle;
      expect(circle.radius).toBeCloseTo(5);
    });
  });

  describe('cancel', () => {
    it('debe limpiar estado', () => {
      tool.onMouseDown({ x: 50, y: 50 });
      tool.cancel();
      expect((tool as any).isDrawing).toBe(false);
      expect((tool as any).startPoint).toBeNull();
    });

    it('debe remover preview del canvas', () => {
      tool.onMouseDown({ x: 50, y: 50 });
      tool.cancel();
      expect(mockCanvas.remove).toHaveBeenCalled();
    });
  });

  describe('Casos edge', () => {
    it('debe manejar círculo con radio cero', () => {
      const p = { x: 10, y: 10 };
      tool.onMouseDown(p);
      expect(tool.onMouseUp(p)).toBeNull();
    });

    it('debe generar IDs únicos para cada círculo', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      const c1 = tool.onMouseUp({ x: 10, y: 0 }) as Circle;

      tool.onMouseDown({ x: 0, y: 0 });
      const c2 = tool.onMouseUp({ x: 20, y: 0 }) as Circle;

      expect(c1.id).not.toBe(c2.id);
    });

    it('debe mantener precisión del radio con decimales', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      const circle = tool.onMouseUp({ x: 7, y: 7 }) as Circle;
      expect(circle.radius).toBeCloseTo(distance({ x: 0, y: 0 }, { x: 7, y: 7 }));
    });
  });
});
