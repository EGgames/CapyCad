import { Vector2, Ellipse, SketchEntityType } from '@capycad/shared-types';
import { Ellipse as FabricEllipse } from 'fabric';
import { nanoid } from 'nanoid';
import { BaseTool } from './BaseTool';

/**
 * Herramienta para dibujar elipses (click-and-drag desde el centro)
 * El primer click establece el centro; el movimiento define radiusX y radiusY
 * proporcionales al desplazamiento horizontal y vertical respectivamente.
 */
export class EllipseTool extends BaseTool {
  onMouseDown(point: Vector2): void {
    if (!this.isDrawing) {
      this.isDrawing = true;
      this.startPoint = point;

      this.previewObject = new FabricEllipse({
        left: point.x,
        top: point.y,
        rx: 0,
        ry: 0,
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
      const rx = Math.abs(point.x - this.startPoint.x);
      const ry = Math.abs(point.y - this.startPoint.y);
      (this.previewObject as FabricEllipse).set({ rx, ry });
      this.canvas.renderAll();
    }
  }

  onMouseUp(point: Vector2): Ellipse | null {
    if (!this.isDrawing || !this.startPoint) return null;

    const rx = Math.abs(point.x - this.startPoint.x);
    const ry = Math.abs(point.y - this.startPoint.y);

    // Ignorar elipses demasiado pequeñas
    if (rx < 5 || ry < 5) return null;

    const ellipse: Ellipse = {
      id: nanoid(),
      type: SketchEntityType.ELLIPSE,
      selected: false,
      center: { ...this.startPoint },
      radiusX: rx,
      radiusY: ry,
    };

    const fabricEllipse = new FabricEllipse({
      left: this.startPoint.x,
      top: this.startPoint.y,
      rx,
      ry,
      stroke: '#ffffff',
      strokeWidth: 2,
      fill: 'transparent',
      selectable: true,
      hasControls: false,
      hasBorders: false,
      originX: 'center',
      originY: 'center',
      data: { entityId: ellipse.id },
    });

    this.canvas.add(fabricEllipse);

    if (this.previewObject) {
      this.canvas.remove(this.previewObject);
      this.previewObject = null;
    }

    this.isDrawing = false;
    this.startPoint = null;

    this.canvas.renderAll();

    return ellipse;
  }
}
