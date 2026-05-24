import { Vector2, Line, SketchEntityType } from '@capycad/shared-types';
import { Line as FabricLine } from 'fabric';
import { nanoid } from 'nanoid';
import { BaseTool } from './BaseTool';

/**
 * Herramienta para dibujar líneas
 */
export class LineTool extends BaseTool {
  onMouseDown(point: Vector2): void {
    if (!this.isDrawing) {
      // Primer click - establecer punto inicial
      this.isDrawing = true;
      this.startPoint = point;

      // Crear preview de la línea
      this.previewObject = new FabricLine([point.x, point.y, point.x, point.y], {
        stroke: '#7c3aed',
        strokeWidth: 2,
        selectable: false,
        evented: false,
        strokeDashArray: [5, 5],
      });

      this.canvas.add(this.previewObject);
    }
  }

  onMouseMove(point: Vector2): void {
    if (this.isDrawing && this.startPoint && this.previewObject) {
      // Actualizar preview
      (this.previewObject as FabricLine).set({
        x2: point.x,
        y2: point.y,
      });
      this.canvas.renderAll();
    }
  }

  onMouseUp(point: Vector2): Line | null {
    if (!this.isDrawing || !this.startPoint) return null;

    // Verificar que no sea un punto (click sin movimiento)
    const dx = Math.abs(point.x - this.startPoint.x);
    const dy = Math.abs(point.y - this.startPoint.y);
    if (dx < 2 && dy < 2) {
      // Click muy pequeño, no crear línea todavía
      return null;
    }

    // Crear entidad de línea
    const line: Line = {
      id: nanoid(),
      type: SketchEntityType.LINE,
      selected: false,
      start: { ...this.startPoint },
      end: { ...point },
    };

    // Crear objeto Fabric permanente
    const fabricLine = new FabricLine([this.startPoint.x, this.startPoint.y, point.x, point.y], {
      stroke: '#ffffff',
      strokeWidth: 2,
      selectable: true,
      hasControls: false,
      hasBorders: false,
      data: { entityId: line.id },
    });

    this.canvas.add(fabricLine);

    // Limpiar preview
    if (this.previewObject) {
      this.canvas.remove(this.previewObject);
      this.previewObject = null;
    }

    // Reset estado
    this.isDrawing = false;
    this.startPoint = null;

    this.canvas.renderAll();

    return line;
  }
}
