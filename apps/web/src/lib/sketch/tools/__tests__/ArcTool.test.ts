/**
 * Tests para ArcTool
 *
 * Flujo: 3 clics — 1) centro, 2) define radio, 3) define ángulo final.
 * El arco se crea sólo si el radio ≥ 5px.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ArcTool } from '@/lib/sketch/tools/ArcTool';
import type { Arc } from '@stl-model/shared-types';

vi.mock('fabric', () => ({
  Circle: vi.fn().mockImplementation(() => ({ set: vi.fn() })),
  Line: vi.fn().mockImplementation(() => ({ set: vi.fn() })),
  Path: vi.fn().mockImplementation(() => ({ set: vi.fn() })),
}));

describe('ArcTool', () => {
  let tool: ArcTool;
  let mockCanvas: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas = {
      add: vi.fn(),
      remove: vi.fn(),
      renderAll: vi.fn(),
    };
    tool = new ArcTool(mockCanvas);
  });

  it('debe inicializar con estado inactivo', () => {
    expect((tool as any).isDrawing).toBe(false);
    expect((tool as any).phase).toBe(0);
    expect((tool as any).startPoint).toBeNull();
  });

  describe('Fase 0 → 1: Definir centro', () => {
    it('debe activar isDrawing al primer click', () => {
      tool.onMouseDown({ x: 50, y: 50 });
      expect((tool as any).isDrawing).toBe(true);
    });

    it('debe guardar el centro como startPoint', () => {
      const center = { x: 50, y: 50 };
      tool.onMouseDown(center);
      expect((tool as any).startPoint).toEqual(center);
    });

    it('debe pasar a phase=1 después del primer click', () => {
      tool.onMouseDown({ x: 50, y: 50 });
      expect((tool as any).phase).toBe(1);
    });

    it('debe agregar preview (círculo) al canvas', () => {
      tool.onMouseDown({ x: 50, y: 50 });
      expect(mockCanvas.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fase 1 → 2: Definir radio', () => {
    beforeEach(() => {
      tool.onMouseDown({ x: 50, y: 50 }); // centro
    });

    it('debe pasar a phase=2 al segundo click', () => {
      tool.onMouseDown({ x: 80, y: 50 }); // radio = 30
      expect((tool as any).phase).toBe(2);
    });

    it('debe calcular el radio correctamente', () => {
      tool.onMouseDown({ x: 80, y: 50 }); // distancia = 30
      expect((tool as any).radius).toBe(30);
    });

    it('debe calcular startAngle correctamente', () => {
      tool.onMouseDown({ x: 80, y: 50 }); // punto a la derecha → ángulo 0
      expect((tool as any).startAngle).toBeCloseTo(0, 5);
    });

    it('debe agregar línea de radio como guía visual', () => {
      tool.onMouseDown({ x: 80, y: 50 });
      // add llamado: 1 para preview, 1 para radiusLine
      expect(mockCanvas.add).toHaveBeenCalledTimes(2);
    });
  });

  describe('onMouseMove', () => {
    it('no debe renderizar sin click inicial', () => {
      tool.onMouseMove({ x: 10, y: 10 });
      expect(mockCanvas.renderAll).not.toHaveBeenCalled();
    });

    it('debe renderizar durante phase=1 (definiendo radio)', () => {
      tool.onMouseDown({ x: 50, y: 50 });
      tool.onMouseMove({ x: 80, y: 50 });
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('debe actualizar preview durante phase=1', () => {
      tool.onMouseDown({ x: 50, y: 50 });
      const preview = (tool as any).previewObject;
      tool.onMouseMove({ x: 80, y: 50 });
      expect(preview.set).toHaveBeenCalled();
    });

    it('debe renderizar durante phase=2 (definiendo ángulo)', () => {
      tool.onMouseDown({ x: 50, y: 50 });
      tool.onMouseDown({ x: 80, y: 50 }); // radio = 30
      mockCanvas.renderAll.mockClear();
      tool.onMouseMove({ x: 50, y: 20 });
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });
  });

  describe('onMouseUp (phase=2): Crear arco', () => {
    beforeEach(() => {
      tool.onMouseDown({ x: 50, y: 50 }); // centro
      tool.onMouseDown({ x: 80, y: 50 }); // radio = 30
    });

    it('debe crear arco con radio ≥ 5', () => {
      const result = tool.onMouseUp({ x: 50, y: 20 });
      expect(result).not.toBeNull();
      const arc = result as Arc;
      expect(arc.type).toBe('arc');
      expect(arc.center).toEqual({ x: 50, y: 50 });
      expect(arc.radius).toBe(30);
      expect(arc.id).toBeDefined();
      expect(arc.selected).toBe(false);
    });

    it('debe calcular endAngle correctamente', () => {
      const result = tool.onMouseUp({ x: 50, y: 20 }) as Arc;
      // Punto arriba del centro → ángulo negativo (atan2(-30, 0) = -PI/2)
      expect(result.endAngle).toBeCloseTo(-Math.PI / 2, 3);
    });

    it('debe retornar null si no está en phase=2', () => {
      const freshTool = new ArcTool(mockCanvas);
      expect(freshTool.onMouseUp({ x: 10, y: 10 })).toBeNull();
    });

    it('debe resetear estado después de crear', () => {
      tool.onMouseUp({ x: 50, y: 20 });
      expect((tool as any).isDrawing).toBe(false);
      expect((tool as any).phase).toBe(0);
      expect((tool as any).radius).toBe(0);
    });

    it('debe remover preview y guías del canvas', () => {
      tool.onMouseUp({ x: 50, y: 20 });
      expect(mockCanvas.remove).toHaveBeenCalled();
    });
  });

  describe('Arco con radio pequeño', () => {
    it('debe retornar null si el radio < 5', () => {
      tool.onMouseDown({ x: 50, y: 50 }); // centro
      tool.onMouseDown({ x: 53, y: 50 }); // radio = 3 < 5
      const result = tool.onMouseUp({ x: 50, y: 47 });
      expect(result).toBeNull();
    });
  });

  describe('cancel', () => {
    it('debe limpiar estado completo', () => {
      tool.onMouseDown({ x: 50, y: 50 });
      tool.onMouseDown({ x: 80, y: 50 });
      tool.cancel();
      expect((tool as any).isDrawing).toBe(false);
      expect((tool as any).phase).toBe(0);
      expect((tool as any).startPoint).toBeNull();
    });

    it('debe remover preview y radiusLine del canvas', () => {
      tool.onMouseDown({ x: 50, y: 50 });
      tool.onMouseDown({ x: 80, y: 50 });
      tool.cancel();
      expect(mockCanvas.remove).toHaveBeenCalled();
    });
  });

  describe('IDs únicos', () => {
    it('debe generar IDs únicos para cada arco', () => {
      // Arco 1
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseDown({ x: 30, y: 0 });
      const arc1 = tool.onMouseUp({ x: 0, y: 30 }) as Arc;

      // Arco 2
      tool.onMouseDown({ x: 100, y: 100 });
      tool.onMouseDown({ x: 130, y: 100 });
      const arc2 = tool.onMouseUp({ x: 100, y: 130 }) as Arc;

      expect(arc1.id).not.toBe(arc2.id);
    });
  });
});
