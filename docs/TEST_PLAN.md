# Plan de Testing - CapyCad CAD Web Application

## Descripción General

Este documento describe la estrategia de testing, estructura de archivos de prueba, convenciones y guías para ejecutar y mantener los tests unitarios del proyecto CapyCad.

---

## Stack de Testing

| Herramienta                     | Versión | Propósito                                     |
| ------------------------------- | ------- | --------------------------------------------- |
| **Vitest**                      | 1.5.2   | Test runner con integración Vite, soporte HMR |
| **@testing-library/react**      | 15.0.2  | Testing de componentes React y hooks          |
| **@testing-library/jest-dom**   | 6.4.2   | Matchers extendidos para assertions DOM       |
| **@testing-library/user-event** | 14.5.2  | Simulación de interacciones de usuario        |
| **@vitest/coverage-v8**         | 1.5.2   | Reporte de cobertura con provider V8          |
| **jsdom**                       | 24.0.0  | Simulación de entorno browser en Node.js      |

---

## Estructura de Archivos de Test

```
apps/web/src/
├── test/
│   └── setup.ts                     # Configuración global de tests
├── stores/
│   ├── __tests__/
│   │   ├── sketchStore.test.ts      # Tests del store 2D
│   │   ├── featureStore.test.ts     # Tests del store 3D
│   │   └── renderStore.test.ts      # Tests del store de renderizado
├── lib/
│   ├── sketch/
│   │   ├── __tests__/
│   │   │   └── geometry.test.ts     # Tests de utilidades matemáticas
│   │   ├── constraints/
│   │   │   └── __tests__/
│   │   │       └── constraintSolver.test.ts
│   │   └── tools/
│   │       └── __tests__/
│   │           ├── LineTool.test.ts
│   │           ├── CircleTool.test.ts
│   │           └── RectangleTool.test.ts
│   ├── cad/
│   │   └── __tests__/
│   │       └── cadWorkerClient.test.ts  # Tests de comunicación Worker
│   ├── export/
│   │   └── __tests__/
│   │       ├── stlExporter.test.ts      # Export STL
│   │       ├── m3fExporter.test.ts      # Export M3F
│   │       └── modelExporter.test.ts    # Export OBJ
│   ├── import/
│   │   └── __tests__/
│   │       └── modelImporter.test.ts    # Import STL/OBJ
│   ├── materials/
│   │   └── __tests__/
│   │       └── materialPresets.test.ts  # Materiales PBR
│   ├── pattern/
│   │   └── __tests__/
│   │       └── patternEngine.test.ts    # Patrones
│   └── project/
│       └── __tests__/
│           └── projectSerializer.test.ts # Proyecto .stlm
└── hooks/
    └── __tests__/
        ├── useCADWorker.test.ts     # Tests de hooks CAD Worker
        └── useAutoSave.test.ts      # Tests de hook Auto Save
```

**Convención**: Los archivos de test se ubican en carpetas `__tests__/` junto al código que prueban.

---

## Cobertura de Tests

### Tests Implementados

| Módulo                    | Archivo                     | Suites | Casos | Estado |
| ------------------------- | --------------------------- | ------ | ----- | ------ |
| Store 2D                  | `sketchStore.test.ts`       | 9      | 17    | ✅     |
| Store 3D                  | `featureStore.test.ts`      | 10     | 29    | ✅     |
| Store Render              | `renderStore.test.ts`       | 10     | 62    | ✅     |
| Utilidades                | `geometry.test.ts`          | 7      | 25    | ✅     |
| Herramienta Línea         | `LineTool.test.ts`          | 7      | 17    | ✅     |
| Herramienta Círculo       | `CircleTool.test.ts`        | 7      | 17    | ✅     |
| Herramienta Rectángulo    | `RectangleTool.test.ts`     | 7      | 18    | ✅     |
| CAD Worker Client         | `cadWorkerClient.test.ts`   | 12     | 50    | ✅     |
| Hook CAD Worker           | `useCADWorker.test.ts`      | 5      | 7     | ✅     |
| Hook Auto Save            | `useAutoSave.test.ts`       | 3      | 8     | ✅     |
| Export STL (US-006)       | `stlExporter.test.ts`       | 3      | 17    | ✅     |
| Export M3F                | `m3fExporter.test.ts`       | 3      | 18    | ✅     |
| Proyecto .stlm (US-007)   | `projectSerializer.test.ts` | 6      | 42    | ✅     |
| Materiales PBR (US-015)   | `materialPresets.test.ts`   | 4      | 21    | ✅     |
| Export OBJ (US-013)       | `modelExporter.test.ts`     | 3      | 11    | ✅     |
| Import STL/OBJ (US-014)   | `modelImporter.test.ts`     | 4      | 16    | ✅     |
| Restricciones (US-009)    | `constraintSolver.test.ts`  | 11     | 32    | ✅     |
| Patrones (US-011)         | `patternEngine.test.ts`     | 4      | 23    | ✅     |
| Vector extrusión (US-004) | `extrusionUtils.test.ts`    | 4      | 10    | ✅     |

