# Análisis Integral de la Aplicación y Herramienta Faltante Prioritaria

Fecha: 11 de mayo de 2026

## 1) Resumen Ejecutivo

La aplicación tiene una base técnica fuerte para CAD web profesional:

- Motor geométrico robusto con OpenCascade.js en Web Worker (WASM + aislamiento del hilo principal).
- Frontend moderno (React + Three.js + Zustand + Tailwind).
- Buen nivel de pruebas (unitarias/integración con Vitest y E2E con Serenity/JS + Cucumber + WebdriverIO).
- Documentación amplia (PRD, User Stories, Test Plan, auditorías técnicas).

Sin embargo, para operar en producción con confiabilidad, falta una capacidad crítica:

**Herramienta faltante prioritaria: Plataforma de observabilidad de frontend (recomendación: Sentry).**

## 2) Qué Ya Tenemos (Inventario Real)

## Producto y arquitectura

- Aplicación CAD 2D/3D con operaciones complejas (extrusión, booleanas, reconstrucción geométrica).
- Cálculo pesado ejecutado fuera de la UI mediante Worker dedicado.
- Pipeline de estados y render estructurado por stores y componentes especializados.

## Calidad de código y testing

- Linting/formato/estándares de commit presentes (ESLint, Prettier, Husky, Commitlint).
- Tests funcionales y de regresión en dos niveles:
  - `apps/web`: Vitest.
  - `apps/e2e`: Serenity/JS + Cucumber + WebdriverIO.

## Gestión del monorepo

- pnpm workspaces + Turbo para escalar módulos y tareas.
- Separación clara entre aplicación web, e2e y paquetes compartidos.

## 3) Brecha Principal Detectada

Actualmente no hay una plataforma consolidada para:

- Capturar errores reales en navegador en producción.
- Correlacionar errores del hilo principal con errores del Worker/WASM.
- Medir degradación de performance en sesiones reales (Core Web Vitals, latencias de interacción).
- Priorizar bugs por impacto de usuarios y frecuencia.

En una app CAD, este punto es especialmente crítico porque:

- Los errores de geometría suelen ser no triviales de reproducir.
- Los fallos del Worker pueden no dejar trazas útiles en logs locales.
- Problemas de rendimiento aparecen bajo cargas o modelos reales del usuario, no solo en QA.

## 3.1) Brecha Funcional CAD (Herramientas)

Además de la brecha de plataforma (observabilidad), existe una brecha funcional concreta en herramientas 3D:

- **Bisel/Chamfer:** la operación existe y ya soporta selección por arista, pero todavía tiene deuda de discoverability, validación y pulido de UX.
- **Filete/Fillet:** también existe y comparte la misma deuda.

Estado real detectado:

- Hay diálogos de UI para Chamfer y Fillet.
- El worker CAD implementa ambas operaciones con OpenCascade.
- Existe selección visual de aristas en el viewport mediante overlay y picker de modificadores.
- Si el usuario no selecciona aristas, el worker conserva el fallback de aplicar sobre toda la feature.

Qué falta para considerarlas herramientas profesionales completas:

1. Mejorar discoverability para que el usuario entienda que estos modificadores viven en el flujo de selección de aristas.
2. Persistir de forma más visible la intención de selección en la UX y en propiedades.
3. Validaciones geométricas y errores accionables (por ejemplo, radio/distancia inviable).
4. Modo de operación todavía más explícito: "todas las aristas" vs "aristas seleccionadas".

## 4) Herramienta Recomendada

## Sentry (Error Tracking + Performance + Session Context)

Por qué Sentry es la pieza que más valor aporta ahora:

- Captura excepciones frontend con contexto de versión, navegador y usuario.
- Soporta trazas y métricas de performance para detectar cuellos de botella.
- Permite instrumentar errores del Worker y eventos del pipeline CAD.
- Facilita alertas accionables y backlog basado en impacto real.

## 5) Por Qué Esta Es Más Prioritaria Que Otras

Hay otras mejoras relevantes (release automation, Docker dev env, Storybook visual testing), pero ninguna reduce tanto riesgo operativo inmediato como observabilidad.

Orden de impacto esperado:

1. Observabilidad en producción (Sentry).
2. Endurecimiento de seguridad de dependencias (vulnerabilidades críticas pendientes).
3. Automatización de releases/versionado (Changesets o Semantic Release).
4. Homologación de entornos con contenedores.

Si el foco es **capacidad CAD percibida por usuario**, entonces el orden cambia y la prioridad de corto plazo pasa a:

1. Pulir Bisel/Filete para que la selección de aristas sea más evidente y confiable para el usuario.
2. Luego observabilidad para detectar fallos reales post-lanzamiento.

## 6) Plan de Implementación Propuesto (Mínimo y Seguro)

## Fase 1: Base

- Integrar SDK de Sentry en `apps/web`.
- Configurar DSN por entorno.
- Registrar versionado de release y sourcemaps.

## Fase 2: CAD/Worker

- Capturar errores del Worker y serializarlos con contexto de operación CAD.
- Agregar breadcrumbs para eventos clave: importar, extruir, boolean, exportar.

## Fase 3: Performance

- Habilitar tracing y métricas Web Vitals.
- Definir dashboard mínimo: crash-free sessions, p95 de operaciones críticas, top 10 errores.

## Fase 4: Operación

- Alertas por regresión (nueva versión con aumento de errores).
- Regla de priorización de bugs basada en impacto (usuarios afectados + frecuencia + severidad).

## 7) Criterios de Éxito

Se considera cerrada esta brecha cuando:

- Existe visibilidad semanal de errores top y su tendencia.
- Los errores de Worker/WASM quedan trazables con contexto de operación.
- El equipo puede detectar regresiones dentro de la primera hora post-deploy.
- Se reduce el tiempo medio de diagnóstico de incidentes de frontend.

## 8) Conclusión

La app está bien encaminada en arquitectura, funcionalidad y testing. El siguiente salto profesional no es agregar más features, sino ganar visibilidad operativa real en producción.

Por impacto técnico y de negocio, la herramienta faltante más importante hoy es:

**Sentry (o equivalente de observabilidad de frontend) como estándar de error tracking y performance.**
