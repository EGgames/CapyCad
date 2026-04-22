/**
 * Tests para CAD Worker Client
 *
 * Prueba el cliente que se comunica con el Web Worker de OpenCascade.js:
 * - Inicialización del worker
 * - Comunicación bidireccional
 * - Operación de extrusión
 * - Manejo de errores
 * - Terminación del worker
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CADWorkerClient, getCADWorker, terminateCADWorker } from '@/lib/cad/cadWorkerClient';
import { SketchEntityType } from '@stl-model/shared-types';

// Mock del Worker
/** Geometría de stub reutilizable */
const STUB_GEOMETRY = {
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  indices: new Uint32Array([0, 1, 2]),
};

class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(data: any) {
    // Simular respuesta async del worker
    setTimeout(() => {
      if (this.onmessage) {
        if (data.type === 'init') {
          this.onmessage(
            new MessageEvent('message', {
              data: { id: data.id, type: 'init', success: true },
            })
          );
        } else if (
          data.type === 'extrude' ||
          data.type === 'fillet' ||
          data.type === 'chamfer' ||
          data.type === 'shell' ||
          data.type === 'sweep' ||
          data.type === 'loft' ||
          data.type === 'revolve' ||
          data.type === 'boolean' ||
          data.type === 'draft' ||
          data.type === 'offset'
        ) {
          this.onmessage(
            new MessageEvent('message', {
              data: {
                id: data.id,
                type: data.type,
                success: true,
                geometry: STUB_GEOMETRY,
              },
            })
          );
        }
      }
    }, 10);
  }

  terminate() {
    // Mock terminate
  }
}

// Mock global Worker
global.Worker = MockWorker as any;

describe('CADWorkerClient', () => {
  let client: CADWorkerClient;

  beforeEach(() => {
    client = new CADWorkerClient();
  });

  afterEach(() => {
    client.terminate();
  });

  describe('Inicialización', () => {
    it('debe crear instancia del cliente', () => {
      expect(client).toBeInstanceOf(CADWorkerClient);
    });

    it('debe inicializar el worker', async () => {
      await client.initialize();
      // Si no lanza error, la inicialización fue exitosa
      expect(true).toBe(true);
    });

    it('no debe reinicializar si ya está inicializado', async () => {
      await client.initialize();
      await client.initialize(); // Segunda llamada debe ser no-op

      expect(true).toBe(true);
    });
  });

  describe('Operación de Extrusión', () => {
    beforeEach(async () => {
      await client.initialize();
    });

    it('debe ejecutar extrusión exitosamente', async () => {
      const entities = [
        {
          id: 'line-1',
          type: SketchEntityType.LINE,
          selected: false,
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 },
        },
      ];

      const result = await client.extrude(entities, 10, 'positive');

      expect(result).toBeDefined();
      expect(result.positions).toBeInstanceOf(Float32Array);
      expect(result.normals).toBeInstanceOf(Float32Array);
      expect(result.indices).toBeInstanceOf(Uint32Array);
    });

    it('debe rechazar si no está inicializado', async () => {
      const uninitializedClient = new CADWorkerClient();

      const entities = [
        {
          id: 'line-1',
          type: SketchEntityType.LINE,
          selected: false,
          start: { x: 0, y: 0 },
          end: { x: 10, y: 0 },
        },
      ];

      await expect(uninitializedClient.extrude(entities, 10, 'positive')).rejects.toThrow(
        'CAD Worker not initialized'
      );

      uninitializedClient.terminate();
    });

    it('debe soportar diferentes direcciones de extrusión', async () => {
      const entities = [
        {
          id: 'circle-1',
          type: SketchEntityType.CIRCLE,
          selected: false,
          center: { x: 0, y: 0 },
          radius: 5,
        },
      ];

      const positive = await client.extrude(entities, 10, 'positive');
      expect(positive).toBeDefined();

      const negative = await client.extrude(entities, 10, 'negative');
      expect(negative).toBeDefined();

      const both = await client.extrude(entities, 10, 'both');
      expect(both).toBeDefined();
    });
  });

  describe('Terminación del Worker', () => {
    it('debe terminar el worker correctamente', () => {
      client.terminate();

      // No debería lanzar error
      expect(true).toBe(true);
    });

    it('debe limpiar requests pendientes al terminar', async () => {
      await client.initialize();

      // Iniciar operación pero terminar antes de que complete
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const termEntity = {
        id: 'line-1',
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
      } as any;
      const promise = client.extrude([termEntity], 10, 'positive');

      client.terminate();

      // La promesa debería rechazarse
      await expect(promise).rejects.toThrow();
    });
  });

  describe('Singleton Pattern', () => {
    afterEach(() => {
      terminateCADWorker();
    });

    it('debe retornar la misma instancia con getCADWorker', () => {
      const instance1 = getCADWorker();
      const instance2 = getCADWorker();

      expect(instance1).toBe(instance2);

      instance1.terminate();
    });

    it('debe crear nueva instancia después de terminate', () => {
      const instance1 = getCADWorker();
      terminateCADWorker();

      const instance2 = getCADWorker();

      expect(instance1).not.toBe(instance2);

      instance2.terminate();
    });
  });
});

