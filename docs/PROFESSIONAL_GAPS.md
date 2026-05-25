# Análisis de Madurez Profesional - CapyCad

## Objetivo

Evaluar qué capacidades de ingeniería profesional faltan para operar este proyecto como producto de software robusto, escalable y mantenible.

## Resumen Ejecutivo

El proyecto tiene buena base técnica de producto (stack moderno, monorepo, testing unitario y E2E disponibles), pero le faltan piezas críticas de industrialización:

1. CI/CD de calidad y release.
2. Seguridad continua (SAST, dependencias, secretos).
3. Observabilidad y operación en producción.
4. Gobernanza de cambios (versionado, PR templates, convenciones de commit, branch protection).

Sin esas capas, el riesgo principal no está en "construir features", sino en regresiones, incidentes silenciosos y releases sin trazabilidad.

## Evidencia Observada en el Repositorio

### Fortalezas actuales

- Monorepo con Turbo y scripts base de build/lint/test.
- Frontend con TypeScript estricto y Vitest.
- Suite E2E separada en app dedicada.
- Documentación funcional y plan de testing.

### Brechas detectadas

- Solo existe un workflow de GitHub Actions orientado a creación de issues, no a calidad/release.
- No se detecta pipeline CI principal para lint/type-check/tests/build.
- No se detecta pre-commit con Husky/lint-staged.
- No se detecta política de releases automatizada (changesets/semantic-release).
- No se detectan herramientas de seguridad continua (CodeQL/Semgrep/Dependabot/Renovate/secret scanning configurado por repo).
- No se detecta stack de observabilidad para front (errores, performance y producto).
- No se detecta configuración de contenedores para entornos reproducibles.

## Herramientas Profesionales Faltantes (Prioridad)

## P0 - Crítico (hacer ahora)

### 1) CI de calidad obligatoria

Implementar workflow `ci.yml` con gates bloqueantes en PR:

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm --filter @capycad/web type-check`
- `pnpm test:run`
- `pnpm build`

Resultado esperado:

- Ningún PR se mergea con build roto o tests fallando.

### 2) Seguridad base automatizada

Agregar:

- Dependabot o Renovate para dependencias.
- CodeQL (GitHub Advanced Security) para análisis estático.
- Secret scanning (gitleaks o GH native alerts si aplica).
- `pnpm audit` en CI con política de severidad.

Resultado esperado:

- Riesgos de supply-chain y vulnerabilidades detectados de forma temprana.

### 3) Estandarización de PR y commits

Agregar:

- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/`
- `CODEOWNERS`
- `commitlint` + Convencional Commits
- Branch protection (required checks, required reviews)

Resultado esperado:

- Proceso de colaboración consistente y auditable.

## P1 - Alto impacto (siguiente etapa)

### 4) Observabilidad real en frontend

Agregar:

- Sentry (errores + tracing)
- Web Vitals (INP/LCP/CLS) y envío a analítica
- Session replay opcional para debugging (Sentry Replay o LogRocket)

Resultado esperado:

- Diagnóstico rápido de fallos y degradaciones de UX en producción.

### 5) Gestión profesional de releases

Agregar:

- Changesets o semantic-release
- Changelog automático por versión
- Workflow de release con tags y artefactos

Resultado esperado:

- Versionado confiable, historial de cambios y rollback más seguro.

### 6) Cobertura como quality gate

Agregar:

- Umbral de cobertura por módulo en CI (mínimo global y por paquete)
- Reporte de cobertura en PR (Codecov o comentario automático)

Resultado esperado:

- Evitar pérdida silenciosa de cobertura al crecer la base de código.

## P2 - Escalamiento (profesionalización completa)

### 7) Entorno reproducible de desarrollo y QA

Agregar:

- Dockerfile(s) + `docker-compose.yml` para stack local
- Script de bootstrap reproducible para nuevos colaboradores

Resultado esperado:

- Menos problemas “en mi máquina funciona”.

### 8) Performance engineering

Agregar:

- Lighthouse CI para presupuesto de performance
- Bundle analyzer (rollup-plugin-visualizer o similar)

Resultado esperado:

- Control de peso de bundle y degradación de carga inicial.

### 9) Gobernanza técnica y arquitectura

Agregar:

- ADRs (Architecture Decision Records)
- Definición de ownership por dominio
- Checklist de “Definition of Done” en PR

Resultado esperado:

- Menos deuda accidental y decisiones más trazables.

## Matriz de Madurez (0-5)

- CI/CD: 1/5
- Seguridad continua: 1/5
- Calidad automatizada: 2/5
- Observabilidad: 1/5
- Release management: 1/5
- Gobernanza técnica: 2/5
- Testing automation (base): 3/5

Madurez global estimada actual: 1.6/5
Madurez objetivo para programa profesional: >= 3.8/5

## Plan de Implementación Recomendado (30-60-90 días)

### 0-30 días

- CI completo bloqueante en PR.
- Dependabot/Renovate + CodeQL + secret scanning.
- PR template + CODEOWNERS + commitlint + branch protection.

### 31-60 días

- Changesets/semantic-release.
- Cobertura con umbrales y reporte en PR.
- Sentry + Web Vitals.

### 61-90 días

- Docker + compose dev/qa.
- Lighthouse CI + presupuesto de performance.
- ADRs y checklist de arquitectura por PR.

## Stack sugerido (concreto)

- CI/CD: GitHub Actions
- Dependencias: Renovate (o Dependabot)
- Seguridad: CodeQL + gitleaks + pnpm audit
- Calidad: ESLint + TypeScript + Vitest + cobertura V8
- Releases: Changesets
- Observabilidad: Sentry + Web Vitals
- Performance: Lighthouse CI + bundle visualizer
- Governance: Commitlint + Husky + lint-staged + CODEOWNERS

## Criterios de salida (para decir “ya es profesional”)

1. 100% de PRs con checks obligatorios en verde.
2. Vulnerabilidades críticas bloquean merge.
3. Cada release queda versionada y trazable automáticamente.
4. Errores de producción con alertas y contexto reproducible.
5. Presupuesto de performance con control automático.
6. Onboarding reproducible en entorno limpio en menos de 20 minutos.

## Nota

Este análisis evalúa la capa de ingeniería y operación (no la calidad funcional del CAD en sí). La meta es convertir un buen proyecto técnico en un producto mantenible y escalable a largo plazo.

## Estado de ejecución (11-05-2026)

Implementado en el repositorio:

- CI base en GitHub Actions (`.github/workflows/ci.yml`)
- Dependabot para npm y GitHub Actions (`.github/dependabot.yml`)
- CodeQL para JavaScript/TypeScript (`.github/workflows/codeql.yml`)
- Gobernanza base: PR template, Issue templates, CODEOWNERS, commitlint, husky, lint-staged

Mitigación de vulnerabilidades realizada:

- Se agregaron overrides de seguridad en `package.json` para:
  - `tar@7.5.11`
  - `@tootallnate/once@3.0.1`
- Resultado del audit productivo:
  - Antes: `7 high`, `1 low`
  - Ahora: `1 high`, `0 low`

Transición gradual activada en CI:

- El audit ya no bloquea el pipeline mientras se termina la remediación final.
- Se sube artefacto `dependency-audit-report` para trazabilidad.

Pendiente inmediato:

- Resolver la vulnerabilidad restante asociada a `fabric` (requiere estrategia de upgrade mayor y validación de compatibilidad).
