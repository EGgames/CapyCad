import { Vector2, Polygon, SketchEntityType } from '@capycad/shared-types';
import { Polygon as FabricPolygon } from 'fabric';
import { nanoid } from 'nanoid';
import { distance } from '../geometry';
import { BaseTool } from './BaseTool';

function buildPolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  rotation = 0
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i / sides) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  }
  return pts;
}

/**
 * Herramienta para dibujar polígonos regulares.
 * Click en centro → arrastra para definir radio.
 * El número de lados se configura externamente via `sides`.
 */
export class PolygonTool extends BaseTool {
  sides: number;

  constructor(canvas: any, sides = 6) {
    super(canvas);
    this.sides = sides;
  }

  onMouseDown(point: Vector2): void {
    if (this.isDrawing) return;
    this.isDrawing = true;
    this.startPoint = point;

    const pts = buildPolygonPoints(point.x, point.y, 1, this.sides);
    this.previewObject = new FabricPolygon(pts, {
      stroke: '#7c3aed',
      strokeWidth: 2,
      fill: 'transparent',
      selectable: false,
      evented: false,
      strokeDashArray: [5, 5],
    });
    this.canvas.add(this.previewObject);
  }

  onMouseMove(point: Vector2): void {
    if (!this.isDrawing || !this.startPoint || !this.previewObject) return;
    const r = distance(this.startPoint, point);
    const pts = buildPolygonPoints(this.startPoint.x, this.startPoint.y, r, this.sides);
    (this.previewObject as FabricPolygon).set({ points: pts });
    // Fabric necesita recomputar bounding box cuando cambian los puntos
    (this.previewObject as any).setCoords?.();
    this.canvas.renderAll();
  }

  onMouseUp(point: Vector2): Polygon | null {
    if (!this.isDrawing || !this.startPoint) return null;
    const r = distance(this.startPoint, point);
    if (r < 5) return null;

    const polygon: Polygon = {
      id: nanoid(),
      type: SketchEntityType.POLYGON,
      selected: false,
      center: { ...this.startPoint },
      radius: r,
      sides: this.sides,
      rotation: 0,
    };

    const pts = buildPolygonPoints(this.startPoint.x, this.startPoint.y, r, this.sides);
    const fabricPoly = new FabricPolygon(pts, {
      stroke: '#ffffff',
      strokeWidth: 2,
      fill: 'transparent',
      selectable: true,
      hasControls: false,
      hasBorders: false,
    });
    (fabricPoly as any).data = { entityId: polygon.id };
    this.canvas.add(fabricPoly);

    if (this.previewObject) {
      this.canvas.remove(this.previewObject);
      this.previewObject = null;
    }
    this.isDrawing = false;
    this.startPoint = null;
    this.canvas.renderAll();
    return polygon;
  }
}
