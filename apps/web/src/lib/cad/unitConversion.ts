import type { DisplayUnit } from '@capycad/shared-types';

export type { DisplayUnit };

/** mm per display-unit (all internal values are stored in mm) */
const MM_PER_UNIT: Record<DisplayUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
  ft: 304.8,
};

/** Convert from internal mm to the current display unit */
export function toDisplay(mm: number, unit: DisplayUnit): number {
  return mm / MM_PER_UNIT[unit];
}

/** Convert from the display unit back to internal mm */
export function fromDisplay(value: number, unit: DisplayUnit): number {
  return value * MM_PER_UNIT[unit];
}

/** Reasonable input step for a given unit */
export function unitStep(unit: DisplayUnit): number {
  switch (unit) {
    case 'mm': return 0.5;
    case 'cm': return 0.05;
    case 'm':  return 0.001;
    case 'in': return 0.025;
    case 'ft': return 0.002;
  }
}

/** Minimum displayable value (> 0) for a given unit, corresponding to 0.01 mm */
export function unitMin(unit: DisplayUnit): number {
  return toDisplay(0.01, unit);
}

export const DISPLAY_UNIT_LABELS: Record<DisplayUnit, string> = {
  mm: 'mm',
  cm: 'cm',
  m: 'm',
  in: 'in',
  ft: 'ft',
};

export const ALL_DISPLAY_UNITS: DisplayUnit[] = ['mm', 'cm', 'm', 'in', 'ft'];
