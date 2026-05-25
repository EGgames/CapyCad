/**
 * Utilidades puras para cálculo de vectores de extrusión.
 *
 * Funciones separadas del worker para permitir testing sin WASM.
 * El sketch vive en el plano XY de OCC (z=0), por lo que la extrusión
 * debe ser en el eje Z (perpendicular al plano del sketch).
 */

/**
 * Calcula los parámetros del vector de extrusión para `gp_Vec_4(x, y, z)`.
 *
 * El sketch face está en el plano XY de OCC (z=0).
 * Para extruir en 3D (perpendicular al sketch), el vector debe ir en Z.
 *
 * @param direction  'positive' | 'negative' | 'both'
 * @param distance   Distancia de extrusión (siempre positiva)
 * @returns [x, y, z] para el constructor gp_Vec_4
 */
export function computeExtrusionVecParams(
  direction: 'positive' | 'negative' | 'both',
  distance: number
): [number, number, number] {
  if (direction === 'both') {
    // Mover la cara −distance en Z primero, luego extruir 2*distance en +Z
    // El resultado es simétrico respecto al plano del sketch.
    return [0, 0, distance * 2];
  }

  const signedDistance = direction === 'negative' ? -distance : distance;
  // Extruir en Z (perpendicular al plano XY del sketch) → produce sólido 3D
  return [0, 0, signedDistance];
}
