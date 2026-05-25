# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

---

## [0.1.1a] - 2026-05-24

### Fixed

- **Extrusión — ghost preview nunca visible**: `ToolbarExtrude` no llamaba a `setEditMode('3d')` antes de activar el preview. El `Canvas3D` (que contiene `ExtrudePreviewGizmo` + `ExtrudePreviewHUD`) tenía `display:none` mientras el editor estaba en modo 2D, por lo que el fantasma nunca se renderizaba. Ahora `setEditMode('3d')` se invoca antes de `setExtrudePreviewActive(true)`.
- **Extrusión — entidades LINE no soportadas en ghost**: `entitiesToShape()` en `ExtrudePreviewGizmo` no manejaba entidades de tipo `LINE`. Las sketches dibujadas con la herramienta Línea no generaban geometría de preview. Se agregó fallback que ordena los segmentos LINE en una cadena conectada y construye un `THREE.Shape` via moveTo/lineTo/closePath.
- **Extrusión — vector de extrusión incorrecto en OCC**: El worker de OpenCascade usaba el eje Y (`gp_Vec_4(0, signedDistance, 0)`) en lugar del eje Z correcto (`gp_Vec_4(0, 0, signedDistance)`).

### Added

- **`extrusionUtils.ts`**: Utilidad pura `computeExtrusionVecParams(direction, distance)` que centraliza el cálculo del vector de extrusión OCC (eje Z, con signo según dirección).
- **Tests de extrusión**: 10 test cases en `extrusionUtils.test.ts` cubriendo los 3 modos de dirección (positive, negative, both).

---

### Added (Unreleased)

- **Fase 2 — CAD Completo (US-009 a US-015)**:
  - **Restricciones Paramétricas (US-009)**: Constraint solver con 7 tipos (horizontal, vertical, distance, equal, concentric, parallel, perpendicular, tangent) + DOF analyzer + ConstraintOverlay UI
  - **Shell (US-010)**: `executeShell()` en cad.worker.ts usando `BRepOffsetAPI_MakeThickSolid` con espesor configurable
  - **Patrones (US-011)**: `patternEngine.ts` con transforms lineales y circulares en ejes arbitrarios + merge de geometrías
  - **Sweep y Loft (US-012)**: `executeSweep()` con `BRepOffsetAPI_MakePipe` + `executeLoft()` con `BRepFillingAPI_BRepFilling`
  - **Export M3F/OBJ (US-013)**: `m3fExporter.ts` (JSON con metadata de fabricación: material, tolerancia, infill, orientación) + `modelExporter.ts` (OBJ via Three.js)
  - **Import STL/OBJ (US-014)**: `modelImporter.ts` con STLLoader + OBJLoader, detección de formato, merge multi-mesh
  - **Materiales PBR (US-015)**: 11+ presets (metal, acero, oro, cobre, plástico, goma, madera, cerámica), tone mapping (Linear/ACES/Reinhard/Cineon), post-processing (bloom, SSR, SSAO, motion blur, DOF), RenderSettingsPanel + MaterialSpherePreview
- **Fase 1 — Features completados**:
  - **Fillet (US-003)**: `executeFillet()` con `BRepFilletAPI_MakeFillet` + FilletDialog
  - **Chamfer (US-004)**: `executeChamfer()` con `BRepFilletAPI_MakeChamfer` + ChamferDialog
  - **Export STL (US-006)**: Binary & ASCII via stlExporter.ts + triggerDownload
  - **Guardar/Cargar Proyecto (US-007)**: projectSerializer.ts con formato .stlm (JSON) + metadata
- **Suite Completa de Tests Unitarios**:
  - **18 archivos de test** con ~430 test cases
  - Nuevos tests: renderStore (62), stlExporter (17), m3fExporter (18), projectSerializer (42), materialPresets (21), modelExporter (11), modelImporter (16), constraintSolver (32), patternEngine (23), useAutoSave (8)
  - Tests previos: sketchStore (17), featureStore (29), geometry (25), LineTool (17), CircleTool (17), RectangleTool (18), cadWorkerClient (50), useCADWorker (7)

### Changed

- N/A

### Deprecated

- N/A

### Removed

- N/A

### Fixed

- N/A

### Security

- N/A

---

## [0.3.0] - 2026-04-06

### Added

- **Sistema de Extrusión 3D completo con OpenCascade.js**:
  - Web Worker dedicado (`workers/cad.worker.ts`) para operaciones CAD sin bloquear UI
  - Cliente del worker (`lib/cad/cadWorkerClient.ts`) con singleton pattern
  - Conversión automática de SketchEntity[] a geometría OpenCascade (Wire → Face → Prism)
  - Triangulación de TopoDS_Shape a BufferGeometry para Three.js
  - Cálculo automático de normales con `computeVertexNormals()`
- **Feature Store con Zustand** (`stores/featureStore.ts`):
  - Gestión de features 3D (extrusiones, revoluciones, fillets, etc.)
  - Historial ilimitado para undo/redo de operaciones 3D
  - Mapa de geometrías para renderizado eficiente
  - Estado de procesamiento con progress (0-100%)
  - Selección de features
- **Hook useCADWorker** (`hooks/useCADWorker.ts`):
  - Inicialización automática de OpenCascade.js al montar App
  - Feedback visual de carga: "Iniciando Motor CAD..."
  - Manejo de errores con opción de recarga
- **Renderizado de Features 3D**:
  - Componente `FeatureMeshes` en Canvas3D
  - Material PBR con metalness y roughness
  - Color amarillo para feature seleccionada, violeta para no seleccionadas
  - Filtrado por visibilidad y estado de supresión
  - Click en mesh para seleccionar feature
