/**
 * Tests para PolygonTool
 *
 * Flujo: mouseDown (centro) → mouseMove (arrastra radio) → mouseUp (crea polígono)
 * El polígono se crea sólo si el radio ≥ 5px.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PolygonTool } from '@/lib/sketch/tools/PolygonTool';
import type { Polygon } from '@capycad/shared-types';

vi.mock('fabric', () => ({
  Polygon: vi.fn().mockImplementation(() => ({ set: vi.fn(), setCoords: vi.fn() })),
}));

describe('PolygonTool', () => {
  let tool: PolygonTool;
  let mockCanvas: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas = {
      add: vi.fn(),
      remove: vi.fn(),
      renderAll: vi.fn(),
    };
    tool = new PolygonTool(mockCanvas);
  });

  it('debe inicializar con estado inactivo y 6 lados por defecto', () => {
    expect((tool as any).isDrawing).toBe(false);
    expect((tool as any).startPoint).toBeNull();
    expect(tool.sides).toBe(6);
  });

  it('debe aceptar número de lados configurable', () => {
    const tri = new PolygonTool(mockCanvas, 3);
    expect(tri.sides).toBe(3);
  });

  describe('onMouseDown', () => {
    it('debe activar isDrawing al primer click', () => {
      tool.onMouseDown({ x: 100, y: 100 });
      expect((tool as any).isDrawing).toBe(true);
    });

    it('debe guardar el punto centro', () => {
      const center = { x: 100, y: 100 };
      tool.onMouseDown(center);
      expect((tool as any).startPoint).toEqual(center);
    });

    it('debe agregar preview al canvas', () => {
      tool.onMouseDown({ x: 100, y: 100 });
      expect(mockCanvas.add).toHaveBeenCalledTimes(1);
    });

    it('no debe reiniciar si ya está dibujando', () => {
      const first = { x: 10, y: 20 };
      tool.onMouseDown(first);
      tool.onMouseDown({ x: 99, y: 99 });
      expect((tool as any).startPoint).toEqual(first);
    });
  });

  describe('onMouseMove', () => {
    it('debe llamar renderAll cuando está dibujando', () => {
      tool.onMouseDown({ x: 100, y: 100 });
      tool.onMouseMove({ x: 130, y: 100 });
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('no debe llamar renderAll sin click previo', () => {
      tool.onMouseMove({ x: 130, y: 100 });
      expect(mockCanvas.renderAll).not.toHaveBeenCalled();
    });

    it('debe actualizar el preview con puntos nuevos', () => {
      tool.onMouseDown({ x: 100, y: 100 });
      const preview = (tool as any).previewObject;
      tool.onMouseMove({ x: 130, y: 100 });
      expect(preview.set).toHaveBeenCalled();
    });
  });

  describe('onMouseUp', () => {
    it('debe crear polígono con radio ≥ 5', () => {
      tool.onMouseDown({ x: 100, y: 100 });
      const result = tool.onMouseUp({ x: 130, y: 100 });
      expect(result).not.toBeNull();
      const poly = result as Polygon;
      expect(poly.type).toBe('polygon');
      expect(poly.center).toEqual({ x: 100, y: 100 });
      expect(poly.radius).toBe(30);
      expect(poly.sides).toBe(6);
      expect(poly.rotation).toBe(0);
      expect(poly.id).toBeDefined();
      expect(poly.selected).toBe(false);
    });

    it('debe retornar null si radio < 5', () => {
      tool.onMouseDown({ x: 100, y: 100 });
      const result = tool.onMouseUp({ x: 102, y: 100 }); // radio ≈ 2
      expect(result).toBeNull();
    });

    it('debe retornar null sin mouseDown previo', () => {
      expect(tool.onMouseUp({ x: 130, y: 100 })).toBeNull();
    });

    it('debe resetear estado después de crear', () => {
      tool.onMouseDown({ x: 100, y: 100 });
      tool.onMouseUp({ x: 130, y: 100 });
      expect((tool as any).isDrawing).toBe(false);
      expect((tool as any).startPoint).toBeNull();
    });

    it('debe crear polígono permanente y remover preview', () => {
      tool.onMouseDown({ x: 100, y: 100 });
      mockCanvas.add.mockClear();
      tool.onMouseUp({ x: 130, y: 100 });
      // Agrega polígono permanente al canvas
      expect(mockCanvas.add).toHaveBeenCalledTimes(1);
      // Remueve preview
      expect(mockCanvas.remove).toHaveBeenCalledTimes(1);
    });

    it('debe respetar el número de lados configurado', () => {
      const tri = new PolygonTool(mockCanvas, 3);
      tri.onMouseDown({ x: 50, y: 50 });
      const result = tri.onMouseUp({ x: 80, y: 50 }) as Polygon;
      expect(result.sides).toBe(3);
    });
  });

  describe('cancel', () => {
    it('debe limpiar estado', () => {
      tool.onMouseDown({ x: 100, y: 100 });
      tool.cancel();
      expect((tool as any).isDrawing).toBe(false);
      expect((tool as any).startPoint).toBeNull();
    });

    it('debe remover preview del canvas', () => {
      tool.onMouseDown({ x: 100, y: 100 });
      tool.cancel();
      expect(mockCanvas.remove).toHaveBeenCalled();
    });
  });

  describe('Casos edge', () => {
    it('debe manejar radio cero (mismo punto)', () => {
      const p = { x: 50, y: 50 };
      tool.onMouseDown(p);
      expect(tool.onMouseUp(p)).toBeNull();
    });

    it('debe generar IDs únicos', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      const p1 = tool.onMouseUp({ x: 30, y: 0 }) as Polygon;

      tool.onMouseDown({ x: 0, y: 0 });
      const p2 = tool.onMouseUp({ x: 0, y: 30 }) as Polygon;

      expect(p1.id).not.toBe(p2.id);
    });
  });
});
