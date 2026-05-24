import { Vector2, SketchEntityType } from '@capycad/shared-types';
import { Path as FabricPath, Circle as FabricCircle, Line as FabricLine } from 'fabric';
import { nanoid } from 'nanoid';
import { BaseTool } from './BaseTool';

/**
 * Entidad Spline (curva Bézier cúbica por tramos)
 * Almacena puntos de control: cada segmento usa 3 puntos del array (c1, c2, end).
 */
export interface Spline {
  id: string;
  type: typeof SketchEntityType.SPLINE;
  selected: boolean;
  /** Punto inicial de la curva */
  start: Vector2;
  /** Lista de segmentos: cada grupo de 3 Vector2 = (cp1, cp2, endPoint) */
  controlPoints: Vector2[];
}

/**
 * Herramienta para dibujar splines Bézier:
 *  - Click izquierdo → añade punto de control
 *  - Double-click / Enter → finaliza la spline
 *  - Escape → cancela
 *
 * Internamente genera curvas Bézier cúbicas usando Catmull-Rom → Bézier conversion.
 */
export class SplineTool extends BaseTool {
  private points: Vector2[] = [];
  private controlDots: FabricCircle[] = [];
  private guideLines: FabricLine[] = [];
  private pathPreview: FabricPath | null = null;
  private lastClickTime = 0;

  onMouseDown(point: Vector2): void {
    const now = Date.now();
    const isDoubleClick = now - this.lastClickTime < 350;
    this.lastClickTime = now;

    if (isDoubleClick && this.points.length >= 2) {
      // Double-click finaliza (onMouseUp lo devolverá)
      return;
    }

    if (!this.isDrawing) {
      this.isDrawing = true;
      this.points = [point];
      this._addDot(point);
    } else {
      this.points.push(point);
      this._addDot(point);
    }

    this._updatePreview();
  }

  onMouseMove(point: Vector2): void {
    if (!this.isDrawing || this.points.length === 0) return;
    // Preview con punto temporal al final
    this._updatePreview(point);
  }

  onMouseUp(_point: Vector2): Spline | null {
    const now = Date.now();
    const isDoubleClick = now - this.lastClickTime < 350;

    if (isDoubleClick && this.points.length >= 2) {
      return this._finalize();
    }
    return null;
  }

  /**
   * Finaliza la spline manualmente (llamado desde Toolbar o shortcut Enter)
   */
  finalize(): Spline | null {
    if (this.points.length < 2) return null;
    return this._finalize();
  }

  private _finalize(): Spline | null {
    if (this.points.length < 2) {
      this._cleanup();
      return null;
    }

    const [start, ...rest] = this.points;
    const controlPoints = this._catmullRomToControlPoints(this.points);

    const pathString = this._buildPathString(start, controlPoints);
    const permanentPath = new FabricPath(pathString, {
      stroke: '#ffffff',
      strokeWidth: 2,
      fill: 'transparent',
      selectable: true,
      hasControls: false,
      hasBorders: false,
      data: { entityId: nanoid() },
    });

    this.canvas.add(permanentPath);

    const entity: Spline = {
      id: ((permanentPath as any).data as { entityId: string }).entityId,
      type: SketchEntityType.SPLINE,
      selected: false,
      start,
      controlPoints: rest,
    };

    this._cleanup();
    return entity;
  }

  private _addDot(point: Vector2): void {
    const dot = new FabricCircle({
      left: point.x,
      top: point.y,
      radius: 4,
      fill: '#7c3aed',
      stroke: '#ffffff',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      originX: 'center',
      originY: 'center',
    });
    this.canvas.add(dot);
    this.controlDots.push(dot);
  }

  private _updatePreview(mousePos?: Vector2): void {
    // Remover preview anterior
    if (this.pathPreview) {
      this.canvas.remove(this.pathPreview);
      this.pathPreview = null;
    }

    const pts = mousePos ? [...this.points, mousePos] : this.points;
    if (pts.length < 2) return;

    const controlPoints = this._catmullRomToControlPoints(pts);
    const pathString = this._buildPathString(pts[0], controlPoints);

    this.pathPreview = new FabricPath(pathString, {
      stroke: '#7c3aed',
      strokeWidth: 2,
      fill: 'transparent',
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
    }) as FabricPath;

    this.canvas.add(this.pathPreview);
    this.canvas.renderAll();
  }

  /**
   * Convierte puntos Catmull-Rom en pares de puntos de control Bézier cúbica.
   * Output: array plano de Vector2 para cada segmento (cp1, cp2, end).
   */
  private _catmullRomToControlPoints(pts: Vector2[]): Vector2[] {
    const result: Vector2[] = [];
    // Centripetal Catmull-Rom (alpha = 0.5)

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      // Tangentes Catmull-Rom → puntos de control Bézier
      const cp1: Vector2 = {
        x: p1.x + (p2.x - p0.x) / 6,
        y: p1.y + (p2.y - p0.y) / 6,
      };
      const cp2: Vector2 = {
        x: p2.x - (p3.x - p1.x) / 6,
        y: p2.y - (p3.y - p1.y) / 6,
      };

      result.push(cp1, cp2, p2);
    }

    return result;
  }

  private _buildPathString(start: Vector2, controlPoints: Vector2[]): string {
    let d = `M ${start.x} ${start.y}`;
    for (let i = 0; i < controlPoints.length; i += 3) {
      const cp1 = controlPoints[i];
      const cp2 = controlPoints[i + 1];
      const end = controlPoints[i + 2];
      d += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`;
    }
    return d;
  }

  private _cleanup(): void {
    if (this.pathPreview) {
      this.canvas.remove(this.pathPreview);
      this.pathPreview = null;
    }
    this.controlDots.forEach((d) => this.canvas.remove(d));
    this.controlDots = [];
    this.guideLines.forEach((l) => this.canvas.remove(l));
    this.guideLines = [];
    this.points = [];
    this.isDrawing = false;
    this.startPoint = null;
    this.canvas.renderAll();
  }

  override cancel(): void {
    this._cleanup();
  }

  override cleanup(): void {
    this._cleanup();
  }
}
