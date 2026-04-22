# language: es

Característica: Aplicación CAD — Funcionalidades principales
  Como diseñador que trabaja con modelos 3D
  Quiero usar la aplicación CAD en el navegador
  Para crear y editar bocetos y modelos tridimensionales

  Antecedentes:
    Dado que el usuario abre la aplicación CAD

  Escenario: Cargar la aplicación correctamente
    Entonces la página debería cargar sin errores críticos
    Y debería ver la barra de herramientas
    Y debería ver el panel lateral

  Escenario: Editor de bocetos activo en modo 2D por defecto
    Entonces el modo de edición inicial debería ser 2D
    Y el canvas de boceto debería estar visible

  Escenario: Cambiar al modo 3D
    Cuando el usuario activa el modo 3D
    Entonces el canvas 3D debería estar montado
    Y debería ver los controles de render

  Escenario: Panel de propiedades visible
    Entonces el panel de propiedades debería estar presente en la interfaz

  Escenario: Motor CAD inicializa sin bloquear la UI
    Entonces la interfaz debería responder antes de que el motor CAD finalice
    Y no debería aparecer una pantalla de bloqueo mayor a 30 segundos

  # ── Modo switching ──────────────────────────────────────────────────────────

  Escenario: Volver al modo 2D desde 3D
    Cuando el usuario activa el modo 3D
    Y el canvas 3D debería estar montado
    Cuando el usuario activa el modo 2D
    Entonces el canvas de boceto debería estar visible

  # ── Herramientas de boceto 2D ──────────────────────────────────────────────

  Escenario: Seleccionar herramienta de línea
    Cuando el usuario selecciona la herramienta "Línea (L)"
    Entonces la herramienta "Línea (L)" debería estar activa

  Escenario: Seleccionar herramienta de círculo
    Cuando el usuario selecciona la herramienta "Círculo (C)"
    Entonces la herramienta "Círculo (C)" debería estar activa

  Escenario: Seleccionar herramienta de rectángulo
    Cuando el usuario selecciona la herramienta "Rectángulo (R)"
    Entonces la herramienta "Rectángulo (R)" debería estar activa

  Escenario: Seleccionar herramienta de polígono
    Cuando el usuario selecciona la herramienta "Polígono (P)"
    Entonces la herramienta "Polígono (P)" debería estar activa

  Escenario: Volver a herramienta de selección
    Cuando el usuario selecciona la herramienta "Línea (L)"
    Y el usuario selecciona la herramienta "Selección"
    Entonces la herramienta "Selección" debería estar activa

  # ── Toolbar controles ──────────────────────────────────────────────────────

  Escenario: Botones de deshacer y rehacer visibles
    Entonces debería ver el botón "Deshacer (Ctrl+Z)"
    Y debería ver el botón "Rehacer (Ctrl+Y)"

  Escenario: Botón de exportar visible
    Entonces debería ver el botón "Exportar modelo"

  # ── Herramientas 3D visibles en modo 3D ────────────────────────────────────

  Escenario: Herramientas 3D visibles al cambiar modo
    Cuando el usuario activa el modo 3D
    Entonces debería ver el botón "Extruir"
    Y debería ver el botón "Revolución"
    Y debería ver el botón "Fillet"
    Y debería ver el botón "Chamfer"

  # ── Sin errores ────────────────────────────────────────────────────────────

  Escenario: Motor CAD sin banner de error
    Entonces no debería mostrar banner de error del motor CAD
