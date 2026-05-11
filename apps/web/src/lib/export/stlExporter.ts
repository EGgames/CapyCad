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
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';

/**
 * Opciones de exportación STL
 */
export interface ExportSTLOptions {
  /** Formato de salida. 'binary' = más compacto, recomendado */
  format: 'binary' | 'ascii';
  /** Nombre base del archivo (sin extensión) */
  filename?: string;
  /** Resolución de la malla (afecta la tolerancia de triangulación) */
  resolution?: 'low' | 'medium' | 'high';
}

const DEFAULT_OPTIONS: Required<ExportSTLOptions> = {
  format: 'binary',
  filename: 'model',
  resolution: 'medium',
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

  const stlData = buildSTLData(geometries, opts.format, opts.resolution);
  triggerDownload(stlData, opts.filename, opts.format);
}

/**
 * Construye los datos STL a partir de las geometrías.
 * Expuesto para facilitar testing.
 */
export function buildSTLData(
  geometries: Map<string, { geometry: BufferGeometry; visible: boolean }>,
  format: 'binary' | 'ascii',
  resolution: 'low' | 'medium' | 'high' = 'medium'
): string | ArrayBuffer {
  const visibleGeometries = Array.from(geometries.values()).filter((g) => g.visible);

  if (visibleGeometries.length === 0) {
    throw new Error('No hay geometrías visibles para exportar');
  }

  // Construir escena temporal con todas las geometrías visibles
  const scene = new Scene();
  const material = new MeshBasicMaterial();
  const temporaryGeometries: BufferGeometry[] = [];

  for (const { geometry } of visibleGeometries) {
    const exportGeometry = applyResolutionToGeometry(geometry, resolution);
    temporaryGeometries.push(exportGeometry);
    const mesh = new Mesh(exportGeometry, material);
    scene.add(mesh);
  }

  const exporter = new STLExporter();

  try {
    if (format === 'binary') {
      return exporter.parse(scene, { binary: true }) as unknown as ArrayBuffer;
    }

    return exporter.parse(scene, { binary: false }) as string;
  } finally {
    for (const geometry of temporaryGeometries) {
      geometry.dispose();
    }
  }
}

function applyResolutionToGeometry(
  geometry: BufferGeometry,
  resolution: 'low' | 'medium' | 'high'
): BufferGeometry {
  const source = geometry.clone();

  if (resolution === 'high') return source;

  const position = source.getAttribute('position');
  const vertexCount = position?.count ?? 0;
  if (vertexCount < 12) return source;

  const ratio = resolution === 'low' ? 0.35 : 0.7;
  const targetCount = Math.max(12, Math.floor(vertexCount * ratio));
  if (targetCount >= vertexCount) return source;

  try {
    const modifier = new SimplifyModifier();
    return modifier.modify(source, targetCount);
  } catch {
    return source;
  }
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
