# Estado del Proyecto - STL-Model CAD Application

**Última actualización**: 8 de abril de 2026

---

## Progreso General

| Fase                     | Historias       | Completadas | Progreso   |
| ------------------------ | --------------- | ----------- | ---------- |
| Fase 1 — MVP Funcional   | US-001 a US-008 | 8/8         | ✅ 100%    |
| Fase 2 — CAD Completo    | US-009 a US-015 | 7/7         | ✅ 100%    |
| Fase 3+ — Cloud & Collab | US-016 a US-019 | 0/4         | ⏸️ Backlog |

---

## Fase 1 — MVP Funcional (COMPLETADA)

| User Story | Descripción             | Estado | Implementación                                                     |
| ---------- | ----------------------- | ------ | ------------------------------------------------------------------ |
| US-001     | Dibujar Formas 2D       | ✅     | 7 herramientas (Line, Circle, Rect, Arc, Polygon, Spline, Measure) |
| US-002     | Extruir Sketch a 3D     | ✅     | `executeExtrude()` en Web Worker con OpenCascade.js                |
| US-003     | Fillet (Redondeo)       | ✅     | `executeFillet()` con `BRepFilletAPI_MakeFillet`                   |
| US-004     | Chamfer (Biselado)      | ✅     | `executeChamfer()` con `BRepFilletAPI_MakeChamfer`                 |
| US-005     | Visualización 3D        | ✅     | Canvas3D + 4 modos vista (shaded/wireframe/edges/rendered)         |
| US-006     | Exportar STL            | ✅     | Binary & ASCII, múltiples geometrías                               |
| US-007     | Guardar/Cargar Proyecto | ✅     | Formato `.stlm` JSON con metadata                                  |
| US-008     | Interfaz con Toolbar    | ✅     | Toolbar 2D/3D + Feature Tree + Properties Panel                    |

## Fase 2 — CAD Completo (COMPLETADA)

| User Story | Descripción                | Estado | Implementación                                      |
| ---------- | -------------------------- | ------ | --------------------------------------------------- |
| US-009     | Restricciones Paramétricas | ✅     | Solver con 7 tipos + análisis DOF                   |
| US-010     | Shell (Vaciar Sólido)      | ✅     | `executeShell()` con `BRepOffsetAPI_MakeThickSolid` |
| US-011     | Patrones de Repetición     | ✅     | Linear + circular con ejes arbitrarios              |
| US-012     | Sweep y Loft               | ✅     | `executeSweep()` + `executeLoft()` en worker        |
| US-013     | Exportar M3F/OBJ           | ✅     | M3F (JSON + metadata fabricación) + OBJ             |
| US-014     | Importar STL/OBJ           | ✅     | STLLoader + OBJLoader con merge multi-mesh          |
| US-015     | Materiales PBR             | ✅     | 11+ presets, tone mapping, post-processing          |

---

## Testing

- **18 archivos de test**, **430+ test cases**
- Tests pasan con `pnpm test:run`
- Ver [TEST_PLAN.md](docs/TEST_PLAN.md) para detalle completo

---

## Estructura Actual

```
STL-Model/
├── apps/
│   ├── web/                          # Frontend React SPA
│   │   └── src/
│   │       ├── components/
│   │       │   ├── canvas/           # Canvas3D, FeatureMeshes, SketchIn3D
│   │       │   ├── editor/           # SketchEditor, ConstraintOverlay
│   │       │   ├── render/           # RenderSettingsPanel, MaterialSpherePreview
│   │       │   ├── toolbar/          # Toolbar, Toolbar2D, Toolbar3D, Tool3DDialogs
│   │       │   ├── sidebar/          # Feature Tree
│   │       │   ├── properties/       # PropertiesPanel
│   │       │   └── ui/              # shadcn components
│   │       ├── stores/
│   │       │   ├── sketchStore.ts    # Estado 2D + undo/redo
│   │       │   ├── featureStore.ts   # Estado 3D + geometrías
│   │       │   ├── renderStore.ts    # Vista, materiales, post-processing
│   │       │   └── uiStore.ts        # Layout paneles
│   │       ├── lib/
│   │       │   ├── cad/              # cadWorkerClient (singleton)
│   │       │   ├── export/           # stlExporter, m3fExporter, modelExporter (OBJ)
│   │       │   ├── import/           # modelImporter (STL/OBJ)
│   │       │   ├── materials/        # materialPresets (11+ PBR)
│   │       │   ├── pattern/          # patternEngine (linear/circular)
│   │       │   ├── project/          # projectSerializer (.stlm)
│   │       │   └── sketch/
│   │       │       ├── constraints/  # constraintSolver, dofAnalyzer
│   │       │       ├── tools/        # Line, Circle, Rect, Arc, Polygon, Spline, Measure
│   │       │       └── geometry.ts   # Math utilities
│   │       ├── hooks/                # useCADWorker, useAutoSave
│   │       ├── workers/
│   │       │   └── cad.worker.ts     # OpenCascade.js (extrude/fillet/chamfer/shell/sweep/loft)
│   │       └── test/                 # Setup + README
│   └── e2e/                          # WebdriverIO + Serenity (placeholder)
├── packages/
│   ├── shared-types/                 # Tipos TS compartidos
│   ├── tsconfig/                     # Configs TS base
│   └── eslint-config/                # ESLint compartido
└── docs/                             # PRD, USER_STORIES, ARCHITECTURE, EDITOR_2D, EXTRUSION_3D, TEST_PLAN
```

---

## Gaps Conocidos

| Área                    | Detalle                                                     |
| ----------------------- | ----------------------------------------------------------- |
| Fillet/Chamfer          | Aplica a todas aristas; falta selección individual de edges |
| Arc en extrusión        | `cad.worker.ts` tiene TODO para start/end angles            |
| Selector resolución STL | No confirmado si UI expone baja/media/alta                  |
| E2E tests               | Estructura existe pero sin tests reales                     |

---

## Comandos

```bash
pnpm install          # Dependencias
pnpm dev              # Dev server → http://localhost:5173
pnpm test:run         # Correr tests una vez
pnpm test:coverage    # Reporte cobertura
pnpm build            # Build producción
```
