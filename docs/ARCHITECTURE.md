# Arquitectura Técnica - STL-Model CAD Application

## Visión General

STL-Model es una aplicación web CAD construida con arquitectura de **Single Page Application (SPA)** con capacidades offline mediante Progressive Web App (PWA). El sistema se divide en tres capas principales: Frontend (React + Three.js), Backend (Node.js + Express), y Storage (PostgreSQL + S3).

---

## Diagrama de Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND (SPA)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   React UI   │  │  Three.js    │  │ OpenCascade  │  │
│  │  Components  │  │  Renderer    │  │  CAD Kernel  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│           │                │                 │          │
│           └────────────────┴─────────────────┘          │
│                      Zustand State                      │
└───────────────────────┬─────────────────────────────────┘
                        │ REST API / WebSocket
                        │ (HTTPS)
┌───────────────────────┴─────────────────────────────────┐
│                     BACKEND (API)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Express    │  │  Socket.io   │  │    Stripe    │  │
│  │   Routes     │  │  Collab Hub  │  │   Payments   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│           │                │                 │          │
│           └────────────────┴─────────────────┘          │
│                   Business Logic Layer                  │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────┴────────┐             ┌────────┴────────┐
│   PostgreSQL   │             │   S3 Storage    │
│   (Metadata)   │             │ (.stlm files)   │
└────────────────┘             └─────────────────┘
```

---

## Stack Tecnológico Detallado

### Frontend

| Componente      | Tecnología        | Versión | Justificación                         |
| --------------- | ----------------- | ------- | ------------------------------------- |
| **Framework**   | React             | 18.3+   | Ecosistema maduro, performance, hooks |
| **Lenguaje**    | TypeScript        | 5.4+    | Type safety, mejor DX, menos bugs     |
| **Build Tool**  | Vite              | 5.2+    | HMR instantáneo, builds optimizados   |
| **Motor 3D**    | Three.js          | r165+   | Estándar de facto para WebGL          |
| **CAD Kernel**  | OpenCascade.js    | 7.7+    | Operaciones booleanas robustas        |
| **Editor 2D**   | Fabric.js         | 6.0+    | Dibujo vectorial, fácil manipulación  |
| **State**       | Zustand           | 4.5+    | Ligero, menos boilerplate que Redux   |
| **Routing**     | React Router      | 6.22+   | Routing declarativo                   |
| **Forms**       | React Hook Form   | 7.51+   | Performance, menos re-renders         |
| **Validation**  | Zod               | 3.23+   | Type-safe schemas                     |
| **UI Library**  | shadcn/ui + Radix | -       | Accesible, customizable               |
| **Styling**     | Tailwind CSS      | 3.4+    | Utility-first, productividad          |
| **HTTP Client** | Axios             | 1.6+    | Interceptors, mejor error handling    |
| **WebSocket**   | Socket.io Client  | 4.7+    | Auto-reconnect, fallbacks             |

### Backend

| Componente       | Tecnología         | Versión | Justificación                        |
| ---------------- | ------------------ | ------- | ------------------------------------ |
| **Runtime**      | Node.js            | 20 LTS  | Estabilidad, performance mejorado    |
| **Framework**    | Express            | 4.19+   | Minimalista, flexible, probado       |
| **Lenguaje**     | TypeScript         | 5.4+    | Mismas razones que frontend          |
| **Database ORM** | Prisma             | 5.13+   | Type-safe queries, migraciones       |
| **Database**     | PostgreSQL         | 16+     | Relacional robusto, JSON support     |
| **File Storage** | AWS S3 SDK         | 3.x     | Estándar para object storage         |
| **Auth**         | Passport.js        | 0.7+    | Estrategias múltiples (local, OAuth) |
| **JWT**          | jsonwebtoken       | 9.0+    | Tokens stateless                     |
| **Validation**   | Zod                | 3.23+   | Compartido con frontend              |
| **WebSocket**    | Socket.io          | 4.7+    | Namespaces, rooms para collab        |
| **Payments**     | Stripe SDK         | 15.x    | API completa, webhooks               |
| **Email**        | Nodemailer         | 6.9+    | SMTP flexible                        |
| **Logging**      | Winston            | 3.13+   | Logs estructurados                   |
| **Testing**      | Vitest + Supertest | -       | Rápido, compatible con Vite          |

### DevOps & Infraestructura

| Componente           | Tecnología     | Justificación                                    |
| -------------------- | -------------- | ------------------------------------------------ |
| **Hosting Frontend** | Vercel         | Deploy automático, CDN global, Edge Functions    |
| **Hosting Backend**  | Railway        | Simple, Postgres incluido, auto-scaling          |
| **CI/CD**            | GitHub Actions | Integración nativa, gratuito para repos públicos |
| **Monorepo**         | Turborepo      | Cache de builds, ejecución paralela              |
| **Package Manager**  | pnpm           | Más rápido que npm, ahorra espacio               |
| **Containerización** | Docker         | Entornos reproducibles                           |
| **Monitoring**       | Sentry         | Error tracking, performance monitoring           |
| **Analytics**        | PostHog        | Open-source, self-hosted option                  |

---

## Estructura del Monorepo

```
stl-model/
├── apps/
│   ├── web/                    # Frontend React SPA
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── canvas/     # Canvas3D, FeatureMeshes, SketchIn3D
│   │   │   │   ├── editor/     # SketchEditor (Fabric.js), ConstraintOverlay
│   │   │   │   ├── render/     # RenderSettingsPanel, MaterialSpherePreview
│   │   │   │   ├── toolbar/    # Toolbar, Toolbar2D, Toolbar3D, Tool3DDialogs
│   │   │   │   ├── sidebar/    # Feature tree
│   │   │   │   ├── properties/ # Properties panel
│   │   │   │   └── ui/         # shadcn components
│   │   │   ├── lib/
│   │   │   │   ├── cad/        # cadWorkerClient (singleton)
│   │   │   │   ├── export/     # stlExporter, m3fExporter, modelExporter (OBJ)
│   │   │   │   ├── import/     # modelImporter (STL/OBJ)
│   │   │   │   ├── materials/  # materialPresets (11+ PBR)
│   │   │   │   ├── pattern/    # patternEngine (linear/circular)
│   │   │   │   ├── project/    # projectSerializer (.stlm)
│   │   │   │   └── sketch/
│   │   │   │       ├── constraints/  # constraintSolver, dofAnalyzer, constraintExporter
│   │   │   │       ├── tools/        # Line, Circle, Rect, Arc, Polygon, Spline, Measure
│   │   │   │       └── geometry.ts
│   │   │   ├── hooks/          # useCADWorker, useAutoSave
│   │   │   ├── stores/         # sketchStore, featureStore, renderStore, uiStore
│   │   │   ├── workers/        # cad.worker.ts (OpenCascade.js)
│   │   │   └── test/           # Setup + README
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── e2e/                    # WebdriverIO + Serenity (placeholder)
│
├── packages/
│   ├── shared-types/           # Tipos compartidos
│   ├── eslint-config/          # ESLint config compartido
│   └── tsconfig/               # TSConfig base
│
├── docs/
│   ├── PRD.md
│   ├── USER_STORIES.md
│   ├── ARCHITECTURE.md
│   ├── EDITOR_2D.md
│   ├── EXTRUSION_3D.md
│   └── TEST_PLAN.md
│
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Módulos Principales del Frontend

