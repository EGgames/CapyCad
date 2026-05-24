import { Vector2 } from '@capycad/shared-types';

/**
 * Calcula la distancia entre dos puntos
 */
export function distance(p1: Vector2, p2: Vector2): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Snap de un punto al grid más cercano
 */
export function snapToGrid(point: Vector2, gridSize: number): Vector2 {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Encuentra el punto más cercano en un array de puntos
 */
export function findNearestPoint(
  point: Vector2,
  points: Vector2[],
  threshold: number = 10
): Vector2 | null {
  let nearest: Vector2 | null = null;
  let minDistance = threshold;

  for (const p of points) {
    const dist = distance(point, p);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = p;
    }
  }

  return nearest;
}

/**
 * Verifica si un punto está cerca de una línea
 */
export function isPointNearLine(
  point: Vector2,
  lineStart: Vector2,
  lineEnd: Vector2,
  threshold: number = 5
): boolean {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;

  return Math.sqrt(dx * dx + dy * dy) < threshold;
}

/**
 * Convierte coordenadas del canvas a coordenadas del mundo
 */
export function canvasToWorld(
  canvasX: number,
  canvasY: number,
  canvasWidth: number,
  canvasHeight: number,
  zoom: number = 1,
  panX: number = 0,
  panY: number = 0
): Vector2 {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  return {
    x: (canvasX - centerX - panX) / zoom,
    y: (centerY - canvasY + panY) / zoom,
  };
}

/**
 * Convierte coordenadas del mundo a coordenadas del canvas
 */
export function worldToCanvas(
  worldX: number,
  worldY: number,
  canvasWidth: number,
  canvasHeight: number,
  zoom: number = 1,
  panX: number = 0,
  panY: number = 0
): Vector2 {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  return {
    x: worldX * zoom + centerX + panX,
    y: centerY - worldY * zoom + panY,
  };
}

/**
 * Calcula el punto medio entre dos puntos
 */
export function midpoint(p1: Vector2, p2: Vector2): Vector2 {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Calcula el ángulo entre dos puntos en radianes
 */
export function angle(p1: Vector2, p2: Vector2): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

/**
 * Calcula el ángulo entre dos puntos en grados
 */
export function angleDegrees(p1: Vector2, p2: Vector2): number {
  return (angle(p1, p2) * 180) / Math.PI;
}