describe('CADWorkerClient - Error Handling', () => {
  let client: CADWorkerClient;

  beforeEach(() => {
    // Mock Worker que simula errores
    global.Worker = class extends MockWorker {
      postMessage(data: any) {
        setTimeout(() => {
          if (this.onmessage) {
            if (data.type === 'init') {
              // Inicialización exitosa
              this.onmessage(
                new MessageEvent('message', {
                  data: { id: data.id, type: 'init', success: true },
                })
              );
            } else if (data.type === 'extrude') {
              // Simular error de extrusión
              this.onmessage(
                new MessageEvent('message', {
                  data: {
                    id: data.id,
                    type: 'extrude',
                    success: false,
                    error: 'Failed to create wire from sketch entities',
                  },
                })
              );
            }
          }
        }, 10);
      }
    } as any;

    client = new CADWorkerClient();
  });

  afterEach(() => {
    client.terminate();
  });

  it('debe manejar errores de extrusión', async () => {
    await client.initialize();

    const entities = [
      {
        id: 'invalid',
        type: SketchEntityType.LINE,
        selected: false,
        start: { x: 0, y: 0 },
        end: { x: 0, y: 0 }, // Línea inválida
      },
    ];

    await expect(client.extrude(entities, 10, 'positive')).rejects.toThrow(
      'Failed to create wire from sketch entities'
    );
  });

  it('debe manejar errores de fillet', async () => {
    global.Worker = class extends MockWorker {
      postMessage(data: any) {
        setTimeout(() => {
          if (this.onmessage) {
            if (data.type === 'init') {
              this.onmessage(
                new MessageEvent('message', { data: { id: data.id, type: 'init', success: true } })
              );
            } else if (data.type === 'fillet') {
              this.onmessage(
                new MessageEvent('message', {
                  data: {
                    id: data.id,
                    type: 'fillet',
                    success: false,
                    error: 'Fillet radius too large',
                  },
                })
              );
            }
          }
        }, 10);
      }
    } as any;

    const errClient = new CADWorkerClient();
    await errClient.initialize();
    await expect(errClient.fillet([], 10, 'positive', 999)).rejects.toThrow(
      'Fillet radius too large'
    );
    errClient.terminate();
  });

  it('debe manejar errores de chamfer', async () => {
    global.Worker = class extends MockWorker {
      postMessage(data: any) {
        setTimeout(() => {
          if (this.onmessage) {
            if (data.type === 'init') {
              this.onmessage(
                new MessageEvent('message', { data: { id: data.id, type: 'init', success: true } })
              );
            } else if (data.type === 'chamfer') {
              this.onmessage(
                new MessageEvent('message', {
                  data: {
                    id: data.id,
                    type: 'chamfer',
                    success: false,
                    error: 'Chamfer distance too large',
                  },
                })
              );
            }
          }
        }, 10);
      }
    } as any;

    const errClient = new CADWorkerClient();
    await errClient.initialize();
    await expect(errClient.chamfer([], 10, 'positive', 999)).rejects.toThrow(
      'Chamfer distance too large'
    );
    errClient.terminate();
  });
});