### 1. Canvas3D (Three.js)

Responsable del rendering y navegación 3D.

**Componentes clave**:

- `Scene.tsx`: Configuración de escena Three.js
- `Camera.tsx`: Configuración de cámara perspectiva
- `Controls.tsx`: OrbitControls para navegación
- `Grid.tsx`: Grid helper en plano XY
- `Mesh.tsx`: Componente para renderizar geometría CAD
- `Lights.tsx`: Iluminación de escena (directional, ambient)

**Hooks**:

- `useThree()`: Acceso a contexto de Three.js
- `useFrame()`: Loop de renderizado (react-three-fiber)

---

### 2. Editor2D (Fabric.js)

Editor de sketches vectoriales con snapping y constraints.

**Componentes**:

- `SketchCanvas.tsx`: Canvas Fabric.js embebido
- `DrawingTools.tsx`: Toolbar con línea, círculo, rectángulo
- `ConstraintPanel.tsx`: Panel de restricciones paramétricas
- `DimensionTool.tsx`: Herramienta de acotación

**State**:

```typescript
interface SketchState {
  activeSketch: Sketch | null;
  entities: SketchEntity[];
  constraints: Constraint[];
  selectedEntities: string[];
}
```

---

### 3. CADKernel (OpenCascade.js)

Wrapper de operaciones CAD sobre OpenCascade.js ejecutado en Web Worker.

