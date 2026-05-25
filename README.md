# CapyCad - Aplicación CAD Web Todo-en-Uno

<div align="center">

![CapyCad](https://via.placeholder.com/800x200/4f46e5/ffffff?text=CapyCad+CAD+Web+App)

**Diseña, modela y exporta piezas 3D directamente desde tu navegador**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r165+-000000.svg)](https://threejs.org/)

</div>

---

## 🎯 ¿Qué es CapyCad?

CapyCad es una aplicación web CAD profesional que combina la potencia de software de escritorio como AutoCAD y Fusion 360 con la accesibilidad de una plataforma web moderna. Diseña piezas 2D/3D, aplica operaciones CAD avanzadas (chaflanes, empalmes, booleanas) y exporta directamente a formatos de impresión 3D.

### ✨ Características Principales

- 🎨 **Editor 2D Paramétrico**: Dibuja sketches con restricciones dimensionales y geométricas
- 🔷 **Modelado 3D Completo**: Extrusión, revolución, sweep, loft y operaciones booleanas
- 🔧 **Herramientas CAD Profesionales**: Fillet, chamfer, shell, offset, draft, patrones
- 🎬 **Renderizado PBR**: Visualiza tus diseños con materiales y iluminación realistas
- 📦 **Exportación Multi-Formato**: STL, M3F, OBJ para impresión 3D y manufactura
- 💾 **Guardado Local**: Proyectos .stlm descargables sin depender de la nube
- 🌐 **Colaboración en Tiempo Real**: Edita proyectos simultáneamente con tu equipo
- 🛒 **Marketplace Integrado**: Vende y compra modelos 3D premium

---

## 🚀 Demo

> **Coming Soon**: Link a demo en vivo

---

## 📋 Roadmap del Proyecto

### ✅ Fase 1 - MVP Funcional (Mes 1) - 🔄 EN PROGRESO

- ✅ Editor 2D con herramientas básicas (Línea, Círculo, Rectángulo)
- ✅ Sistema de snapping a grid
- ✅ Undo/Redo con historial ilimitado
- ✅ **Extrusión lineal con OpenCascade.js** (completado)
- ✅ **Feature Tree jerárquico** (Sketch → Extrusión)
- ✅ **Panel de propiedades editable**
- 🔄 Fillet y Chamfer (próximo)
- ⏸️ Revolución
- ✅ Visualización 3D con materiales PBR
- ⏸️ Exportación STL
- ⏸️ Guardado/carga local

**Progreso actual**: 4/8 user stories completadas (50%)

### 🔄 Fase 2 - CAD Completo (Mes 2)

- Restricciones paramétricas
- Operaciones avanzadas: Shell, Offset, Draft
- Patrones lineal y circular
- Sweep y Loft
- Exportación M3F, OBJ
- Renderizado PBR

### 📅 Fases 3-6 - Backend, Marketplace, Colaboración

Ver [roadmap completo en PRD](docs/PRD.md#roadmap-sugerido)

---

## 🛠️ Stack Tecnológico

### Frontend

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Motor 3D**: Three.js (rendering) + OpenCascade.js (CAD kernel)
- **Editor 2D**: Fabric.js
- **State**: Zustand
- **UI**: shadcn/ui + Tailwind CSS

### Backend (Fase 3+)

- **Runtime**: Node.js 20 LTS
- **Framework**: Express + TypeScript
- **Database**: PostgreSQL 16 + Prisma ORM
- **Storage**: AWS S3 / MinIO
- **WebSocket**: Socket.io
- **Payments**: Stripe

---

## 📁 Estructura del Proyecto

```
capycad/
├── apps/
│   ├── web/          # Frontend React (Vite)
│   └── api/          # Backend Node.js (Fase 3+)
├── packages/
│   └── shared-types/ # Tipos TypeScript compartidos
├── docs/
│   ├── PRD.md              # Documento de Requisitos
│   ├── USER_STORIES.md     # Historias de Usuario
│   └── ARCHITECTURE.md     # Arquitectura Técnica
└── README.md
```

---

## 🏁 Inicio Rápido

### Prerrequisitos

- Node.js 20+
- pnpm 8+ (o npm/yarn)
- Git

### Instalación

```bash
# Clonar el repositorio (o navegar al directorio del proyecto)
cd capycad

# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev
```

La aplicación estará disponible en `http://localhost:5173`

📖 **Guía completa**: Ver [SETUP.md](SETUP.md) para instrucciones detalladas y solución de problemas

---

## 🎨 Uso del Editor 2D

El editor 2D está **completamente funcional** y listo para usar:

### Flujo de Trabajo Básico

1. **Crear un Sketch**: Click en el botón "Nuevo Sketch" en el sidebar izquierdo
2. **Seleccionar Herramienta**: Click en Línea, Círculo o Rectángulo en la toolbar
3. **Dibujar**:
   - **Línea**: Click para punto inicial, click para punto final
   - **Círculo**: Click para centro, click para definir radio
   - **Rectángulo**: Click para primera esquina, click para esquina opuesta
4. **Undo/Redo**: Usa `Ctrl+Z` / `Ctrl+Y` o los botones en la toolbar
5. **Navegar**: Zoom con rueda del mouse, pan arrastrando el canvas

### Herramientas Disponibles

| Herramienta | Atajo    | Uso                           |
| ----------- | -------- | ----------------------------- |
| Selección   | -        | Seleccionar y mover entidades |
| Línea       | -        | Dibujar líneas rectas         |
| Círculo     | -        | Dibujar círculos              |
| Rectángulo  | -        | Dibujar rectángulos           |
| Undo        | `Ctrl+Z` | Deshacer última acción        |
| Redo        | `Ctrl+Y` | Rehacer acción deshecha       |
| Cancelar    | `Escape` | Cancelar dibujo en progreso   |

### Snapping

El sistema de snapping a grid está **activo por defecto**:

- Grid de 10px (configurable en `sketchStore.ts`)
- Puntos snap automáticamente al grid más cercano
- Visual feedback con líneas de grid

📖 **Guía completa del editor**: Ver [EDITOR_2D.md](docs/EDITOR_2D.md) para arquitectura, debugging y personalización

---

## 📚 Documentación

- **[PRD - Product Requirements Document](docs/PRD.md)**: Requisitos completos del producto
- **[User Stories](docs/USER_STORIES.md)**: Historias de usuario por fase
- **[Architecture](docs/ARCHITECTURE.md)**: Arquitectura técnica detallada
- **[Editor 2D Guide](docs/EDITOR_2D.md)**: Guía completa del editor 2D
- **[API Documentation](docs/API.md)**: Documentación de endpoints (Fase 3+)

---

## 🧪 Testing

```bash
# Ejecutar tests unitarios
pnpm test

# Ejecutar tests con cobertura
pnpm test:coverage

# Ejecutar tests E2E
pnpm test:e2e
```

---

## 🤝 Contribuir

Este es un proyecto personal en desarrollo activo. Las contribuciones son bienvenidas una vez que se lance la versión MVP.

### Guía de Contribución (Futuro)

1. Fork el proyecto
2. Crea una branch para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 👤 Autor

**Emiliano Galmarini**

- GitHub: [@emilianogalmarini](https://github.com/emilianogalmarini)

---

## 🙏 Agradecimientos

- [Three.js](https://threejs.org/) - Rendering 3D en el navegador
- [OpenCascade.js](https://ocjs.org/) - Kernel CAD para operaciones geométricas
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - React renderer para Three.js
- [Fabric.js](http://fabricjs.com/) - Editor 2D vectorial
- Comunidad maker y de impresión 3D por la inspiración

---

## 📊 Estado del Proyecto

- **Versión Actual**: 0.1.0-alpha
- **Estado**: En Desarrollo Activo 🚧
- **Última Actualización**: Abril 2026

---

<div align="center">

**⭐ Si te gusta este proyecto, considera darle una estrella en GitHub ⭐**

Made with ❤️ and ☕ by [Emiliano Galmarini](https://github.com/emilianogalmarini)

</div>
