/**
 * Importador de Modelos 3D
 *
 * US-014: Importación de archivos STL y OBJ
 *
 * Convierte archivos 3D externos en BufferGeometry de Three.js
 * que luego el featureStore puede almacenar como ImportFeature.
 */

import type { BufferGeometry } from 'three';

// ─── Constantes ───────────────────────────────────────────────────────────────

export const SUPPORTED_FORMATS = ['stl', 'obj'] as const;
export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

// ─── Detectar formato ─────────────────────────────────────────────────────────

/**
 * Detecta el formato a partir de la extensión del nombre de archivo.
 * @throws Error si la extensión no es soportada.
 */
export function detectFormat(filename: string): SupportedFormat {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'stl') return 'stl';
  if (ext === 'obj') return 'obj';
  throw new Error(`Formato no soportado: .${ext}. Use .stl o .obj`);
}

// ─── Cargadores ───────────────────────────────────────────────────────────────

/**
 * Carga un archivo STL y devuelve su BufferGeometry.
 */
export async function loadSTL(file: File): Promise<BufferGeometry> {
  const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');

  return new Promise((resolve, reject) => {
    const loader = new STLLoader();
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        if (buffer == null) {
          reject(new Error('No se pudo leer el archivo'));
          return;
        }
        const geometry = loader.parse(buffer as ArrayBuffer);
        geometry.computeVertexNormals();
        resolve(geometry);
      } catch (err) {
        reject(new Error(`Error al parsear STL: ${(err as Error).message}`));
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Carga un archivo OBJ y devuelve su BufferGeometry (primera malla encontrada).
 * Si hay múltiples mallas, las fusiona en una sola geometría.
 */
export async function loadOBJ(file: File): Promise<BufferGeometry> {
  const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
  const { mergeGeometries } = await import('three/examples/jsm/utils/BufferGeometryUtils.js');
  const { Mesh } = await import('three');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') {
          reject(new Error('No se pudo leer el archivo'));
          return;
        }

        const loader = new OBJLoader();
        const group = loader.parse(text);

        const geometries: BufferGeometry[] = [];
        group.traverse((child) => {
          if (child instanceof Mesh) {
            geometries.push(child.geometry.clone());
          }
        });

        if (geometries.length === 0) {
          reject(new Error('No se encontraron mallas en el archivo OBJ'));
          return;
        }

        const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries);
        if (!merged) {
          reject(new Error('No se pudo fusionar las geometrías OBJ'));
          return;
        }

        merged.computeVertexNormals();
        resolve(merged);
      } catch (err) {
        reject(new Error(`Error al parsear OBJ: ${(err as Error).message}`));
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsText(file);
  });
}

// ─── Función unificada ────────────────────────────────────────────────────────

/**
 * Importa un archivo 3D (STL o OBJ) y devuelve la geometría y el formato detectado.
 */
export async function importModelFile(
  file: File
): Promise<{ geometry: BufferGeometry; format: SupportedFormat; filename: string }> {
  const format = detectFormat(file.name);

  let geometry: BufferGeometry;
  if (format === 'stl') {
    geometry = await loadSTL(file);
  } else {
    geometry = await loadOBJ(file);
  }

  return { geometry, format, filename: file.name };
}
