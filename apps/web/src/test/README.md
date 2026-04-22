# Tests Unitarios - STL Model Web App

Esta carpeta contiene la configuración global para todos los tests unitarios del proyecto.

## Inicio Rápido

```bash
# Ejecutar todos los tests en modo watch
pnpm test

# Ejecutar tests una vez (CI)
pnpm test:run

# Generar reporte de cobertura
pnpm test:coverage

# Abrir interfaz UI de Vitest
pnpm test:ui
```

## Archivos en Este Directorio

### `setup.ts`

Configuración global que se ejecuta antes de todos los tests:

- Extiende `expect` con matchers de `@testing-library/jest-dom`
- Configura cleanup automático después de cada test
- Mockea APIs del browser (matchMedia, ResizeObserver)

```typescript
// Ejemplos de matchers disponibles:
expect(element).toBeInTheDocument();
expect(element).toHaveClass('active');
expect(element).toHaveTextContent('Hello');
```

## Convenciones de Testing

### Ubicación de Tests

Los tests se ubican en carpetas `__tests__/` junto al código que prueban:

```
src/
├── stores/
│   ├── sketchStore.ts
│   └── __tests__/
│       └── sketchStore.test.ts
├── lib/
│   ├── sketch/
│   │   ├── geometry.ts
│   │   └── __tests__/
│   │       └── geometry.test.ts
└── hooks/
    ├── useCADWorker.ts
    └── __tests__/
        └── useCADWorker.test.ts
```

### Nomenclatura

- **Archivos**: `NombreModulo.test.ts` o `NombreModulo.test.tsx`
- **Test suites**: `describe('moduleName', () => { ... })`
- **Test cases**: `it('should do something when condition', () => { ... })`

### Estructura AAA

```typescript
it('should add entity to sketch', () => {
  // Arrange: Preparar datos de entrada
  const entity = { id: '1', type: 'line', ... };

  // Act: Ejecutar acción
  store.addEntity(entity);

  // Assert: Verificar resultado
  expect(store.entities).toHaveLength(1);
});
```

### Aislamiento

```typescript
describe('MyStore', () => {
  beforeEach(() => {
    // Reset state antes de cada test
    useMyStore.setState(initialState);
  });

  afterEach(() => {
    // Limpiar mocks
    vi.clearAllMocks();
  });
});
```

## Mocking Strategies

### Module Mocks

```typescript
vi.mock('@/lib/cad/cadWorkerClient', () => ({
  getCADWorkerClient: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    extrude: vi.fn().mockResolvedValue(mockGeometry),
  })),
}));
```

### Method Spies

```typescript
const disposeSpy = vi.spyOn(geometry, 'dispose');
store.deleteFeature('feature-1');
expect(disposeSpy).toHaveBeenCalled();
```

### Hook Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';

const { result } = renderHook(() => useMyHook());

await waitFor(() => {
  expect(result.current.isReady).toBe(true);
});
```

## Cobertura Actual

- **Stores**: 100% (sketchStore, featureStore)
- **Utilidades**: 100% (geometry.ts)
- **Herramientas**: ~95% (LineTool, CircleTool, RectangleTool)
- **Workers**: ~90% (CAD Worker Client)
- **Hooks**: ~90% (useCADWorker)

Ver [TEST_PLAN.md](../../../../docs/TEST_PLAN.md) para detalles completos.

## Referencias

- [Vitest Docs](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
