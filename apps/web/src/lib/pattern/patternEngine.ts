/**
 * Motor de Patrones de Repetición
 *
 * US-011: Patrones lineales y circulares de features/geometrías 3D.
 *
 * Genera transformaciones Matrix4 puras para cada instancia del patrón,
 * luego aplica esas transformaciones a una BufferGeometry para crear copias.
 * Combina todas las copias en una única BufferGeometry fusionada.
 *
 * Funciones exportadas:
 * - computeLinearTransforms(options): Matrix4[]
 * - computeCircularTransforms(options): Matrix4[]
 * - applyTransformToGeometry(geometry, matrix): BufferGeometry
 * - mergePatternGeometries(geometry, transforms): BufferGeometry
 */

import { Matrix4, Vector3, BufferGeometry, Float32BufferAttribute, Quaternion } from 'three';

// ─── Opciones ─────────────────────────────────────────────────────────────────

export interface LinearPatternOptions {
  /** Dirección del patrón (se normaliza automáticamente) */
  direction: { x: number; y: number; z: number };
  /** Distancia entre instancias consecutivas (mm) */
  spacing: number;
  /** Número total de instancias (incluida la original) */
  instances: number;
}

export interface CircularPatternOptions {
  /** Eje de rotación definido por dos puntos */
  axis: {
    start: { x: number; y: number; z: number };
    end: { x: number; y: number; z: number };
  };
  /** Número total de instancias (incluida la original) */
  instances: number;
  /** Ángulo total del patrón en grados (defecto: 360°) */
  totalAngle?: number;
}

// ─── computeLinearTransforms ──────────────────────────────────────────────────

/**
 * Calcula N matrices de transformación para un patrón lineal.
 * La primera siempre es la identidad (instancia original en su posición).
 *
 * @param options.direction  - Vector dirección (se normaliza)
 * @param options.spacing    - Distancia entre instancias consecutivas
 * @param options.instances  - Número total de instancias ≥ 1
 */
export function computeLinearTransforms(options: LinearPatternOptions): Matrix4[] {
  const { direction, spacing, instances } = options;

  if (instances < 1) {
    throw new RangeError('instances must be >= 1');
  }
  if (spacing <= 0) {
    throw new RangeError('spacing must be > 0');
  }

  const dir = new Vector3(direction.x, direction.y, direction.z).normalize();

  const transforms: Matrix4[] = [];
  for (let i = 0; i < instances; i++) {
    const tx = dir.x * spacing * i;
    const ty = dir.y * spacing * i;
    const tz = dir.z * spacing * i;
    transforms.push(new Matrix4().makeTranslation(tx, ty, tz));
  }

  return transforms;
}

// ─── computeCircularTransforms ────────────────────────────────────────────────

/**
 * Calcula N matrices de transformación para un patrón circular.
 * La primera siempre es la identidad.
 *
 * El eje puede estar en cualquier posición (no tiene por qué pasar por el origen).
 * El algoritmo:
 * 1. Traslada al origen restando `axis.start`
 * 2. Rota ángulo_i alrededor del eje normalizado
 * 3. Tras-traslada restaurando `axis.start`
 *
 * @param options.axis       - Eje de rotación (dos puntos)
 * @param options.instances  - Número total de instancias ≥ 1
 * @param options.totalAngle - Ángulo total en grados (defecto 360)
 */
export function computeCircularTransforms(options: CircularPatternOptions): Matrix4[] {
  const { axis, instances, totalAngle = 360 } = options;

  if (instances < 1) {
    throw new RangeError('instances must be >= 1');
  }

  const origin = new Vector3(axis.start.x, axis.start.y, axis.start.z);
  const axisDir = new Vector3(
    axis.end.x - axis.start.x,
    axis.end.y - axis.start.y,
    axis.end.z - axis.start.z
  ).normalize();

  const stepDeg = totalAngle / instances;

  // Matices de traslación al origen y de vuelta
  const toOrigin = new Matrix4().makeTranslation(-origin.x, -origin.y, -origin.z);
  const fromOrigin = new Matrix4().makeTranslation(origin.x, origin.y, origin.z);

  const transforms: Matrix4[] = [];

  for (let i = 0; i < instances; i++) {
    if (i === 0) {
      transforms.push(new Matrix4()); // identidad
      continue;
    }

    const angleDeg = stepDeg * i;
    const angleRad = (angleDeg * Math.PI) / 180;

    const q = new Quaternion().setFromAxisAngle(axisDir, angleRad);
    const rotation = new Matrix4().makeRotationFromQuaternion(q);

    // M = fromOrigin × rotation × toOrigin
    const m = new Matrix4().copy(fromOrigin).multiply(rotation).multiply(toOrigin);

    transforms.push(m);
  }

  return transforms;
}

