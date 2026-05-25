# PRD: CAD Web Application (CapyCad)

## Descripción General

CapyCad es una aplicación web CAD todo-en-uno que permite a usuarios de todos los niveles (desde hobbyistas hasta profesionales) diseñar, modelar y exportar piezas 2D/3D para manufactura aditiva (impresión 3D) y sustractiva (corte CNC). La aplicación combina las capacidades de un software CAD profesional con la accesibilidad de una plataforma web moderna, eliminando barreras de instalación y permitiendo trabajo colaborativo en la nube.

- **PRD**: CAD Web Application (CapyCad)
- **Versión**: 1.0.0
- **Fecha**: Abril 2026
- **Estado**: En Desarrollo

---

## Resumen Ejecutivo

CapyCad revoluciona el diseño CAD al ofrecer una solución web completa que compite con software de escritorio tradicional como AutoCAD, Fusion 360 y SolidWorks. La plataforma permite crear diseños 2D y 3D paramétricos, aplicar operaciones CAD avanzadas (chaflanes, empalmes, booleanas), renderizar modelos con calidad fotorrealista y exportar a formatos estándar de la industria (STL, M3F, OBJ).

**Público Objetivo**: Hobbyistas de impresión 3D, makers, estudiantes, diseñadores industriales, ingenieros mecánicos y profesionales de manufactura que buscan una herramienta CAD accesible, potente y sin ataduras de licencias costosas.

**Propuesta de Valor**: Acceso inmediato desde cualquier navegador, sin instalación; capacidades CAD profesionales con curva de aprendizaje progresiva; integración con ecosistema de impresión 3D/CNC; marketplace de modelos y componentes; almacenamiento local y en nube.

---

## Requerimientos del Usuario

### REQ-001: Acceso Universal

**Necesidad**: Como usuario quiero acceder a la aplicación desde cualquier dispositivo con navegador web sin necesidad de instalar software, para poder trabajar en mis diseños desde cualquier lugar (casa, trabajo, biblioteca, etc.).

**Vinculación**: Arquitectura web responsive, soporte multi-navegador (Chrome, Firefox, Safari, Edge), optimización para tablets con stylus.

---

### REQ-002: Diseño 2D y 3D Integrado

**Necesidad**: Como diseñador quiero crear bocetos 2D que pueda convertir fácilmente en modelos 3D mediante extrusión, revolución y barrido, porque así es como trabajo conceptualmente mis diseños mecánicos.

**Vinculación**: Editor 2D parametrizado + herramientas de transformación 3D + preview en tiempo real.

---

### REQ-003: Herramientas CAD Profesionales

**Necesidad**: Como ingeniero mecánico requiero operaciones CAD estándar (chaflán, empalme, offset, shell, draft) para crear piezas manufacturables con tolerancias y acabados adecuados.

**Vinculación**: Motor CAD con kernel geométrico (OpenCascade.js) + validación de geometría + análisis de manufacturabilidad.

---

### REQ-004: Exportación Multi-Formato

**Necesidad**: Como usuario de impresión 3D necesito exportar mis modelos a STL/M3F para impresoras FDM/SLA, y a OBJ para visualización/importación en otros software.

**Vinculación**: Biblioteca de exportación con configuración de resolución de malla + validación de manifold + reparación automática.

---

### REQ-005: Guardado Local y Persistencia

**Necesidad**: Como usuario quiero guardar mis proyectos localmente en mi computadora y poder cargarlos cuando quiera continuar trabajando, sin depender de conexión a internet.

**Vinculación**: Sistema de archivos de proyecto (.stlm) + serialización/deserialización + auto-guardado + historial de versiones.

---

### REQ-006: Renderizado de Calidad

**Necesidad**: Como diseñador industrial necesito visualizar mis modelos con materiales realistas, iluminación y sombras para presentar propuestas a clientes.

**Vinculación**: Motor de render PBR (Physically Based Rendering) + biblioteca de materiales + HDRI environments + post-processing.

---

### REQ-007: Gestión de Usuarios y Comunidad

**Necesidad**: Como miembro de la comunidad maker quiero crear una cuenta para guardar mis proyectos en la nube, compartir diseños y acceder a modelos de otros usuarios.

**Vinculación**: Backend con autenticación + almacenamiento en nube + sistema de compartición + galería comunitaria.

---

### REQ-008: Marketplace Integrado

**Necesidad**: Como creador de contenido quiero monetizar mis diseños vendiendo modelos 3D premium a través de una tienda integrada en la plataforma.

**Vinculación**: E-commerce con pasarela de pagos + sistema de licencias + gestión de descargas + analytics para vendedores.

---

### REQ-009: Curva de Aprendizaje Progresiva

**Necesidad**: Como principiante necesito una interfaz intuitiva con tutoriales interactivos que me guíen desde lo básico hasta funciones avanzadas, sin sentirme abrumado.

**Vinculación**: UI/UX adaptativa por nivel de usuario + tooltips contextuales + wizard de bienvenida + video tutorials in-app.

---

### REQ-010: Colaboración en Tiempo Real

**Necesidad**: Como equipo de diseño queremos trabajar simultáneamente en el mismo proyecto, viendo cambios en tiempo real como en Google Docs.

