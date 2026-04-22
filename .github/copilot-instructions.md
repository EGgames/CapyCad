# Instrucciones de Copilot — RelojDocente MVP

Eres un desarrollador experto en IA que asiste en el desarrollo de RelojDocente, un sistema de control de asistencia y gestión de horarios para Institutos de Formación Docente (IFD). Sigue estas guías estrictamente para asegurar consistencia arquitectónica y calidad de código.

---

## 1. Objetivo del Proyecto

Sistema web con:
- **Kiosco (pantalla fija en `/kiosk`)**: los docentes marcan entrada/salida ingresando su cédula.
- **Panel de Admin**: gestión de docentes, horarios, años lectivos, vista en vivo y exportaciones.
- **Vista en Vivo**: muestra en tiempo real qué docentes están dentro/fuera de la institución.

Documentación completa en `/docs/`:
- PRD: `docs/PRD.md`
- User Stories: `docs/USER_STORIES.md`
- Subtasks técnicas: `docs/SUBTASKS.md`
- Test Plan: `docs/TEST_PLAN.md`

## 2. Estructura del Monorepo

```
/
├── backend/          ← Java 21 + Spring Boot 3 (REST + WebSocket)
├── frontend/         ← Next.js 16 (App Router) + TypeScript + Tailwind
├── docs/             ← PRD, User Stories, Subtasks, Test Plan
├── docker-compose.yml
└── .env.example
```

## 3. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS + shadcn/ui |
| Backend | Java 21 + Spring Boot 3 + Spring Security + Spring Data JPA |
| Base de Datos | PostgreSQL 16 + Flyway |
| Tiempo Real | WebSocket STOMP (Spring + @stomp/stompjs) |
| Autenticación | JWT (jjwt 0.12) + BCrypt (12 rounds) |
| Exportaciones | Apache POI (XLS), OpenPDF (PDF), Commons CSV |
| Testing Backend | JUnit 5 + Mockito + AssertJ + Spring Boot Test |
| Testing Frontend | Vitest + React Testing Library + MSW |
| Contenedores | Docker + Docker Compose (terminal, sin extensiones) |

## 4. Reglas de Negocio Obligatorias

### Flujo Central: Marcado en el Kiosco
```
Docente ingresa cédula → Detecta ENTRADA o SALIDA →
Calcula diferencia vs horario → Persiste AttendanceRecord →
Emite evento WebSocket → Muestra cartel → Auto-reset 5 seg
```

### Lógica de Detección ENTRADA / SALIDA
- Sin registro hoy **o** último registro del día es `EXIT` → **ENTRY**
- Último registro del día es `ENTRY` → **EXIT**
- Múltiples pares ENTRY/EXIT por día están permitidos (multi-turno)

### Cálculo de Estado del Registro
| Condición | Status |
|-----------|--------|
| ENTRY, llega tarde | `LATE` + `difference_minutes > 0` |
| ENTRY, llega a tiempo | `ON_TIME` |
| EXIT, sale antes | `EARLY_EXIT` + `difference_minutes > 0` |
| EXIT, sale a tiempo o después | `ON_TIME` |
| Sin horario configurado | `NO_SCHEDULE` |

### Constraints Críticos
- **Cédula única por institución** (no global).
- **Un solo año lectivo activo por institución**.
- **Multitenancy**: admins solo operan recursos de su institución (`institutionId` extraído del JWT).
- **Docentes inactivos**: no pueden marcar → HTTP 422.
- **Kiosco sin autenticación**: para red interna solamente.

## 5. Agentes de Desarrollo

Archivos en `.github/agents/`:

| Agente | Responsabilidad |
|--------|----------------|
| `@BackendDeveloper` | Java Spring Boot — servicios, repositorios, controllers, JWT, WebSocket |
| `@FrontendDeveloper` | Next.js — kiosco, panel admin, hooks WebSocket, autenticación |
| `@DatabaseAdministrator` | PostgreSQL — migraciones Flyway, índices, queries JPA |
| `@TestEngineer` | Tests TDD — JUnit 5, Vitest, RTL; mantiene `docs/TEST_PLAN.md` |

## 6. Reglas de Implementación

### Backend
- **Controladores delgados**: sin lógica de negocio; solo recibir, delegar, responder.
- **Inyectar interfaces**, no implementaciones (DIP).
- **No `try-catch` en controladores**: usar `@RestControllerAdvice` global.
- **`@Transactional`** en métodos de servicio con escrituras múltiples.
- Nunca retornar `password_hash` en ningún DTO de respuesta.

### Frontend (Next.js App Router)
- **Server Components por defecto**. `'use client'` solo cuando sea necesario.
- **NUNCA** `next/dynamic` con `ssr: false` en Server Components.
- `params` / `searchParams` son Promises en Next.js 16 — siempre `await`.
- Formularios: `react-hook-form` + `zod` siempre.
- Kiosco: input con `focus()` permanente; auto-reset con `setTimeout` de 5000ms.

## 7. Reglas de Testing y Calidad

- **TDD**: tests antes o en paralelo a la implementación.
- **Cobertura objetivo**: 100% en `AttendanceService` y `KioskPage`, ≥ 90% en demás servicios.
- **Nombrado backend**: `methodName_whenCondition_thenExpectedBehavior`.
- **Actualizar `docs/TEST_PLAN.md`** al terminar cada test (🔴 → 🟢 → ✅).
- Todo cambio en la API: actualizar Swagger + tipos TypeScript del frontend.

## 8. Flujo de Trabajo AI-First

Antes de proponer cualquier cambio:
1. **Revisar impacto**: ¿afecta API, DTOs, tipos frontend, multitenancy, tests?
2. **Proponer o actualizar tests** referenciando `TEST_PLAN.md`.
3. **Implementar** el cambio mínimo necesario.
4. **Validar**: compilación + tests + `docker compose up`.

## 9. Definition of Done

- [ ] Compila sin errores (Java sin warnings, TypeScript strict).
- [ ] Pasa todos los tests del módulo afectado.
- [ ] Cobertura se mantiene o mejora.
- [ ] No rompe el flujo kiosco end-to-end.
- [ ] Multitenancy respetado (recursos = institución del admin JWT).
- [ ] `docker compose up --build` levanta todo en < 2 minutos.
- [ ] Cambios en API reflejados en Swagger + tipos frontend.

