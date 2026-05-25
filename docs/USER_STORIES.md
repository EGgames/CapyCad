# User Stories - CapyCad CAD Application

## Fase 1 - MVP Funcional (Mes 1)

### US-001: Dibujar Formas 2D Básicas

**Como** usuario principiante  
**Quiero** dibujar líneas, círculos y rectángulos en un editor 2D  
**Para** crear bocetos simples que pueda convertir en piezas 3D

**Criterios de Aceptación**:

- Puedo seleccionar herramienta de línea y hacer click para definir puntos inicial y final
- Puedo dibujar círculos especificando centro y radio
- Puedo dibujar rectángulos con dos clicks (esquinas opuestas)
- Veo preview en tiempo real mientras dibujo
- Puedo deshacer y rehacer acciones (Ctrl+Z / Ctrl+Y)

**Prioridad**: Alta  
**Estimación**: 3 días

---

### US-002: Extruir Sketch a 3D

**Como** diseñador  
**Quiero** convertir mi boceto 2D en un sólido 3D mediante extrusión  
**Para** crear piezas volumétricas simples

**Criterios de Aceptación**:

- Selecciono un sketch cerrado y elijo opción "Extruir"
- Ingreso distancia de extrusión (positiva o negativa)
- Veo preview 3D del resultado antes de confirmar
- El sólido resultante aparece en el viewport 3D
- Puedo editar la distancia desde el feature tree

**Prioridad**: Alta  
**Estimación**: 4 días

---

### US-003: Redondear Aristas (Fillet)

**Como** ingeniero  
**Quiero** aplicar redondeos a las aristas de mi pieza  
**Para** eliminar esquinas filosas y mejorar la manufacturabilidad

**Criterios de Aceptación**:

- Selecciono una o múltiples aristas del modelo
- Especifico radio de redondeo (1-50mm)
- Veo preview interactivo del fillet
- Confirmo y el fillet se aplica correctamente
- Puedo editar el radio posteriormente

**Prioridad**: Alta  
**Estimación**: 3 días

---

### US-004: Biselar Aristas (Chamfer)

**Como** diseñador mecánico  
**Quiero** aplicar chaflanes a aristas seleccionadas  
**Para** crear biseles controlados en mis piezas

**Criterios de Aceptación**:

- Selecciono aristas y elijo "Chamfer"
- Especifico distancia o ángulo del bisel
- Preview muestra el resultado antes de aplicar
- Chamfer se crea correctamente en la geometría
- Aparece en historial de features editable

**Prioridad**: Alta  
**Estimación**: 3 días

---

### US-005: Visualizar Modelo en 3D

**Como** usuario  
**Quiero** ver mi modelo 3D con diferentes modos de visualización  
**Para** inspeccionar la geometría desde varios ángulos

**Criterios de Aceptación**:

- Puedo rotar la vista con click derecho + arrastrar
- Puedo hacer zoom con scroll
- Puedo panear con click medio + arrastrar
- Puedo cambiar entre modo wireframe y shaded
- La navegación es fluida (60 FPS mínimo)

**Prioridad**: Alta  
**Estimación**: 2 días

---

### US-006: Exportar a STL

**Como** usuario de impresión 3D  
**Quiero** exportar mi modelo a formato STL  
**Para** poder imprimirlo en mi impresora 3D

**Criterios de Aceptación**:

- Accedo a menú "Archivo > Exportar > STL"
- Selecciono resolución (baja/media/alta)
- Archivo STL se descarga automáticamente
- El archivo es válido (manifold cerrado)
- Puedo abrir el STL en cualquier slicer (Cura, PrusaSlicer)

**Prioridad**: Alta  
**Estimación**: 2 días

---

### US-007: Guardar y Cargar Proyecto

**Como** usuario  
**Quiero** guardar mi proyecto localmente y cargarlo después  
**Para** continuar trabajando en mis diseños en otra sesión

**Criterios de Aceptación**:

- Botón "Guardar Proyecto" descarga archivo .stlm
- Botón "Abrir Proyecto" permite seleccionar archivo .stlm
- Al cargar, se restaura toda la geometría y el historial de features
- Metadata del proyecto (nombre, fecha) se preserva
- Archivos son relativamente pequeños (< 5MB para proyectos típicos)

**Prioridad**: Alta  
**Estimación**: 3 días

---

### US-008: Interfaz Básica con Toolbar

**Como** usuario  
**Quiero** una interfaz intuitiva con herramientas organizadas  
**Para** acceder rápidamente a las funciones que necesito

**Criterios de Aceptación**:

- Toolbar superior con iconos claros de herramientas 2D/3D
- Sidebar izquierdo con feature tree (historial de operaciones)
- Panel derecho con propiedades del objeto seleccionado
- Viewport central ocupa la mayor parte de la pantalla
- Tooltips aparecen al pasar mouse sobre herramientas

