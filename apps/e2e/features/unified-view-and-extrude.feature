# language: es

Característica: Vista unificada 2D/3D
  Como diseñador
  Quiero que el canvas 3D esté siempre montado y la cámara se oriente cenitalmente al pasar a 2D
  Para no perder el contexto de la escena al alternar entre modos

  Antecedentes:
    Dado que el usuario abre la aplicación CAD

  Escenario: El canvas 3D ya está montado en modo 2D inicial
    Entonces el canvas de boceto debería estar visible
    Y el canvas 3D debería estar montado

  Escenario: Cambiar a modo 3D oculta el overlay 2D pero conserva la escena 3D
    Cuando el usuario activa el modo 3D
    Entonces el canvas 3D debería estar montado
    Y el canvas de boceto no debería estar visible

  Escenario: Volver a modo 2D no destruye la escena 3D
    Cuando el usuario activa el modo 3D
    Y el usuario activa el modo 2D
    Entonces el canvas 3D debería estar montado
    Y el canvas de boceto debería estar visible

  Escenario: La barra de herramientas y el botón Extruir están disponibles tras pasar a 3D
    Cuando el usuario activa el modo 3D
    Entonces debería ver la barra de herramientas
    Y debería ver el botón "Extruir"
    Y no debería mostrar banner de error del motor CAD
