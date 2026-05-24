/**
 * Tests para utilidades de geometría
 *
 * Prueba funciones matemáticas para:
 * - Cálculo de distancias
 * - Snapping a grid
 * - Conversión de coordenadas
 * - Punto medio, ángulos, etc.
 */

import { describe, it, expect } from 'vitest';
import {
  distance,
  snapToGrid,
  canvasToWorld,
  worldToCanvas,
  midpoint,
  angle,
  angleDegrees,
  findNearestPoint,
} from '@/lib/sketch/geometry';
import { Vector2 } from '@capycad/shared-types';

describe('geometry utilities', () => {
  describe('distance', () => {
    it('debe calcular distancia entre dos puntos', () => {
      const p1: Vector2 = { x: 0, y: 0 };
      const p2: Vector2 = { x: 3, y: 4 };

      const d = distance(p1, p2);
      expect(d).toBe(5); // 3-4-5 triangle
    });

    it('debe retornar 0 para el mismo punto', () => {
      const p: Vector2 = { x: 5, y: 10 };

      expect(distance(p, p)).toBe(0);
    });

    it('debe calcular distancia con coordenadas negativas', () => {
      const p1: Vector2 = { x: -3, y: -4 };
      const p2: Vector2 = { x: 0, y: 0 };

      const d = distance(p1, p2);
      expect(d).toBe(5);
    });
  });

  describe('snapToGrid', () => {
    it('debe hacer snap a grid de 10px', () => {
      const point: Vector2 = { x: 13, y: 17 };
      const snapped = snapToGrid(point, 10);

      expect(snapped).toEqual({ x: 10, y: 20 });
    });

    it('debe hacer snap hacia arriba/abajo según cercanía', () => {
      const p1: Vector2 = { x: 14, y: 16 };
      const p2: Vector2 = { x: 16, y: 14 };

      expect(snapToGrid(p1, 10)).toEqual({ x: 10, y: 20 });
      expect(snapToGrid(p2, 10)).toEqual({ x: 20, y: 10 });
    });

    it('debe funcionar con grid size diferente', () => {
      const point: Vector2 = { x: 23, y: 47 };

      const snapped20 = snapToGrid(point, 20);
      expect(snapped20).toEqual({ x: 20, y: 40 });

      const snapped5 = snapToGrid(point, 5);
      expect(snapped5).toEqual({ x: 25, y: 45 });
    });

    it('debe retornar el mismo punto si ya está en grid', () => {
      const point: Vector2 = { x: 100, y: 200 };
      const snapped = snapToGrid(point, 10);

      expect(snapped).toEqual(point);
    });
  });

  describe('canvasToWorld y worldToCanvas', () => {
    const W = 400;
    const H = 400;

    it('debe mapear el centro del canvas al origen del mundo', () => {
      // center (200,200) → world (0,0)
      const world = canvasToWorld(200, 200, W, H);
      expect(world).toEqual({ x: 0, y: 0 });
    });

    it('debe convertir coordenadas canvas a mundo', () => {
      // x=(300-200-0)/1=100, y=(200-100+0)/1=100
      const world = canvasToWorld(300, 100, W, H, 1, 0, 0);
      expect(world).toEqual({ x: 100, y: 100 });
    });

    it('debe convertir coordenadas mundo a canvas', () => {
      // x=100*1+200+0=300, y=200-100*1+0=100
      const canvas = worldToCanvas(100, 100, W, H, 1, 0, 0);
      expect(canvas).toEqual({ x: 300, y: 100 });
    });

    it('debe ser operaciones inversas', () => {
      const cx = 123;
      const cy = 234;
      const zoom = 2;
      const panX = 10;
      const panY = 20;
      const world = canvasToWorld(cx, cy, W, H, zoom, panX, panY);
      const back = worldToCanvas(world.x, world.y, W, H, zoom, panX, panY);
      expect(back.x).toBeCloseTo(cx);
      expect(back.y).toBeCloseTo(cy);
    });
  });

  describe('midpoint', () => {
    it('debe calcular punto medio entre dos puntos', () => {
      const p1: Vector2 = { x: 0, y: 0 };
      const p2: Vector2 = { x: 10, y: 20 };

      const mid = midpoint(p1, p2);
      expect(mid).toEqual({ x: 5, y: 10 });
    });

    it('debe funcionar con coordenadas negativas', () => {
      const p1: Vector2 = { x: -10, y: -20 };
      const p2: Vector2 = { x: 10, y: 20 };

      const mid = midpoint(p1, p2);
      expect(mid).toEqual({ x: 0, y: 0 });
    });

    it('debe retornar el mismo punto si ambos son iguales', () => {
      const p: Vector2 = { x: 5, y: 5 };

      const mid = midpoint(p, p);
      expect(mid).toEqual(p);
    });
  });

  describe('angle', () => {
    it('debe calcular ángulo en radianes', () => {
      const p1: Vector2 = { x: 0, y: 0 };
      const p2: Vector2 = { x: 1, y: 0 };

      const rad = angle(p1, p2);
      expect(rad).toBe(0); // Horizontal derecha = 0 rad
    });

    it('debe calcular ángulo vertical', () => {
      const p1: Vector2 = { x: 0, y: 0 };
      const p2: Vector2 = { x: 0, y: 1 };

      const rad = angle(p1, p2);
      expect(rad).toBeCloseTo(Math.PI / 2); // 90 grados = π/2 rad
    });

    it('debe calcular ángulo 45 grados', () => {
      const p1: Vector2 = { x: 0, y: 0 };
      const p2: Vector2 = { x: 1, y: 1 };

      const rad = angle(p1, p2);
      expect(rad).toBeCloseTo(Math.PI / 4); // 45 grados = π/4 rad
    });
  });

  describe('angleDegrees', () => {
    it('debe calcular ángulo en grados', () => {
      const p1: Vector2 = { x: 0, y: 0 };
      const p2: Vector2 = { x: 1, y: 0 };

      const deg = angleDegrees(p1, p2);
      expect(deg).toBeCloseTo(0);
    });

    it('debe calcular 90 grados', () => {
      const p1: Vector2 = { x: 0, y: 0 };
      const p2: Vector2 = { x: 0, y: 1 };

      const deg = angleDegrees(p1, p2);
      expect(deg).toBeCloseTo(90);
    });

    it('debe calcular 45 grados', () => {
      const p1: Vector2 = { x: 0, y: 0 };
      const p2: Vector2 = { x: 1, y: 1 };

      const deg = angleDegrees(p1, p2);
      expect(deg).toBeCloseTo(45);
    });

    it('debe calcular 180 grados', () => {
      const p1: Vector2 = { x: 0, y: 0 };
      const p2: Vector2 = { x: -1, y: 0 };

      const deg = angleDegrees(p1, p2);
      expect(deg).toBeCloseTo(180);
    });
  });

  describe('findNearestPoint', () => {
    it('debe encontrar el punto más cercano', () => {
      const target: Vector2 = { x: 10, y: 10 };
      const points: Vector2[] = [
        { x: 0, y: 0 },
        { x: 9, y: 9 },
        { x: 100, y: 100 },
      ];

      const nearest = findNearestPoint(target, points);
      expect(nearest).toEqual({ x: 9, y: 9 });
    });

    it('debe retornar null si no hay puntos', () => {
      const target: Vector2 = { x: 10, y: 10 };
      const points: Vector2[] = [];

      const nearest = findNearestPoint(target, points);
      expect(nearest).toBeNull();
    });

    it('debe retornar el único punto disponible', () => {
      const target: Vector2 = { x: 10, y: 10 };
      // Punto a distancia ~2.83, dentro del threshold por defecto (10)
      const points: Vector2[] = [{ x: 12, y: 12 }];

      const nearest = findNearestPoint(target, points);
      expect(nearest).toEqual({ x: 12, y: 12 });
    });

    it('debe manejar puntos con misma distancia (retorna el primero)', () => {
      const target: Vector2 = { x: 0, y: 0 };
      const points: Vector2[] = [
        { x: 3, y: 4 }, // distancia 5
        { x: 4, y: 3 }, // distancia 5
      ];

      const nearest = findNearestPoint(target, points);
      expect(nearest).toEqual({ x: 3, y: 4 });
    });
  });
});