**Vinculación**: WebSocket backend + CRDT para resolución de conflictos + cursores multi-usuario + comentarios y anotaciones.

---

## Requerimientos Funcionales

### Módulo: Editor 2D

#### FUNC-001: Herramientas de Dibujo Básico

**Descripción**: El sistema debe proporcionar herramientas de dibujo vectorial 2D incluyendo líneas, arcos, círculos, elipses, rectángulos, polígonos y splines (Bézier y NURBS).

**Vinculación**: REQ-002

**Criterios de Aceptación**:

- Cada herramienta tiene icono distintivo en toolbar
- Shortcuts de teclado configurables (L=línea, C=círculo, etc.)
- Snap a grid con configuración de espaciado
- Snap a puntos especiales (endpoints, midpoints, center, intersection)
- Preview en tiempo real mientras se dibuja
- Undo/Redo ilimitado (Ctrl+Z / Ctrl+Y)

---

#### FUNC-002: Acotación y Restricciones Paramétricas

**Descripción**: El usuario puede definir cotas dimensionales (distancia, radio, ángulo) y restricciones geométricas (paralelo, perpendicular, tangente, concéntrico) que se actualizan automáticamente.

**Vinculación**: REQ-002, REQ-003

**Criterios de Aceptación**:

- Panel de restricciones muestra todas las constraints activas
- Cotas editables haciendo doble click
- Solver de restricciones resuelve geometría en < 100ms para sketches de hasta 500 entidades
- Indicadores visuales de sobre-restricción o sub-restricción
- Exportación de tabla de parámetros a CSV

---

#### FUNC-003: Operaciones Booleanas 2D

**Descripción**: Unión, resta, intersección y XOR de perfiles 2D cerrados.

**Vinculación**: REQ-002

**Criterios de Aceptación**:

- Funciona con perfiles multicontorno (con islas)
- Resultado siempre es geometría válida
- Preview de operación antes de confirmar
- Manejo de casos edge (líneas superpuestas, puntos coincidentes)

---

### Módulo: Transformación 3D

#### FUNC-004: Extrusión Lineal y de Revolución

**Descripción**: Convertir sketches 2D en sólidos 3D mediante extrusión lineal (con draft angle opcional) o revolución alrededor de un eje.

**Vinculación**: REQ-002

**Criterios de Aceptación**:

- Extrusión con distancia configurable (positiva o negativa)
- Draft angle de -45° a +45°
- Revolución con ángulo parcial (ej. 270° para crear 3/4 de cilindro)
- Preview en tiempo real con calidad baja (wireframe) para performance
- Opción de crear sólido o superficie

---

#### FUNC-005: Barrido y Loft

**Descripción**: Crear geometría 3D siguiendo una trayectoria (sweep) o interpolando entre múltiples perfiles (loft).

**Vinculación**: REQ-002, REQ-003

**Criterios de Aceptación**:

- Sweep soporta trayectorias 3D complejas (splines)
- Loft entre 2 a 10 perfiles
- Control de tangencia en puntos de unión
- Opción de superficie de unión o sólido cerrado

---

### Módulo: Operaciones CAD Avanzadas

#### FUNC-006: Chaflán (Chamfer)

**Descripción**: Aplicar biselado a aristas seleccionadas con distancia o ángulo configurable.

**Vinculación**: REQ-003

**Criterios de Aceptación**:

- Selección múltiple de aristas (click + Shift)
- Modo distancia-distancia o distancia-ángulo
- Preview interactivo arrastrando manija 3D
- Validación de aplicabilidad (aristas compatibles)
- Historial de features editable

---

#### FUNC-007: Empalme (Fillet)

**Descripción**: Redondear aristas con radio configurable, incluyendo fillets de radio variable.

**Vinculación**: REQ-003

**Criterios de Aceptación**:

- Radio constante o variable a lo largo de la arista
- Propagación automática a aristas tangentes (opcional)
- Manejo de confluencias (3+ aristas en un vértice)
- Límites de radio según geometría adyacente

---

#### FUNC-008: Operaciones Booleanas 3D

**Descripción**: Unión, resta, intersección de sólidos 3D con detección automática de interferencias.

**Vinculación**: REQ-003

**Criterios de Aceptación**:

- Unión elimina caras internas
- Resta maneja múltiples herramientas
- Resultado siempre es manifold válido
- Reporte de volumen antes/después

---

#### FUNC-009: Shell y Offset

**Descripción**: Crear carcasa hueca removiendo una o más caras, con espesor de pared uniforme. Offset de caras hacia adentro/afuera.

**Vinculación**: REQ-003

**Criterios de Aceptación**:

- Shell con espesor de 0.1mm a 100mm
- Selección de múltiples caras a remover
- Validación de auto-intersecciones
- Offset individual de caras con distancias independientes

---

#### FUNC-010: Draft (Ángulo de Desmoldeo)

**Descripción**: Aplicar ángulo de salida a caras seleccionadas respecto a un plano neutro, esencial para piezas moldeadas.

**Vinculación**: REQ-003

**Criterios de Aceptación**:

- Selección de plano neutro (XY, YZ, XZ o custom)
- Ángulo de -30° a +30°
- Preview con código de colores indicando dirección
- Validación de manufacturabilidad