**API Principal**:

```typescript
// cad-kernel.worker.ts
export class CADKernel {
  extrude(sketch: Sketch, distance: number): Solid;
  revolve(sketch: Sketch, axis: Axis, angle: number): Solid;
  fillet(solid: Solid, edges: Edge[], radius: number): Solid;
  chamfer(solid: Solid, edges: Edge[], distance: number): Solid;
  boolean(solidA: Solid, solidB: Solid, op: 'union' | 'subtract' | 'intersect'): Solid;
  shell(solid: Solid, facesToRemove: Face[], thickness: number): Solid;
}
```

**Comunicación con Worker**:

```typescript
// main thread
const cadWorker = new Worker('cad-kernel.worker.ts');
cadWorker.postMessage({ operation: 'extrude', params: {...} });
cadWorker.onmessage = (e) => {
  const resultSolid = e.data.solid;
  updateScene(resultSolid);
};
```

---

### 4. ProjectManager

Maneja serialización/deserialización de proyectos .stlm.

**Formato .stlm** (JSON comprimido con gzip):

```json
{
  "version": "1.0.0",
  "metadata": {
    "name": "MyProject",
    "author": "user@example.com",
    "created": "2026-04-06T12:00:00Z",
    "modified": "2026-04-06T14:30:00Z"
  },
  "features": [
    {
      "id": "feat-001",
      "type": "extrude",
      "params": {
        "sketch": {...},
        "distance": 10
      },
      "parent": null
    },
    {
      "id": "feat-002",
      "type": "fillet",
      "params": {
        "edges": ["edge-5", "edge-8"],
        "radius": 2
      },
      "parent": "feat-001"
    }
  ],
  "thumbnail": "data:image/png;base64,..."
}
```

---

### 5. Exporters

Convierte geometría interna a formatos estándar.

**STL Exporter**:

```typescript
export function exportSTL(solid: Solid, options: STLOptions): Blob {
  const triangles = tessellate(solid, options.resolution);
  const stlData = options.binary ? generateBinarySTL(triangles) : generateASCIISTL(triangles);
  return new Blob([stlData], { type: 'model/stl' });
}
```

**Validación de Manifold**:

- Verificar que todas las aristas tienen exactamente 2 caras adyacentes
- Verificar coherencia de normales
- Detectar agujeros y auto-reparar (opcional)

---

## Módulos Principales del Backend

### 1. Autenticación

**Estrategias**:

- Local (email + password con bcrypt)
- OAuth2 (Google, GitHub via Passport.js)

**Flujo JWT**:

```
1. User POST /api/auth/login { email, password }
2. Backend verifica credenciales
3. Genera access token (expira 15min) + refresh token (expira 7 días)
4. Frontend almacena tokens en httpOnly cookies
5. Cada request incluye access token en header
6. Si access token expira, renovar con refresh token
```

**Middleware de Autenticación**:

```typescript
export const authenticate = async (req: Request, res: Response, next: Next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

---

### 2. Gestión de Proyectos

**Endpoints**:

- `POST /api/projects` - Crear nuevo proyecto
- `GET /api/projects/:id` - Obtener proyecto
- `PUT /api/projects/:id` - Actualizar proyecto
- `DELETE /api/projects/:id` - Eliminar proyecto
- `GET /api/projects` - Listar proyectos del usuario

**Modelo de Datos** (Prisma):

```prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  fileUrl     String   // S3 URL del archivo .stlm
  thumbnail   String?
  public      Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
}
```

**Upload de Archivos**:

```typescript
// Usando pre-signed URLs de S3
export const uploadProject = async (req: Request, res: Response) => {
  const { fileName, contentType } = req.body;

  const s3Params = {
    Bucket: process.env.S3_BUCKET,
    Key: `projects/${req.user.id}/${uuid()}.stlm`,
    ContentType: contentType,
    Expires: 60, // URL válida por 60 segundos
  };

  const uploadUrl = await s3.getSignedUrlPromise('putObject', s3Params);
  res.json({ uploadUrl, fileKey: s3Params.Key });
};
```

---

### 3. Colaboración en Tiempo Real (Socket.io)

**Eventos**:

```typescript
// Cliente se une a proyecto
socket.on('join-project', ({ projectId }) => {
  socket.join(projectId);
  socket.to(projectId).emit('user-joined', { userId: socket.userId });
});

