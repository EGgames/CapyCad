/**
 * Exportador a formato STL
 *
 * Convierte geometrías Three.js BufferGeometry en archivos STL
 * para impresión 3D y compatibilidad con slicers (Cura, PrusaSlicer).
 *
 * US-006: Exportar modelo a STL (binario o ASCII)
 */

import { Scene, Mesh, MeshBasicMaterial, type BufferGeometry } from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

/**
 * Opciones de exportación STL
 */
export interface ExportSTLOptions {
  /** Formato de salida. 'binary' = más compacto, recomendado */
  format: 'binary' | 'ascii';
  /** Nombre base del archivo (sin extensión) */
  filename?: string;
}

const DEFAULT_OPTIONS: Required<ExportSTLOptions> = {
  format: 'binary',
  filename: 'model',
};

/**
 * Exporta un conjunto de geometrías THREE.BufferGeometry a STL y dispara
 * la descarga del archivo en el navegador.
 *
 * @param geometries - Mapa featureId → BufferGeometry visible a exportar
 * @param options - Opciones de exportación (formato, nombre)
 */
export function exportToSTL(
  geometries: Map<string, { geometry: BufferGeometry; visible: boolean }>,
  options: Partial<ExportSTLOptions> = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const stlData = buildSTLData(geometries, opts.format);
  triggerDownload(stlData, opts.filename, opts.format);
}

/**
 * Construye los datos STL a partir de las geometrías.
 * Expuesto para facilitar testing.
 */
export function buildSTLData(
  geometries: Map<string, { geometry: BufferGeometry; visible: boolean }>,
  format: 'binary' | 'ascii'
): string | ArrayBuffer {
  const visibleGeometries = Array.from(geometries.values()).filter((g) => g.visible);

  if (visibleGeometries.length === 0) {
    throw new Error('No hay geometrías visibles para exportar');
  }

  // Construir escena temporal con todas las geometrías visibles
  const scene = new Scene();
  const material = new MeshBasicMaterial();

  for (const { geometry } of visibleGeometries) {
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);
  }

  const exporter = new STLExporter();

  if (format === 'binary') {
    return exporter.parse(scene, { binary: true }) as unknown as ArrayBuffer;
  }

  return exporter.parse(scene, { binary: false }) as string;
}

/**
 * Dispara la descarga del archivo STL en el navegador.
 * Expuesto para facilitar testing.
 */
export function triggerDownload(
  data: string | ArrayBuffer,
  filename: string,
  format: 'binary' | 'ascii'
): void {
  let blob: Blob;

  if (format === 'binary') {
    blob = new Blob([data as ArrayBuffer], { type: 'application/octet-stream' });
  } else {
    blob = new Blob([data as string], { type: 'text/plain' });
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.stl`;
  link.click();
  URL.revokeObjectURL(url);
}
