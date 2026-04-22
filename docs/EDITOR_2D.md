# Editor 2D - Guía de Uso

## ✨ Características Implementadas

El editor 2D de STL-Model permite crear sketches 2D paramétricos que luego pueden convertirse en sólidos 3D mediante operaciones de extrusión, revolución, etc.

---

## 🎨 Herramientas Disponibles

### 1. Selección (Select)

- **Shortcut**: Click en botón "Selección" o Escape
- **Uso**: Seleccionar y manipular entidades existentes
- Click en una entidad para seleccionarla
- Click en el espacio vacío para deseleccionar

### 2. Línea (Line)

- **Shortcut**: L
- **Uso**: Dibujar líneas rectas
- **Pasos**:
  1. Click para definir punto inicial
  2. Mover mouse para ver preview
  3. Click para definir punto final

### 3. Círculo (Circle)

- **Shortcut**: C
- **Uso**: Dibujar círculos
- **Pasos**:
  1. Click para definir centro
  2. Mover mouse para ver preview del radio
  3. Click para definir radio final

### 4. Rectángulo (Rectangle)

- **Shortcut**: R
- **Uso**: Dibujar rectángulos
- **Pasos**:
  1. Click para primera esquina
  2. Mover mouse para ver preview
  3. Click para esquina opuesta

---

## ⌨️ Atajos de Teclado

| Atajo                                 | Acción                                            |
| ------------------------------------- | ------------------------------------------------- |
| **Ctrl + Z** (Cmd + Z en Mac)         | Deshacer                                          |
| **Ctrl + Y** (Cmd + Shift + Z en Mac) | Rehacer                                           |
| **Escape**                            | Cancelar acción actual / Herramienta de selección |
| **L**                                 | Herramienta Línea                                 |
| **C**                                 | Herramienta Círculo                               |
| **R**                                 | Herramienta Rectángulo                            |
| **Delete**                            | Eliminar entidades seleccionadas                  |
| **Ctrl + A**                          | Seleccionar todo                                  |

---

## 🎯 Snapping (Ajuste Automático)

El editor incluye un sistema de snapping inteligente:

### Grid Snapping

- **Por defecto**: Activado
- **Tamaño del grid**: 10 unidades
- Los puntos se ajustan automáticamente a la cuadrícula
- Facilita crear geometrías alineadas y precisas

### Configuración de Snapping

```typescript
// En el store
snapOptions: {
  enabled: true,        // Activar/desactivar snapping
  snapToGrid: true,     // Snap al grid
  snapToPoints: true,   // Snap a puntos existentes
  snapToLines: false,   // Snap a líneas existentes
  gridSize: 10,         // Tamaño del grid en unidades
}
```

---

## 🔄 Historial (Undo/Redo)

El editor mantiene un historial completo de acciones:

- **Capacidad**: Ilimitada (en memoria)
- **Persistencia**: Se mantiene mientras el sketch esté activo
- **Acciones registradas**:
  - Agregar entidades
  - Eliminar entidades
  - Modificar propiedades

### Implementación

```typescript
// Store mantiene historial de estados
history: HistoryState[];
historyIndex: number;

// Cada acción crea un snapshot
addEntity(entity) {
  const newHistory = history.slice(0, historyIndex + 1);
  newHistory.push({ entities: [...entities], timestamp: Date.now() });
}
```

---

## 🎨 Navegación del Canvas

### Zoom

- **Acercar**: Click en botón `+` o Ctrl + Scroll Up
- **Alejar**: Click en botón `-` o Ctrl + Scroll Down
- **Restablecer**: Click en botón "Restablecer vista"
- **Rango**: 10% - 1000%

### Pan (Desplazamiento)

- **Método 1**: Herramienta de selección + arrastrar en espacio vacío
- **Método 2**: Middle mouse button (rueda del mouse) + arrastrar
- **Reset**: Botón "Restablecer vista"

---

## 📐 Flujo de Trabajo Típico

### Crear un Sketch Simple

1. **Iniciar Sketch**

   ```
   Click en "Nuevo Sketch" en sidebar → Se abre editor 2D
   ```

2. **Dibujar Formas**

   ```
   Seleccionar herramienta (Línea/Círculo/Rectángulo)
   → Click para puntos/centro
   → Click para finalizar
   ```

3. **Ajustar y Refinar**

   ```
   Usar Undo/Redo si es necesario
   Verificar que entidades estén correctamente alineadas
   ```

