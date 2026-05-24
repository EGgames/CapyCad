import { Vector2, Circle, SketchEntityType } from '@capycad/shared-types';
import { Circle as FabricCircle } from 'fabric';
import { nanoid } from 'nanoid';
import { distance } from '../geometry';
import { BaseTool } from './BaseTool';

/**
 * Herramienta para dibujar círculos
 */
export class CircleTool extends BaseTool {
  onMouseDown(point: Vector2): void {
    if (!this.isDrawing) {
      // Primer click - establecer centro
      this.isDrawing = true;
      this.startPoint = point;

      // Crear preview del círculo
      this.previewObject = new FabricCircle({
        left: point.x,
        top: point.y,
        radius: 0,
        stroke: '#7c3aed',
        strokeWidth: 2,
        fill: 'transparent',
        selectable: false,
        evented: false,
        strokeDashArray: [5, 5],
        originX: 'center',
        originY: 'center',
      });

      this.canvas.add(this.previewObject);
    }
  }

  onMouseMove(point: Vector2): void {
    if (this.isDrawing && this.startPoint && this.previewObject) {
      // Calcular radio basado en distancia
      const radius = distance(this.startPoint, point);

      // Actualizar preview
      (this.previewObject as FabricCircle).set({
        radius: radius,
      });
      this.canvas.renderAll();
    }
  }

  onMouseUp(point: Vector2): Circle | null {
    if (!this.isDrawing || !this.startPoint) return null;

    // Calcular radio
    const radius = distance(this.startPoint, point);

    // Verificar que el radio sea significativo
    if (radius < 5) {
      // Radio muy pequeño, no crear círculo todavía
      return null;
    }

    // Crear entidad de círculo
    const circle: Circle = {
      id: nanoid(),
      type: SketchEntityType.CIRCLE,
      selected: false,
      center: { ...this.startPoint },
      radius: radius,
    };

    // Crear objeto Fabric permanente
    const fabricCircle = new FabricCircle({
      left: this.startPoint.x,
      top: this.startPoint.y,
      radius: radius,
      stroke: '#ffffff',
      strokeWidth: 2,
      fill: 'transparent',
      selectable: true,
      hasControls: false,
      hasBorders: false,
      originX: 'center',
      originY: 'center',
      data: { entityId: circle.id },
    });

    this.canvas.add(fabricCircle);

    // Limpiar preview
    if (this.previewObject) {
      this.canvas.remove(this.previewObject);
      this.previewObject = null;
    }

    // Reset estado
    this.isDrawing = false;
    this.startPoint = null;

    this.canvas.renderAll();

    return circle;
  }
}