describe('CADWorkerClient - Operación de Fillet', () => {
  let client: CADWorkerClient;

  const SQUARE_ENTITIES = [
    {
      id: 'l1',
      type: SketchEntityType.LINE,
      selected: false,
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
    },
    {
      id: 'l2',
      type: SketchEntityType.LINE,
      selected: false,
      start: { x: 10, y: 0 },
      end: { x: 10, y: 10 },
    },
    {
      id: 'l3',
      type: SketchEntityType.LINE,
      selected: false,
      start: { x: 10, y: 10 },
      end: { x: 0, y: 10 },
    },
    {
      id: 'l4',
      type: SketchEntityType.LINE,
      selected: false,
      start: { x: 0, y: 10 },
      end: { x: 0, y: 0 },
    },
  ];

  beforeEach(async () => {
    global.Worker = MockWorker as any;
    client = new CADWorkerClient();
    await client.initialize();
  });

  afterEach(() => {
    client.terminate();
  });

  it('debe ejecutar fillet exitosamente y retornar geometría', async () => {
    const geometry = await client.fillet(SQUARE_ENTITIES, 20, 'positive', 1.5);

    expect(geometry).toBeDefined();
    expect(geometry.positions).toBeInstanceOf(Float32Array);
    expect(geometry.normals).toBeInstanceOf(Float32Array);
    expect(geometry.indices).toBeInstanceOf(Uint32Array);
    expect(geometry.positions.length).toBeGreaterThan(0);
  });

  it('debe lanzar error si no está inicializado', async () => {
    const uninit = new CADWorkerClient();
    await expect(uninit.fillet(SQUARE_ENTITIES, 20, 'positive', 1.5)).rejects.toThrow(
      'CAD Worker not initialized'
    );
    uninit.terminate();
  });

  it('debe rechazar radio de fillet <= 0', async () => {
    await expect(client.fillet(SQUARE_ENTITIES, 20, 'positive', 0)).rejects.toThrow(
      'Fillet radius must be greater than 0'
    );
    await expect(client.fillet(SQUARE_ENTITIES, 20, 'positive', -1)).rejects.toThrow(
      'Fillet radius must be greater than 0'
    );
  });

  it('debe enviar payload correcto al worker', async () => {
    const postMessageSpy = vi.fn();
    const originalPostMessage = (client as any).worker.postMessage.bind((client as any).worker);
    (client as any).worker.postMessage = (data: any) => {
      postMessageSpy(data);
      originalPostMessage(data);
    };

    await client.fillet(SQUARE_ENTITIES, 20, 'positive', 2.0);

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'fillet',
        payload: expect.objectContaining({
          entities: SQUARE_ENTITIES,
          extrudeDistance: 20,
          direction: 'positive',
          radius: 2.0,
        }),
      })
    );
  });
});

describe('CADWorkerClient - Operación de Chamfer', () => {
  let client: CADWorkerClient;

  const SQUARE_ENTITIES = [
    {
      id: 'l1',
      type: SketchEntityType.LINE,
      selected: false,
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
    },
    {
      id: 'l2',
      type: SketchEntityType.LINE,
      selected: false,
      start: { x: 10, y: 0 },
      end: { x: 10, y: 10 },
    },
    {
      id: 'l3',
      type: SketchEntityType.LINE,
      selected: false,
      start: { x: 10, y: 10 },
      end: { x: 0, y: 10 },
    },
    {
      id: 'l4',
      type: SketchEntityType.LINE,
      selected: false,
      start: { x: 0, y: 10 },
      end: { x: 0, y: 0 },
    },
  ];

  beforeEach(async () => {
    global.Worker = MockWorker as any;
    client = new CADWorkerClient();
    await client.initialize();
  });

  afterEach(() => {
    client.terminate();
  });

  it('debe ejecutar chamfer exitosamente y retornar geometría', async () => {
    const geometry = await client.chamfer(SQUARE_ENTITIES, 20, 'positive', 1.5);

    expect(geometry).toBeDefined();
    expect(geometry.positions).toBeInstanceOf(Float32Array);
    expect(geometry.normals).toBeInstanceOf(Float32Array);
    expect(geometry.indices).toBeInstanceOf(Uint32Array);
    expect(geometry.positions.length).toBeGreaterThan(0);
  });

  it('debe lanzar error si no está inicializado', async () => {
    const uninit = new CADWorkerClient();
    await expect(uninit.chamfer(SQUARE_ENTITIES, 20, 'positive', 1.5)).rejects.toThrow(
      'CAD Worker not initialized'
    );
    uninit.terminate();
  });

  it('debe rechazar distancia de chamfer <= 0', async () => {
    await expect(client.chamfer(SQUARE_ENTITIES, 20, 'positive', 0)).rejects.toThrow(
      'Chamfer distance must be greater than 0'
    );
    await expect(client.chamfer(SQUARE_ENTITIES, 20, 'positive', -1)).rejects.toThrow(
      'Chamfer distance must be greater than 0'
    );
  });

  it('debe enviar payload correcto al worker', async () => {
    const postMessageSpy = vi.fn();
    const originalPostMessage = (client as any).worker.postMessage.bind((client as any).worker);
    (client as any).worker.postMessage = (data: any) => {
      postMessageSpy(data);
      originalPostMessage(data);
    };

    await client.chamfer(SQUARE_ENTITIES, 20, 'positive', 2.0);

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'chamfer',
        payload: expect.objectContaining({
          entities: SQUARE_ENTITIES,
          extrudeDistance: 20,
          direction: 'positive',
          chamferDistance: 2.0,
        }),
      })
    );
  });
});

// ─── US-010: Shell ────────────────────────────────────────────────────────────