4. **Preparar para 3D**
   ```
   Click en "Ver en 3D" → Volver a vista 3D
   Seleccionar sketch → Aplicar "Extruir" (próxima fase)
   ```

---

## 🏗️ Arquitectura del Editor

### Componentes Principales

```
SketchEditor (React Component)
├── Fabric.js Canvas
├── Tool System
│   ├── BaseTool (abstract)
│   ├── LineTool
│   ├── CircleTool
│   └── RectangleTool
├── Geometry Utilities
│   ├── Snapping
│   ├── Coordinate Conversion
│   └── Distance Calculations
└── Zustand Store
    ├── Active Sketch
    ├── History (Undo/Redo)
    ├── Tool State
    └── Snap Options
```

### Herramientas (Tools)

Cada herramienta hereda de `BaseTool` e implementa:

```typescript
abstract class BaseTool {
  onMouseDown(point: Vector2): void;
  onMouseMove(point: Vector2): void;
  onMouseUp(point: Vector2): SketchEntity | null;
  cancel(): void;
  cleanup(): void;
}
```

**Ejemplo: LineTool**

```typescript
class LineTool extends BaseTool {
  // Estado interno
  private isDrawing: boolean = false;
  private startPoint: Vector2 | null = null;
  private previewObject: fabric.Line | null = null;

  // Primer click → establecer punto inicial + mostrar preview
  onMouseDown(point) { ... }

  // Mover mouse → actualizar preview
  onMouseMove(point) { ... }

  // Segundo click → crear línea permanente
  onMouseUp(point) {
    return { id, type: 'line', start, end };
  }
}
```

---

## 🔧 Personalización

### Cambiar Tamaño del Grid

```typescript
// En SketchEditor.tsx
const gridSize = 10; // Cambiar este valor

// O mediante el store
updateSnapOptions({ gridSize: 20 });
```

### Colores del Editor

```typescript
// Colores de preview (mientras se dibuja)
stroke: '#7c3aed',      // Morado (primary)
strokeDashArray: [5, 5] // Línea punteada

// Colores de entidades permanentes
stroke: '#ffffff',      // Blanco
strokeWidth: 2
```

### Dimensiones del Canvas

```typescript
// Se calcula automáticamente
const width = window.innerWidth - 512 - 256; // Menos sidebars
const height = window.innerHeight - 56; // Menos toolbar
```

---

## 🐛 Debugging y Troubleshooting

### El canvas no responde

- Verificar que Fabric.js esté inicializado: `console.log(fabricCanvasRef.current)`
- Verificar event listeners: `canvas.on('mouse:down', ...)`

### Las entidades no se guardan en el store

- Verificar que `addEntity()` se llame después de `onMouseUp()`
- Inspeccionar el store en React DevTools

### El snapping no funciona

- Verificar `snapOptions.enabled === true`
- Verificar `snapOptions.snapToGrid === true`
- Console log del punto antes/después de snapping

### Performance lento con muchas entidades

- Implementar virtualización (solo renderizar entidades visibles)
- Usar `canvas.requestRenderAll()` en lugar de `renderAll()`
- Limitar historial a últimas 50 acciones

---

## 📈 Próximos Pasos

### Fase 2 - Mejoras Planificadas

1. **Restricciones Paramétricas** (US-009)
   - Distancia, horizontal, vertical
   - Paralelo, perpendicular, tangente
   - Solver de constraints en tiempo real

2. **Más Herramientas**
   - Arco (3 puntos o centro-ángulo)
   - Polígono regular
   - Splines (Bézier, NURBS)

3. **Edición Avanzada**
   - Trim (recortar líneas)
   - Extend (extender líneas)
   - Offset (desplazar curvas)
   - Mirror (espejo)

4. **Dimensiones y Cotas**
   - Acotación automática
   - Dimensiones conducidas vs conductoras
   - Tablas de parámetros

---

## 💡 Tips y Mejores Prácticas

1. **Usa Grid Snapping**: Mantén las entidades alineadas desde el inicio
2. **Sketch Cerrados**: Para extruir, asegúrate de que el perfil esté cerrado
3. **Undo es tu amigo**: No tengas miedo de experimentar
4. **Nombra tus Sketches**: Renombra sketches para mejor organización
5. **Un sketch, un plano**: Mantén cada sketch en un solo plano (XY, XZ, YZ)

---

**Última actualización:** Abril 2026  
**Versión:** 0.1.0 (Fase 1 - Día 2-3)
