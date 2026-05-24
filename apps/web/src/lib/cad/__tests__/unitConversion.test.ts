/**
 * Tests para unitConversion
 *
 * Cubre: toDisplay, fromDisplay, unitStep, unitMin,
 *        DISPLAY_UNIT_LABELS, ALL_DISPLAY_UNITS y round-trips.
 */

import { describe, it, expect } from 'vitest';
import {
  toDisplay,
  fromDisplay,
  unitStep,
  unitMin,
  DISPLAY_UNIT_LABELS,
  ALL_DISPLAY_UNITS,
} from '@/lib/cad/unitConversion';

describe('unitConversion', () => {
  // ── toDisplay ──────────────────────────────────────────────────────────────

  describe('toDisplay — mm → unidad display', () => {
    it('convierte mm a mm (identidad)', () => {
      expect(toDisplay(10, 'mm')).toBe(10);
    });

    it('convierte mm a cm', () => {
      expect(toDisplay(100, 'cm')).toBeCloseTo(10, 6);
    });

    it('convierte mm a m', () => {
      expect(toDisplay(1000, 'm')).toBeCloseTo(1, 6);
    });

    it('convierte mm a in', () => {
      expect(toDisplay(25.4, 'in')).toBeCloseTo(1, 6);
    });

    it('convierte mm a ft', () => {
      expect(toDisplay(304.8, 'ft')).toBeCloseTo(1, 6);
    });

    it('convierte 0 mm a cualquier unidad', () => {
      for (const unit of ALL_DISPLAY_UNITS) {
        expect(toDisplay(0, unit)).toBe(0);
      }
    });

    it('convierte valores negativos correctamente', () => {
      expect(toDisplay(-25.4, 'in')).toBeCloseTo(-1, 6);
    });
  });

  // ── fromDisplay ───────────────────────────────────────────────────────────

  describe('fromDisplay — unidad display → mm', () => {
    it('convierte mm a mm (identidad)', () => {
      expect(fromDisplay(10, 'mm')).toBe(10);
    });

    it('convierte cm a mm', () => {
      expect(fromDisplay(1, 'cm')).toBeCloseTo(10, 6);
    });

    it('convierte m a mm', () => {
      expect(fromDisplay(1, 'm')).toBeCloseTo(1000, 6);
    });

    it('convierte in a mm', () => {
      expect(fromDisplay(1, 'in')).toBeCloseTo(25.4, 6);
    });

    it('convierte ft a mm', () => {
      expect(fromDisplay(1, 'ft')).toBeCloseTo(304.8, 6);
    });

    it('convierte 0 en cualquier unidad a 0 mm', () => {
      for (const unit of ALL_DISPLAY_UNITS) {
        expect(fromDisplay(0, unit)).toBe(0);
      }
    });

    it('convierte valores negativos correctamente', () => {
      expect(fromDisplay(-1, 'in')).toBeCloseTo(-25.4, 6);
    });
  });

  // ── Round-trips ───────────────────────────────────────────────────────────

  describe('Round-trip toDisplay → fromDisplay', () => {
    const testValues = [1, 10, 100, 0.5, 123.456];

    for (const unit of ['mm', 'cm', 'm', 'in', 'ft'] as const) {
      for (const value of testValues) {
        it(`round-trip ${value} mm usando unidad "${unit}"`, () => {
          const displayed = toDisplay(value, unit);
          const restored = fromDisplay(displayed, unit);
          expect(restored).toBeCloseTo(value, 6);
        });
      }
    }
  });

  // ── unitStep ──────────────────────────────────────────────────────────────

  describe('unitStep — paso recomendado por unidad', () => {
    it('mm → 0.5', () => {
      expect(unitStep('mm')).toBe(0.5);
    });

    it('cm → 0.05', () => {
      expect(unitStep('cm')).toBe(0.05);
    });

    it('m → 0.001', () => {
      expect(unitStep('m')).toBe(0.001);
    });

    it('in → 0.025', () => {
      expect(unitStep('in')).toBe(0.025);
    });

    it('ft → 0.002', () => {
      expect(unitStep('ft')).toBe(0.002);
    });

    it('todos los pasos son mayores que 0', () => {
      for (const unit of ALL_DISPLAY_UNITS) {
        expect(unitStep(unit)).toBeGreaterThan(0);
      }
    });
  });

  // ── unitMin ───────────────────────────────────────────────────────────────

  describe('unitMin — valor mínimo positivo por unidad', () => {
    it('es mayor que 0 para todas las unidades', () => {
      for (const unit of ALL_DISPLAY_UNITS) {
        expect(unitMin(unit)).toBeGreaterThan(0);
      }
    });

    it('mm → equivalente a 0.01 mm', () => {
      expect(unitMin('mm')).toBeCloseTo(0.01, 6);
    });

    it('cm → equivalente a 0.01 mm en cm', () => {
      expect(unitMin('cm')).toBeCloseTo(0.001, 6);
    });

    it('m → equivalente a 0.01 mm en m', () => {
      expect(unitMin('m')).toBeCloseTo(0.00001, 6);
    });

    it('in → equivalente a 0.01 mm en pulgadas', () => {
      expect(unitMin('in')).toBeCloseTo(0.01 / 25.4, 6);
    });

    it('ft → equivalente a 0.01 mm en pies', () => {
      expect(unitMin('ft')).toBeCloseTo(0.01 / 304.8, 6);
    });
  });

  // ── DISPLAY_UNIT_LABELS ───────────────────────────────────────────────────

  describe('DISPLAY_UNIT_LABELS', () => {
    it('contiene etiqueta para todas las unidades', () => {
      for (const unit of ALL_DISPLAY_UNITS) {
        expect(DISPLAY_UNIT_LABELS[unit]).toBeDefined();
      }
    });

    it('mm tiene etiqueta "mm"', () => {
      expect(DISPLAY_UNIT_LABELS['mm']).toBe('mm');
    });

    it('cm tiene etiqueta "cm"', () => {
      expect(DISPLAY_UNIT_LABELS['cm']).toBe('cm');
    });

    it('m tiene etiqueta "m"', () => {
      expect(DISPLAY_UNIT_LABELS['m']).toBe('m');
    });

    it('in tiene etiqueta "in"', () => {
      expect(DISPLAY_UNIT_LABELS['in']).toBe('in');
    });

    it('ft tiene etiqueta "ft"', () => {
      expect(DISPLAY_UNIT_LABELS['ft']).toBe('ft');
    });

    it('todas las etiquetas son strings no vacíos', () => {
      for (const unit of ALL_DISPLAY_UNITS) {
        expect(typeof DISPLAY_UNIT_LABELS[unit]).toBe('string');
        expect(DISPLAY_UNIT_LABELS[unit].length).toBeGreaterThan(0);
      }
    });
  });

  // ── ALL_DISPLAY_UNITS ─────────────────────────────────────────────────────

  describe('ALL_DISPLAY_UNITS', () => {
    it('contiene exactamente 5 unidades', () => {
      expect(ALL_DISPLAY_UNITS).toHaveLength(5);
    });

    it('incluye mm, cm, m, in, ft', () => {
      expect(ALL_DISPLAY_UNITS).toContain('mm');
      expect(ALL_DISPLAY_UNITS).toContain('cm');
      expect(ALL_DISPLAY_UNITS).toContain('m');
      expect(ALL_DISPLAY_UNITS).toContain('in');
      expect(ALL_DISPLAY_UNITS).toContain('ft');
    });

    it('no contiene duplicados', () => {
      const unique = new Set(ALL_DISPLAY_UNITS);
      expect(unique.size).toBe(ALL_DISPLAY_UNITS.length);
    });
  });

  // ── Conversiones conocidas ────────────────────────────────────────────────

  describe('Conversiones conocidas (valores de referencia)', () => {
    it('1 ft = 12 in', () => {
      const mmPerFt = fromDisplay(1, 'ft');
      const inches = toDisplay(mmPerFt, 'in');
      expect(inches).toBeCloseTo(12, 4);
    });

    it('1 m = 100 cm', () => {
      const mmPerM = fromDisplay(1, 'm');
      const cm = toDisplay(mmPerM, 'cm');
      expect(cm).toBeCloseTo(100, 4);
    });

    it('2.54 cm = 1 in', () => {
      const mm = fromDisplay(2.54, 'cm');
      const inches = toDisplay(mm, 'in');
      expect(inches).toBeCloseTo(1, 4);
    });

    it('30.48 cm = 1 ft', () => {
      const mm = fromDisplay(30.48, 'cm');
      const ft = toDisplay(mm, 'ft');
      expect(ft).toBeCloseTo(1, 4);
    });
  });
});