**Prioridad**: Alta  
**Estimación**: 4 días

---

## Fase 2 - CAD Completo (Mes 2)

### US-009: Restricciones Paramétricas

**Como** diseñador paramétrico  
**Quiero** definir relaciones dimensionales y geométricas en mis sketches  
**Para** que el diseño se actualice automáticamente al cambiar parámetros

**Prioridad**: Media  
**Estimación**: 5 días

---

### US-010: Operación Shell (Vaciar Sólido)

**Como** ingeniero de producto  
**Quiero** crear carcasas huecas con espesor de pared uniforme  
**Para** diseñar envases y contenedores

**Prioridad**: Media  
**Estimación**: 4 días

---

### US-011: Patrones de Repetición

**Como** diseñador mecánico  
**Quiero** replicar features en patrones lineales o circulares  
**Para** crear diseños con elementos repetitivos eficientemente

**Prioridad**: Media  
**Estimación**: 3 días

---

### US-012: Operación Sweep y Loft

**Como** diseñador industrial  
**Quiero** crear geometría siguiendo trayectorias complejas  
**Para** modelar formas orgánicas y conductos

**Prioridad**: Media  
**Estimación**: 5 días

---

### US-013: Exportar a Múltiples Formatos

**Como** profesional CAD  
**Quiero** exportar a M3F y OBJ además de STL  
**Para** integrar con diferentes herramientas de mi workflow

**Prioridad**: Media  
**Estimación**: 3 días

---

### US-014: Importar Modelos Existentes

**Como** usuario  
**Quiero** importar archivos STL y OBJ  
**Para** editar o ensamblar modelos existentes

**Prioridad**: Media  
**Estimación**: 3 días

---

### US-015: Materiales y Renderizado PBR

**Como** diseñador de producto  
**Quiero** aplicar materiales realistas a mi modelo  
**Para** crear presentaciones profesionales

**Prioridad**: Media  
**Estimación**: 4 días

---

## Backlog (Fases 3-6)

### US-016: Autenticación de Usuario

**Como** miembro de la comunidad  
**Quiero** crear una cuenta y hacer login  
**Para** guardar mis proyectos en la nube

**Prioridad**: Baja  
**Fase**: 3

---

### US-017: Compartir Proyectos Públicamente

**Como** creator  
**Quiero** publicar mis diseños en la galería comunitaria  
**Para** recibir feedback y ganar visibilidad

**Prioridad**: Baja  
**Fase**: 3

---

### US-018: Vender Modelos en Marketplace

**Como** diseñador profesional  
**Quiero** listar modelos premium con precio  
**Para** monetizar mi trabajo creativo

**Prioridad**: Baja  
**Fase**: 4

---

### US-019: Colaborar en Tiempo Real

**Como** miembro de un equipo  
**Quiero** editar proyectos simultáneamente con colegas  
**Para** acelerar el proceso de diseño

**Prioridad**: Baja  
**Fase**: 5

---

## Mapa de Historias de Usuario

```
USUARIO
    |
    ├── Crear Diseños
    │   ├── US-001: Dibujar 2D
    │   ├── US-002: Extruir 3D
    │   ├── US-009: Restricciones
    │   └── US-012: Sweep/Loft
    │
    ├── Modificar Geometría
    │   ├── US-003: Fillet
    │   ├── US-004: Chamfer
    │   ├── US-010: Shell
    │   └── US-011: Patrones
    │
    ├── Visualizar
    │   ├── US-005: Navegación 3D
    │   └── US-015: Materiales PBR
    │
    ├── Gestionar Archivos
    │   ├── US-007: Guardar/Cargar
    │   ├── US-006: Exportar STL
    │   ├── US-013: Exportar M3F/OBJ
    │   └── US-014: Importar
    │
    └── Colaborar
        ├── US-016: Autenticación
        ├── US-017: Compartir
        ├── US-018: Vender
        └── US-019: Edición Colaborativa
```

---

## Definición de "Done"

Para que una User Story se considere terminada debe cumplir:

- [ ] Código implementado y funcionando
- [ ] Tests unitarios escritos y pasando (cobertura ≥ 80%)
- [ ] Documentación técnica actualizada
- [ ] UI/UX revisada (responsive, accesible)
- [ ] Sin errores en consola del navegador
- [ ] Revisión de código por peer
- [ ] Desplegado en entorno de staging
- [ ] Validado por usuario final o PO

---

## Velocidad Estimada

**Fase 1** (20 días hábiles / mes):

- 8 User Stories prioritarias
- 24 días de estimación total
- Velocidad ajustada: **~3 US/semana** para desarrollo individual

**Nota**: Las estimaciones son flexibles y se ajustarán según el progreso real del desarrollador.
