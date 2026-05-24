/**
 * Tests para MeasureTool
 *
 * Flujo: 1er click → marca inicio + preview dashed line
 *        mouse move → actualiza línea + etiqueta de distancia
 *        2do click  → fija la medición (sólida) + llama onMeasure
 *        Escape/cancel → elimina labelObject y previewObject
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MeasureTool } from '@/lib/sketch/tools/MeasureTool';

const { mockFabricLine, mockFabricText } = vi.hoisted(() => {
  const mockFabricLine = vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    data: {},
  }));
  const mockFabricText = vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    data: {},
  }));
  return { mockFabricLine, mockFabricText };
});

vi.mock('fabric', () => ({
  Line: mockFabricLine,
  FabricText: mockFabricText,
}));

describe('MeasureTool', () => {
  let tool: MeasureTool;
  let mockCanvas: any;
  let onMeasureMock: ReturnType<typeof vi.fn>;

  const defaultOptions = {
    unit: 'mm' as const,
    pixelsPerMm: 4,
    onMeasure: undefined as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas = {
      add: vi.fn(),
      remove: vi.fn(),
      renderAll: vi.fn(),
    };
    onMeasureMock = vi.fn();
    tool = new MeasureTool(mockCanvas, { ...defaultOptions, onMeasure: onMeasureMock });
  });

  // ── Estado inicial ─────────────────────────────────────────────────────────

  it('debe inicializar con isDrawing=false', () => {
    expect((tool as any).isDrawing).toBe(false);
  });

  it('debe inicializar con startPoint=null', () => {
    expect((tool as any).startPoint).toBeNull();
  });

  it('debe inicializar con labelObject=null', () => {
    expect((tool as any).labelObject).toBeNull();
  });

  it('debe inicializar con previewObject=null', () => {
    expect((tool as any).previewObject).toBeNull();
  });

  // ── onMouseDown: primer click ─────────────────────────────────────────────

  describe('Primer click — inicio de medición', () => {
    it('debe activar isDrawing', () => {
      tool.onMouseDown({ x: 10, y: 20 });
      expect((tool as any).isDrawing).toBe(true);
    });

    it('debe guardar el startPoint', () => {
      tool.onMouseDown({ x: 10, y: 20 });
      expect((tool as any).startPoint).toEqual({ x: 10, y: 20 });
    });

    it('debe agregar la línea de preview al canvas', () => {
      tool.onMouseDown({ x: 10, y: 20 });
      expect(mockCanvas.add).toHaveBeenCalledTimes(1);
    });

    it('debe crear la línea de preview como instancia FabricLine', () => {
      tool.onMouseDown({ x: 10, y: 20 });
      expect(mockFabricLine).toHaveBeenCalledTimes(1);
    });

    it('debe marcar la línea de preview con isMeasurePreview=true', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      const previewObj = (tool as any).previewObject;
      expect(previewObj.data.isMeasurePreview).toBe(true);
    });
  });

  // ── onMouseDown: segundo click ─────────────────────────────────────────────

  describe('Segundo click — fijar medición', () => {
    beforeEach(() => {
      tool.onMouseDown({ x: 0, y: 0 }); // primer click
    });

    it('debe desactivar isDrawing', () => {
      tool.onMouseDown({ x: 40, y: 0 }); // segundo click
      expect((tool as any).isDrawing).toBe(false);
    });

    it('debe resetear startPoint a null', () => {
      tool.onMouseDown({ x: 40, y: 0 });
      expect((tool as any).startPoint).toBeNull();
    });

    it('debe llamar onMeasure con distancia correcta en mm', () => {
      // pixelsPerMm=4, distancia 40px → 10mm
      tool.onMouseDown({ x: 40, y: 0 });
      expect(onMeasureMock).toHaveBeenCalledWith(
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        10,
        'mm'
      );
    });

    it('debe llamar onMeasure con distancia correcta en ft', () => {
      const ftTool = new MeasureTool(mockCanvas, {
        unit: 'ft',
        pixelsPerMm: 4,
        onMeasure: onMeasureMock,
      });
      ftTool.onMouseDown({ x: 0, y: 0 });
      // 1219.2 px / 4 = 304.8 mm / 304.8 = 1 ft
      ftTool.onMouseDown({ x: 1219.2, y: 0 });
      expect(onMeasureMock).toHaveBeenCalledWith(
        { x: 0, y: 0 },
        { x: 1219.2, y: 0 },
        expect.closeTo(1, 4),
        'ft'
      );
    });

    it('no debe llamar onMeasure si no está definido', () => {
      const noCallbackTool = new MeasureTool(mockCanvas, {
        unit: 'mm',
        pixelsPerMm: 4,
      });
      noCallbackTool.onMouseDown({ x: 0, y: 0 });
      // No debe lanzar error
      expect(() => noCallbackTool.onMouseDown({ x: 40, y: 0 })).not.toThrow();
    });

    it('debe llamar renderAll', () => {
      tool.onMouseDown({ x: 40, y: 0 });
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('debe calcular distancia euclidiana correctamente', () => {
      // Punto diagonal: dx=30, dy=40 → distancia=50px / 4 = 12.5mm
      tool.onMouseDown({ x: 30, y: 40 });
      expect(onMeasureMock).toHaveBeenCalledWith(
        { x: 0, y: 0 },
        { x: 30, y: 40 },
        12.5,
        'mm'
      );
    });
  });

  // ── onMouseMove ────────────────────────────────────────────────────────────

  describe('onMouseMove', () => {
    it('no debe hacer nada si no se ha iniciado la medición', () => {
      tool.onMouseMove({ x: 10, y: 10 });
      expect(mockCanvas.renderAll).not.toHaveBeenCalled();
    });

    it('debe actualizar la línea de preview', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      const previewLine = (tool as any).previewObject;
      tool.onMouseMove({ x: 50, y: 0 });
      expect(previewLine.set).toHaveBeenCalled();
    });

    it('debe agregar etiqueta de distancia cuando dist >= 1px', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseMove({ x: 50, y: 0 });
      expect(mockFabricText).toHaveBeenCalled();
    });

    it('debe llamar renderAll en cada movimiento', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseMove({ x: 30, y: 0 });
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('no debe agregar etiqueta cuando dist < 1px', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseMove({ x: 0.5, y: 0 });
      expect(mockFabricText).not.toHaveBeenCalled();
    });

    it('debe eliminar etiqueta anterior antes de agregar nueva', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseMove({ x: 40, y: 0 }); // agrega primera etiqueta
      const firstLabel = (tool as any).labelObject;
      tool.onMouseMove({ x: 80, y: 0 }); // mueve a nuevo punto
      expect(mockCanvas.remove).toHaveBeenCalledWith(firstLabel);
    });
  });

  // ── onMouseUp ─────────────────────────────────────────────────────────────

  describe('onMouseUp', () => {
    it('debe retornar null (sin-op)', () => {
      const result = tool.onMouseUp({ x: 10, y: 10 });
      expect(result).toBeNull();
    });
  });

  // ── cancel ────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('debe eliminar el previewObject si existe', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      const previewObj = (tool as any).previewObject;
      tool.cancel();
      expect(mockCanvas.remove).toHaveBeenCalledWith(previewObj);
    });

    it('debe eliminar el labelObject si existe', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseMove({ x: 40, y: 0 });
      const label = (tool as any).labelObject;
      tool.cancel();
      expect(mockCanvas.remove).toHaveBeenCalledWith(label);
    });

    it('debe limpiar labelObject a null después de cancel', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseMove({ x: 40, y: 0 });
      tool.cancel();
      expect((tool as any).labelObject).toBeNull();
    });

    it('debe resetear isDrawing a false', () => {
      tool.onMouseDown({ x: 0, y: 0 });
      tool.cancel();
      expect((tool as any).isDrawing).toBe(false);
    });

    it('no debe lanzar error si no hay previewObject ni labelObject', () => {
      expect(() => tool.cancel()).not.toThrow();
    });
  });

  // ── updateOptions ─────────────────────────────────────────────────────────

  describe('updateOptions', () => {
    it('debe actualizar la unidad de medida', () => {
      tool.updateOptions({ unit: 'ft', pixelsPerMm: 4 });
      expect((tool as any).options.unit).toBe('ft');
    });

    it('debe actualizar pixelsPerMm', () => {
      tool.updateOptions({ unit: 'mm', pixelsPerMm: 8 });
      expect((tool as any).options.pixelsPerMm).toBe(8);
    });

    it('debe afectar el formato de distancia', () => {
      tool.updateOptions({ unit: 'ft', pixelsPerMm: 304.8, onMeasure: onMeasureMock });
      tool.onMouseDown({ x: 0, y: 0 });
      tool.onMouseDown({ x: 304.8, y: 0 }); // 304.8px / 304.8 = 1mm / 304.8 = 1ft
      expect(onMeasureMock).toHaveBeenCalledWith(
        { x: 0, y: 0 },
        { x: 304.8, y: 0 },
        expect.closeTo(1 / 304.8, 4),
        'ft'
      );
    });
  });
});
