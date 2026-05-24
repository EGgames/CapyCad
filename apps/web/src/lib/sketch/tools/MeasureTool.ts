import { Vector2, SketchEntity } from '@capycad/shared-types';
import { Line as FabricLine, FabricText } from 'fabric';
import { BaseTool } from './BaseTool';

export interface MeasureOptions {
  unit: 'mm' | 'ft';
  pixelsPerMm: number;
  onMeasure?: (
    start: { x: number; y: number },
    end: { x: number; y: number },
    distance: number,
    unit: 'mm' | 'ft'
  ) => void;
}

/**
 * Herramienta de medición:
 * - 1er click: establece punto de inicio
 * - Mouse move: muestra línea + etiqueta con distancia en tiempo real
 * - 2do click: fija la medición en el canvas (amarilla, solo lectura)
 * - Escape: cancela
 */
export class MeasureTool extends BaseTool {
  private labelObject: FabricText | null = null;
  private options: MeasureOptions;

  constructor(canvas: import('fabric').Canvas, options: MeasureOptions) {
    super(canvas);
    this.options = options;
  }

  private formatDistance(px: number): string {
    const mm = px / this.options.pixelsPerMm;
    if (this.options.unit === 'ft') {
      const ft = mm / 304.8;
      return `${ft.toFixed(3)} ft`;
    }
    return `${mm.toFixed(1)} mm`;
  }

  updateOptions(options: MeasureOptions) {
    this.options = options;
  }

  onMouseDown(point: Vector2): void {
    if (!this.isDrawing) {
      // Primer click — marcar inicio
      this.isDrawing = true;
      this.startPoint = point;

      this.previewObject = new FabricLine([point.x, point.y, point.x, point.y], {
        stroke: '#f59e0b',
        strokeWidth: 1.5,
        strokeDashArray: [6, 3],
        selectable: false,
        evented: false,
      });
      (this.previewObject as any).data = { isMeasurePreview: true };
      this.canvas.add(this.previewObject);
    } else {
      // Segundo click — fijar medición
      const start = this.startPoint!;
      const end = point;

      if (this.previewObject) {
        (this.previewObject as any).data = { isMeasure: true };
        (this.previewObject as FabricLine).set({ strokeDashArray: undefined });
        this.previewObject = null;
      }
      if (this.labelObject) {
        (this.labelObject as any).data = { isMeasure: true };
        this.labelObject = null;
      }

      // Persist measurement
      if (this.options.onMeasure) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distPx = Math.sqrt(dx * dx + dy * dy);
        const distMm = distPx / this.options.pixelsPerMm;
        const distFinal = this.options.unit === 'ft' ? distMm / 304.8 : distMm;
        this.options.onMeasure(start, end, distFinal, this.options.unit);
      }

      this.isDrawing = false;
      this.startPoint = null;
      this.canvas.renderAll();
    }
  }

  onMouseMove(point: Vector2): void {
    if (!this.isDrawing || !this.startPoint || !this.previewObject) return;

    const dx = point.x - this.startPoint.x;
    const dy = point.y - this.startPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Actualizar línea de preview
    (this.previewObject as FabricLine).set({
      x1: this.startPoint.x,
      y1: this.startPoint.y,
      x2: point.x,
      y2: point.y,
    });

    // Actualizar o crear etiqueta
    const label = dist < 1 ? '' : this.formatDistance(dist);
    const midX = (this.startPoint.x + point.x) / 2;
    const midY = (this.startPoint.y + point.y) / 2;

    if (this.labelObject) {
      this.canvas.remove(this.labelObject);
    }

    if (label) {
      this.labelObject = new FabricText(label, {
        left: midX + 6,
        top: midY - 16,
        fontSize: 11,
        fill: '#f59e0b',
        fontFamily: 'monospace',
        selectable: false,
        evented: false,
      });
      (this.labelObject as any).data = { isMeasurePreview: true };
      this.canvas.add(this.labelObject);
    }

    this.canvas.renderAll();
  }

  onMouseUp(_point: Vector2): SketchEntity | null {
    return null;
  }

  override cancel(): void {
    if (this.labelObject) {
      this.canvas.remove(this.labelObject);
      this.labelObject = null;
    }
    super.cancel(); // BaseTool: elimina previewObject + renderAll
  }

  // No override de cleanup() — BaseTool.cleanup() llama this.cancel() que ya es seguro
}