describe('CADWorkerClient - Operación de Shell', () => {
  let client: CADWorkerClient;

  const SQUARE_ENTITIES = [
    {
      id: 'l1',
      type: SketchEntityType.LINE,
      selected: false,
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
    },
    {
      id: 'l2',
      type: SketchEntityType.LINE,
      selected: false,
      start: { x: 10, y: 0 },
      end: { x: 10, y: 10 },
    },
    {
      id: 'l3',
      type: SketchEntityType.LINE,
      selected: false,
      start: { x: 10, y: 10 },
      end: { x: 0, y: 10 },
    },
    {
      id: 'l4',
      type: SketchEntityType.LINE,
      selected: false,
      start: { x: 0, y: 10 },
      end: { x: 0, y: 0 },
    },
  ];

  beforeEach(async () => {
    global.Worker = MockWorker as any;
    client = new CADWorkerClient();
    await client.initialize();
  });

  afterEach(() => {
    client.terminate();
  });

  it('debe ejecutar shell exitosamente y retornar geometría', async () => {
    const geometry = await client.shell(SQUARE_ENTITIES, 20, 'positive', 2);

    expect(geometry).toBeDefined();
    expect(geometry.positions).toBeInstanceOf(Float32Array);
    expect(geometry.normals).toBeInstanceOf(Float32Array);
    expect(geometry.indices).toBeInstanceOf(Uint32Array);
    expect(geometry.positions.length).toBeGreaterThan(0);
  });

  it('debe lanzar error si no está inicializado', async () => {
    const uninit = new CADWorkerClient();
    await expect(uninit.shell(SQUARE_ENTITIES, 20, 'positive', 2)).rejects.toThrow(
      'CAD Worker not initialized'
    );
    uninit.terminate();
  });

  it('debe rechazar thickness <= 0', async () => {
    await expect(client.shell(SQUARE_ENTITIES, 20, 'positive', 0)).rejects.toThrow(
      'Shell thickness must be greater than 0'
    );
    await expect(client.shell(SQUARE_ENTITIES, 20, 'positive', -1)).rejects.toThrow(
      'Shell thickness must be greater than 0'
    );
  });

  it('debe enviar payload correcto al worker', async () => {
    const postMessageSpy = vi.fn();
    const originalPostMessage = (client as any).worker.postMessage.bind((client as any).worker);
    (client as any).worker.postMessage = (data: any) => {
      postMessageSpy(data);
      originalPostMessage(data);
    };

    await client.shell(SQUARE_ENTITIES, 20, 'positive', 2);

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'shell',
        payload: expect.objectContaining({
          entities: SQUARE_ENTITIES,
          extrudeDistance: 20,
          direction: 'positive',
          thickness: 2,
        }),
      })
    );
  });

  it('debe manejar error de shell desde el worker', async () => {
    global.Worker = class extends MockWorker {
      postMessage(data: any) {
        setTimeout(() => {
          if (this.onmessage) {
            if (data.type === 'init') {
              this.onmessage(
                new MessageEvent('message', { data: { id: data.id, type: 'init', success: true } })
              );
            } else if (data.type === 'shell') {
              this.onmessage(
                new MessageEvent('message', {
                  data: {
                    id: data.id,
                    type: 'shell',
                    success: false,
                    error: 'Shell thickness too large',
                  },
                })
              );
            }
          }
        }, 10);
      }
    } as any;

    const errClient = new CADWorkerClient();
    await errClient.initialize();
    await expect(errClient.shell(SQUARE_ENTITIES, 20, 'positive', 999)).rejects.toThrow(
      'Shell thickness too large'
    );
    errClient.terminate();
  });
});

// ─── US-012: Sweep ────────────────────────────────────────────────────────────