**Total**: 19 archivos, 111+ test suites, 440 test cases

### Objetivos de Cobertura

- **Stores**: 100% (crítico para gestión de estado)
- **Utilidades**: 100% (funciones matemáticas puras)
- **Herramientas**: ≥ 90% (workflows de dibujo)
- **Workers/Hooks**: ≥ 90% (comunicación async)
- **Overall**: ≥ 80%

---

## Comandos de Testing

### Ejecutar Todos los Tests

```bash
pnpm test
```

Ejecuta todos los tests en modo watch (desarrollo).

### Ejecutar Tests Una Vez (CI)

```bash
pnpm test:run
```

Ejecuta todos los tests una sola vez sin modo watch.

### Generar Reporte de Cobertura

```bash
pnpm test:coverage
```

Genera reporte de cobertura en:

- Terminal (text reporter)
- `coverage/index.html` (HTML interactivo)
- `coverage/coverage-final.json` (JSON para CI)

### Ejecutar Tests Específicos

```bash
# Por nombre de archivo
pnpm test sketchStore

# Por patrón
pnpm test __tests__/

# Por test suite
pnpm test -t "should create sketch"
```

---

## Estrategias de Mocking

### 1. Module Mocks (vi.mock)

Usado para mockear módulos completos:

```typescript
// featureStore.test.ts
vi.mock('@/lib/cad/cadWorkerClient', () => ({
  getCADWorkerClient: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    extrude: vi.fn().mockResolvedValue({
      vertices: new Float32Array([
        /* ... */
      ]),
      indices: new Uint32Array([
        /* ... */
      ]),
      // ...
    }),
  })),
}));
```

**Cuándo usar**: Dependencias externas complejas (workers, APIs, librerías pesadas).

### 2. Method Spies (vi.spyOn)

Usado para verificar llamadas a métodos:

```typescript
// featureStore.test.ts
const disposeSpy = vi.spyOn(geometry, 'dispose');
store.deleteFeature(featureId);
expect(disposeSpy).toHaveBeenCalled();
```

**Cuándo usar**: Verificar side effects (cleanup, dispose, logs).

### 3. Web Worker Mock

Custom mock class para simular Worker API:

```typescript
// cadWorkerClient.test.ts
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;

  postMessage(data: any) {
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(
          new MessageEvent('message', {
            data: { type: 'initialized', success: true },
          })
        );
      }
    }, 10);
  }

  terminate() {}
}
```

**Cuándo usar**: Testing de comunicación async con Web Workers.

### 4. Hook Testing (renderHook)

Usado para testear custom hooks:

```typescript
// useCADWorker.test.ts
import { renderHook, waitFor } from '@testing-library/react';

const { result } = renderHook(() => useCADWorker());

await waitFor(() => {
  expect(result.current.isInitialized).toBe(true);
});
```

**Cuándo usar**: Hooks personalizados con efectos o estado.

---

## Convenciones de Testing

### Nomenclatura de Tests

Seguir patrón **Behavior-Driven**:

```typescript
describe('createSketch', () => {
  it('should create a new sketch with unique ID', () => {
    // ...
  });

  it('should set sketch as active when created', () => {
    // ...
  });
});
```

