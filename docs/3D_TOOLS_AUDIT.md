# Informe de Implementación — Herramientas 3D

**Fecha:** 2026-04-06
**Alcance:** Todas las herramientas 3D expuestas en la barra `Toolbar3D` y `ToolbarBoolean`.
**Fuente del audit:**
- UI: [apps/web/src/components/toolbar/Toolbar3D.tsx](apps/web/src/components/toolbar/Toolbar3D.tsx), [apps/web/src/components/toolbar/Tool3DDialogs.tsx](apps/web/src/components/toolbar/Tool3DDialogs.tsx), [apps/web/src/components/toolbar/ToolbarBoolean.tsx](apps/web/src/components/toolbar/ToolbarBoolean.tsx)
- Store: [apps/web/src/stores/featureStore.ts](apps/web/src/stores/featureStore.ts)
- Worker client: [apps/web/src/lib/cad/cadWorkerClient.ts](apps/web/src/lib/cad/cadWorkerClient.ts)
- Worker OCC: [apps/web/src/workers/cad.worker.ts](apps/web/src/workers/cad.worker.ts)
- Tests: [apps/web/src/stores/__tests__/featureStore.test.ts](apps/web/src/stores/__tests__/featureStore.test.ts), [apps/web/src/lib/cad/__tests__/cadWorkerClient.test.ts](apps/web/src/lib/cad/__tests__/cadWorkerClient.test.ts)

---

## 1. Resumen ejecutivo

Hay **17 operaciones 3D** repartidas en tres familias:

| Familia | Cantidad | Estado global |
|---|---|---|
| Features generativas (sketch → sólido) | 4 (Extrude, Revolve, Sweep, Loft) | 🟢 OK · ⚠️ Loft hardcodeado |
| Modificadores (sólido → sólido) | 7 (Fillet, Chamfer, Shell, Draft, Offset, Patrón Lineal, Patrón Circular) | 🟡 OK pero acoplado a EXTRUDE |
| Primitivas paramétricas | 5 (Box, Sphere, Cylinder, Cone, Torus) | 🟢 OK |
| Booleanas (binaria sólido + sólido) | 1 (Union/Subtract/Intersect) | 🟢 OK (con UI dedicada) |

**Pipeline común verificado:** botón → handler en `Toolbar3D` → diálogo en `Tool3DDialogs` → acción en `featureStore` → `cadWorkerClient` → `cad.worker` (`execute*` con OpenCascade) → `BufferGeometry` → `addFeature`.

**Cobertura de tests:** 547/547 pasan. Tests por operación en `cadWorkerClient.test.ts` cubren Extrude, Fillet, Chamfer, Shell, Sweep, Loft, Revolve, Boolean, Draft, Offset (10/10 pipelines de OCC). Las 5 primitivas no tienen tests dedicados en el cliente del worker.

---

## 2. Matriz de implementación

Convenciones: ✅ implementado · ⚠️ implementado con limitación · ❌ falta · — no aplica