// Cliente envía operación CAD
socket.on('cad-operation', ({ projectId, operation }) => {
  // Broadcast a todos excepto emisor
  socket.to(projectId).emit('remote-operation', operation);
});

// Cliente mueve cursor
socket.on('cursor-move', ({ projectId, position }) => {
  socket.to(projectId).emit('remote-cursor', {
    userId: socket.userId,
    position,
  });
});
```

**Resolución de Conflictos**:

- Operational Transformation (OT) simplificado
- Last-write-wins con timestamp
- Notificación de conflictos al usuario

---

### 4. Marketplace

**Endpoints**:

- `POST /api/marketplace/listings` - Publicar modelo
- `GET /api/marketplace/listings` - Buscar modelos
- `GET /api/marketplace/listings/:id` - Detalle de modelo
- `POST /api/marketplace/purchase` - Comprar modelo
- `POST /api/marketplace/reviews` - Dejar review

**Integración con Stripe**:

```typescript
export const createPurchase = async (req: Request, res: Response) => {
  const { listingId } = req.body;
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });

  // Crear PaymentIntent en Stripe
  const paymentIntent = await stripe.paymentIntents.create({
    amount: listing.price * 100, // centavos
    currency: 'usd',
    metadata: { listingId, userId: req.user.id },
  });

  res.json({ clientSecret: paymentIntent.client_secret });
};
```

**Webhook de Stripe** (payment succeeded):

```typescript
app.post('/api/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

  if (event.type === 'payment_intent.succeeded') {
    const { listingId, userId } = event.data.object.metadata;

    // Crear registro de compra
    await prisma.purchase.create({
      data: { listingId, userId, amount: event.data.object.amount / 100 }
    });

    // Notificar al vendedor
    await sendEmail(seller.email, 'Nueva venta!', ...);
  }

  res.json({ received: true });
});
```

---

## Seguridad

### Medidas Implementadas

1. **HTTPS Obligatorio**: Forzar redirección de HTTP a HTTPS
2. **CORS Configurado**: Whitelist de dominios permitidos
3. **Helmet.js**: Headers de seguridad (CSP, XSS, etc.)
4. **Rate Limiting**: 100 requests/minuto por IP
5. **SQL Injection**: Prevenido por Prisma (prepared statements)
6. **XSS**: Sanitización de inputs con DOMPurify
7. **CSRF**: Tokens anti-CSRF en formularios
8. **Passwords**: Hasheado con bcrypt (12 rounds)
9. **JWT**: Tokens con expiración corta + refresh tokens
10. **File Uploads**: Validación de MIME types y tamaño máximo (50MB)

---

## Performance

### Optimizaciones Frontend

1. **Code Splitting**: Lazy loading de rutas con React.lazy()
2. **Tree Shaking**: Vite elimina código no usado
3. **Asset Optimization**: Imágenes en WebP, compresión gzip
4. **Virtual Scrolling**: Para feature tree con 1000+ items
5. **Web Workers**: CAD kernel en worker para no bloquear UI
6. **IndexedDB**: Cache de proyectos recientes
7. **Service Worker**: PWA con estrategia cache-first

### Optimizaciones Backend

1. **Database Indexing**: Índices en userId, projectId
2. **Query Optimization**: Eager loading con Prisma
3. **Caching**: Redis para sesiones y datos frecuentes
4. **CDN**: CloudFront para archivos estáticos y .stlm
5. **Compression**: gzip/brotli en responses
6. **Connection Pooling**: Pool de conexiones a Postgres

---

## Testing

### Estrategia de Testing

| Tipo              | Herramienta           | Cobertura Objetivo |
| ----------------- | --------------------- | ------------------ |
| Unit Tests        | Vitest                | ≥ 80%              |
| Component Tests   | React Testing Library | ≥ 70%              |
| Integration Tests | Supertest             | Endpoints críticos |
| E2E Tests         | Playwright            | Flujos principales |
| Visual Regression | Chromatic             | Componentes UI     |

### Ejemplo de Test Unitario

```typescript
// fillet.test.ts
import { describe, it, expect } from 'vitest';
import { CADKernel } from '../cad-kernel';