describe('CADWorkerClient - Operación de Sweep', () => {
  let client: CADWorkerClient;

  const CIRCLE_PROFILE = [
    { id: 'c1', type: SketchEntityType.CIRCLE, selected: false, center: { x: 0, y: 0 }, radius: 5 },
  ];

  const STRAIGHT_PATH = [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 30 },
  ];

  beforeEach(async () => {
    global.Worker = MockWorker as any;
    client = new CADWorkerClient();
    await client.initialize();
  });

  afterEach(() => {
    client.terminate();
  });

  it('debe ejecutar sweep exitosamente y retornar geometría', async () => {
    const geometry = await client.sweep(CIRCLE_PROFILE, STRAIGHT_PATH);

    expect(geometry).toBeDefined();
    expect(geometry.positions).toBeInstanceOf(Float32Array);
    expect(geometry.normals).toBeInstanceOf(Float32Array);
    expect(geometry.indices).toBeInstanceOf(Uint32Array);
    expect(geometry.positions.length).toBeGreaterThan(0);
  });

  it('debe lanzar error si no está inicializado', async () => {
    const uninit = new CADWorkerClient();
    await expect(uninit.sweep(CIRCLE_PROFILE, STRAIGHT_PATH)).rejects.toThrow(
      'CAD Worker not initialized'
    );
    uninit.terminate();
  });

  it('debe rechazar trayectoria con menos de 2 puntos', async () => {
    await expect(client.sweep(CIRCLE_PROFILE, [{ x: 0, y: 0, z: 0 }])).rejects.toThrow(
      'Sweep path must have at least 2 points'
    );
    await expect(client.sweep(CIRCLE_PROFILE, [])).rejects.toThrow(
      'Sweep path must have at least 2 points'
    );
  });

  it('debe enviar payload correcto al worker', async () => {
    const postMessageSpy = vi.fn();
    const originalPostMessage = (client as any).worker.postMessage.bind((client as any).worker);
    (client as any).worker.postMessage = (data: any) => {
      postMessageSpy(data);
      originalPostMessage(data);
    };

    await client.sweep(CIRCLE_PROFILE, STRAIGHT_PATH);

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sweep',
        payload: expect.objectContaining({
          profileEntities: CIRCLE_PROFILE,
          pathPoints: STRAIGHT_PATH,
        }),
      })
    );
  });

  it('debe manejar error de sweep desde el worker', async () => {
    global.Worker = class extends MockWorker {
      postMessage(data: any) {
        setTimeout(() => {
          if (this.onmessage) {
            if (data.type === 'init') {
              this.onmessage(
                new MessageEvent('message', { data: { id: data.id, type: 'init', success: true } })
              );
            } else if (data.type === 'sweep') {
              this.onmessage(
                new MessageEvent('message', {
                  data: {
                    id: data.id,
                    type: 'sweep',
                    success: false,
                    error: 'Failed to create path wire',
                  },
                })
              );
            }
          }
        }, 10);
      }
    } as any;

    const errClient = new CADWorkerClient();
    await errClient.initialize();
    await expect(errClient.sweep(CIRCLE_PROFILE, STRAIGHT_PATH)).rejects.toThrow(
      'Failed to create path wire'
    );
    errClient.terminate();
  });
});

// ─── US-012: Loft ─────────────────────────────────────────────────────────────

describe('CADWorkerClient - Operación de Loft', () => {
  let client: CADWorkerClient;

  const SECTIONS = [
    {
      entities: [
        {
          id: 'c1',
          type: SketchEntityType.CIRCLE,
          selected: false,
          center: { x: 0, y: 0 },
          radius: 10,
        },
      ],
      zOffset: 0,
    },
    {
      entities: [
        {
          id: 'c2',
          type: SketchEntityType.CIRCLE,
          selected: false,
          center: { x: 0, y: 0 },
          radius: 5,
        },
      ],
      zOffset: 20,
    },
  ];

  beforeEach(async () => {
    global.Worker = MockWorker as any;
    client = new CADWorkerClient();
    await client.initialize();
  });

  afterEach(() => {
    client.terminate();
  });

  it('debe ejecutar loft exitosamente y retornar geometría', async () => {
    const geometry = await client.loft(SECTIONS);

    expect(geometry).toBeDefined();
    expect(geometry.positions).toBeInstanceOf(Float32Array);
    expect(geometry.normals).toBeInstanceOf(Float32Array);
    expect(geometry.indices).toBeInstanceOf(Uint32Array);
    expect(geometry.positions.length).toBeGreaterThan(0);
  });

  it('debe ejecutar loft cerrado', async () => {
    const geometry = await client.loft(SECTIONS, true);
    expect(geometry).toBeDefined();
  });

  it('debe lanzar error si no está inicializado', async () => {
    const uninit = new CADWorkerClient();
    await expect(uninit.loft(SECTIONS)).rejects.toThrow('CAD Worker not initialized');
    uninit.terminate();
  });

  it('debe rechazar loft con menos de 2 secciones', async () => {
    await expect(client.loft([SECTIONS[0]])).rejects.toThrow('Loft requires at least 2 sections');
    await expect(client.loft([])).rejects.toThrow('Loft requires at least 2 sections');
  });

  it('debe enviar payload correcto al worker', async () => {
    const postMessageSpy = vi.fn();
    const originalPostMessage = (client as any).worker.postMessage.bind((client as any).worker);
    (client as any).worker.postMessage = (data: any) => {
      postMessageSpy(data);
      originalPostMessage(data);
    };

    await client.loft(SECTIONS, false);

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'loft',
        payload: expect.objectContaining({
          sections: SECTIONS,
          closed: false,
        }),
      })
    );
  });

  it('debe manejar error de loft desde el worker', async () => {
    global.Worker = class extends MockWorker {
      postMessage(data: any) {
        setTimeout(() => {
          if (this.onmessage) {
            if (data.type === 'init') {
              this.onmessage(
                new MessageEvent('message', { data: { id: data.id, type: 'init', success: true } })
              );
            } else if (data.type === 'loft') {
              this.onmessage(
                new MessageEvent('message', {
                  data: {
                    id: data.id,
                    type: 'loft',
                    success: false,
                    error: 'Loft sections not compatible',
                  },
                })
              );
            }
          }
        }, 10);
      }
    } as any;

    const errClient = new CADWorkerClient();
    await errClient.initialize();
    await expect(errClient.loft(SECTIONS)).rejects.toThrow('Loft sections not compatible');
    errClient.terminate();
  });
});

