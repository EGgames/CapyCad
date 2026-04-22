import { EntityId, Vector3 } from './core';
import { Sketch } from './geometry';

/**
 * Tipos de operaciones CAD
 */
export enum FeatureType {
  EXTRUDE = 'extrude',
  REVOLVE = 'revolve',
  SWEEP = 'sweep',
  LOFT = 'loft',
  FILLET = 'fillet',
  CHAMFER = 'chamfer',
  SHELL = 'shell',
  OFFSET = 'offset',
  DRAFT = 'draft',
  BOOLEAN = 'boolean',
  PATTERN_LINEAR = 'pattern_linear',
  PATTERN_CIRCULAR = 'pattern_circular',
  IMPORT = 'import',
  // Primitivas 3D
  PRIMITIVE_BOX = 'primitive_box',
  PRIMITIVE_SPHERE = 'primitive_sphere',
  PRIMITIVE_CYLINDER = 'primitive_cylinder',
  PRIMITIVE_CONE = 'primitive_cone',
  PRIMITIVE_TORUS = 'primitive_torus',
}

/**
 * Feature base
 */
export interface Feature {
  id: EntityId;
  type: FeatureType;
  name: string;
  parentId: EntityId | null;
  visible: boolean;
  suppressed: boolean;
  /** Posición en coordenadas mundo (para primitivas colocadas con click-to-place) */
  position?: Vector3;
  /** Orientación en radianes (Euler XYZ) */
  rotation?: Vector3;
}

/**
 * Extrusión
 */
export interface ExtrudeFeature extends Feature {
  type: FeatureType.EXTRUDE;
  sketch: Sketch;
  distance: number;
  direction: 'positive' | 'negative' | 'both';
  draftAngle?: number;
}

/**
 * Revolución
 */
export interface RevolveFeature extends Feature {
  type: FeatureType.REVOLVE;
  sketch: Sketch;
  axis: { start: Vector3; end: Vector3 };
  angle: number; // Grados
}

/**
 * Fillet (redondeo)
 */
export interface FilletFeature extends Feature {
  type: FeatureType.FILLET;
  edges: EntityId[];
  radius: number;
}

/**
 * Chamfer (chaflán)
 */
export interface ChamferFeature extends Feature {
  type: FeatureType.CHAMFER;
  edges: EntityId[];
  distance: number;
  angle?: number;
}

/**
 * Shell (vaciado)
 */
export interface ShellFeature extends Feature {
  type: FeatureType.SHELL;
  facesToRemove: EntityId[];
  thickness: number;
}

/**
 * Sweep (barrido por trayectoria)
 */
export interface SweepFeature extends Feature {
  type: FeatureType.SWEEP;
  profileSketch: Sketch;
  pathPoints: Array<{ x: number; y: number; z: number }>;
}

/**
 * Loft (sección variable entre perfiles)
 */
export interface LoftFeature extends Feature {
  type: FeatureType.LOFT;
  sections: Array<{ sketch: Sketch; zOffset: number }>;
  closed?: boolean;
}

/**
 * Operación booleana
 */
export interface BooleanFeature extends Feature {
  type: FeatureType.BOOLEAN;
  operation: 'union' | 'subtract' | 'intersect';
  targetId: EntityId;
  toolId: EntityId;
}

/**
 * Patrón lineal
 */
export interface LinearPatternFeature extends Feature {
  type: FeatureType.PATTERN_LINEAR;
  featureId: EntityId;
  direction: Vector3;
  spacing: number;
  instances: number;
}

/**
 * Patrón circular
 */
export interface CircularPatternFeature extends Feature {
  type: FeatureType.PATTERN_CIRCULAR;
  featureId: EntityId;
  axis: { start: Vector3; end: Vector3 };
  instances: number;
  angle?: number; // Si no se especifica, 360°
}

/**
 * Modelo importado (STL / OBJ)
 */
export interface ImportFeature extends Feature {
  type: FeatureType.IMPORT;
  /** Nombre original del archivo */
  sourceFilename: string;
  /** Formato de origen */
  sourceFormat: 'stl' | 'obj';
}

/**
 * Draft (ángulo de desmoldeo)
 */
export interface DraftFeature extends Feature {
  type: FeatureType.DRAFT;
  /** ID de la feature base a la que se aplica el draft */
  sourceFeatureId: EntityId;
  /** Ángulo de desmoldeo en grados (-30 a +30) */
  angle: number;
  /** Plano neutro de referencia */
  neutralPlane: 'XY' | 'XZ' | 'YZ';
}

/**
 * Offset (desplazamiento de superficie)
 */
export interface OffsetFeature extends Feature {
  type: FeatureType.OFFSET;
  /** ID de la feature base a la que se aplica el offset */
  sourceFeatureId: EntityId;
  /** Distancia de offset (positivo = hacia afuera, negativo = hacia adentro) */
  distance: number;
}

// ─── Primitivas 3D ────────────────────────────────────────────────────────────

/**
 * Caja 3D
 */
export interface BoxFeature extends Feature {
  type: FeatureType.PRIMITIVE_BOX;
  width: number;
  height: number;
  depth: number;
}

/**
 * Esfera 3D
 */
export interface SphereFeature extends Feature {
  type: FeatureType.PRIMITIVE_SPHERE;
  radius: number;
}

/**
 * Cilindro 3D
 */
export interface CylinderFeature extends Feature {
  type: FeatureType.PRIMITIVE_CYLINDER;
  radius: number;
  height: number;
}

/**
 * Cono 3D
 */
export interface ConeFeature extends Feature {
  type: FeatureType.PRIMITIVE_CONE;
  baseRadius: number;
  topRadius: number;
  height: number;
}

/**
 * Toroide 3D
 */
export interface TorusFeature extends Feature {
  type: FeatureType.PRIMITIVE_TORUS;
  majorRadius: number;
  minorRadius: number;
}

/**
 * Unión de todos los tipos de features
 */
export type AnyFeature =
  | ExtrudeFeature
  | RevolveFeature
  | FilletFeature
  | ChamferFeature
  | ShellFeature
  | SweepFeature
  | LoftFeature
  | BooleanFeature
  | LinearPatternFeature
  | CircularPatternFeature
  | ImportFeature
  | DraftFeature
  | OffsetFeature
  | BoxFeature
  | SphereFeature
  | CylinderFeature
  | ConeFeature
  | TorusFeature;
