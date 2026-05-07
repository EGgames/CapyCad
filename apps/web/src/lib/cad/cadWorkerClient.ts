/**
 * Cliente para comunicarse con el CAD Worker
 *
 * Proporciona una API simple para ejecutar operaciones CAD pesadas
 * en un Web Worker sin bloquear la UI principal.
 */

import type { SketchEntity, AppliedModifier } from '@stl-model/shared-types';
import { nanoid } from 'nanoid';

export interface EdgeSegmentData {
  index: number;
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  mid: { x: number; y: number; z: number };
}

interface GeometryData {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

/**
 * Descriptor discriminado para construir cualquier sólido en operaciones booleanas y modificadores.
 * Coincide con el tipo interno `BooleanShapeDescriptor` del worker.
 * El variant `boolean` es recursivo para encadenar booleanas.
 */
export type BooleanShapeDescriptor =
  | { kind: 'extrude'; entities: SketchEntity[]; distance: number; direction: 'positive' | 'negative' | 'both'; canvasWidth?: number; canvasHeight?: number }
  | { kind: 'box'; width: number; height: number; depth: number }
  | { kind: 'sphere'; radius: number }
  | { kind: 'cylinder'; radius: number; height: number }
  | { kind: 'cone'; baseRadius: number; topRadius: number; height: number }
  | { kind: 'torus'; majorRadius: number; minorRadius: number }
  | { kind: 'boolean'; target: BooleanShapeDescriptor; targetTranslation: { x: number; y: number; z: number }; tool: BooleanShapeDescriptor; toolTranslation: { x: number; y: number; z: number }; operation: 'union' | 'subtract' | 'intersect' };

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

export class CADWorkerClient {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private isInitialized = false;
  private workerError: Error | null = null;

  constructor() {
    this.initWorker();
  }