// ─── Revolve ──────────────────────────────────────────────────────────────────

describe('CADWorkerClient - Operación de Revolve', () => {
  let client: CADWorkerClient;

  const CIRCLE_ENTITIES = [
    {
      id: 'c1',
      type: SketchEntityType.CIRCLE,
      selected: false,
      center: { x: 0, y: 0 },
      radius: 10,
    },
  ];

  beforeEach(async () => {
    global.Worker = MockWorker as any;
    client = new CADWorkerClient();
    await client.initialize();
  });

  afterEach(() => {
    client.terminate();
  });

  it('debe ejecutar revolve exitosamente y retornar geometría', async () => {
    const geometry = await client.revolve(CIRCLE_ENTITIES, 'Y', 360);

    expect(geometry).toBeDefined();
    expect(geometry.positions).toBeInstanceOf(Float32Array);
    expect(geometry.normals).toBeInstanceOf(Float32Array);
    expect(geometry.indices).toBeInstanceOf(Uint32Array);
    expect(geometry.positions.length).toBeGreaterThan(0);
  });

  it('debe ejecutar revolve parcial (180 grados)', async () => {
    const geometry = await client.revolve(CIRCLE_ENTITIES, 'Z', 180);
    expect(geometry).toBeDefined();
  });

  it('debe lanzar error si no está inicializado', async () => {
    const uninit = new CADWorkerClient();
    await expect(uninit.revolve(CIRCLE_ENTITIES, 'Y', 360)).rejects.toThrow(
      'CAD Worker not initialized'
    );
    uninit.terminate();
  });

  it('debe rechazar ángulo <= 0', async () => {
    await expect(client.revolve(CIRCLE_ENTITIES, 'Y', 0)).rejects.toThrow();
    await expect(client.revolve(CIRCLE_ENTITIES, 'Y', -90)).rejects.toThrow();
  });

  it('debe rechazar ángulo > 360', async () => {
    await expect(client.revolve(CIRCLE_ENTITIES, 'Y', 361)).rejects.toThrow();
    await expect(client.revolve(CIRCLE_ENTITIES, 'Y', 720)).rejects.toThrow();
  });

  it('debe enviar payload correcto al worker', async () => {
    const postMessageSpy = vi.fn();
    const originalPostMessage = (client as any).worker.postMessage.bind((client as any).worker);
    (client as any).worker.postMessage = (data: any) => {
      postMessageSpy(data);
      originalPostMessage(data);
    };

    await client.revolve(CIRCLE_ENTITIES, 'X', 180);

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'revolve',
        payload: expect.objectContaining({
          entities: CIRCLE_ENTITIES,
          axis: 'X',
          angle: 180,
        }),
      })
    );
  });

  it('debe manejar error de revolve desde el worker', async () => {
    global.Worker = class extends MockWorker {
      postMessage(data: any) {
        setTimeout(() => {
          if (this.onmessage) {
            if (data.type === 'init') {
              this.onmessage(
                new MessageEvent('message', {
                  data: { id: data.id, type: 'init', success: true },
                })
              );
            } else if (data.type === 'revolve') {
              this.onmessage(
                new MessageEvent('message', {
                  data: {
                    id: data.id,
                    type: 'revolve',
                    success: false,
                    error: 'Revolve axis invalid',
                  },
                })
              );
            }
          }
        }, 10);
      }
    } as any;

    const errClient = new CADWorkerClient();
    await errClient.initialize();
    await expect(errClient.revolve(CIRCLE_ENTITIES, 'Y', 360)).rejects.toThrow(
      'Revolve axis invalid'
    );
    errClient.terminate();
  });
});

// ─── Boolean ──────────────────────────────────────────────────────────────────

