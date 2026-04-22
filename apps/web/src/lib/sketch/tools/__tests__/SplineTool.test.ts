/**
 * Tests para SplineTool
 *
 * Flujo: click sucesivos (puntos de control) → double-click o finalize() para cerrar.
 * La spline requiere al menos 2 puntos.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SplineTool } from '@/lib/sketch/tools/SplineTool';
import type { Spline } from '@/lib/sketch/tools/SplineTool';

vi.mock('fabric', () => ({
  Path: vi.fn().mockImplementation((_path: string, opts?: Record<string, unknown>) => ({
    set: vi.fn(),
    ...(opts || {}),
  })),
  Circle: vi.fn().mockImplementation(() => ({ set: vi.fn() })),
  Line: vi.fn().mockImplementation(() => ({ set: vi.fn() })),
}));

describe('SplineTool', () => {
  let tool: SplineTool;
  let mockCanvas: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas = {
      add: vi.fn(),
      remove: vi.fn(),
      renderAll: vi.fn(),
    };
    tool = new SplineTool(mockCanvas);
  });

  it('debe inicializar con estado inactivo', () => {
    expect((tool as any).isDrawing).toBe(false);
    expect((tool as any).points).toEqual([]);
  });

  describe('onMouseDown — agregar puntos', () => {
    it('debe activar isDrawing en el primer click', () => {
      tool.onMouseDown({ x: 10, y: 10 });
      expect((tool as any).isDrawing).toBe(true);
    });

    it('debe almacenar el primer punto', () => {
      const p = { x: 10, y: 20 };
      tool.onMouseDown(p);
      expect((tool as any).points).toEqual([p]);
    });

    it('debe acumular puntos con clicks sucesivos', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      (tool as any).lastClickTime = 0; // evitar false double-click
      tool.onMouseDown({ x: 50, y: 50 });
      (tool as any).lastClickTime = 0;
      tool.onMouseDown({ x: 100, y: 0 });
      expect((tool as any).points).toHaveLength(3);
    });

    it('debe agregar dot de control al canvas con cada click', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      // 1 dot + pathPreview (o solo dot si < 2 puntos)
      expect(mockCanvas.add).toHaveBeenCalled();
    });
  });

  describe('onMouseMove', () => {
    it('no debe renderizar sin click previo', () => {
      tool.onMouseMove({ x: 10, y: 10 });
      expect(mockCanvas.renderAll).not.toHaveBeenCalled();
    });

    it('debe actualizar preview cuando hay puntos', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseDown({ x: 50, y: 50 });
      mockCanvas.renderAll.mockClear();
      tool.onMouseMove({ x: 100, y: 0 });
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });
  });

  describe('onMouseUp — double-click finaliza', () => {
    it('debe retornar null en click simple', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      const result = tool.onMouseUp({ x: 0, y: 0 });
      expect(result).toBeNull();
    });

    it('debe retornar Spline en double-click con ≥ 2 puntos', () => {
      // Simular dos puntos y luego double-click
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseDown({ x: 50, y: 50 });

      // Simular double-click: setear lastClickTime para que el delta < 350ms
      (tool as any).lastClickTime = Date.now();
      const result = tool.onMouseUp({ x: 50, y: 50 });

      expect(result).not.toBeNull();
      const spline = result as Spline;
      expect(spline.type).toBe('spline');
      expect(spline.start).toEqual({ x: 0, y: 0 });
      expect(spline.id).toBeDefined();
      expect(spline.selected).toBe(false);
    });
  });

  describe('finalize()', () => {
    it('debe retornar Spline con ≥ 2 puntos', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseDown({ x: 50, y: 50 });
      const result = tool.finalize();
      expect(result).not.toBeNull();
      const spline = result as Spline;
      expect(spline.type).toBe('spline');
      expect(spline.start).toEqual({ x: 0, y: 0 });
      expect(spline.controlPoints).toHaveLength(1); // rest = [{ x:50, y:50 }]
    });

    it('debe retornar null con < 2 puntos', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      expect(tool.finalize()).toBeNull();
    });

    it('debe retornar null sin puntos', () => {
      expect(tool.finalize()).toBeNull();
    });

    it('debe crear path permanente en el canvas', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseDown({ x: 50, y: 50 });
      mockCanvas.add.mockClear();
      tool.finalize();
      // Agrega path permanente
      expect(mockCanvas.add).toHaveBeenCalled();
    });

    it('debe limpiar estado después de finalizar', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseDown({ x: 50, y: 50 });
      tool.finalize();
      expect((tool as any).isDrawing).toBe(false);
      expect((tool as any).points).toEqual([]);
      expect((tool as any).controlDots).toEqual([]);
    });

    it('debe remover dots de control y preview del canvas', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseDown({ x: 50, y: 50 });
      tool.onMouseDown({ x: 100, y: 0 });
      mockCanvas.remove.mockClear();
      tool.finalize();
      // Remueve: pathPreview + 3 controlDots
      expect(mockCanvas.remove).toHaveBeenCalled();
    });
  });

  describe('Spline con múltiples puntos', () => {
    it('debe crear spline con 4 puntos', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      (tool as any).lastClickTime = 0;
      tool.onMouseDown({ x: 30, y: 40 });
      (tool as any).lastClickTime = 0;
      tool.onMouseDown({ x: 70, y: 20 });
      (tool as any).lastClickTime = 0;
      tool.onMouseDown({ x: 100, y: 60 });
      const result = tool.finalize() as Spline;
      expect(result.controlPoints).toHaveLength(3); // 4 puntos - 1 start = 3
    });
  });

  describe('cancel', () => {
    it('debe limpiar estado completo', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseDown({ x: 50, y: 50 });
      tool.cancel();
      expect((tool as any).isDrawing).toBe(false);
      expect((tool as any).points).toEqual([]);
      expect((tool as any).controlDots).toEqual([]);
    });

    it('debe remover objetos del canvas', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseDown({ x: 50, y: 50 });
      mockCanvas.remove.mockClear();
      tool.cancel();
      expect(mockCanvas.remove).toHaveBeenCalled();
    });
  });

  describe('Casos edge', () => {
    it('debe generar IDs únicos', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseDown({ x: 50, y: 50 });
      const s1 = tool.finalize() as Spline;

      tool.onMouseDown({ x: 10, y: 10 });
      tool.onMouseDown({ x: 60, y: 60 });
      const s2 = tool.finalize() as Spline;

      expect(s1.id).not.toBe(s2.id);
    });
  });
});
