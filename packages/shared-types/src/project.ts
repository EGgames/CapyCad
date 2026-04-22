import { EntityId, Timestamp } from './core';
import { AnyFeature } from './cad';
import { Sketch } from './geometry';

/**
 * Proyecto STL-Model
 */
export interface Project {
  id: EntityId;
  version: string; // Versión del formato de archivo
  metadata: ProjectMetadata;
  features: AnyFeature[];
  sketches: Sketch[];
  cameras: CameraState[];
  activeCameraId: EntityId;
}

/**
 * Metadata del proyecto
 */
export interface ProjectMetadata {
  name: string;
  description?: string;
  author?: string;
  created: Timestamp;
  modified: Timestamp;
  thumbnail?: string; // Base64 data URL
  tags?: string[];
}

/**
 * Estado de cámara guardado
 */
export interface CameraState {
  id: EntityId;
  name: string;
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
}

/**
 * Opciones de exportación STL
 */
export interface STLExportOptions {
  format: 'binary' | 'ascii';
  resolution: 'low' | 'medium' | 'high';
  units: 'mm' | 'cm' | 'in';
  validateManifold: boolean;
  autoRepair: boolean;
}

/**
 * Opciones de exportación OBJ
 */
export interface OBJExportOptions {
  includeNormals: boolean;
  smoothNormals: boolean;
  includeMaterials: boolean;
  units: 'mm' | 'cm' | 'in';
}

/**
 * Opciones de exportación M3F
 */
export interface M3FExportOptions {
  includeMetadata: boolean;
  embedMaterials: boolean;
  compressionLevel: number; // 0-9
}