describe('CADWorkerClient - Operación de Boolean', () => {
  let client: CADWorkerClient;

  const RECT_ENTITIES = [
    {
      id: 'l1',
      type: SketchEntityType.LINE,
      selected: false,
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
    },
  ];

  beforeEach(async () => {
    global.Worker = MockWorker as any;
    client = new CADWorkerClient();
    await client.initialize();
  });

  afterEach(() => {
    client.terminate();
  });

  it('debe ejecutar union exitosamente y retornar geometría', async () => {
    const geometry = await client.booleanOp(
      RECT_ENTITIES,
      10,
      'positive',
      RECT_ENTITIES,
      5,
      'positive',
      'union'
    );

    expect(geometry).toBeDefined();
    expect(geometry.positions).toBeInstanceOf(Float32Array);
    expect(geometry.normals).toBeInstanceOf(Float32Array);
    expect(geometry.indices).toBeInstanceOf(Uint32Array);
    expect(geometry.positions.length).toBeGreaterThan(0);
  });

  it('debe ejecutar resta exitosamente', async () => {
    const geometry = await client.booleanOp(
      RECT_ENTITIES,
      10,
      'positive',
      RECT_ENTITIES,
      5,
      'both',
      'subtract'
    );
    expect(geometry).toBeDefined();
  });

  it('debe ejecutar intersección exitosamente', async () => {
    const geometry = await client.booleanOp(
      RECT_ENTITIES,
      10,
      'negative',
      RECT_ENTITIES,
      10,
      'negative',
      'intersect'
    );
    expect(geometry).toBeDefined();
  });

  it('debe lanzar error si no está inicializado', async () => {
    const uninit = new CADWorkerClient();
    await expect(
      uninit.booleanOp(RECT_ENTITIES, 10, 'positive', RECT_ENTITIES, 5, 'positive', 'union')
    ).rejects.toThrow('CAD Worker not initialized');
    uninit.terminate();
  });

  it('debe enviar payload correcto al worker', async () => {
    const postMessageSpy = vi.fn();
    const originalPostMessage = (client as any).worker.postMessage.bind((client as any).worker);
    (client as any).worker.postMessage = (data: any) => {
      postMessageSpy(data);
      originalPostMessage(data);
    };

    await client.booleanOp(RECT_ENTITIES, 10, 'positive', RECT_ENTITIES, 5, 'both', 'subtract');

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'boolean',
        payload: expect.objectContaining({
          targetEntities: RECT_ENTITIES,
          targetDistance: 10,
          targetDirection: 'positive',
          toolEntities: RECT_ENTITIES,
          toolDistance: 5,
          toolDirection: 'both',
          operation: 'subtract',
        }),
      })
    );
  });

  it('debe manejar error de boolean desde el worker', async () => {
    global.Worker = class extends MockWorker {
      postMessage(data: any) {
        setTimeout(() => {
          if (this.onmessage) {
            if (data.type === 'init') {
              this.onmessage(
                new MessageEvent('message', {
                  data: { id: data.id, type: 'init', success: true },
                })
              );
            } else if (data.type === 'boolean') {
              this.onmessage(
                new MessageEvent('message', {
                  data: {
                    id: data.id,
                    type: 'boolean',
                    success: false,
                    error: 'Boolean operation failed on empty body',
                  },
                })
              );
            }
          }
        }, 10);
      }
    } as any;

    const errClient = new CADWorkerClient();
    await errClient.initialize();
    await expect(
      errClient.booleanOp(RECT_ENTITIES, 10, 'positive', RECT_ENTITIES, 5, 'positive', 'union')
    ).rejects.toThrow('Boolean operation failed on empty body');
    errClient.terminate();
  });
});

// ─── Draft ───────────────────────────────────────────────────────────────────