  /**
   * Inicializa el Web Worker
   */
  private initWorker(): void {
    try {
      this.worker = new Worker(new URL('../../workers/cad.worker.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = (event) => {
        const { id, type, success, geometry, edges, error } = event.data;

        const request = this.pendingRequests.get(id);
        if (!request) {
          console.warn(`[CAD Worker Client] No pending request for id: ${id}`);
          return;
        }

        this.pendingRequests.delete(id);

        if (success) {
          switch (type) {
            case 'init':
              this.isInitialized = true;
              request.resolve(true);
              break;
            case 'extrude':
            case 'fillet':
            case 'chamfer':
            case 'shell':
            case 'sweep':
            case 'loft':
            case 'revolve':
            case 'boolean':
            case 'draft':
            case 'offset':
            case 'bevel':
            case 'cove':
              request.resolve(geometry);
              break;
            case 'get_edges':
              request.resolve(edges);
              break;
            case 'primitive_box':
            case 'primitive_sphere':
            case 'primitive_cylinder':
            case 'primitive_cone':
            case 'primitive_torus':
              request.resolve(geometry);
              break;
            default:
              request.resolve(true);
          }
        } else {
          request.reject(new Error(error || 'Worker operation failed'));
        }
      };

      this.worker.onerror = (event) => {
        const err = new Error(event.message || 'Worker error');
        console.error('[CAD Worker Client] Worker error:', event);
        this.workerError = err;
        // Rechazar todas las requests pendientes y futuras
        this.pendingRequests.forEach((request) => {
          request.reject(err);
        });
        this.pendingRequests.clear();
      };
    } catch (error) {
      console.error('[CAD Worker Client] Failed to initialize worker:', error);
      this.workerError = error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Inicializa OpenCascade.js en el worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.workerError) throw this.workerError;
    if (!this.worker) throw new Error('Worker not available');

    const id = nanoid();
    const promise = new Promise<void>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Timeout de 30s — el WASM de 50MB puede tardar en cargar
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('CAD Worker initialization timed out (30s)'));
        }
      }, 30000);

      // Limpiar timeout si se resuelve antes
      const original = this.pendingRequests.get(id)!;
      this.pendingRequests.set(id, {
        resolve: (v) => {
          clearTimeout(timeout);
          original.resolve(v);
        },
        reject: (e) => {
          clearTimeout(timeout);
          original.reject(e);
        },
      });
    });

    this.worker.postMessage({ id, type: 'init', payload: null });

    return promise;
  }

  /**
   * Ejecuta operación de extrusión
   */
  async extrude(
    entities: SketchEntity[],
    distance: number,
    direction: 'positive' | 'negative' | 'both' = 'positive',
    canvasWidth = 800,
    canvasHeight = 600
  ): Promise<GeometryData> {
    if (!this.isInitialized) {
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    }

    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    this.worker?.postMessage({
      id,
      type: 'extrude',
      payload: { entities, distance, direction, canvasWidth, canvasHeight },
    });

    return promise;
  }

  /**
   * Obtiene las aristas BRep de un sólido para selección visual
   */
  async getEdges(
    source: BooleanShapeDescriptor,
    sourceTranslation: { x: number; y: number; z: number },
    sourceModifiers?: AppliedModifier[]
  ): Promise<EdgeSegmentData[]> {
    if (!this.isInitialized) {
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    }

    const id = nanoid();
    const promise = new Promise<EdgeSegmentData[]>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    this.worker?.postMessage({
      id,
      type: 'get_edges',
      payload: { source, sourceTranslation, sourceModifiers },
    });

    return promise;
  }

  /**
   * Ejecuta operación de fillet (redondeo de aristas)
   */
  async fillet(
    source: BooleanShapeDescriptor,
    sourceTranslation: { x: number; y: number; z: number },
    radius: number,
    edgeIndices?: number[],
    sourceModifiers?: AppliedModifier[]
  ): Promise<GeometryData> {
    if (!this.isInitialized) {
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    }
    if (radius <= 0) {
      throw new Error('Fillet radius must be greater than 0');
    }

    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    this.worker?.postMessage({
      id,
      type: 'fillet',
      payload: { source, sourceTranslation, radius, edgeIndices, sourceModifiers },
    });

    return promise;
  }

  /**
   * Ejecuta operación de chamfer (biselado de aristas)
   */
  async chamfer(
    source: BooleanShapeDescriptor,
    sourceTranslation: { x: number; y: number; z: number },
    chamferDistance: number,
    edgeIndices?: number[],
    sourceModifiers?: AppliedModifier[]
  ): Promise<GeometryData> {
    if (!this.isInitialized) {
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    }
    if (chamferDistance <= 0) {
      throw new Error('Chamfer distance must be greater than 0');
    }

    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    this.worker?.postMessage({
      id,
      type: 'chamfer',
      payload: { source, sourceTranslation, chamferDistance, edgeIndices, sourceModifiers },
    });

    return promise;
  }

  /**
   * Ejecuta operación de shell (vaciado con espesor uniforme)
   */
  async shell(
    source: BooleanShapeDescriptor,
    sourceTranslation: { x: number; y: number; z: number },
    thickness: number,
    sourceModifiers?: AppliedModifier[]
  ): Promise<GeometryData> {
    if (!this.isInitialized) {
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    }
    if (thickness <= 0) {
      throw new Error('Shell thickness must be greater than 0');
    }

    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    this.worker?.postMessage({
      id,
      type: 'shell',
      payload: { source, sourceTranslation, thickness, sourceModifiers },
    });

    return promise;
  }

  /**
   * Ejecuta operación de sweep (barrido por trayectoria)
   */
  async sweep(
    profileEntities: SketchEntity[],
    pathPoints: Array<{ x: number; y: number; z: number }>
  ): Promise<GeometryData> {
    if (!this.isInitialized) {
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    }
    if (pathPoints.length < 2) {
      throw new Error('Sweep path must have at least 2 points');
    }

    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    this.worker?.postMessage({
      id,
      type: 'sweep',
      payload: { profileEntities, pathPoints },
    });

    return promise;
  }

  /**
   * Ejecuta operación de loft (transición entre perfiles)
   */
  async loft(
    sections: Array<{ entities: SketchEntity[]; zOffset: number }>,
    closed = false
  ): Promise<GeometryData> {
    if (!this.isInitialized) {
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    }
    if (sections.length < 2) {
      throw new Error('Loft requires at least 2 sections');
    }

    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    this.worker?.postMessage({
      id,
      type: 'loft',
      payload: { sections, closed },
    });

    return promise;
  }

  /**
   * Ejecuta operación de revolución
   */
  async revolve(
    entities: SketchEntity[],
    axis: 'X' | 'Y' | 'Z' = 'Y',
    angle: number = 360
  ): Promise<GeometryData> {
    if (!this.isInitialized) {
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    }
    if (angle <= 0 || angle > 360) {
      throw new Error('Revolve angle must be between 0 and 360 degrees');
    }

    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    this.worker?.postMessage({
      id,
      type: 'revolve',
      payload: { entities, axis, angle },
    });

    return promise;
  }

  /**
   * Ejecuta operación booleana entre dos sólidos (soporta extrude, box, sphere, cylinder, cone, torus)
   */
  async booleanOp(
    target: BooleanShapeDescriptor,
    targetTranslation: { x: number; y: number; z: number },
    tool: BooleanShapeDescriptor,
    toolTranslation: { x: number; y: number; z: number },
    operation: 'union' | 'subtract' | 'intersect'
  ): Promise<GeometryData> {
    if (!this.isInitialized) {
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    }

    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    this.worker?.postMessage({
      id,
      type: 'boolean',
      payload: { target, targetTranslation, tool, toolTranslation, operation },
    });

    return promise;
  }

  /**
   * Ejecuta operación de draft (ángulo de desmoldeo)
   */
  async draft(
    source: BooleanShapeDescriptor,
    sourceTranslation: { x: number; y: number; z: number },
    angle: number,
    neutralPlane: 'XY' | 'XZ' | 'YZ' = 'XY',
    sourceModifiers?: AppliedModifier[]
  ): Promise<GeometryData> {
    if (!this.isInitialized) {
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    }
    if (angle < -30 || angle > 30) {
      throw new Error('Draft angle must be between -30 and 30 degrees');
    }

    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    this.worker?.postMessage({
      id,
      type: 'draft',
      payload: { source, sourceTranslation, angle, neutralPlane, sourceModifiers },
    });

    return promise;
  }

  /**
   * Ejecuta operación de offset (desplazamiento de superficie)
   */
  async offset(
    source: BooleanShapeDescriptor,
    sourceTranslation: { x: number; y: number; z: number },
    offsetDistance: number,
    sourceModifiers?: AppliedModifier[]
  ): Promise<GeometryData> {
    if (!this.isInitialized) {
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    }

    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    this.worker?.postMessage({
      id,
      type: 'offset',
      payload: { source, sourceTranslation, offsetDistance, sourceModifiers },
    });

    return promise;
  }

  /**
   * Ejecuta operación de bisel asimétrico (bevel).
   * d1 y d2 son las distancias desde las dos caras adyacentes a cada arista.
   */
  async bevel(
    source: BooleanShapeDescriptor,
    sourceTranslation: { x: number; y: number; z: number },
    d1: number,
    d2: number,
    edgeIndices?: number[],
    sourceModifiers?: AppliedModifier[]
  ): Promise<GeometryData> {
    if (!this.isInitialized) {
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    }
    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });
    this.worker?.postMessage({
      id,
      type: 'bevel',
      payload: { source, sourceTranslation, d1, d2, edgeIndices, sourceModifiers },
    });
    return promise;
  }

  /**
   * Ejecuta operación de media caña (cove — redondeo cóncavo).
   */
  async cove(
    source: BooleanShapeDescriptor,
    sourceTranslation: { x: number; y: number; z: number },
    radius: number,
    edgeIndices?: number[],
    sourceModifiers?: AppliedModifier[]
  ): Promise<GeometryData> {
    if (!this.isInitialized) {
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    }
    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });
    this.worker?.postMessage({
      id,
      type: 'cove',
      payload: { source, sourceTranslation, radius, edgeIndices },
    });
    return promise;
  }

  // ─── Primitive Methods ───────────────────────────────

  async primitiveBox(width: number, height: number, depth: number): Promise<GeometryData> {
    if (!this.isInitialized)
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    if (width <= 0 || height <= 0 || depth <= 0)
      throw new Error('Box dimensions must be greater than 0');
    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });
    this.worker?.postMessage({ id, type: 'primitive_box', payload: { width, height, depth } });
    return promise;
  }

  async primitiveSphere(radius: number): Promise<GeometryData> {
    if (!this.isInitialized)
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    if (radius <= 0) throw new Error('Sphere radius must be greater than 0');
    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });
    this.worker?.postMessage({ id, type: 'primitive_sphere', payload: { radius } });
    return promise;
  }

  async primitiveCylinder(radius: number, height: number): Promise<GeometryData> {
    if (!this.isInitialized)
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    if (radius <= 0 || height <= 0) throw new Error('Cylinder dimensions must be greater than 0');
    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });
    this.worker?.postMessage({ id, type: 'primitive_cylinder', payload: { radius, height } });
    return promise;
  }

  async primitiveCone(
    baseRadius: number,
    topRadius: number,
    height: number
  ): Promise<GeometryData> {
    if (!this.isInitialized)
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    if (baseRadius < 0 || topRadius < 0 || height <= 0)
      throw new Error('Cone dimensions must be valid (radii >= 0, height > 0)');
    if (baseRadius === 0 && topRadius === 0)
      throw new Error('At least one cone radius must be greater than 0');
    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });
    this.worker?.postMessage({
      id,
      type: 'primitive_cone',
      payload: { baseRadius, topRadius, height },
    });
    return promise;
  }

  async primitiveTorus(majorRadius: number, minorRadius: number): Promise<GeometryData> {
    if (!this.isInitialized)
      throw new Error('CAD Worker not initialized. Call initialize() first.');
    if (majorRadius <= 0 || minorRadius <= 0) throw new Error('Torus radii must be greater than 0');
    if (minorRadius >= majorRadius) throw new Error('Minor radius must be less than major radius');
    const id = nanoid();
    const promise = new Promise<GeometryData>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });
    this.worker?.postMessage({
      id,
      type: 'primitive_torus',
      payload: { majorRadius, minorRadius },
    });
    return promise;
  }

  /**
   * Termina el worker y libera recursos
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    // Reject all pending requests before clearing
    this.pendingRequests.forEach((request) => {
      request.reject(new Error('Worker terminated'));
    });
    this.pendingRequests.clear();
    this.isInitialized = false;
  }
}

// Singleton para uso global
let cadWorkerInstance: CADWorkerClient | null = null;

/**
 * Obtiene la instancia singleton del CAD Worker
 */
export function getCADWorker(): CADWorkerClient {
  if (!cadWorkerInstance) {
    cadWorkerInstance = new CADWorkerClient();
  }
  return cadWorkerInstance;
}

/**
 * Termina el worker singleton
 */
export function terminateCADWorker(): void {
  if (cadWorkerInstance) {
    cadWorkerInstance.terminate();
    cadWorkerInstance = null;
  }
}
