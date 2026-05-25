/**
 * Tests para utilidades de extrusión 3D (extrusionUtils)
 *
 * US-004 — Extrusión 3D desde sketch 2D.
 *
 * El sketch reside en el plano XY de OCC (z=0).
 * Para producir un sólido 3D el vector de extrusión DEBE ir en el eje Z
 * (perpendicular al plano del sketch). Extruir en Y dejaría la geometría
 * plana dentro del mismo plano → resultado 2D, no 3D.
 *
 * Nomenclatura: methodName_whenCondition_thenExpectedBehavior
 */

import { describe, it, expect } from 'vitest';
import { computeExtrusionVecParams } from '../extrusionUtils';

describe('computeExtrusionVecParams', () => {
  describe('dirección "positive"', () => {
    it('computeExtrusionVecParams_whenPositive_thenZComponentPositive', () => {
      const [x, y, z] = computeExtrusionVecParams('positive', 10);

      // El vector debe apuntar en +Z (eje perpendicular al plano XY del sketch)
      expect(z).toBe(10);
    });

    it('computeExtrusionVecParams_whenPositive_thenXYComponentsZero', () => {
      const [x, y, z] = computeExtrusionVecParams('positive', 10);

      // No debe haber componente en X ni en Y (no extruir dentro del plano del sketch)
      expect(x).toBe(0);
      expect(y).toBe(0);
    });

    it('computeExtrusionVecParams_whenPositiveLargeDistance_thenZEqualDistance', () => {
      const distance = 99.5;
      const [, , z] = computeExtrusionVecParams('positive', distance);

      expect(z).toBe(distance);
    });
  });

  describe('dirección "negative"', () => {
    it('computeExtrusionVecParams_whenNegative_thenZComponentNegative', () => {
      const [x, y, z] = computeExtrusionVecParams('negative', 10);

      // El vector debe apuntar en −Z
      expect(z).toBe(-10);
    });

    it('computeExtrusionVecParams_whenNegative_thenXYComponentsZero', () => {
      const [x, y, z] = computeExtrusionVecParams('negative', 10);

      expect(x).toBe(0);
      expect(y).toBe(0);
    });
  });

  describe('dirección "both"', () => {
    it('computeExtrusionVecParams_whenBoth_thenZComponentIsDoubleDistance', () => {
      const [, , z] = computeExtrusionVecParams('both', 10);

      // La cara se desplaza −distance en Z antes de extruir, por eso el vector
      // final mide 2*distance para abarcar ambas direcciones simétricamente.
      expect(z).toBe(20);
    });

    it('computeExtrusionVecParams_whenBoth_thenXYComponentsZero', () => {
      const [x, y] = computeExtrusionVecParams('both', 10);

      expect(x).toBe(0);
      expect(y).toBe(0);
    });
  });

  describe('invariantes generales', () => {
    it('computeExtrusionVecParams_whenAnyDirection_thenXIsAlwaysZero', () => {
      // La extrusión nunca tiene componente en X
      expect(computeExtrusionVecParams('positive', 5)[0]).toBe(0);
      expect(computeExtrusionVecParams('negative', 5)[0]).toBe(0);
      expect(computeExtrusionVecParams('both', 5)[0]).toBe(0);
    });

    it('computeExtrusionVecParams_whenAnyDirection_thenYIsAlwaysZero', () => {
      // La extrusión NUNCA debe tener componente en Y (el plano del sketch es XY;
      // extruir en Y = 2D, no 3D).
      expect(computeExtrusionVecParams('positive', 5)[1]).toBe(0);
      expect(computeExtrusionVecParams('negative', 5)[1]).toBe(0);
      expect(computeExtrusionVecParams('both', 5)[1]).toBe(0);
    });

    it('computeExtrusionVecParams_whenPositiveAndNegative_thenVectorsAreOpposite', () => {
      const [, , zPos] = computeExtrusionVecParams('positive', 10);
      const [, , zNeg] = computeExtrusionVecParams('negative', 10);

      expect(zPos).toBe(-zNeg);
    });
  });
});