---

#### FUNC-011: Patrón Lineal y Circular

**Descripción**: Replicar features (holes, bosses, fillets) en patrones rectangulares o radiales.

**Vinculación**: REQ-003

**Criterios de Aceptación**:

- Patrón lineal: 1D o 2D (filas x columnas)
- Patrón circular: instancias equiespaciadas alrededor de eje
- Opción de suprimir instancias individuales
- Pattern de patterns (anidados)

---

### Módulo: Importación y Exportación

#### FUNC-012: Exportación STL

**Descripción**: Exportar modelos 3D a formato STL (ASCII o binario) con configuración de resolución de malla.

**Vinculación**: REQ-004

**Criterios de Aceptación**:

- Selección de unidades (mm, cm, in)
- Resolución: baja (rápida), media, alta (máxima calidad)
- Validación de manifold automática
- Reporte de estadísticas (triángulos, vértices, volumen, área)
- Reparación automática opcional (cerrar agujeros, unificar normales)

---

#### FUNC-013: Exportación M3F

**Descripción**: Exportar a formato M3F (Manufacturing File Format) con metadatos de manufactura embebidos.

**Vinculación**: REQ-004

**Criterios de Aceptación**:

- Embedding de material, tolerancias, acabado superficial
- Información de orientación óptima de impresión
- Color por cara/vértice
- Compatibilidad con slicers modernos (PrusaSlicer, Cura)

---

#### FUNC-014: Exportación OBJ

**Descripción**: Exportar a formato OBJ con materiales (MTL) para interoperabilidad con software de visualización/rendering.

**Vinculación**: REQ-004

**Criterios de Aceptación**:

- Grupos por componente
- Archivos MTL con texturas embebidas o referenciadas
- Normales suavizadas o facetadas (configurable)
- UVs preservados si existen

---

#### FUNC-015: Importación Multi-Formato

**Descripción**: Importar archivos STL, OBJ, STEP (básico) para edición o ensamblaje.

**Vinculación**: REQ-005

**Criterios de Aceptación**:

- Parsing robusto con manejo de archivos corruptos
- Heurística de unidades (detección automática o selección manual)
- Conversión de malla a B-Rep (opcional, para edición)
- Preview antes de importar con info de complejidad

---

### Módulo: Gestión de Archivos

#### FUNC-016: Guardado de Proyecto Local

**Descripción**: Serializar proyecto completo (geometría, historial de features, vistas, anotaciones) a archivo .stlm descargable.

**Vinculación**: REQ-005

**Criterios de Aceptación**:

- Formato JSON comprimido (gzip)
- Tamaño < 10MB para proyectos típicos (50 features)
- Versionado de formato para compatibilidad futura
- Metadata: autor, fecha, descripción, thumbnail

---

#### FUNC-017: Carga de Proyecto Local

**Descripción**: Parsear y reconstruir proyecto desde archivo .stlm con validación de integridad.

**Vinculación**: REQ-005

**Criterios de Aceptación**:

- Drag & drop o selector de archivo
- Progress bar para archivos grandes
- Manejo de versiones antiguas (migración automática)
- Reporte de features no reconstructibles (con fallback)

---

#### FUNC-018: Auto-Guardado

**Descripción**: Guardar estado del proyecto automáticamente en IndexedDB cada 2 minutos.

**Vinculación**: REQ-005

**Criterios de Aceptación**:

- No interrumpe trabajo del usuario (background)
- Almacena últimas 10 versiones
- Recuperación automática tras crash
- Opción de deshabilitar en configuración

---

### Módulo: Renderizado y Visualización

#### FUNC-019: Modos de Visualización

**Descripción**: Cambiar entre modos wireframe, shaded, shaded with edges, y rendered (PBR).

**Vinculación**: REQ-006

**Criterios de Aceptación**:

- Shortcuts rápidos (W, S, E, R)
- Wireframe con detección de aristas vivas vs suavizadas
- Shaded con iluminación básica (3-point lighting)
- Rendered con sombras, AO, reflections

---

#### FUNC-020: Biblioteca de Materiales PBR

**Descripción**: Colección de materiales predefinidos (metales, plásticos, madera, vidrio) aplicables a sólidos.

**Vinculación**: REQ-006

**Criterios de Aceptación**:

- Mínimo 50 materiales predefinidos
- Parámetros editables (roughness, metalness, color)
- Preview en esfera en tiempo real
- Importación de materiales custom (albedo, normal, roughness maps)

---

#### FUNC-021: Iluminación y Entornos HDRI

**Descripción**: Configurar iluminación de escena con luces direccionales, puntuales, y entornos HDRI para reflejos realistas.

**Vinculación**: REQ-006

**Criterios de Aceptación**:

- 3 tipos de luz: directional, point, spot
- 10+ HDRIs predefinidos (estudio, exterior, interior)
- Intensidad y color configurables
- Ground plane con sombras proyectadas

---

#### FUNC-022: Post-Procesado

**Descripción**: Efectos de post-procesado: bloom, tone mapping, SSAO, depth of field, motion blur.

**Vinculación**: REQ-006

**Criterios de Aceptación**:

