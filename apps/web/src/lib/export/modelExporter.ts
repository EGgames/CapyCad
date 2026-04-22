/**
 * Exportador de Modelos 3D
 *
 * US-013: Exportación a múltiples formatos (STL binario, STL ASCII, OBJ)
 *
 * Unifica las opciones de exportación y delega en los exportadores
 * específicos de Three.js (stlExporter para STL, OBJExporter para OBJ).
 */

import type { BufferGeometry } from 'three';
import { exportToSTL } from './stlExporter';
import { exportToM3F } from './m3fExporter';
import type { FeatureGeometry } from '@/stores/featureStore';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ExportFormat = 'stl-binary' | 'stl-ascii' | 'obj' | 'm3f';

export interface ExportOptions {
  filename?: string;
  format: ExportFormat;
}

// ─── Exportador OBJ ──────────────────────────────────────────────────────────

/**
 * Exporta geometrías a formato OBJ usando OBJExporter de Three.js.
 * Retorna el string OBJ completo.
 */
export async function buildOBJData(geometries: BufferGeometry[]): Promise<string> {
  if (geometries.length === 0) {
    throw new Error('No hay geometrías para exportar');
  }

  const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');
  const { Object3D, Mesh, MeshStandardMaterial } = await import('three');

  const exporter = new OBJExporter();
  const root = new Object3D();

  geometries.forEach((geometry, index) => {
    const material = new MeshStandardMaterial();
    const mesh = new Mesh(geometry, material);
    mesh.name = `mesh_${index}`;
    root.add(mesh);
  });

  const result = exporter.parse(root);
  return result;
}

/**
 * Genera un Blob del contenido OBJ.
 */
export async function buildOBJBlob(geometries: BufferGeometry[]): Promise<Blob> {
  const objString = await buildOBJData(geometries);
  return new Blob([objString], { type: 'text/plain' });
}

// ─── Exportador unificado ────────────────────────────────────────────────────

/**
 * Exporta las geometrías al formato indicado y dispara la descarga.
 */
export async function exportModel(
  featureGeometries: FeatureGeometry[],
  options: ExportOptions
): Promise<void> {
  const { format, filename = 'modelo' } = options;

  const geometries = featureGeometries.filter((fg) => fg.visible).map((fg) => fg.geometry);

  if (format !== 'm3f' && geometries.length === 0) {
    throw new Error('No hay geometrías visibles para exportar');
  }

  if (format === 'm3f') {
    const geometriesMap = new Map<
      string,
      { geometry: BufferGeometry; visible: boolean; name?: string }
    >();
    featureGeometries
      .filter((fg) => fg.visible)
      .forEach((fg) => {
        geometriesMap.set(fg.featureId, { geometry: fg.geometry, visible: true });
      });
    exportToM3F(geometriesMap, { filename });
    return;
  } else if (format === 'obj') {
    const blob = await buildOBJBlob(geometries);
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${filename}.obj`);
    URL.revokeObjectURL(url);
  } else {
    // Convertir FeatureGeometry[] al Map que espera exportToSTL
    const geometriesMap = new Map<string, { geometry: BufferGeometry; visible: boolean }>();
    featureGeometries
      .filter((fg) => fg.visible)
      .forEach((fg) => {
        geometriesMap.set(fg.featureId, { geometry: fg.geometry, visible: true });
      });
    const stlFormat = format === 'stl-ascii' ? 'ascii' : 'binary';
    exportToSTL(geometriesMap, { filename, format: stlFormat });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