| # | Herramienta | Botón UI | Diálogo | Handler | Store action | Worker case | OCC `execute*` | Tests cliente | Tests store | Notas |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Extrude** | ✅ | `ExtrudeDialog` | `handleExtrude` | `createExtrude` | `extrude` | `executeExtrude` | ✅ (Extrusión + errores) | ✅ (éxito + error) | Pipeline base, referencia para el resto |
| 2 | **Revolve** | ✅ | `RevolveDialog` | `handleRevolve` | `createRevolve` | `revolve` | `executeRevolve` | ✅ (Revolve) | ❌ | Eje X/Y/Z, ángulo en grados |
| 3 | **Sweep** | ✅ | `SweepDialog` | `handleSweep` | `createSweep` | `sweep` | `executeSweep` | ✅ (Sweep) | ❌ | Trayectoria como `pathPoints[]` poligonal |
| 4 | **Loft** | ✅ | `LoftDialog` | `handleLoft` | `createLoft` | `loft` | `executeLoft` | ✅ (Loft) | ❌ | ⚠️ **El handler ignora el sketch**; ver §4.1 |
| 5 | **Fillet** | ✅ | `FilletDialog` | `handleFillet` | `createFillet` | `fillet` | `executeFillet` | ✅ (Fillet + errores) | ❌ | Aplica a TODAS las aristas; sin selección por arista |
| 6 | **Chamfer** | ✅ | `ChamferDialog` | `handleChamfer` | `createChamfer` | `chamfer` | `executeChamfer` | ✅ (Chamfer + errores) | ❌ | Igual que Fillet, todas las aristas |
| 7 | **Shell** | ✅ | `ShellDialog` | `handleShell` | `createShell` | `shell` | `executeShell` | ✅ (Shell) | ❌ | Cara superior detectada por mayor Z medio |
| 8 | **Draft** | ✅ | `DraftDialog` | `handleDraft` | `createDraft` | `draft` | `executeDraft` | ✅ (Draft) | ❌ | Plano neutro fijo en Z=0; fallback a base si falla |
| 9 | **Offset** | ✅ | `OffsetDialog` | `handleOffset` | `createOffset` | `offset` | `executeOffset` | ✅ (Offset) | ❌ | Fallback a base si OCC no converge |
| 10 | **Patrón Lineal** | ✅ | `LinearPatternDialog` | `handleLinearPattern` | `createLinearPattern` | — | — (pure JS) | ❌ | ❌ | Replica geometría con `mergePatternGeometries`, **no usa OCC** |
| 11 | **Patrón Circular** | ✅ | `CircularPatternDialog` | `handleCircularPattern` | `createCircularPattern` | — | — (pure JS) | ❌ | ❌ | Igual que lineal, transformaciones en Three.js |
| 12 | **Box** | ✅ | `BoxDialog` | `handlePrimitiveBox` | `createPrimitiveBox` | `primitive_box` | `executePrimitiveBox` | ❌ | ❌ | Click-to-place + `OrientationSelector` |
| 13 | **Sphere** | ✅ | `SphereDialog` | `handlePrimitiveSphere` | `createPrimitiveSphere` | `primitive_sphere` | `executePrimitiveSphere` | ❌ | ❌ | Click-to-place |
| 14 | **Cylinder** | ✅ | `CylinderDialog` | `handlePrimitiveCylinder` | `createPrimitiveCylinder` | `primitive_cylinder` | `executePrimitiveCylinder` | ❌ | ❌ | Eje Y-up |
| 15 | **Cone** | ✅ | `ConeDialog` | `handlePrimitiveCone` | `createPrimitiveCone` | `primitive_cone` | `executePrimitiveCone` | ❌ | ❌ | Cono truncado (radio sup/inf separados) |
| 16 | **Torus** | ✅ | `TorusDialog` | `handlePrimitiveTorus` | `createPrimitiveTorus` | `primitive_torus` | `executePrimitiveTorus` | ❌ | ❌ | Eje Y-up |
| 17 | **Boolean** | ✅ (toolbar dedicada) | `BooleanDialog` | en `ToolbarBoolean` | `createBoolean` | `boolean` | `executeBoolean` | ✅ (Boolean) | ✅ (integration `ToolbarBoolean.integration.test.tsx`) | Solo permite EXTRUDEs; bug de estado obsoleto resuelto en fase previa |

---

## 3. Análisis transversal

### 3.1 UX común
- **Validación pre-diálogo** vía dos helpers en `Toolbar3D`:
  - `requireSketch()` — usado por Extrude/Revolve/Sweep. Bloquea si no hay sketch activo con entidades.
  - `requireSelectedFeature()` — usado por Fillet/Chamfer/Shell/Draft/Offset/Patrones. Bloquea si no hay feature seleccionada.
- **Click-to-place** para las 5 primitivas: `startPlacement(action)` → click en canvas → `confirmPlacement(pos)` → `useEffect` abre el diálogo automáticamente con `placementPosition` ya seteado. El cierre del diálogo invoca `cancelPlacement()` para limpiar estado.
- **Orientación**: `OrientationSelector` (6 presets) presente en los 5 diálogos de primitivas; setea `placementRotation` que viaja al `feature.rotation`.
- **Feedback de error**: todos los handlers usan `try/catch` + `console.error` + `alert(...)`. Inconsistente con el resto del producto (no hay sistema de toasts unificado).

