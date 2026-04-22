/**
 * Vector 3D
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Vector 2D
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Color RGB
 */
export interface Color {
  r: number;
  g: number;
  b: number;
}

/**
 * ID único de entidad
 */
export type EntityId = string;

/**
 * Timestamp ISO 8601
 */
export type Timestamp = string;
