import { EntityId, Vector2, Vector3 } from './core';

/**
 * Tipos de entidades de sketch 2D
 */
export enum SketchEntityType {
  LINE = 'line',
  CIRCLE = 'circle',
  ARC = 'arc',
  RECTANGLE = 'rectangle',
  POLYGON = 'polygon',
  SPLINE = 'spline',
}

/**
 * Entidad base de sketch
 */
export interface SketchEntity {
  id: EntityId;
  type: SketchEntityType;
  selected: boolean;
  /** Rotación en grados (sentido horario). Solo aplica visualmente en las entidades que lo soporten. */
  rotation?: number;
}

/**
 * Línea 2D
 */
export interface Line extends SketchEntity {
  type: SketchEntityType.LINE;
  start: Vector2;
  end: Vector2;
}

/**
 * Círculo 2D
 */
export interface Circle extends SketchEntity {
  type: SketchEntityType.CIRCLE;
  center: Vector2;
  radius: number;
}

/**
 * Arco 2D
 */
export interface Arc extends SketchEntity {
  type: SketchEntityType.ARC;
  center: Vector2;
  radius: number;
  startAngle: number;
  endAngle: number;
}

/**
 * Rectángulo 2D (con esquinas opcionalmente redondeadas)
 */
export interface Rectangle extends SketchEntity {
  type: SketchEntityType.RECTANGLE;
  topLeft: Vector2;
  bottomRight: Vector2;
  /** Radio de redondeo de esquinas en píxeles (0 = sin redondeo) */
  cornerRadius?: number;
}

/**
 * Polígono regular 2D
 */
export interface Polygon extends SketchEntity {
  type: SketchEntityType.POLYGON;
  center: Vector2;
  radius: number;
  sides: number;
  rotation?: number; // radianes
}

/**
 * Medición persistente
 */
export interface Measurement {
  id: EntityId;
  start: Vector2;
  end: Vector2;
  distance: number;
  unit: 'mm' | 'ft';
}

/**
 * Sketch 2D contenedor
 */
export interface Sketch {
  id: EntityId;
  name: string;
  entities: SketchEntity[];
  constraints: Constraint[];
  measurements: Measurement[];
  plane: 'XY' | 'XZ' | 'YZ' | 'custom';
}

/**
 * Tipos de restricciones
 */
export enum ConstraintType {
  DISTANCE = 'distance',
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
  PARALLEL = 'parallel',
  PERPENDICULAR = 'perpendicular',
  TANGENT = 'tangent',
  CONCENTRIC = 'concentric',
  EQUAL = 'equal',
}

/**
 * Restricción paramétrica
 */
export interface Constraint {
  id: EntityId;
  type: ConstraintType;
  entities: EntityId[];
  value?: number;
}

/**
 * Sólido 3D (representación simplificada)
 */
export interface Solid {
  id: EntityId;
  vertices: Vector3[];
  faces: Face[];
  edges: Edge[];
  volume?: number;
}

/**
 * Cara de un sólido
 */
export interface Face {
  id: EntityId;
  vertices: number[]; // Índices en array de vertices
  normal?: Vector3;
}

/**
 * Arista de un sólido
 */
export interface Edge {
  id: EntityId;
  vertices: [number, number]; // Índices de vértices inicial y final
}