- Activación/desactivación individual de efectos
- Presets (draft, presentation, photo-realistic)
- Performance mode (desactiva efectos costosos)
- Exportación de renders a PNG/JPG en alta resolución (hasta 4K)

---

### Módulo: Backend y Autenticación

#### FUNC-023: Registro y Login de Usuarios

**Descripción**: Sistema de autenticación con email/password, OAuth (Google, GitHub), y recuperación de contraseña.

**Vinculación**: REQ-007

**Criterios de Aceptación**:

- Validación de email con confirmación
- Contraseña: mínimo 8 caracteres, 1 mayúscula, 1 número
- Login persistente con JWT (7 días)
- Límite de intentos fallidos (5) con lockout temporal

---

#### FUNC-024: Almacenamiento en Nube

**Descripción**: Sincronización automática de proyectos a cuenta de usuario en servidor.

**Vinculación**: REQ-007

**Criterios de Aceptación**:

- Quota: 5GB para usuarios free, 100GB para premium
- Sincronización incremental (solo cambios)
- Manejo de conflictos (last-write-wins con opción de merge)
- Compartición de proyectos con permisos (view, edit, admin)

---

#### FUNC-025: Galería Comunitaria

**Descripción**: Explorar, buscar y descargar modelos públicos compartidos por otros usuarios.

**Vinculación**: REQ-007

**Criterios de Aceptación**:

- Filtros por categoría (mecánico, arquitectura, arte, etc.)
- Búsqueda por texto y tags
- Sistema de likes y comentarios
- Reportar contenido inapropiado
- Trending y featured models

---

### Módulo: Marketplace

#### FUNC-026: Publicación de Modelos de Pago

**Descripción**: Creadores pueden listar modelos con precio, descripción, preview y licencia.

**Vinculación**: REQ-008

**Criterios de Aceptación**:

- Precio de $0.99 a $999.99
- Hasta 10 imágenes + 1 video preview
- 3 tipos de licencia (personal, comercial, extendida)
- Editor WYSIWYG para descripción

---

#### FUNC-027: Pasarela de Pagos

**Descripción**: Integración con Stripe para procesamiento de pagos con tarjeta y PayPal.

**Vinculación**: REQ-008

**Criterios de Aceptación**:

- Checkout seguro con PCI compliance
- Soporte de múltiples monedas (USD, EUR, GBP)
- Facturación automática por email
- Dashboard de ventas para creadores
- Comisión de plataforma: 15% por transacción

---

#### FUNC-028: Sistema de Reviews

**Descripción**: Compradores pueden dejar reseñas (1-5 estrellas) y comentarios en modelos comprados.

**Vinculación**: REQ-008

**Criterios de Aceptación**:

- Solo compradores verificados pueden opinar
- Respuesta del vendedor opcional
- Ordenamiento por relevancia/fecha
- Flagging de reviews spam

---

### Módulo: Onboarding y Educación

#### FUNC-029: Tutorial Interactivo

**Descripción**: Wizard guiado que enseña operaciones básicas creando una pieza simple paso a paso.

**Vinculación**: REQ-009

**Criterios de Aceptación**:

- 5 tutoriales progresivos (beginner a advanced)
- Highlights y tooltips contextuales
- Validación de acciones del usuario
- Opción de saltar o repetir
- Certificado de completitud (gamificación)

---

#### FUNC-030: Asistente Contextual con IA

**Descripción**: Chatbot con LLM que responde preguntas sobre cómo usar la herramienta y sugiere workflows óptimos.

**Vinculación**: REQ-009

**Criterios de Aceptación**:

- Entrenado en documentación completa del software
- Respuestas con links a tutoriales relevantes
- Detección de intención (ej. "¿cómo redondeo esta esquina?" → sugiere Fillet)
- Historial de conversación persistente

---

### Módulo: Colaboración

#### FUNC-031: Edición Multi-Usuario en Tiempo Real

**Descripción**: Múltiples usuarios pueden editar el mismo proyecto simultáneamente con cursores visibles y merge automático de cambios.

**Vinculación**: REQ-010

**Criterios de Aceptación**:

- Latencia < 200ms para sincronización
- Colisión de ediciones: last-write-wins con notificación
- Presencia de usuarios activos (avatares)
- Chat integrado en sidebar

---

#### FUNC-032: Sistema de Comentarios y Anotaciones

**Descripción**: Anclar comentarios a geometría específica (caras, aristas) visibles para colaboradores.

**Vinculación**: REQ-010

**Criterios de Aceptación**:

- Comentarios con texto, imágenes, y menciones (@usuario)
- Hilos de conversación
- Estado: abierto, resuelto, cerrado
- Notificaciones por email y in-app

---

## Requerimientos No Funcionales

### NFUNC-001: Performance y Responsividad

**Descripción**: La aplicación debe mantener 60 FPS en viewport 3D con modelos de hasta 1 millón de polígonos en hardware moderno (GPU de 4GB).

**Vinculación**: REQ-001, REQ-002

**Criterios de Aceptación**:

- Tiempo de carga inicial < 3 segundos (above-the-fold)
- Operaciones CAD (fillet, chamfer) < 500ms para geometría típica
- Lazy loading de módulos (code splitting)
- Progressive web app (funcionamiento básico offline)

