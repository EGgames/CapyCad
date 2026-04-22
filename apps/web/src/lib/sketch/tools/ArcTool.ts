import { Vector2, Arc, SketchEntityType } from '@stl-model/shared-types';
import { Circle as FabricCircle, Line as FabricLine } from 'fabric';
import { nanoid } from 'nanoid';
import { distance } from '../geometry';
import { BaseTool } from './BaseTool';

/**
 * Herramienta para dibujar arcos de 3 puntos:
 *  1er click  → centro del arco
 *  2do click  → define radio + punto de inicio
 *  3er click  → define punto final (ángulo final)
 */
export class ArcTool extends BaseTool {
  private phase: 0 | 1 | 2 = 0;
  private radius = 0;
  private startAngle = 0;
  private radiusLine: FabricLine | null = null;

  onMouseDown(point: Vector2): void {
    if (this.phase === 0) {
      // Centro
      this.isDrawing = true;
      this.startPoint = point;
      this.phase = 1;

      // Preview: pequeño círculo central
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
    } else if (this.phase === 1) {
      // Fin de radio / inicio de arco
      if (!this.startPoint) return;
      this.radius = distance(this.startPoint, point);
      this.startAngle = Math.atan2(point.y - this.startPoint.y, point.x - this.startPoint.x);
      this.phase = 2;

      // Agregar línea de radio como ayuda visual
      this.radiusLine = new FabricLine([this.startPoint.x, this.startPoint.y, point.x, point.y], {
        stroke: '#7c3aed',
        strokeWidth: 1,
        strokeDashArray: [4, 4],
        selectable: false,
        evented: false,
      });
      this.canvas.add(this.radiusLine);
    } else {
      // Tercer click: confirmar arco
      const entity = this._buildEntity(point);
      if (entity) {
        this._cleanup();
        // Devolver via onMouseUp — aquí simplemente guardamos estado para que onMouseUp lo retorne
      }
    }
  }

  onMouseMove(point: Vector2): void {
    if (!this.isDrawing || !this.startPoint || !this.previewObject) return;

    if (this.phase === 1) {
      const r = distance(this.startPoint, point);
      (this.previewObject as FabricCircle).set({ radius: r });
    } else if (this.phase === 2) {
      const endAngle = Math.atan2(point.y - this.startPoint.y, point.x - this.startPoint.x);
      (this.previewObject as FabricCircle).set({
        radius: this.radius,
        startAngle: (this.startAngle * 180) / Math.PI,
        endAngle: (endAngle * 180) / Math.PI,
      } as any);
    }
    this.canvas.renderAll();
  }

  onMouseUp(point: Vector2): Arc | null {
    if (!this.isDrawing || !this.startPoint) return null;
    if (this.phase !== 2) return null;

    const entity = this._buildEntity(point);
    if (!entity) return null;
    this._cleanup();
    return entity;
  }

  private _buildEntity(point: Vector2): Arc | null {
    if (!this.startPoint || this.radius < 5) return null;
    const endAngle = Math.atan2(point.y - this.startPoint.y, point.x - this.startPoint.x);
    return {
      id: nanoid(),
      type: SketchEntityType.ARC,
      selected: false,
      center: { ...this.startPoint },
      radius: this.radius,
      startAngle: this.startAngle,
      endAngle: endAngle,
    };
  }

  private _cleanup() {
    if (this.previewObject) {
      this.canvas.remove(this.previewObject);
      this.previewObject = null;
    }
    if (this.radiusLine) {
      this.canvas.remove(this.radiusLine);
      this.radiusLine = null;
    }
    this.isDrawing = false;
    this.startPoint = null;
    this.phase = 0;
    this.radius = 0;
    this.canvas.renderAll();
  }

  override cancel(): void {
    this._cleanup();
  }

  override cleanup(): void {
    this._cleanup();
  }
}
