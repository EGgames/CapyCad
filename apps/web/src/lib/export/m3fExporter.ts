/**
 * Exportador a formato M3F (Manufacturing File Format)
 *
 * FUNC-013: Exportación M3F con metadatos de manufactura embebidos.
 *
 * M3F es un formato JSON estructurado que combina:
 * - Geometría de malla (vértices + triángulos)
 * - Metadatos de manufactura (material, tolerancias, orientación, acabado)
 * - Información de proyecto
 *
 * Compatible con slicers modernos mediante conversión a STL/OBJ,
 * y enriquecido con datos de manufactura para flujos CAM/FDM/SLA.
 */

import type { BufferGeometry } from 'three';

// ─── Tipos M3F ────────────────────────────────────────────────────────────────

export interface M3FManufacturingData {
  /** Material de manufactura recomendado */
  material: string;
  /** Tolerancia dimensional en mm */
  tolerance: number;
  /** Acabado superficial (Ra en µm) */
  surfaceFinish: number;
  /** Orientación óptima de impresión [pitch, yaw, roll] en grados */
  printOrientation: [number, number, number];
  /** Soporte de impresión requerido */
  supportRequired: boolean;
  /** Resolución de capa recomendada en mm */
  layerHeight: number;
  /** Relleno recomendado en % */
  infillPercent: number;
}

export interface M3FMesh {
  name: string;
  /** Vértices: triplas [x, y, z] */
  vertices: number[][];
  /** Caras: tripletas de índices de vértice */
  triangles: number[][];
  /** Normales por cara (opcional) */
  faceNormals?: number[][];
}

export interface M3FFile {
  /** Versión del formato */
  version: '1.0';
  /** Nombre del proyecto */
  projectName: string;
  /** Timestamp ISO 8601 */
  exportedAt: string;
  /** Unidades de medida */
  units: 'mm' | 'cm' | 'in';
  /** Métricas del modelo */
  metrics: {
    vertexCount: number;
    triangleCount: number;
    meshCount: number;
    /** Bounding box */
    boundingBox: {
      min: [number, number, number];
      max: [number, number, number];
      size: [number, number, number];
    };
  };
  /** Meshes del modelo */
  meshes: M3FMesh[];
  /** Metadatos de manufactura */
  manufacturing: M3FManufacturingData;
}

export interface M3FExportOptions {
  projectName?: string;
  units?: 'mm' | 'cm' | 'in';
  manufacturing?: Partial<M3FManufacturingData>;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_MANUFACTURING: M3FManufacturingData = {
  material: 'PLA',
  tolerance: 0.2,
  surfaceFinish: 3.2,
  printOrientation: [0, 0, 0],
  supportRequired: false,
  layerHeight: 0.2,
  infillPercent: 20,
};

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Extrae los datos de malla desde un BufferGeometry de Three.js.
 */
function geometryToM3FMesh(geometry: BufferGeometry, name: string): M3FMesh {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const normal = geometry.getAttribute('normal');

  if (!position) {
    throw new Error(`Geometry "${name}" has no position attribute`);
  }

  // Vértices
  const vertices: number[][] = [];
  for (let i = 0; i < position.count; i++) {
    vertices.push([position.getX(i), position.getY(i), position.getZ(i)]);
  }

  // Triángulos
  const triangles: number[][] = [];
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      triangles.push([index.getX(i), index.getX(i + 1), index.getX(i + 2)]);
    }
  } else {
    // Sin índice: cada grupo de 3 vértices es un triángulo
    for (let i = 0; i < position.count; i += 3) {
      triangles.push([i, i + 1, i + 2]);
    }
  }

  // Normales por cara (promedio de los 3 vértices del triángulo)
  const faceNormals: number[][] | undefined = normal ? [] : undefined;
  if (faceNormals && normal) {
    for (const tri of triangles) {
      const nx = (normal.getX(tri[0]) + normal.getX(tri[1]) + normal.getX(tri[2])) / 3;
      const ny = (normal.getY(tri[0]) + normal.getY(tri[1]) + normal.getY(tri[2])) / 3;
      const nz = (normal.getZ(tri[0]) + normal.getZ(tri[1]) + normal.getZ(tri[2])) / 3;
      faceNormals.push([nx, ny, nz]);
    }
  }

  return { name, vertices, triangles, faceNormals };
}

/**
 * Calcula el bounding box de todos los meshes.
 */
function computeBoundingBox(meshes: M3FMesh[]): M3FFile['metrics']['boundingBox'] {
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (const mesh of meshes) {
    for (const [x, y, z] of mesh.vertices) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }
  }

  if (!isFinite(minX)) {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
      size: [0, 0, 0],
    };
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    size: [maxX - minX, maxY - minY, maxZ - minZ],
  };
}

/**
 * Construye el objeto M3FFile sin disparar descarga.
 * Expuesto para facilitar testing.
 */
export function buildM3FData(
  geometries: Map<string, { geometry: BufferGeometry; visible: boolean; name?: string }>,
  options: M3FExportOptions = {}
): M3FFile {
  const visibleEntries = Array.from(geometries.entries()).filter(([, g]) => g.visible);

  if (visibleEntries.length === 0) {
    throw new Error('No hay geometrías visibles para exportar');
  }

  const meshes = visibleEntries.map(([id, g], idx) =>
    geometryToM3FMesh(g.geometry, g.name ?? `mesh_${idx}_${id.slice(0, 6)}`)
  );

  const totalVertices = meshes.reduce((acc, m) => acc + m.vertices.length, 0);
  const totalTriangles = meshes.reduce((acc, m) => acc + m.triangles.length, 0);

  return {
    version: '1.0',
    projectName: options.projectName ?? 'CapyCad Project',
    exportedAt: new Date().toISOString(),
    units: options.units ?? 'mm',
    metrics: {
      vertexCount: totalVertices,
      triangleCount: totalTriangles,
      meshCount: meshes.length,
      boundingBox: computeBoundingBox(meshes),
    },
    meshes,
    manufacturing: {
      ...DEFAULT_MANUFACTURING,
      ...(options.manufacturing ?? {}),
    },
  };
}

/**
 * Exporta geometrías a formato M3F y dispara descarga del archivo.
 */
export function exportToM3F(
  geometries: Map<string, { geometry: BufferGeometry; visible: boolean; name?: string }>,
  options: M3FExportOptions & { filename?: string } = {}
): void {
  const m3fData = buildM3FData(geometries, options);
  const json = JSON.stringify(m3fData, null, 2);

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${options.filename ?? 'model'}.m3f`;
  link.click();
  URL.revokeObjectURL(url);
  link.remove();
}