---

### NFUNC-002: Compatibilidad de Navegadores

**Descripción**: Funcionamiento completo en Chrome 90+, Firefox 88+, Safari 14+, Edge 90+.

**Vinculación**: REQ-001

**Criterios de Aceptación**:

- Detección de WebGL 2.0 con fallback a WebGL 1.0
- Polyfills para features ES2020+
- Testing automatizado en BrowserStack
- Mensaje de advertencia para navegadores no soportados

---

### NFUNC-003: Responsive Design

**Descripción**: UI adaptada a desktop (1920x1080), laptop (1366x768), y tablet (iPad Pro 12.9").

**Vinculación**: REQ-001

**Criterios de Aceptación**:

- Viewport 3D ocupa 70% en desktop, 60% en tablet
- Toolbars colapsables en pantallas pequeñas
- Touch gestures (pinch-zoom, two-finger rotate)
- No soportar móviles (mensaje de redirección a desktop)

---

### NFUNC-004: Seguridad

**Descripción**: Protección contra vulnerabilidades comunes (XSS, CSRF, SQL injection) y cifrado de datos sensibles.

**Vinculación**: REQ-007, REQ-008

**Criterios de Aceptación**:

- HTTPS obligatorio en producción
- Sanitización de inputs
- JWT con refresh tokens
- Passwords hasheadas con bcrypt (cost 12)
- Auditoría de seguridad trimestral
- Rate limiting en APIs (100 req/min por IP)

---

### NFUNC-005: Escalabilidad

**Descripción**: Arquitectura que soporte 10,000 usuarios concurrentes y 1 millón de usuarios registrados en fase 1.

**Vinculación**: REQ-007

**Criterios de Aceptación**:

- Backend stateless con balanceo de carga
- CDN para assets estáticos
- Database sharding por región geográfica
- Cache con Redis para sesiones
- Auto-scaling en Kubernetes

---

### NFUNC-006: Disponibilidad

**Descripción**: SLA de 99.5% uptime (downtime máximo de ~3.6 hrs/mes).

**Vinculación**: REQ-001

**Criterios de Aceptación**:

- Multi-region deployment con failover automático
- Health checks cada 30 segundos
- Backups diarios con retención de 30 días
- Disaster recovery plan documentado
- Monitoreo con alertas (PagerDuty)

---

### NFUNC-007: Accesibilidad (WCAG 2.1 AA)

**Descripción**: Interfaz accesible para usuarios con discapacidades visuales, motoras y cognitivas.

**Vinculación**: REQ-009

**Criterios de Aceptación**:

- Contraste mínimo 4.5:1 en textos
- Navegación completa por teclado
- Screen reader compatible (ARIA labels)
- Textos alternativos en iconos
- Reducción de movimiento (prefers-reduced-motion)

---

### NFUNC-008: Internacionalización (i18n)

**Descripción**: Soporte multi-idioma con detección automática de locale del navegador.

**Vinculación**: REQ-001

**Criterios de Aceptación**:

- Idiomas iniciales: inglés, español, francés, alemán, japonés
- Strings externalizados en archivos JSON
- Formato de fechas, números y unidades según locale
- RTL support para árabe y hebreo (futuro)

---

### NFUNC-009: Observabilidad

**Descripción**: Logging, métricas y tracing para diagnóstico de problemas en producción.

**Vinculación**: Todos los requerimientos (operacional)

**Criterios de Aceptación**:

- Logs estructurados (JSON) con niveles (debug, info, warn, error)
- Métricas de negocio (modelos creados, exportaciones, ventas)
- Traces distribuidos con OpenTelemetry
- Dashboards en Grafana para métricas clave
- Alertas automáticas en anomalías (spike de errores)

---

### NFUNC-010: Documentación Técnica

**Descripción**: Documentación completa de arquitectura, APIs y guías de contribución.

**Vinculación**: Todos los requerimientos (mantenibilidad)

**Criterios de Aceptación**:

- Diagramas de arquitectura (C4 model)
- API docs con OpenAPI/Swagger
- Comentarios JSDoc/TypeDoc en código crítico
- Wiki para decisiones de diseño (ADRs)
- README con setup instructions < 10 minutos

---

## Arquitectura Técnica Recomendada

### Frontend Stack

- **Framework**: React 18+ con TypeScript (strict mode)
- **Build Tool**: Vite (desarrollo rápido) o Next.js 15+ (si se requiere SSR para SEO)
- **Motor 3D**:
  - **Three.js** (r150+) para rendering y escena 3D
  - **OpenCascade.js** (7.6+) para operaciones CAD kernel (importado como Web Worker para no bloquear UI)
  - Alternativa todo-en-uno: **Babylon.js** (6.0+) con extensión de modelado
- **UI Components**:
  - shadcn/ui + Radix UI (componentes accesibles)
  - Tailwind CSS para estilos
- **State Management**:
  - Zustand (global state ligero)
  - TanStack Query (server state)
- **Formularios**: React Hook Form + Zod
- **2D Canvas**: Fabric.js o Konva.js para editor de sketches
- **File Format Parsers**:
  - three-stdlib (STL, OBJ loaders)
  - occt-import-js (STEP reader)

### Backend Stack

- **Runtime**: Node.js 20 LTS con Express o Fastify
- **Lenguaje**: TypeScript
- **Database**:
  - PostgreSQL 16 (datos relacionales: users, projects, orders)
  - S3-compatible storage (MinIO o AWS S3) para archivos .stlm
- **Autenticación**: Passport.js + JWT + OAuth2
- **WebSocket**: Socket.io para colaboración en tiempo real
- **File Processing**:
  - Sharp (thumbnails de previews)
  - FFmpeg (videos de marketing)
- **Payments**: Stripe SDK
- **Email**: SendGrid o AWS SES
- **Hosting Recomendado**:
  - Frontend: Vercel o Netlify
  - Backend: Railway, Render, o AWS ECS
  - Database: Supabase (Postgres managed) o Railway

### Arquitectura de Datos

```
frontend/
  ├── src/
  │   ├── components/
  │   │   ├── canvas/         # Viewport 3D con Three.js
  │   │   ├── editor/         # Editor 2D de sketches
  │   │   ├── toolbar/        # Herramientas CAD
  │   │   ├── sidebar/        # Feature tree, propiedades
  │   │   └── ui/            # Componentes reutilizables
  │   ├── lib/
  │   │   ├── cad-kernel/    # Wrappers de OpenCascade.js
  │   │   ├── exporters/     # STL, OBJ, M3F writers
  │   │   ├── project/       # Serialización .stlm
  │   │   └── collaboration/ # WebSocket client
  │   ├── hooks/             # Custom hooks
  │   ├── stores/            # Zustand stores
  │   └── pages/             # Rutas principales
  │
backend/
  ├── src/
  │   ├── api/              # REST endpoints
  │   ├── websocket/        # Socket.io handlers
  │   ├── services/         # Lógica de negocio
  │   ├── models/           # Prisma models
  │   ├── middleware/       # Auth, validation
  │   └── workers/          # Jobs asíncronos (thumbnails)
  │
shared/
  └── types/               # TypeScript interfaces compartidas
```

---

## Casos de Uso Principales

### CU-001: Crear Pieza Mecánica Básica

**Actor**: Estudiante de ingeniería  
**Flujo**:

1. Usuario inicia sesión y crea nuevo proyecto
2. Selecciona plano de trabajo (plano XY)
3. Dibuja rectángulo 50x30mm con herramienta rectangle
4. Agrega 4 círculos de 5mm de diámetro en las esquinas (agujeros de montaje)
5. Aplica operación booleana 2D (resta círculos del rectángulo)
6. Extruye sketch 10mm hacia arriba
7. Aplica fillet de 2mm a aristas superiores
8. Asigna material "Plastic ABS - Black"
9. Exporta a STL con resolución media
10. Descarga archivo "mounting_plate.stl"

---

### CU-002: Colaborar en Diseño de Producto

**Actores**: Diseñador líder + 2 diseñadores junior  
**Flujo**:

1. Líder crea proyecto "ProductCasing" y lo marca como colaborativo
2. Invita a 2 colegas por email con permisos de edición
3. Diseñador 1 modela carcasa principal usando loft entre 3 perfiles
4. Diseñador 2 añade clips de ensamblaje en las paredes laterales (simultáneamente)
5. Líder revisa en tiempo real, añade comentario: "Reducir altura de clips 1mm"
6. Diseñador 2 edita feature del clip desde el feature tree
7. Todos aprueban diseño final
8. Líder exporta a M3F con metadatos de material (ABS, 2mm wall thickness)
9. Proyecto se guarda automáticamente en nube con historial de versiones

---

### CU-003: Renderizar Presentación para Cliente

**Actor**: Diseñador industrial  
**Flujo**:

1. Importa modelo completado en formato .stlm
2. Cambia a modo Rendered (PBR)
3. Aplica material "Brushed Aluminum" a carcasa
4. Aplica material "Glass Clear" a ventana frontal
5. Selecciona HDRI "Studio Softbox" para iluminación
6. Ajusta cámara: vista a 45°, focal length 50mm
7. Activa post-procesado: bloom, SSAO, depth of field
8. Renderiza imagen 4K (3840x2160)
9. Exporta JPG con compresión 90%
10. Descarga "product_presentation.jpg"

---

### CU-004: Vender Modelo en Marketplace

**Actor**: Creator profesional  
**Flujo**:

1. Usuario completa diseño de "Parametric Gear Generator"
2. Navega a "My Store" en dashboard
3. Click en "Publish New Model"
4. Sube archivo .stlm + 5 renders + video de 30 seg demostrando uso
5. Escribe descripción con editor WYSIWYG (500 palabras)
6. Agrega tags: "mechanical", "gears", "parametric", "engineering"
7. Selecciona licencia: "Commercial Extended"
8. Fija precio: $29.99
9. Publica modelo → aparece en marketplace
10. Comprador adquiere modelo → Creator recibe $25.49 (85% de $29.99)

---

## Flujo de Usuario (User Journey)

### Nuevo Usuario (Principiante)

```
Landing Page → Sign Up → Welcome Tutorial (Sketch + Extrude) →
Create First Project → Use CAD Tools → Export STL →
Download File → [Optional] Share to Community
```

### Usuario Recurrente (Intermedio)

```
Login → Dashboard (Recent Projects) → Open Project →
Edit Features → Apply Materials → Render Preview →
Save to Cloud → Collaborate (Invite Team) → Export Multi-Format
```

### Usuario Avanzado (Profesional)

```
Login → Import STEP → Advanced CAD Ops (Draft, Shell, Patterns) →
Assemblies (Multiple Parts) → Simulation (Future) →
Render Photorealistic → Marketplace Upload → Monitor Sales Analytics
```

---

## Roadmap Sugerido

> **Nota**: Este roadmap es flexible y ajustable según las necesidades del desarrollador. Los tiempos son estimaciones para desarrollo local e individual, y pueden modificarse según prioridades y recursos disponibles.

### Fase 1 - MVP Funcional (Mes 1)

- [ ] Editor 2D con herramientas básicas (líneas, arcos, círculos)
- [ ] Extrusión lineal y revolución
- [ ] Operaciones CAD: Fillet, Chamfer, Booleanas 3D
- [ ] Visualización: Wireframe, Shaded, Preview
- [ ] Exportación: STL solamente
- [ ] Guardado/carga de proyectos locales (.stlm)
- [ ] UI básica con toolbar y feature tree

### Fase 2 - CAD Completo (Mes 2)

- [ ] Restricciones paramétricas
- [ ] Operaciones avanzadas: Shell, Offset, Draft
- [ ] Patrones lineal y circular
- [ ] Sweep y Loft
- [ ] Exportación: M3F, OBJ
- [ ] Importación: STL, OBJ
- [ ] Materiales PBR (30 predefinidos)
- [ ] Renderizado avanzado con HDRI

### Fase 3 - Backend y Comunidad (Mes 3)

- [ ] Sistema de autenticación (email + OAuth)
- [ ] Almacenamiento en nube
- [ ] Galería comunitaria
- [ ] Sistema de búsqueda y filtros
- [ ] Likes y comentarios
- [ ] Tutorial interactivo completo

### Fase 4 - Marketplace y Monetización (Mes 4)

- [ ] Integración de pagos (Stripe)
- [ ] Publicación de modelos de pago
- [ ] Sistema de licencias
- [ ] Dashboard de vendedor
- [ ] Reviews y ratings
- [ ] Analytics de ventas

### Fase 5 - Colaboración (Mes 5)

- [ ] WebSocket backend
- [ ] Edición multi-usuario en tiempo real
- [ ] Cursores remotos
- [ ] Sistema de comentarios anclados
- [ ] Chat integrado
- [ ] Resolución de conflictos

### Fase 6 - Avanzado (Mes 6+)

- [ ] Ensamblajes (múltiples piezas)
- [ ] Simulación FEA básica
- [ ] Importación STEP/IGES completa
- [ ] Generative design con IA
- [ ] Plugin system (extensiones de terceros)
- [ ] Aplicación de escritorio (Electron)

---

## Métricas de Éxito (KPIs)

### Adopción

- **Usuarios registrados**: 10,000 en primer año
- **Usuarios activos mensuales (MAU)**: 3,000 (30% de registrados)
- **Proyectos creados**: 50,000 en primer año
- **Tasa de retención (Day 7)**: > 40%

### Engagement

- **Sesiones promedio/mes**: 8 sesiones por usuario activo
- **Tiempo promedio/sesión**: 25 minutos
- **Modelos exportados/usuario/mes**: 5 exportaciones
- **Tasa de completitud de tutorial**: > 60%

### Marketplace

- **GMV (Gross Merchandise Volume)**: $100,000 en primer año post-launch
- **Modelos publicados**: 1,000 modelos
- **Conversion rate (visits → purchases)**: 2-5%
- **Vendedores activos**: 200 creators

### Técnicas

- **Performance**: 60 FPS en viewport 3D
- **Disponibilidad**: 99.5% uptime
- **Tiempo de carga inicial**: < 3 segundos (P95)
- **Tasa de errores**: < 0.5% de requests

### Financieras

- **Ingresos**: $150,000 año 1 (comisiones marketplace + suscripciones premium futuras)
- **CAC (Customer Acquisition Cost)**: < $20
- **LTV (Lifetime Value)**: > $100
- **LTV/CAC Ratio**: > 3

---

## Riesgos y Mitigaciones

### Riesgo 1: Complejidad Técnica de OpenCascade.js

**Probabilidad**: Alta | **Impacto**: Alto  
**Mitigación**:

- Prototipo POC (Proof of Concept) en Fase 0 con operaciones críticas
- Contratar consultor experto en OCCT si es necesario
- Plan B: Usar biblioteca más simple (Manifold) con funcionalidad reducida

### Riesgo 2: Performance en Navegador

**Probabilidad**: Media | **Impacto**: Alto  
**Mitigación**:

- Implementar Web Workers para cálculos pesados
- LOD (Level of Detail) para modelos complejos
- Culling agresivo de geometría no visible
- Benchmarking continuo con modelos reales

### Riesgo 3: Adopción de Usuarios

**Probabilidad**: Media | **Impacto**: Crítico  
**Mitigación**:

- Beta cerrada con 100 early adopters antes del launch público
- Programa de referidos (invita 5 amigos → mes premium gratis)
- Content marketing (tutoriales en YouTube, blog posts SEO)
- Partnership con comunidades maker (r/3Dprinting, forums)

### Riesgo 4: Competencia de Software Establecido

**Probabilidad**: Alta | **Impacto**: Medio  
**Mitigación**:

- Diferenciación: web-first, colaboración, marketplace integrado
- Freemium model agresivo (80% funcionalidad gratis)
- Nichos desatendidos: educación, hobbyistas, países emergentes
- Evangelización en eventos (Maker Faire, TCT Show)

### Riesgo 5: Costos de Infraestructura Escalables

**Probabilidad**: Media | **Impacto**: Medio  
**Mitigación**:

- Arquitectura serverless donde sea posible (reducir costos fijos)
- CDN para assets (reduce egress bandwidth)
- Compresión agresiva de archivos .stlm
- Quotas estrictas en tier gratuito (5GB storage, 100 exports/mes)

---

## Dependencias y Prerequisitos

### Técnicas

- [ ] Investigación y selección final de motor CAD kernel
- [ ] Setup de entorno de desarrollo (monorepo con Turborepo)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Infraestructura de staging y producción

### Diseño

- [ ] Sistema de diseño completo (Figma)
- [ ] Iconografía custom para herramientas CAD
- [ ] Guías de UX para operaciones complejas
- [ ] Prototipos interactivos de flujos críticos

### Legales

- [ ] Términos de servicio y política de privacidad
- [ ] Acuerdos de marketplace (vendedor y comprador)
- [ ] Licencias de software open-source (compliance)
- [ ] GDPR compliance (si hay usuarios EU)

### Business

- [ ] Modelo de precios final (freemium tiers)
- [ ] Contrato con pasarela de pagos (Stripe)
- [ ] Plan de marketing y adquisición
- [ ] Partnerships estratégicos (Prusa, Ultimaker, etc.)

---

## Anexos

### A. Glosario de Términos CAD

- **B-Rep (Boundary Representation)**: Representación de sólidos mediante sus fronteras (caras, aristas, vértices)
- **Chamfer**: Biselado de arista con distancia o ángulo
- **CRDT (Conflict-free Replicated Data Type)**: Estructura de datos para sincronización distribuida
- **Draft Angle**: Ángulo de desmoldeo para facilitar extracción de moldes
- **Fillet**: Redondeo de arista con radio especificado
- **Loft**: Interpolación de geometría entre múltiples perfiles
- **Manifold**: Sólido cerrado sin agujeros ni auto-intersecciones (válido para impresión 3D)
- **NURBS (Non-Uniform Rational B-Splines)**: Curvas/superficies matemáticas para modelado preciso
- **PBR (Physically Based Rendering)**: Renderizado con modelos de iluminación realistas
- **Shell**: Operación que crea carcasa hueca removiendo caras
- **Sweep**: Extrusión de perfil a lo largo de una trayectoria 3D

### B. Referencias de Competencia

- **Onshape**: CAD web profesional (SaaS, $1500/año) - referencia arquitectura colaborativa
- **Tinkercad**: CAD web simple para educación - referencia UX principiantes
- **Shapr3D**: CAD táctil para iPad - referencia gestos touch
- **Fusion 360**: CAD desktop con nube - referencia funcionalidades completas
- **Blender**: Open-source modeling - NO es competencia directa (arte vs CAD) pero referencia UI

### C. Librerías Open Source Evaluadas

| Librería       | Pros                                            | Contras                                 | Decisión       |
| -------------- | ----------------------------------------------- | --------------------------------------- | -------------- |
| OpenCascade.js | Kernel CAD real, operaciones booleanas robustas | Curva de aprendizaje, bundle size ~15MB | ✅ Recomendado |
| Three.js       | Renderizado potente, comunidad grande           | No es motor CAD por sí solo             | ✅ Renderizado |
| Babylon.js     | Todo-en-uno, buen performance                   | Menos documentación CAD específica      | ⚠️ Alternativa |
| Manifold       | Operaciones booleanas rápidas                   | Menos funcionalidades que OCCT          | ⚠️ Backup      |
| Verb NURBS     | Curvas y superficies                            | Proyecto inactivo desde 2019            | ❌ Descartado  |

---

## Aprobaciones

| Rol           | Nombre      | Fecha       | Firma |
| ------------- | ----------- | ----------- | ----- |
| Product Owner | [Pendiente] | [Pendiente] |       |
| Tech Lead     | [Pendiente] | [Pendiente] |       |
| UX Lead       | [Pendiente] | [Pendiente] |       |
| Stakeholder   | [Pendiente] | [Pendiente] |       |

---

## Historial de Revisiones

| Versión | Fecha      | Autor           | Cambios                  |
| ------- | ---------- | --------------- | ------------------------ |
| 1.0.0   | Abril 2026 | Irispilot Agent | Creación inicial del PRD |

---

**Fin del Documento**

_Este PRD es un documento vivo que se actualizará conforme evolucionen los requerimientos del proyecto. Todas las modificaciones deben ser aprobadas por el Product Owner y comunicadas al equipo de desarrollo._