### 3.2 Indicador de progreso
Todas las acciones de `featureStore` que llaman al worker setean `isProcessing: true` y van actualizando `processingProgress` en pasos 0 → 30 → 50 → 80 → 90 → 100. Los botones consumen `isProcessing` para mostrar `cursor-wait`/`opacity-50` y `disabled`. Patrones lineal/circular **no** usan este indicador (operación síncrona en JS, lo cual es correcto pero inconsistente si las geometrías son grandes).

### 3.3 Layout vertical/horizontal
`Toolbar3D` consume `usePanelOrientation()` y conmuta a layout vertical (icono + label) cuando está dockeada en panel lateral. Verificado en fase previa.

### 3.4 Inicialización OpenCascade
La estrategia diferida (prefetch de WASM + `triggerInit` en idle + overlay solo en modo 3D) implementada en fases previas sigue vigente. Las 17 operaciones se benefician automáticamente porque todas pasan por `worker.initialize()` en el store.

---

## 4. Hallazgos y deudas técnicas

### 4.1 ⚠️ CRÍTICO — `handleLoft` ignora el sketch del usuario
Archivo: [apps/web/src/components/toolbar/Toolbar3D.tsx](apps/web/src/components/toolbar/Toolbar3D.tsx#L182-L201)

El handler **hardcodea dos secciones circulares** (radio 10 y `topRadius` parametrizable) en vez de tomar las entidades del sketch activo o permitir al usuario seleccionar varios sketches como secciones. El backend (`createLoft`, `executeLoft`) está completo y soporta N secciones arbitrarias; la limitación es 100% del lado de la UI.

**Acción sugerida:** rediseñar `LoftDialog` para listar sketches del proyecto y permitir asignar `zOffset` a cada uno, o como mínimo construir las secciones desde `activeSketch.entities`.

### 4.2 ⚠️ Modificadores acoplados rígidamente a `FeatureType.EXTRUDE`
Archivos: `featureStore.ts` líneas de `createFillet`, `createChamfer`, `createShell`, `createDraft`, `createOffset`.

Cada uno hace:
```ts
const sourceFeature = features.find(
  (f): f is ExtrudeFeature => f.id === sourceFeatureId && f.type === FeatureType.EXTRUDE
);
if (!sourceFeature) throw new Error(`Source extrude feature not found: ${sourceFeatureId}`);
```

Y reconstruye la geometría desde `entities + distance + direction` en el worker (`buildExtrudedShape`) en lugar de operar sobre el sólido ya generado. Consecuencias:

1. Si el usuario selecciona una primitiva, una revolve, un sweep, otro fillet o un boolean → **error duro** lanzado al hacer click sobre el botón habilitado (`requireSelectedFeature` no valida tipo, sólo presencia).
2. Imposible encadenar modificadores (fillet sobre un fillet, chamfer sobre una primitiva, shell sobre un boolean…).
3. Re-ejecuta la extrusión completa cada vez (coste duplicado).

**Acción sugerida:** persistir el `TopoDS_Shape` o un handle serializable del worker, y aceptar cualquier feature 3D como `sourceFeature`. A nivel UI, deshabilitar el botón si la feature seleccionada no es modificable (en lugar del `alert`).

### 4.3 ⚠️ Fillet/Chamfer aplican a TODAS las aristas
Archivos: `executeFillet` y `executeChamfer` en `cad.worker.ts`.

Recorren `TopExp_Explorer` sobre todas las aristas y aplican el redondeo/bisel a cada una. No hay selección de aristas en el UI, por lo que un cubo siempre queda con todas las aristas redondeadas. La definición de `FilletFeature.edges` y `ChamferFeature.edges` ya prevé selección parcial — solo falta cablear UI + worker.

### 4.4 ⚠️ Shell asume que la cara superior es la de mayor Z medio
Archivo: `executeShell` en `cad.worker.ts`. Funciona para extrusiones simples en plano XY pero falla con orientaciones arbitrarias o sólidos rotados. Razonable como heurística inicial; documentar la limitación y eventualmente permitir selección de cara.

### 4.5 ⚠️ Draft con plano neutro fijo en Z=0 / dirección Z
Archivo: `executeDraft`. Idéntico problema conceptual: solo válido para extrusiones XY. La UI ofrece selector `neutralPlane` (XY/XZ/YZ) que **no se usa** en el worker (sólo se persiste en el feature).

### 4.6 ⚠️ Patrones no operan en OCC
Archivos: `createLinearPattern`, `createCircularPattern` en `featureStore.ts`. Usan `mergePatternGeometries` (Three.js, sin booleana). Cada copia es un `BufferGeometry` independiente fusionado: si las copias se solapan, no se hace `union` real → triángulos duplicados que rompen el cálculo de volumen, exportación a STL/STEP estanco, etc.

### 4.7 UX — `alert(...)` en lugar de toasts/notificaciones
17 `alert(...)` en `Toolbar3D.tsx`. Bloqueante, no localizable, fuera del DS. Reemplazar por un sistema de toast (la app ya tiene `data-testid="cad-init-toast"` en `App.tsx` — extender el patrón).

### 4.8 UX — Botones de modificadores se ven habilitados aunque sean inválidos
En `Toolbar3D.tsx` se usa `opacity-40` cuando `tool.needsFeature && !selectedFeatureId`, pero el `onClick` sigue activo y simplemente lanza el `alert`. Debería ser `disabled={true}` con `title` explicativo.

### 4.9 Cobertura de tests irregular
- ✅ Cliente del worker: 10/15 operaciones tienen `describe` propio.
- ❌ Sin tests para las 5 primitivas a nivel de cliente.
- ❌ Sin tests para Patrones a ningún nivel.
- ❌ `featureStore.test.ts` solo cubre Extrude (creación + error). Faltan los 15 restantes.
- ✅ Único test de integración UI 3D: `ToolbarBoolean.integration.test.tsx`.

### 4.10 Documentación desactualizada
[docs/EXTRUSION_3D.md](docs/EXTRUSION_3D.md) (v0.2.0) lista Revolve, Fillet y Chamfer en *“Próximas Mejoras”*, pero los tres están implementados con tests. Reescribir en línea con este audit o redirigir desde allí a este informe.

---

## 5. Plan de mejora sugerido (ordenado por valor / esfuerzo)

| Prioridad | Tarea | Impacto | Esfuerzo |
|---|---|---|---|
| **P0** | Reemplazar `handleLoft` hardcodeado por flujo basado en sketches del proyecto (§4.1) | Alto | M |
| **P0** | Validar tipo de feature en `requireSelectedFeature` y deshabilitar botón si no aplica (§4.2 + §4.8) | Alto | S |
| **P1** | Permitir modificadores sobre cualquier feature 3D, no solo Extrude (§4.2) | Alto | L |
| **P1** | Reemplazar `alert(...)` por sistema de toast unificado (§4.7) | Medio | S |
| **P1** | Tests de `createRevolve`, `createSweep`, `createLoft`, `createFillet`, `createChamfer`, `createShell`, `createDraft`, `createOffset`, `createBoolean`, `createLinearPattern`, `createCircularPattern` y las 5 primitivas en `featureStore.test.ts` (§4.9) | Alto | M |
| **P2** | Selección de aristas para Fillet/Chamfer (§4.3) | Medio | L |
| **P2** | Patrones con booleana real (union de copias) o documentar limitación (§4.6) | Medio | M |
| **P2** | Selección de cara para Shell (§4.4) y plano neutro real para Draft (§4.5) | Medio | M |
| **P3** | Actualizar [docs/EXTRUSION_3D.md](docs/EXTRUSION_3D.md) o reemplazarlo por este informe (§4.10) | Bajo | S |
| **P3** | Tests de cliente del worker para las 5 primitivas (§4.9) | Bajo | S |

---

## 6. Conclusión

El **andamiaje completo** de las 17 herramientas está en su sitio: cada una tiene UI, diálogo, handler, store action, mensaje de worker e implementación OCC (o JS para Patrones). Compila, pasa los 547 tests y la inicialización diferida de OCC funciona correctamente.

Los riesgos reales se concentran en cuatro áreas:

1. **Loft no usa el sketch** (regresión funcional encubierta).
2. **Modificadores solo encadenables sobre Extrude** (limita drásticamente el flujo de modelado).
3. **Patrones sin booleana** (geometría no estanca al solapar copias).
4. **Cobertura de tests muy desigual** (la ergonomía actual hace difícil detectar regresiones más allá de Extrude/Boolean).

Resolver P0 + P1 dejaría el stack 3D listo para uso real más allá de demos.
