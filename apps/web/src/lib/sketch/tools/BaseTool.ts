import { Vector2, SketchEntity } from '@capycad/shared-types';
import { Canvas as FabricCanvas, FabricObject } from 'fabric';

/**
 * Base class para todas las herramientas de dibujo
 */
export abstract class BaseTool {
  protected canvas: FabricCanvas;
  protected isDrawing: boolean = false;
  protected startPoint: Vector2 | null = null;
  protected previewObject: FabricObject | null = null;

  constructor(canvas: FabricCanvas) {
    this.canvas = canvas;
  }

  /**
   * Inicia el dibujo
   */
  abstract onMouseDown(point: Vector2): void;

  /**
   * Actualiza preview mientras se mueve el mouse
   */
  abstract onMouseMove(point: Vector2): void;

  /**
   * Finaliza el dibujo
   */
  abstract onMouseUp(point: Vector2): SketchEntity | null;

  /**
   * Cancela el dibujo actual
   */
  cancel(): void {
    this.isDrawing = false;
    this.startPoint = null;
    if (this.previewObject) {
      this.canvas.remove(this.previewObject);
      this.previewObject = null;
    }
    this.canvas.renderAll();
  }

  /**
   * Limpia la herramienta
   */
  cleanup(): void {
    this.cancel();
  }
}