describe('CADKernel.fillet', () => {
  it('should apply fillet to selected edges', () => {
    const kernel = new CADKernel();
    const box = kernel.createBox(10, 10, 10);
    const edges = kernel.getEdges(box).slice(0, 4); // Top 4 edges

    const filletedBox = kernel.fillet(box, edges, 2);

    expect(filletedBox).toBeDefined();
    expect(kernel.getVolume(filletedBox)).toBeLessThan(1000); // Volume reduced
  });

  it('should throw error if radius is too large', () => {
    const kernel = new CADKernel();
    const box = kernel.createBox(10, 10, 10);
    const edges = kernel.getEdges(box).slice(0, 1);

    expect(() => {
      kernel.fillet(box, edges, 15); // Radius > edge length
    }).toThrow('Fillet radius too large');
  });
});
```

---

## Deployment

### Estrategia de Deploy

1. **Staging Environment**: Deploy automático en cada push a `develop`
2. **Production Environment**: Deploy manual desde `main` con aprobación
3. **Rollback**: Revert a versión anterior en < 5 minutos
4. **Database Migrations**: Ejecutadas automáticamente con Prisma Migrate
5. **Zero-Downtime**: Blue-green deployment en Railway

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: railway/deploy@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
          service: api
```

---

## Monitoreo y Observabilidad

### Métricas Clave

**Performance Metrics**:

- Tiempo de carga inicial (P50, P95, P99)
- FPS en viewport 3D
- Tiempo de ejecución de operaciones CAD

**Business Metrics**:

- DAU / MAU
- Proyectos creados por día
- Modelos exportados
- GMV del marketplace

**Error Tracking**:

- Errores frontend (Sentry)
- Errores backend (Sentry + Winston logs)
- Alertas automáticas en Slack

### Dashboard de Métricas (Grafana)

```
┌─────────────────────────────────────────────┐
│  Response Time (P95)         │  250ms  ⬇︎    │
│  Error Rate                  │   0.3%  ✓    │
│  Active Users                │  1,234  ⬆︎    │
│  Database Connections        │    45   ✓    │
│  WebSocket Connections       │   234   ⬆︎    │
│  S3 Bandwidth (GB)           │  12.4   ⬆︎    │
└─────────────────────────────────────────────┘
```

---

## Estado de Implementación

Fase 1 (MVP) y Fase 2 (CAD Completo) están 100% implementadas. Ver [STATUS.md](../STATUS.md) para detalle.

### Implementado

- Canvas 3D con Three.js + react-three-fiber (4 modos vista)
- Editor 2D con Fabric.js (7 herramientas)
- CAD Kernel en Web Worker con OpenCascade.js (extrude, fillet, chamfer, shell, sweep, loft)
- Restricciones paramétricas con solver + DOF analysis
- Patrones lineales y circulares
- Export STL (binary/ASCII), M3F (JSON + metadata fabricación), OBJ
- Import STL/OBJ
- Materiales PBR (11+ presets) + tone mapping + post-processing
- Guardar/Cargar proyecto (.stlm)
- 430+ test cases

### Próximos Pasos (Fase 3+)

1. **Autenticación y Cloud** (US-016): Backend API, cuentas de usuario, almacenamiento en nube
2. **Compartir Proyectos** (US-017): Galería comunitaria, perfiles públicos
3. **Marketplace** (US-018): Venta de modelos, integración Stripe
4. **Colaboración Real-Time** (US-019): WebSocket/CRDT, cursores multi-usuario
