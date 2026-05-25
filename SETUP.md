# Guía de Instalación y Ejecución

## Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** 20 o superior
- **pnpm** 8 o superior (recomendado) o npm/yarn

### Verificar versiones

```bash
node --version  # Debe ser >= 20.0.0
pnpm --version  # Debe ser >= 8.0.0
```

### Instalar pnpm (si no lo tienes)

```bash
npm install -g pnpm
```

---

## Instalación

### 1. Clonar el repositorio (si aplica)

```bash
git clone https://github.com/tu-usuario/capycad.git
cd capycad
```

### 2. Instalar dependencias

Desde la raíz del proyecto:

```bash
pnpm install
```

Este comando instalará todas las dependencias para:

- El workspace raíz (Turborepo, Prettier)
- Todos los packages (`shared-types`, `tsconfig`, `eslint-config`)
- La aplicación web (`apps/web`)

---

## Ejecución en Desarrollo

### Iniciar servidor de desarrollo

```bash
pnpm dev
```

Esto ejecutará:

- `apps/web` en `http://localhost:5173`

La aplicación se abrirá automáticamente en tu navegador.

### Características del modo desarrollo

- ⚡ **Hot Module Replacement (HMR)**: Los cambios se reflejan instantáneamente
- 🔍 **TypeScript type checking**: Validación en tiempo real
- 🎨 **Tailwind CSS**: Estilos actualizados al guardar

---

## Scripts Disponibles

### Desde la raíz (comandos Turbo)

```bash
# Ejecutar todos los proyectos en modo desarrollo
pnpm dev

# Compilar todos los proyectos
pnpm build

# Ejecutar tests en todos los proyectos
pnpm test

# Ejecutar tests con cobertura
pnpm test:coverage

# Linting en todos los proyectos
pnpm lint

# Formatear código con Prettier
pnpm format

# Limpiar node_modules y builds
pnpm clean
```

### Desde `apps/web`

```bash
cd apps/web

# Modo desarrollo
pnpm dev

# Build de producción
pnpm build

# Preview del build de producción
pnpm preview

# Tests
pnpm test

# Linting
pnpm lint

# Type checking
pnpm type-check
```

---

## Estructura del Proyecto

```
capycad/
├── apps/
│   └── web/                    # Aplicación React (Vite)
│       ├── src/
│       │   ├── components/     # Componentes React
│       │   ├── lib/            # Utilidades
│       │   └── main.tsx        # Entry point
│       └── package.json
│
├── packages/
│   ├── shared-types/           # Tipos TypeScript compartidos
│   ├── tsconfig/               # Configuraciones TS base
│   └── eslint-config/          # Config ESLint compartida
│
├── docs/                       # Documentación
│   ├── PRD.md
│   ├── USER_STORIES.md
│   └── ARCHITECTURE.md
│
└── package.json                # Workspace raíz
```

---

## Solución de Problemas

### Error: `command not found: pnpm`

Instala pnpm globalmente:

```bash
npm install -g pnpm
```

### Error: `Node version not supported`

Actualiza Node.js a la versión 20 o superior:

```bash
# Con nvm
nvm install 20
nvm use 20
```

### Error de dependencias

Limpia e instala de nuevo:

```bash
pnpm clean
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Puerto 5173 ocupado

Cambia el puerto en `apps/web/vite.config.ts`:

```typescript
server: {
  port: 3000, // Cambia el puerto aquí
  open: true,
}
```

### Error de ESLint o TypeScript

Ejecuta type checking y linting:

```bash
pnpm lint
pnpm type-check
```

---

## Próximos Pasos

Una vez que la aplicación esté corriendo:

1. ✅ **Explora la interfaz**: Familiarízate con el layout (toolbar, canvas 3D, sidebars)
2. 🎨 **Prueba la navegación 3D**: Click derecho + arrastrar para rotar, scroll para zoom
3. 📚 **Revisa la documentación**: Lee [USER_STORIES.md](docs/USER_STORIES.md) para conocer las funcionalidades planificadas
4. 🔨 **Comienza a desarrollar**: Sigue el roadmap de [ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Recursos Útiles

- [Documentación de React](https://react.dev/)
- [Documentación de Three.js](https://threejs.org/docs/)
- [Documentación de React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Documentación de Vite](https://vitejs.dev/)
- [Documentación de Tailwind CSS](https://tailwindcss.com/docs)

---

## Soporte

Para reportar problemas o solicitar features, consulta:

- [PRD.md](docs/PRD.md) - Requisitos del producto
- [USER_STORIES.md](docs/USER_STORIES.md) - Historias de usuario
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Arquitectura técnica
