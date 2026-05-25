/**
 * Tests de la convención de coordenadas Sketch 2D ↔ Mundo 3D ↔ OCC.
 *
 * Documentamos y blindamos la constante PIXELS_PER_MM = 50 que debe coincidir
 * con `PIXELS_PER_UNIT` de `SketchIn3D.tsx` y con la conversión `px2mm` del
 * worker `cad.worker.ts`. Si alguno de los tres se cambia sin actualizar los
 * otros dos, el sketch queda desalineado del sólido extruido y de la cámara.
 *
 * Estos tests sirven como contrato/regresión, no requieren OCC ni Three.js.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const srcRoot = join(__dirname, '..', '..', '..');
const workerSrc = readFileSync(join(srcRoot, 'workers', 'cad.worker.ts'), 'utf8');
const sketch3DSrc = readFileSync(join(srcRoot, 'components', 'canvas', 'SketchIn3D.tsx'), 'utf8');

const EXPECTED_SCALE = 50;

describe('Convención de escala 2D↔3D↔OCC', () => {
  it('cad.worker.ts define PIXELS_PER_MM = 50', () => {
    const match = workerSrc.match(/PIXELS_PER_MM\s*=\s*(\d+)/);
    expect(match, 'falta la constante PIXELS_PER_MM en el worker').not.toBeNull();
    expect(Number(match![1])).toBe(EXPECTED_SCALE);
  });

  it('SketchIn3D.tsx define PIXELS_PER_UNIT = 50', () => {
    const match = sketch3DSrc.match(/PIXELS_PER_UNIT\s*=\s*(\d+)/);
    expect(match, 'falta la constante PIXELS_PER_UNIT en SketchIn3D').not.toBeNull();
    expect(Number(match![1])).toBe(EXPECTED_SCALE);
  });

  it('cad.worker.ts extruye sobre el eje +Z de OCC (→ eje +Y de Three.js tras rotateGeometry90)', () => {
    // La cara del sketch está en el plano XY de OCC (z=0).
    // La extrusión perpendicular al sketch debe ir en el eje Z de OCC.
    // Tras rotateGeometry90: OCC Z → Three.js Y (arriba) → sólido 3D correcto.
    // Un vector (0, signedDistance, 0) extruiría en OCC Y → Three.js −Z (plano),
    // lo que producía geometría 2D (bug corregido).
    expect(workerSrc).toContain('new oc.gp_Vec_4(0, 0, signedDistance)');
  });

  it('SketchIn3D proyecta el sketch en el plano XZ (y=0)', () => {
    expect(sketch3DSrc).toContain('y=0');
  });
});