- **Panel de Propiedades mejorado** (`components/properties/PropertiesPanel.tsx`):
  - Edición de nombre de feature
  - Control de distancia de extrusión (mm, acepta decimales)
  - Selector de dirección: Positiva (+Z), Negativa (-Z) o Ambas
  - Toggle de visibilidad con iconos Eye/EyeOff
  - Toggle de supresión con indicador de estado
  - ID de feature (solo lectura)
- **Feature Tree actualizado** (`components/sidebar/Sidebar.tsx`):
  - Muestra sketches y features 3D en jerarquía
  - Iconos específicos por tipo (FileText, Cube, Box)
  - Highlight de feature seleccionada con background primario
  - Hover action para toggle de visibilidad rápida
  - Contador de entidades para sketches
  - Indicador "Suprimido" para features inactivas
- **Botón Extruir funcional** (`components/toolbar/Toolbar.tsx`):
  - Validación: verifica sketch activo con entidades
  - Distancia por defecto: 10mm
  - Feedback visual: cursor de espera durante procesamiento
  - Cambio automático a vista 3D después de extruir
  - Alert informativos si no hay sketch válido
- **Documentación completa**:
  - `docs/EXTRUSION_3D.md` (500+ líneas): Guía técnica del sistema de extrusión
  - Arquitectura detallada de componentes
  - Flujo completo de conversión 2D → 3D
  - API técnica con ejemplos de código
  - Troubleshooting y debugging tips
  - Benchmarks de performance

### Changed

- **Canvas3D.tsx**: Eliminado cubo de ejemplo, ahora renderiza features dinámicamente
- **App.tsx**: Agregado indicador de inicialización del CAD engine con Loader2
- **Sidebar.tsx**: Refactorizado para mostrar árbol combinado de sketches y features
- **PropertiesPanel.tsx**: Transformado de placeholder a panel funcional

### Fixed

- Geometrías 3D ahora tienen normales correctas para iluminación realista
- Features ocultas o suprimidas no se renderizan en Canvas3D
- Limpieza automática de geometrías al eliminar features (evita memory leaks)

### Performance

- OpenCascade.js se ejecuta en Web Worker (no bloquea UI principal)
- Geometrías cacheadas en Map<id, FeatureGeometry> para acceso O(1)
- Triangulación con deflexión lineal de 0.1 (balance calidad/performance)

---

- N/A

---

## [0.2.0] - 2026-04-08

### Added

- **Editor 2D completo con Fabric.js**:
  - Componente `SketchEditor.tsx` (484 líneas) con canvas interactivo
  - Sistema de herramientas de dibujo: Línea, Círculo, Rectángulo
  - Preview en tiempo real durante el dibujo
  - Grid interactivo con snapping (10px por defecto, configurable)
  - Controles de zoom: 10% - 1000% con botones +/- y rueda del mouse
  - Pan con arrastre del canvas
- **Gestión de estado con Zustand**:
  - Store `sketchStore.ts` (270+ líneas) para estado del sketch
  - Historial ilimitado para undo/redo
  - Gestión de herramienta activa y entidades seleccionadas
  - Sistema de snapping configurable
- **Sistema de herramientas orientado a objetos**:
  - Clase base abstracta `BaseTool` para extensibilidad
  - `LineTool`: Dibujo de líneas con dos clicks
  - `CircleTool`: Click para centro, drag para radio
  - `RectangleTool`: Click-drag para crear rectángulos
- **Utilidades matemáticas**:
  - `geometry.ts`: Funciones para conversión de coordenadas
  - Snapping a grid, cálculo de distancias, puntos medios, ángulos
- **Integración UI**:
  - Toolbar con selección de herramientas y estados activos
  - Botones Undo/Redo con estados disabled apropiados
  - Sidebar con botón "Nuevo Sketch" funcional
  - Cambio entre modo 2D y 3D
  - Indicador de modo activo en toolbar
- **Keyboard shortcuts**:
  - `Ctrl+Z`: Undo
  - `Ctrl+Y`: Redo
  - `Escape`: Cancelar dibujo en progreso
- **Documentación**:
  - `EDITOR_2D.md`: Guía completa del usuario y desarrollador
  - Instrucciones de uso, arquitectura, debugging
- **Dependencias nuevas**:
  - `nanoid ^5.0.7`: Generación de IDs únicos
  - `@types/fabric ^5.3.7`: Tipos TypeScript para Fabric.js

### Changed

- `App.tsx`: Agregado cambio dinámico entre SketchEditor y Canvas3D
- `Toolbar.tsx`: Integrado con sketchStore para gestión de herramientas
- `Sidebar.tsx`: Conectado "Nuevo Sketch" y botón "Ver en 3D"
- `STATUS.md`: Actualizado progreso a 3/8 historias (37.5%)

### Fixed

- Configuración JSX en TypeScript para componentes Fabric.js
- Cálculo de tamaño del canvas considerando sidebars fijos (512px + 256px)

---

## [0.1.0] - 2026-04-06

### Added

- Initial project setup with Turborepo monorepo structure
- TypeScript configuration with strict mode
- ESLint and Prettier configuration
- Shared types package (`@capycad/shared-types`)
- Frontend application with React 18 + Vite 5
- Three.js integration with react-three-fiber
- Basic UI layout (Toolbar, Sidebar, Canvas, Properties Panel)
- Tailwind CSS with shadcn/ui design system
- Basic 3D viewport with OrbitControls
- Grid helper and lighting setup
- Project documentation (PRD, User Stories, Architecture)