// ─── applyTransformToGeometry ─────────────────────────────────────────────────

/**
 * Retorna una nueva BufferGeometry con el atributo `position` transformado
 * por la matrix dada. No muta la geometría original.
 *
 * Copia también el resto de atributos (normals, uv, etc.) sin transformar
 * (las normales deberían re-calcularse, pero para el merge es suficiente
 * porque llamaremos a `computeVertexNormals()` al final).
 */
export function applyTransformToGeometry(
  geometry: BufferGeometry,
  matrix: Matrix4
): BufferGeometry {
  const result = new BufferGeometry();

  // Clonar y transformar posiciones
  const posAttr = geometry.getAttribute('position');
  const posArray = posAttr.array as Float32Array;
  const newPos = new Float32Array(posArray.length);

  for (let i = 0; i < posAttr.count; i++) {
    const v = new Vector3(posArray[i * 3], posArray[i * 3 + 1], posArray[i * 3 + 2]);
    v.applyMatrix4(matrix);
    newPos[i * 3] = v.x;
    newPos[i * 3 + 1] = v.y;
    newPos[i * 3 + 2] = v.z;
  }

  result.setAttribute('position', new Float32BufferAttribute(newPos, 3));

  // Copiar otros atributos tal cual
  geometry.attributes;
  for (const name in geometry.attributes) {
    if (name === 'position') continue;
    result.setAttribute(name, geometry.getAttribute(name).clone());
  }

  // Copiar índices si existen
  if (geometry.index) {
    result.setIndex(geometry.index.clone());
  }

  return result;
}

// ─── mergePatternGeometries ───────────────────────────────────────────────────

/**
 * Fusiona una geometría base con N instancias transformadas en un único
 * BufferGeometry. La primera transformación (identidad) corresponde al original.
 *
 * @param geometry   - Geometría fuente
 * @param transforms - Array de Matrix4 (una por instancia)
 */
export function mergePatternGeometries(
  geometry: BufferGeometry,
  transforms: Matrix4[]
): BufferGeometry {
  // Obtener todas las posiciones transformadas
  const allPositions: number[] = [];
  const allNormals: number[] = [];
  const allIndices: number[] = [];
  let vertexOffset = 0;

  const normAttr = geometry.getAttribute('normal');
  const hasNormals = !!normAttr;
  const hasIndex = !!geometry.index;

  for (const matrix of transforms) {
    const transformed = applyTransformToGeometry(geometry, matrix);
    const tp = transformed.getAttribute('position');
    const tn = transformed.getAttribute('normal');

    for (let i = 0; i < tp.count; i++) {
      allPositions.push(
        (tp.array as Float32Array)[i * 3],
        (tp.array as Float32Array)[i * 3 + 1],
        (tp.array as Float32Array)[i * 3 + 2]
      );
      if (hasNormals && tn) {
        allNormals.push(
          (tn.array as Float32Array)[i * 3],
          (tn.array as Float32Array)[i * 3 + 1],
          (tn.array as Float32Array)[i * 3 + 2]
        );
      }
    }

    if (hasIndex && geometry.index) {
      const idx = geometry.index.array;
      for (let i = 0; i < idx.length; i++) {
        allIndices.push(idx[i] + vertexOffset);
      }
    }

    vertexOffset += tp.count;
    transformed.dispose();
  }

  const merged = new BufferGeometry();
  merged.setAttribute('position', new Float32BufferAttribute(new Float32Array(allPositions), 3));

  if (hasNormals && allNormals.length > 0) {
    merged.setAttribute('normal', new Float32BufferAttribute(new Float32Array(allNormals), 3));
  }

  if (hasIndex && allIndices.length > 0) {
    merged.setIndex(allIndices);
  }

  return merged;
}
