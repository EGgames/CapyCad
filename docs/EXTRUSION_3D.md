# 🎯 Sistema de Extrusión 3D - Guía Completa

Documentación técnica del sistema de extrusión y operaciones CAD 3D de CapyCad.

---

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Flujo de Trabajo](#flujo-de-trabajo)
- [Arquitectura](#arquitectura)
- [Uso del Usuario](#uso-del-usuario)
- [API Técnica](#api-técnica)
- [Troubleshooting](#troubleshooting)

---

## 🎨 Descripción General

El sistema de extrusión permite convertir sketches 2D en sólidos 3D mediante operaciones CAD estándar. Utiliza **OpenCascade.js** ejecutado en un Web Worker para no bloquear la UI durante operaciones pesadas.

### Características Principales

- ✅ **Extrusión lineal** con dirección positiva, negativa o ambas
- ✅ **Web Worker** para operaciones CAD sin bloquear UI
- ✅ **Triangulación automática** para renderizado en Three.js
- ✅ **Feature Tree** jerárquico (Sketch → Extrusión → Fillet, etc.)
- ✅ **Propiedades editables** en tiempo real
- ✅ **Historial undo/redo** para operaciones 3D
- ✅ **Visibilidad y supresión** de features

### Tecnologías

| Componente       | Tecnología                             |
| ---------------- | -------------------------------------- |
| CAD Kernel       | OpenCascade.js 2.3.0                   |
| Web Worker       | Worker API + ES Modules                |
| State Management | Zustand 4.5+                           |
| 3D Rendering     | Three.js r165 + react-three-fiber      |
| Geometría        | BufferGeometry con normales calculadas |

---

## 🔄 Flujo de Trabajo

### 1. Usuario dibuja Sketch 2D

```
Usuario crea Sketch →
  Dibuja líneas, círculos, rectángulos →
    Entidades almacenadas en sketchStore
```

### 2. Usuario ejecuta Extrusión

```
Click en botón "Extruir" (toolbar) →
  Validación: ¿Hay sketch activo con entidades? →
    Distancia por defecto: 10mm →
      featureStore.createExtrude() llamado
```

### 3. Procesamiento en Web Worker

```
CAD Worker Client envía mensaje al worker →
  Worker: Convierte SketchEntity[] a TopoDS_Wire →
    Worker: BRepBuilderAPI_MakeFace crea face →
      Worker: BRepPrimAPI_MakePrism ejecuta extrusión →
        Worker: BRepMesh_IncrementalMesh triangula →
          Retorna: { positions, normals, indices }
```

### 4. Renderizado en Canvas3D

```
featureStore recibe geometryData →
  Crea BufferGeometry de Three.js →
    Calcula normales correctas con computeVertexNormals() →
      Agrega feature al árbol →
        Canvas3D renderiza mesh con material PBR →
          Usuario ve sólido 3D ✨
```

---

## 🏗️ Arquitectura

### Componentes Clave

#### 1. **CAD Worker** (`workers/cad.worker.ts`)

Web Worker que ejecuta OpenCascade.js de forma aislada.

**Responsabilidades:**

- Inicializar OpenCascade.js (solo una vez)
- Convertir entidades 2D a geometría OpenCascade
- Ejecutar operaciones CAD (extrude, revolve, fillet, etc.)
- Triangular geometría resultante
- Retornar buffers para Three.js

**Mensajes soportados:**

```typescript
{ type: 'init', payload: null }
{ type: 'extrude', payload: { entities, distance, direction } }
```

**Respuestas:**

```typescript
{ id, type, success: true, geometry?: GeometryData }
{ id, type, success: false, error: string }
```

#### 2. **CAD Worker Client** (`lib/cad/cadWorkerClient.ts`)

Wrapper para comunicación con el worker desde el thread principal.

**Métodos principales:**

```typescript
class CADWorkerClient {
  async initialize(): Promise<void>
  async extrude(entities, distance, direction): Promise<GeometryData>
  terminate(): void
}

getCADWorker(): CADWorkerClient  // Singleton
```

**Uso:**

```typescript
import { getCADWorker } from '@/lib/cad/cadWorkerClient';

const worker = getCADWorker();
await worker.initialize();
const geometryData = await worker.extrude(entities, 10, 'positive');
```

#### 3. **Feature Store** (`stores/featureStore.ts`)

Estado global de features 3D con Zustand.

**Estado:**

```typescript
{
  features: Feature[]              // Todas las operaciones 3D
  selectedFeatureId: string | null // Feature seleccionada
  geometries: Map<id, FeatureGeometry> // Geometrías para renderizado
  history: Feature[][]             // Historial para undo/redo
  historyIndex: number
  isProcessing: boolean            // Estado de carga
  processingProgress: number       // 0-100
}
```

**Acciones importantes:**

```typescript
createExtrude(sketchId, entities, distance, direction): Promise<string>
addFeature(feature, geometry): void
updateFeature(featureId, updates): void
deleteFeature(featureId): void
selectFeature(featureId): void
undo(): void
redo(): void
```

#### 4. **Canvas3D** (`components/canvas/Canvas3D.tsx`)

Componente React que renderiza features 3D con Three.js.

**Subcomponente FeatureMeshes:**

```typescript
function FeatureMeshes() {
  // Lee geometries del featureStore
  // Filtra por visible y suppressed
  // Renderiza mesh por cada feature
  // Color amarillo si seleccionada, violeta si no
}
```

**Iluminación:**

- `ambientLight`: Iluminación general (0.5)
- `directionalLight`: Luz direccional con sombras (1.0)
- `pointLight`: Luz puntual secundaria (0.5)

#### 5. **Toolbar** (`components/toolbar/Toolbar.tsx`)

Botón "Extruir" conectado a la lógica de extrusión.

**Handler de extrusión:**

```typescript
const handleExtrude = async () => {
  // 1. Validar sketch activo
  if (!activeSketch || activeSketch.entities.length === 0) {
    alert('No hay un sketch activo con entidades para extruir');
    return;
  }

  // 2. Ejecutar extrusión con distancia por defecto
  await createExtrude(activeSketch.id, activeSketch.entities, 10, 'positive');

  // 3. Cambiar a vista 3D
  setEditMode('3d');
};
```

#### 6. **Properties Panel** (`components/properties/PropertiesPanel.tsx`)

Panel lateral que muestra y edita propiedades de la feature seleccionada.

**Propiedades editables:**

- Nombre de la feature
- Distancia de extrusión (mm)
- Dirección (positive, negative, both)
- Visibilidad (visible/oculto)
- Estado (activo/suprimido)

---

## 👤 Uso del Usuario

### Flujo Completo: Del Sketch al Sólido 3D

#### 1. **Dibujar Sketch**

```
Click "Nuevo Sketch" →
  Seleccionar herramienta (Línea/Círculo/Rectángulo) →
    Dibujar forma cerrada →
      Resultado: Sketch con entidades 2D
```

**Ejemplo:** Dibujar un rectángulo de 50x30mm

#### 2. **Extruir Sketch**

```
Click botón "Extruir" (icono de cubo en toolbar 3D) →
  Esperar procesamiento (1-3 segundos) →
    Vista cambia automáticamente a 3D →
      Resultado: Sólido 3D con height=10mm por defecto
```

**Feedback visual:**

- Indicador "Iniciando Motor CAD..." al inicio (solo primera vez)
- Botón "Extruir" con cursor de espera mientras procesa
- Modelo 3D aparece en el canvas con color violeta

#### 3. **Editar Extrusión**

```
Click en sólido 3D (canvas) o en feature (sidebar) →
  Panel de propiedades muestra parámetros →
    Cambiar "Distancia" a 25mm →
      Presionar Enter o hacer blur del input →
        Resultado: Extrusión actualizada
```

**Propiedades disponibles:**

- **Distancia:** Altura de extrusión en mm (acepta decimales)
- **Dirección:** Positiva (+Z), Negativa (-Z) o Ambas
- **Visibilidad:** Toggle para ocultar/mostrar
- **Estado:** Activo o Suprimido (no se regenera)

#### 4. **Gestionar Features en Sidebar**

```
Feature Tree muestra:
  📄 Sketch001 (2 entidades)
  🧊 Extrusión 10mm [seleccionada]
```

**Acciones:**

- **Click en feature:** Selecciona y muestra propiedades
- **Hover + icono ojo:** Toggle visibilidad rápida
- **Feature resaltada:** Background primario si seleccionada

---

## 🔧 API Técnica

### Crear Extrusión Programáticamente

```typescript
import { useFeatureStore } from '@/stores/featureStore';

const { createExtrude } = useFeatureStore();

// Ejecutar extrusión
const featureId = await createExtrude(
  sketchId, // ID del sketch origen
  entities, // SketchEntity[] del sketch
  25, // Distancia en mm
  'positive' // Dirección
);

console.log(`Feature creada: ${featureId}`);
```

### Actualizar Feature Existente

```typescript
const { updateFeature } = useFeatureStore();

updateFeature(featureId, {
  distance: 50, // Nueva distancia
  direction: 'both', // Nueva dirección
  name: 'Extrusión Base', // Nuevo nombre
  visible: true,
  suppressed: false,
});
```

### Acceder a Geometría de Feature

```typescript
const { getGeometry } = useFeatureStore();

const featureGeom = getGeometry(featureId);
if (featureGeom) {
  console.log('Positions:', featureGeom.geometry.attributes.position.count);
  console.log('Triangles:', featureGeom.geometry.index.count / 3);
}
```

### Eliminar Feature

```typescript
const { deleteFeature } = useFeatureStore();

deleteFeature(featureId); // Limpia geometría y actualiza historial
```

### Undo/Redo de Features

```typescript
const { undo, redo, canUndo, canRedo } = useFeatureStore();

if (canUndo) undo();
if (canRedo) redo();
```

---

## 🔍 Conversión de Entidades 2D → OpenCascade

El worker convierte cada tipo de entidad sketch a geometría OpenCascade:

### Line → BRepBuilderAPI_MakeEdge

```typescript
const p1 = new gp_Pnt(line.start.x, line.start.y, 0);
const p2 = new gp_Pnt(line.end.x, line.end.y, 0);
const edge = new BRepBuilderAPI_MakeEdge(p1, p2).Edge();
```

### Circle → gp_Circ + MakeEdge

```typescript
const center = new gp_Pnt(circle.center.x, circle.center.y, 0);
const axis = new gp_Ax2(center, new gp_Dir(0, 0, 1));
const gpCirc = new gp_Circ(axis, circle.radius);
const edge = new BRepBuilderAPI_MakeEdge(gpCirc).Edge();
```

### Rectangle → 4 Edges

```typescript
const p1 = new gp_Pnt(x1, y1, 0);
const p2 = new gp_Pnt(x2, y1, 0);
const p3 = new gp_Pnt(x2, y2, 0);
const p4 = new gp_Pnt(x1, y2, 0);

const edges = [
  new BRepBuilderAPI_MakeEdge(p1, p2).Edge(),
  new BRepBuilderAPI_MakeEdge(p2, p3).Edge(),
  new BRepBuilderAPI_MakeEdge(p3, p4).Edge(),
  new BRepBuilderAPI_MakeEdge(p4, p1).Edge(),
];

edges.forEach((e) => wireBuilder.Add(e));
```

### Wire → Face → Prism

```typescript
// Wire cerrado
const wire = wireBuilder.Wire();

// Crear face
const face = new BRepBuilderAPI_MakeFace(wire, true).Face();

// Extruir
const extrusionVec = new gp_Vec(0, 0, distance);
const prism = new BRepPrimAPI_MakePrism(face, extrusionVec, false, true);
const shape = prism.Shape();
```

---

## 🐛 Troubleshooting

### Problema: "OpenCascade not initialized"

**Causa:** El worker no se inicializó antes de llamar a `extrude()`.

**Solución:**

```typescript
const worker = getCADWorker();
await worker.initialize();  // Siempre inicializar primero
await worker.extrude(...);
```

El hook `useCADWorker` en `App.tsx` maneja esto automáticamente.

---

### Problema: Extrusión falla con "Failed to create wire"

**Causa:** Las entidades del sketch no forman un contorno cerrado válido.

**Diagnóstico:**

- Revisar que todas las líneas conecten correctamente
- Verificar que los puntos start/end de líneas consecutivas coincidan
- Asegurar que círculos/rectángulos tengan dimensiones válidas (radio > 0)

**Solución:**

- Implementar sistema de snapping más robusto (snap to points)
- Validar sketch antes de extruir (check de contorno cerrado)

---

### Problema: Geometría 3D no se renderiza

**Checklist:**

1. ¿La feature está visible? (check `feature.visible === true`)
2. ¿La feature no está suprimida? (check `feature.suppressed === false`)
3. ¿La geometría tiene vértices? (console.log positions.length)
4. ¿El canvas está en modo 3D? (check `editMode === '3d'`)

**Debug:**

```typescript
const { geometries } = useFeatureStore();
console.log('Geometrías en store:', geometries.size);
geometries.forEach((g, id) => {
  console.log(`Feature ${id}:`, {
    positions: g.geometry.attributes.position.count,
    triangles: g.geometry.index.count / 3,
  });
});
```

---

### Problema: Worker muy lento en primera extrusión

**Causa:** OpenCascade.js es pesado (~8MB WASM) y tarda en cargar la primera vez.

**Comportamiento esperado:**

- Primera inicialización: 2-5 segundos
- Extrusiones subsecuentes: < 1 segundo

**Optimizaciones futuras:**

- Pre-cargar worker en service worker
- Mostrar barra de progreso con porcentaje
- Cachear geometrías simples

---

### Problema: Normales incorrectas (iluminación extraña)

**Causa:** Las normales no se calcularon correctamente o están invertidas.

**Solución:**

```typescript
geometry.computeVertexNormals(); // Ya implementado en featureStore
```

Si persiste, verificar orientación de faces en triangulateShape().

---

## 📊 Performance

### Benchmarks (aproximados)

| Operación               | Entidades     | Tiempo         |
| ----------------------- | ------------- | -------------- |
| Inicializar worker      | N/A           | 2-4s (una vez) |
| Extruir rectángulo      | 4 líneas      | ~500ms         |
| Extruir círculo         | 1 círculo     | ~600ms         |
| Extruir sketch complejo | 20+ entidades | ~1-2s          |
| Triangulación           | 1000 vértices | ~200ms         |

### Límites

- **Max entidades por sketch:** ~100 (recomendado)
- **Max features en árbol:** ~50 (UI puede saturarse)
- **Max triángulos por mesh:** ~100k (Three.js límite)

---

## 🚀 Próximas Mejoras

### Fase 2 (Planificado)

- [ ] **Dirección 'both'** funcionando correctamente (union de dos prisms)
- [ ] **Re-ejecución automática** al cambiar distancia en properties panel
- [ ] **Preview en tiempo real** al cambiar parámetros
- [ ] **Validación de sketch** antes de extruir (check contorno cerrado)
- [ ] **Revolución** alrededor de eje
- [ ] **Fillet** (redondeo de aristas)
- [ ] **Chamfer** (chaflán de aristas)

### Optimizaciones

- [ ] Cachear geometrías para evitar re-cálculo
- [ ] Paralelizar múltiples extrusiones con worker pool
- [ ] Implementar Level of Detail (LOD) para sketches complejos
- [ ] Comprimir geometryData antes de enviar desde worker

---

## 📚 Referencias

- [OpenCascade.js Docs](https://ocjs.org/docs/)
- [Three.js BufferGeometry](https://threejs.org/docs/#api/en/core/BufferGeometry)
- [Web Workers MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [BRepPrimAPI_MakePrism](https://dev.opencascade.org/doc/refman/html/class_b_rep_prim_a_p_i___make_prism.html)

---

**Versión:** 0.2.0  
**Última actualización:** 6 de abril de 2026  
**Autor:** CapyCad Team