- `describe`: Agrupa tests relacionados (por método/funcionalidad)
- `it/test`: Describe comportamiento esperado en lenguaje natural
- Usar "should" para claridad: `should return X when Y`

### Estructura AAA (Arrange-Act-Assert)

```typescript
it('should add entity to sketch', () => {
  // Arrange: Preparar estado inicial
  const store = useSketchStore.getState();
  store.createSketch();
  const entity: SketchEntity = {
    id: 'test-line',
    type: 'line',
    // ...
  };

  // Act: Ejecutar acción
  store.addEntity(entity);

  // Assert: Verificar resultado
  const state = useSketchStore.getState();
  expect(state.entities).toHaveLength(1);
  expect(state.entities[0]).toEqual(entity);
});
```

### Aislamiento de Tests (beforeEach/afterEach)

```typescript
describe('SketchStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSketchStore.setState({
      sketches: [],
      activeSketchId: null,
      entities: [],
      // ...
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Tests aquí...
});
```

**Importante**: Cada test debe ser independiente y no depender del orden de ejecución.

### Testing de Operaciones Asíncronas

Usar `async/await` con `waitFor` para operaciones async:

```typescript
it('should initialize CAD worker', async () => {
  const { result } = renderHook(() => useCADWorker());

  // Wait for async initialization
  await waitFor(
    () => {
      expect(result.current.isInitialized).toBe(true);
    },
    { timeout: 3000 }
  );

  expect(result.current.error).toBeNull();
});
```

### Testing de Precisión Numérica

Usar `toBeCloseTo` para comparaciones de floats:

```typescript
it('should calculate distance correctly', () => {
  const d = distance({ x: 0, y: 0 }, { x: 3, y: 4 });

  // Don't use toBe(5) for floats
  expect(d).toBeCloseTo(5, 5); // 5 decimales de precisión
});
```

---

## Casos de Prueba por Categoría

### 1. Tests de Stores (State Management)

**Objetivo**: Verificar gestión de estado global, inmutabilidad, historial.

Casos cubiertos:

- ✅ CRUD básico (create, read, update, delete)
- ✅ Undo/Redo con múltiples operaciones
- ✅ Selección y navegación
- ✅ Limpieza de historial tras nueva operación
- ✅ IDs únicos y generación automática
- ✅ Side effects (dispose de geometrías)

### 2. Tests de Utilidades (Pure Functions)

**Objetivo**: Verificar cálculos matemáticos y transformaciones.

Casos cubiertos:

- ✅ Cálculo de distancias (including triángulo 3-4-5)
- ✅ Snap to grid con diferentes tamaños
- ✅ Conversión bidireccional canvas ↔ world
- ✅ Cálculo de punto medio
- ✅ Ángulos en radianes y grados
- ✅ Búsqueda de punto más cercano
- ✅ Edge cases: puntos idénticos, arrays vacíos, coordenadas negativas

### 3. Tests de Herramientas (Workflows)

**Objetivo**: Verificar flujo de interacción usuario (clicks, preview, reset).

Casos cubiertos:

- ✅ Workflow de dos clicks (line)
- ✅ Workflow centro-radio (circle)
- ✅ Workflow esquina-a-esquina (rectangle)
- ✅ Generación de preview dinámico
- ✅ Estado isActive durante interacción
- ✅ Reset y cancel operations
- ✅ Edge cases: zero-length line, zero-radius circle, zero-size rectangle
- ✅ IDs únicos por entidad creada

### 4. Tests de Workers y Hooks

**Objetivo**: Verificar comunicación async, inicialización, manejo de errores.

Casos cubiertos:

- ✅ Inicialización del worker
- ✅ Prevención de reinicialización
- ✅ Operaciones de extrusión (todas las direcciones)
- ✅ Manejo de errores (not initialized, wire failure)
- ✅ Patrón singleton
- ✅ Cleanup de recursos (terminate)
- ✅ Auto-inicialización en hooks
- ✅ Transiciones de estado (not initialized → initializing → initialized)
- ✅ Limpieza en unmount

---

## Agregar Nuevos Tests

### Paso 1: Crear Archivo de Test

```bash
# Ejemplo: nuevo test para ArcTool
touch apps/web/src/lib/sketch/tools/__tests__/ArcTool.test.ts
```

