import { Vector2, Rectangle, SketchEntityType } from '@capycad/shared-types';
import { Rect } from 'fabric';
import { nanoid } from 'nanoid';
import { BaseTool } from './BaseTool';

/**
 * Herramienta para dibujar rectángulos
 */
export class RectangleTool extends BaseTool {
  onMouseDown(point: Vector2): void {
    if (!this.isDrawing) {
      // Primer click - establecer esquina inicial
      this.isDrawing = true;
      this.startPoint = point;

      // Crear preview del rectángulo
      this.previewObject = new Rect({
        left: point.x,
        top: point.y,
        width: 0,
        height: 0,
        stroke: '#7c3aed',
        strokeWidth: 2,
        fill: 'transparent',
        selectable: false,
        evented: false,
        strokeDashArray: [5, 5],
      });

      this.canvas.add(this.previewObject);
    }
  }

  onMouseMove(point: Vector2): void {
    if (this.isDrawing && this.startPoint && this.previewObject) {
      // Calcular dimensiones
      const width = point.x - this.startPoint.x;
      const height = point.y - this.startPoint.y;

      // Ajustar left/top si width/height son negativos
      const left = width > 0 ? this.startPoint.x : point.x;
      const top = height > 0 ? this.startPoint.y : point.y;

      // Actualizar preview
      (this.previewObject as Rect).set({
        left: left,
        top: top,
        width: Math.abs(width),
        height: Math.abs(height),
      });
      this.canvas.renderAll();
    }
  }

  onMouseUp(point: Vector2): Rectangle | null {
    if (!this.isDrawing || !this.startPoint) return null;

    // Calcular dimensiones
    const width = Math.abs(point.x - this.startPoint.x);
    const height = Math.abs(point.y - this.startPoint.y);

    // Verificar que las dimensiones sean significativas
    if (width < 5 || height < 5) {
      // Rectángulo muy pequeño, no crear todavía
      return null;
    }

    // Determinar esquinas
    const topLeft: Vector2 = {
      x: Math.min(this.startPoint.x, point.x),
      y: Math.min(this.startPoint.y, point.y),
    };

    const bottomRight: Vector2 = {
      x: Math.max(this.startPoint.x, point.x),
      y: Math.max(this.startPoint.y, point.y),
    };

    // Crear entidad de rectángulo
    const rectangle: Rectangle = {
      id: nanoid(),
      type: SketchEntityType.RECTANGLE,
      selected: false,
      topLeft: topLeft,
      bottomRight: bottomRight,
    };

    // Crear objeto Fabric permanente
    const fabricRect = new Rect({
      left: topLeft.x,
      top: topLeft.y,
      width: width,
      height: height,
      stroke: '#ffffff',
      strokeWidth: 2,
      fill: 'transparent',
      selectable: true,
      hasControls: false,
      hasBorders: false,
      data: { entityId: rectangle.id },
    });

    this.canvas.add(fabricRect);

    // Limpiar preview
    if (this.previewObject) {
      this.canvas.remove(this.previewObject);
      this.previewObject = null;
    }

    // Reset estado
    this.isDrawing = false;
    this.startPoint = null;

    this.canvas.renderAll();

    return rectangle;
  }
}
