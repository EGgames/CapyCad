/**
 * Tests para RectangleTool
 *
 * Flujo real: mouseDown (esquina inicial) → mouseMove (preview) → mouseUp (crea rectángulo)
 * El rectángulo se crea sólo si width >= 5 Y height >= 5.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RectangleTool } from '@/lib/sketch/tools/RectangleTool';
import type { Rectangle } from '@stl-model/shared-types';

vi.mock('fabric', () => ({
  Line: vi.fn().mockImplementation(() => ({ set: vi.fn() })),
  Circle: vi.fn().mockImplementation(() => ({ set: vi.fn() })),
  Rect: vi.fn().mockImplementation(() => ({ set: vi.fn() })),
}));

describe('RectangleTool', () => {
  let tool: RectangleTool;
  let mockCanvas: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas = {
      add: vi.fn(),
      remove: vi.fn(),
      renderAll: vi.fn(),
    };
    tool = new RectangleTool(mockCanvas);
  });

  it('debe inicializar con estado inactivo', () => {
    expect((tool as any).isDrawing).toBe(false);
    expect((tool as any).startPoint).toBeNull();
  });

  describe('onMouseDown', () => {
    it('debe establecer primera esquina', () => {
      const corner = { x: 10, y: 20 };
      tool.onMouseDown(corner);
      expect((tool as any).isDrawing).toBe(true);
      expect((tool as any).startPoint).toEqual(corner);
    });

    it('no debe sobrescribir esquina si ya está dibujando', () => {
      const corner = { x: 10, y: 20 };
      tool.onMouseDown(corner);
      tool.onMouseDown({ x: 99, y: 99 });
      expect((tool as any).startPoint).toEqual(corner);
    });

    it('debe agregar preview al canvas', () => {
      tool.onMouseDown({ x: 10, y: 20 });
      expect(mockCanvas.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('onMouseMove', () => {
    it('debe llamar renderAll al mover', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseMove({ x: 50, y: 50 });
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('no debe renderizar sin click inicial', () => {
      tool.onMouseMove({ x: 50, y: 50 });
      expect(mockCanvas.renderAll).not.toHaveBeenCalled();
    });

    it('debe actualizar el preview con la esquina opuesta', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      const previewObj = (tool as any).previewObject;
      tool.onMouseMove({ x: 50, y: 40 });
      expect(previewObj.set).toHaveBeenCalledWith(
        expect.objectContaining({ width: 50, height: 40 })
      );
    });
  });

  describe('onMouseUp', () => {
    it('debe crear rectángulo con dimensiones suficientes', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 30, y: 20 };
      tool.onMouseDown(start);
      const result = tool.onMouseUp(end);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('rectangle');
      const rect = result as Rectangle;
      expect(rect.topLeft).toEqual({ x: 0, y: 0 });
      expect(rect.bottomRight).toEqual({ x: 30, y: 20 });
    });

    it('debe retornar null si width < 5', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      expect(tool.onMouseUp({ x: 3, y: 20 })).toBeNull();
    });

    it('debe retornar null si height < 5', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      expect(tool.onMouseUp({ x: 20, y: 3 })).toBeNull();
    });

    it('debe retornar null sin mouseDown previo', () => {
      expect(tool.onMouseUp({ x: 30, y: 30 })).toBeNull();
    });

    it('debe resetear estado después de crear', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseUp({ x: 30, y: 20 });
      expect((tool as any).isDrawing).toBe(false);
      expect((tool as any).startPoint).toBeNull();
    });

    it('debe crear rectángulo en cualquier dirección (drag hacia arriba-izquierda)', () => {
      tool.onMouseDown({ x: 50, y: 50 });
      const result = tool.onMouseUp({ x: 10, y: 10 }) as Rectangle;
      expect(result).not.toBeNull();
      expect(result.topLeft).toEqual({ x: 10, y: 10 });
      expect(result.bottomRight).toEqual({ x: 50, y: 50 });
    });
  });

  describe('cancel', () => {
    it('debe limpiar estado', () => {
      tool.onMouseDown({ x: 10, y: 10 });
      tool.cancel();
      expect((tool as any).isDrawing).toBe(false);
      expect((tool as any).startPoint).toBeNull();
    });

    it('debe remover preview del canvas', () => {
      tool.onMouseDown({ x: 10, y: 10 });
      tool.cancel();
      expect(mockCanvas.remove).toHaveBeenCalled();
    });
  });

  describe('Casos edge', () => {
    it('debe manejar rectángulo de tamaño cero', () => {
      const p = { x: 10, y: 10 };
      tool.onMouseDown(p);
      expect(tool.onMouseUp(p)).toBeNull();
    });

    it('debe generar IDs únicos para cada rectángulo', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      const r1 = tool.onMouseUp({ x: 30, y: 20 }) as Rectangle;

      tool.onMouseDown({ x: 0, y: 0 });
      const r2 = tool.onMouseUp({ x: 50, y: 40 }) as Rectangle;

      expect(r1.id).not.toBe(r2.id);
    });

    it('debe mantener precisión con coordenadas decimales', () => {
      tool.onMouseDown({ x: 0.5, y: 0.5 });
      const rect = tool.onMouseUp({ x: 10.7, y: 8.3 }) as Rectangle;
      expect(rect.topLeft.x).toBeCloseTo(0.5);
      expect(rect.topLeft.y).toBeCloseTo(0.5);
    });
  });
});