### Paso 2: Estructura Básica

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ArcTool } from '../ArcTool';
import type { Point, SketchEntity } from '@/types/sketch';

describe('ArcTool', () => {
  let tool: ArcTool;

  beforeEach(() => {
    tool = new ArcTool();
  });

  describe('handleClick', () => {
    it('should start arc on first click', () => {
      const point: Point = { x: 0, y: 0 };
      tool.handleClick(point);

      expect(tool.isActive()).toBe(true);
    });
  });

  // Más tests...
});
```

### Paso 3: Ejecutar Nuevo Test

```bash
pnpm test ArcTool
```

### Paso 4: Actualizar Este Documento

Agregar fila en tabla "Tests Implementados" con estado ✅.

---

## Debugging de Tests

### Modo Watch con UI

```bash
pnpm test --ui
```

Abre interfaz web interactiva para navegar tests y ver resultados.

### Ver Output Detallado

```bash
pnpm test --reporter=verbose
```

### Debugging en VS Code

Agregar configuración de launch en `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["test", "--run", "--no-coverage"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

Colocar breakpoints y ejecutar "Debug Vitest Tests".

---

## Integración Continua (CI)

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm test:run
      - run: pnpm test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Referencias

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [Mocking in Vitest](https://vitest.dev/guide/mocking.html)
- [Testing Zustand Stores](https://docs.pmnd.rs/zustand/guides/testing)

---

## Changelog de Tests

### 2024-01-XX - Test Suite Inicial

- ✅ Implementados 9 archivos de test (~160+ casos)
- ✅ Cobertura completa de stores (sketchStore, featureStore)
- ✅ Cobertura completa de utilidades (geometry.ts)
- ✅ Cobertura de herramientas 2D (Line, Circle, Rectangle)
- ✅ Tests de comunicación Worker (CAD Worker Client)
- ✅ Tests de hooks (useCADWorker)
- ✅ Setup de test environment (matchers, cleanup, mocks)
- ✅ Configuración de coverage reporters

### 2024-XX-XX - US-010 Shell + US-012 Sweep/Loft

- ✅ 16 tests nuevos en `cadWorkerClient.test.ts` (Shell ×5, Sweep ×5, Loft ×6)
- ✅ Corrección de tipos SketchEntityType en todos los mocks del test (string enum fix)
- ✅ `ShellPanel` UI en PropertiesPanel.tsx (visible al seleccionar EXTRUDE)
- ✅ `SweepLoftCreator` UI en estado sin selección de PropertiesPanel.tsx
- ✅ `createShell`, `createSweep`, `createLoft` en featureStore
- ✅ Worker: `executeShell`, `executeSweep`, `executeLoft` con OCC API
- ✅ Total: **313 tests** en 15 archivos (antes: 297)

### 2024-XX-XX - Revolve + Boolean + Fix Auto-Select

- ✅ Fix UX: auto-switch a 'select' tras dibujar entidad en SketchEditor
- ✅ Worker: `executeRevolve` (BRepPrimAPI_MakeRevol con gp_Ax1 X/Y/Z)
- ✅ Worker: `executeBoolean` (BRepAlgoAPI_Fuse / Cut / Common)
- ✅ Worker: `case 'revolve'` + `case 'boolean'` en switch handler
- ✅ Client: métodos `revolve(entities, axis, angle)` + `booleanOp(..., operation)`
- ✅ featureStore: `createRevolve` + `createBoolean` → `RevolveFeature` + `BooleanFeature`
- ✅ `RevolvePanel` UI standalone en estado sin selección (eje X/Y/Z + ángulo)
- ✅ `BooleanPanel` UI en EXTRUDE seleccionado (unión/resta/intersección + herramienta)
- ✅ Badge de tipo `BOOLEAN` en FeatureProperties
- ✅ 13 tests nuevos en `cadWorkerClient.test.ts` (Revolve ×7, Boolean ×6)
- ✅ Total: **326 tests** en 15 archivos (antes: 313)

---

**Última actualización**: 2024-01-XX  
**Mantenedores**: CapyCad Team  
**Versión**: 1.0.0