describe('CADWorkerClient - Operación de Draft', () => {
  const RECT_ENTITIES = [
    {
      id: 'r1',
      type: SketchEntityType.RECTANGLE,
      selected: false,
      topLeft: { x: 0, y: 0 },
      bottomRight: { x: 10, y: 10 },
    },
  ];

  let client: CADWorkerClient;

  beforeEach(async () => {
    global.Worker = MockWorker as any;
    client = new CADWorkerClient();
    await client.initialize();
  });

  afterEach(() => {
    client.terminate();
  });

  it('debe ejecutar draft exitosamente y retornar geometría', async () => {
    const result = await client.draft(RECT_ENTITIES, 20, 'positive', 10, 'XY');
    expect(result).toBeDefined();
    expect(result.positions).toBeInstanceOf(Float32Array);
    expect(result.normals).toBeInstanceOf(Float32Array);
    expect(result.indices).toBeInstanceOf(Uint32Array);
  });

  it('debe lanzar error si no está inicializado', async () => {
    const freshClient = new CADWorkerClient();
    await expect(freshClient.draft(RECT_ENTITIES, 20, 'positive', 10, 'XY')).rejects.toThrow(
      'CAD Worker not initialized'
    );
    freshClient.terminate();
  });

  it('debe rechazar ángulo > 30', async () => {
    await expect(client.draft(RECT_ENTITIES, 20, 'positive', 45, 'XY')).rejects.toThrow(
      'Draft angle must be between -30 and 30'
    );
  });

  it('debe rechazar ángulo < -30', async () => {
    await expect(client.draft(RECT_ENTITIES, 20, 'positive', -31, 'XY')).rejects.toThrow(
      'Draft angle must be between -30 and 30'
    );
  });

  it('debe enviar payload correcto al worker', async () => {
    const postMessageSpy = vi.fn();
    const originalPostMessage = MockWorker.prototype.postMessage;
    MockWorker.prototype.postMessage = function (data: any) {
      postMessageSpy(data);
      originalPostMessage.call(this, data);
    };

    await client.draft(RECT_ENTITIES, 20, 'positive', 5, 'XZ');

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'draft',
        payload: expect.objectContaining({
          entities: RECT_ENTITIES,
          extrudeDistance: 20,
          direction: 'positive',
          angle: 5,
          neutralPlane: 'XZ',
        }),
      })
    );

    MockWorker.prototype.postMessage = originalPostMessage;
  });

  it('debe manejar error de draft desde el worker', async () => {
    global.Worker = class extends MockWorker {
      postMessage(data: any) {
        setTimeout(() => {
          if (this.onmessage) {
            if (data.type === 'init') {
              this.onmessage(
                new MessageEvent('message', {
                  data: { id: data.id, type: 'init', success: true },
                })
              );
            } else if (data.type === 'draft') {
              this.onmessage(
                new MessageEvent('message', {
                  data: {
                    id: data.id,
                    type: 'draft',
                    success: false,
                    error: 'Draft failed on thin body',
                  },
                })
              );
            }
          }
        }, 10);
      }
    } as any;

    const errClient = new CADWorkerClient();
    await errClient.initialize();
    await expect(errClient.draft(RECT_ENTITIES, 20, 'positive', 10, 'XY')).rejects.toThrow(
      'Draft failed on thin body'
    );
    errClient.terminate();
  });
});

// ─── Offset ──────────────────────────────────────────────────────────────────

describe('CADWorkerClient - Operación de Offset', () => {
  const RECT_ENTITIES = [
    {
      id: 'r1',
      type: SketchEntityType.RECTANGLE,
      selected: false,
      topLeft: { x: 0, y: 0 },
      bottomRight: { x: 10, y: 10 },
    },
  ];

  let client: CADWorkerClient;

  beforeEach(async () => {
    global.Worker = MockWorker as any;
    client = new CADWorkerClient();
    await client.initialize();
  });

  afterEach(() => {
    client.terminate();
  });

  it('debe ejecutar offset exitosamente y retornar geometría', async () => {
    const result = await client.offset(RECT_ENTITIES, 20, 'positive', 3);
    expect(result).toBeDefined();
    expect(result.positions).toBeInstanceOf(Float32Array);
    expect(result.normals).toBeInstanceOf(Float32Array);
    expect(result.indices).toBeInstanceOf(Uint32Array);
  });

  it('debe lanzar error si no está inicializado', async () => {
    const freshClient = new CADWorkerClient();
    await expect(freshClient.offset(RECT_ENTITIES, 20, 'positive', 3)).rejects.toThrow(
      'CAD Worker not initialized'
    );
    freshClient.terminate();
  });

  it('debe enviar payload correcto al worker', async () => {
    const postMessageSpy = vi.fn();
    const originalPostMessage = MockWorker.prototype.postMessage;
    MockWorker.prototype.postMessage = function (data: any) {
      postMessageSpy(data);
      originalPostMessage.call(this, data);
    };

    await client.offset(RECT_ENTITIES, 20, 'positive', 5);

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'offset',
        payload: expect.objectContaining({
          entities: RECT_ENTITIES,
          extrudeDistance: 20,
          direction: 'positive',
          offsetDistance: 5,
        }),
      })
    );

    MockWorker.prototype.postMessage = originalPostMessage;
  });

  it('debe manejar error de offset desde el worker', async () => {
    global.Worker = class extends MockWorker {
      postMessage(data: any) {
        setTimeout(() => {
          if (this.onmessage) {
            if (data.type === 'init') {
              this.onmessage(
                new MessageEvent('message', {
                  data: { id: data.id, type: 'init', success: true },
                })
              );
            } else if (data.type === 'offset') {
              this.onmessage(
                new MessageEvent('message', {
                  data: {
                    id: data.id,
                    type: 'offset',
                    success: false,
                    error: 'Offset operation failed',
                  },
                })
              );
            }
          }
        }, 10);
      }
    } as any;

    const errClient = new CADWorkerClient();
    await errClient.initialize();
    await expect(errClient.offset(RECT_ENTITIES, 20, 'positive', 3)).rejects.toThrow(
      'Offset operation failed'
    );
    errClient.terminate();
  });
});
