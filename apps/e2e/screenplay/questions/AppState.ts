import { Question } from '@serenity-js/core';
import { By, PageElement, Page } from '@serenity-js/web';

/** Selector del canvas de boceto 2D (Fabric.js monta un <canvas>) */
const sketchCanvas = () =>
  PageElement.located(By.css('[data-testid="sketch-canvas"], canvas.lower-canvas'));

/** Selector del canvas 3D (react-three-fiber monta dentro de #canvas-container) */
const canvas3D = () => PageElement.located(By.css('#canvas-container canvas'));

/** Barra de herramientas de archivo (siempre renderizada — ToolbarFile) */
const toolbar = () => PageElement.located(By.css('[data-testid="toolbar-file"]'));

/** Panel lateral */
const sidebar = () => PageElement.located(By.css('[data-testid="sidebar"]'));

/** Panel de propiedades */
const propertiesPanel = () => PageElement.located(By.css('[data-testid="properties-panel"]'));

/** Banner de error del motor CAD */
const cadErrorBanner = () =>
  PageElement.located(By.cssContainingText('span', 'Motor CAD no disponible'));

/** Overlay de inicialización bloqueante */
const initOverlay = () => PageElement.located(By.css('[data-testid="cad-init-overlay"]'));

/** Barra de herramientas booleanas (panel) */
const toolbarBoolean = () => PageElement.located(By.css('[data-testid="toolbar-boolean"]'));

/** Botón de operación booleana unión (siempre visible en modo 3D) */
const booleanOpenBtn = () => PageElement.located(By.css('[data-testid="boolean-union-btn"]'));

/** Mensaje "no hay extrusiones" dentro del diálogo de booleana */
const booleanEmptyMsg = () => PageElement.located(By.css('[data-testid="boolean-empty-msg"]'));

/**
 * Preguntas de Screenplay — estado de la UI de la app CAD.
 */
export const AppState = {
  /** ¿Está presente la barra de herramientas en el DOM? */
  toolbarIsVisible: () =>
    Question.about('la visibilidad de la barra de herramientas', (actor) =>
      actor.answer(toolbar().isPresent())
    ),

  /** ¿Existe el panel lateral en el DOM? */
  sidebarIsPresent: () =>
    Question.about('la presencia del panel lateral', (actor) =>
      actor.answer(sidebar().isPresent())
    ),

  /** ¿Está presente el canvas de boceto en el DOM? */
  sketchCanvasIsVisible: () =>
    Question.about('la visibilidad del canvas de boceto', (actor) =>
      actor.answer(sketchCanvas().isPresent())
    ),

  /** ¿Está montado el canvas 3D? */
  canvas3DIsPresent: () =>
    Question.about('la presencia del canvas 3D', (actor) => actor.answer(canvas3D().isPresent())),

  /** ¿Está presente el panel de propiedades? */
  propertiesPanelIsPresent: () =>
    Question.about('la presencia del panel de propiedades', (actor) =>
      actor.answer(propertiesPanel().isPresent())
    ),

  /** ¿El banner de error CAD NO está presente (motor disponible)? */
  cadErrorBannerIsAbsent: () =>
    Question.about('la ausencia del error del motor CAD', async (actor) => {
      const present = await actor.answer(cadErrorBanner().isPresent());
      return !present;
    }),

  /** Título de la página actual */
  pageTitle: () => Page.current().title(),

  /** ¿El overlay de init NO está visible (UI desbloqueada)? */
  initOverlayIsGone: () =>
    Question.about('que el overlay de inicialización no bloquea la UI', async (actor) => {
      const present = await actor.answer(initOverlay().isPresent());
      return !present;
    }),

  /** ¿Existe un botón con el title dado?
   *  Estrategia: exact → contains → data-testid partial match */
  buttonIsPresent: (title: string) =>
    Question.about(`la presencia del botón "${title}"`, async (actor) => {
      // 1. Exact title match
      if (await actor.answer(PageElement.located(By.css(`[title="${title}"]`)).isPresent())) return true;
      // 2. Title contains (handles conditional suffixes like "Extruir — requiere …")
      if (await actor.answer(PageElement.located(By.css(`[title*="${title}"]`)).isPresent())) return true;
      // 3. data-testid partial match (handles modifier buttons whose title is a long description)
      const key = title.toLowerCase().replace(/\s+/g, '-');
      return actor.answer(PageElement.located(By.css(`[data-testid*="${key}-btn"]`)).isPresent());
    }),

  /** ¿Está activo (seleccionado) un botón de herramienta? Busca clase de activación. */
  toolButtonIsActive: (toolLabel: string) =>
    Question.about(`que la herramienta "${toolLabel}" está activa`, async (actor) => {
      const button = PageElement.located(By.css(`[title="${toolLabel}"]`));
      const present = await actor.answer(button.isPresent());
      if (!present) return false;
      // Los botones activos tienen clase bg-violet-600 o bg-primary
      const cssClass = await actor.answer(button.attribute('class'));
      return cssClass?.includes('bg-violet') || cssClass?.includes('bg-primary') || false;
    }),

  /** ¿Está presente la barra de booleanas? */
  booleanToolbarIsPresent: () =>
    Question.about('la presencia de la barra de booleanas', (actor) =>
      actor.answer(toolbarBoolean().isPresent())
    ),

  /** ¿Está presente el botón para abrir el diálogo de booleana? */
  booleanOpenButtonIsPresent: () =>
    Question.about('la presencia del botón de booleana', (actor) =>
      actor.answer(booleanOpenBtn().isPresent())
    ),

  /** ¿Se muestra el mensaje "no hay extrusiones" en el diálogo de booleana? */
  booleanEmptyMessageIsVisible: () =>
    Question.about('el mensaje de booleana sin extrusiones', (actor) =>
      actor.answer(booleanEmptyMsg().isPresent())
    ),
};
