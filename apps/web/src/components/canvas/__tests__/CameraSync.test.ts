/**
 * Tests del contrato visual del componente CameraSync (vista unificada 2D/3D).
 *
 * No instanciamos Three.js (innecesariamente costoso para un Web Worker GL en JSDOM);
 * comprobamos el contrato declarado en el código fuente:
 *   - en modo '2d' la cámara va a vista cenital (alta posición Y, mirando origen)
 *   - en modo '3d' vuelve a posición isométrica
 * Si alguien rompe esos valores el sketch deja de alinearse visualmente con
 * el overlay 2D (Fabric).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const canvasSrc = readFileSync(join(__dirname, '..', 'Canvas3D.tsx'), 'utf8');

describe('CameraSync — sincronización cámara 3D ↔ modo edición', () => {
  it('declara el componente CameraSync', () => {
    expect(canvasSrc).toMatch(/function CameraSync\s*\(/);
    expect(canvasSrc).toContain('<CameraSync />');
  });

  it('en modo 2d coloca la cámara cenital sobre el plano XZ', () => {
    // posición Y alta, mirando al origen
    expect(canvasSrc).toMatch(/camera\.position\.set\s*\(\s*0\s*,\s*50\s*,\s*0\s*\)/);
    expect(canvasSrc).toMatch(/camera\.up\.set\s*\(\s*0\s*,\s*0\s*,\s*-1\s*\)/);
  });

  it('en modo 3d restaura la vista isométrica', () => {
    expect(canvasSrc).toMatch(/camera\.position\.set\s*\(\s*10\s*,\s*10\s*,\s*10\s*\)/);
    expect(canvasSrc).toMatch(/camera\.up\.set\s*\(\s*0\s*,\s*1\s*,\s*0\s*\)/);
  });

  it('reacciona a cambios de editMode del sketchStore', () => {
    expect(canvasSrc).toContain('useSketchStore((s) => s.editMode)');
    expect(canvasSrc).toMatch(/useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*editMode/);
  });
});
