/**
 * Serializador de Proyectos - Formato .stlm
 *
 * Convierte el estado de los stores (sketch + features) en un archivo JSON
 * con extensión .stlm y viceversa.
 *
 * US-007: Guardar y cargar proyecto (.stlm)
 *
 * Formato v1:
 * {
 *   "version": "1.0",
 *   "metadata": { "name", "created", "modified" },
 *   "sketch": { id, name, plane, entities, constraints },
 *   "features": [ ExtrudeFeature | ... (sin geometría Three.js) ]
 * }
 *
 * Las geometrías THREE.BufferGeometry no se serializan — se regeneran
 * desde las features al cargar el proyecto.
 */

import { nanoid } from 'nanoid';
import type { Sketch, SketchEntity } from '@capycad/shared-types';
import type { Feature } from '@capycad/shared-types';

// ─── Versión del formato ──────────────────────────────────────────────────────

export const PROJECT_FORMAT_VERSION = '1.0';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ProjectMetadata {
  name: string;
  created: string; // ISO 8601
  modified: string;
}

/**
 * Estructura del archivo .stlm serializado en disco
 */
export interface SerializedProject {
  version: string;
  metadata: ProjectMetadata;
  sketch: Sketch | null;
  features: Feature[];
}

/**
 * Estado hidratado devuelto por loadProject para aplicar a los stores
 */
export interface LoadedProject {
  sketch: Sketch | null;
  features: Feature[];
  metadata: ProjectMetadata;
}

// ─── Guardar ─────────────────────────────────────────────────────────────────

/**
 * Serializa el estado actual de los stores a JSON y descarga el archivo .stlm.
 *
 * @param sketch   - Sketch activo del sketchStore (puede ser null)
 * @param features - Array de features del featureStore
 * @param name     - Nombre del proyecto (se incorpora en metadata)
 */
export function saveProject(
  sketch: Sketch | null,
  features: Feature[],
  name = 'proyecto-sin-nombre'
): void {
  const now = new Date().toISOString();
  const project: SerializedProject = {
    version: PROJECT_FORMAT_VERSION,
    metadata: { name, created: now, modified: now },
    sketch,
    features,
  };

  const json = JSON.stringify(project, null, 2);
  triggerProjectDownload(json, name);
}

/**
 * Genera el JSON serializado del proyecto sin disparar descarga.
 * Expuesto para facilitar testing.
 */
export function serializeProject(
  sketch: Sketch | null,
  features: Feature[],
  name = 'proyecto-sin-nombre',
  now?: string
): SerializedProject {
  const timestamp = now ?? new Date().toISOString();
  return {
    version: PROJECT_FORMAT_VERSION,
    metadata: { name, created: timestamp, modified: timestamp },
    sketch,
    features,
  };
}

// ─── Cargar ───────────────────────────────────────────────────────────────────

/**
 * Parsea el contenido de un archivo .stlm y devuelve el estado del proyecto.
 * Lanza error si el JSON es inválido o la versión es incompatible.
 *
 * @param jsonContent - Texto del archivo .stlm leído como string
 */
export function loadProject(jsonContent: string): LoadedProject {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonContent);
  } catch {
    throw new Error('Archivo .stlm inválido: no es JSON válido');
  }

  validateProjectShape(parsed);

  const project = parsed as SerializedProject;
  const sketch = project.sketch
    ? { ...project.sketch, measurements: project.sketch.measurements ?? [] }
    : null;
  return {
    sketch,
    features: project.features,
    metadata: project.metadata,
  };
}

// ─── Validación ───────────────────────────────────────────────────────────────

/**
 * Valida que el objeto parseado tenga la estructura mínima esperada.
 */
function validateProjectShape(obj: unknown): void {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('Archivo .stlm inválido: estructura raíz no es un objeto');
  }

  const project = obj as Record<string, unknown>;

  if (typeof project['version'] !== 'string') {
    throw new Error('Archivo .stlm inválido: campo "version" faltante o inválido');
  }

  if (!isSemanticallyCompatible(project['version'] as string)) {
    throw new Error(
      `Versión de proyecto "${project['version']}" incompatible con la versión actual "${PROJECT_FORMAT_VERSION}"`
    );
  }

  if (typeof project['metadata'] !== 'object' || project['metadata'] === null) {
    throw new Error('Archivo .stlm inválido: campo "metadata" faltante');
  }

  if (!Array.isArray(project['features'])) {
    throw new Error('Archivo .stlm inválido: campo "features" debe ser un array');
  }
}

/**
 * Comprueba si una versión es compatible con la actual (major igual).
 */
export function isSemanticallyCompatible(fileVersion: string): boolean {
  const fileMajor = parseInt(fileVersion.split('.')[0] ?? '0', 10);
  const currentMajor = parseInt(PROJECT_FORMAT_VERSION.split('.')[0] ?? '0', 10);
  return fileMajor === currentMajor;
}

// ─── Descarga ─────────────────────────────────────────────────────────────────

/**
 * Dispara la descarga del archivo .stlm en el navegador.
 * Expuesto para facilitar testing.
 */
export function triggerProjectDownload(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(filename)}.stlm`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

/**
 * Limpia el nombre de archivo eliminando caracteres no permitidos.
 */
export function sanitizeFilename(name: string): string {
  return (
    name
      .trim()
      .replace(/[^a-zA-Z0-9_\-. ]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 100) || 'proyecto'
  );
}

/**
 * Crea un sketch vacío nuevo con ID generado.
 * Útil al crear proyectos nuevos.
 */
export function createEmptySketch(name = 'Sketch 1', plane: Sketch['plane'] = 'XY'): Sketch {
  return {
    id: nanoid(),
    name,
    entities: [] as SketchEntity[],
    constraints: [],
    measurements: [],
    plane,
  };
}
